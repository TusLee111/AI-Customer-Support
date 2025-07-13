from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from socketio_instance import sio, active_rooms
import time
from fastapi.responses import JSONResponse

from models.schemas import Message, ChatRoom, UserType, RoomSchema, MessageSchema, MessageResponse, CreateMessageSchema
from services.chat_service import ChatService
from services.ai_service import AIService
from routes.auth import get_current_user
from database.connection import get_database

print("[DEBUG] chat.py imported")  # Log khi import file

router = APIRouter()

def get_chat_service():
    db = get_database()
    return ChatService(db)

def get_current_active_admin():
    return {"id": "admin", "user_type": "admin"}

class CreateRoomRequest(BaseModel):
    customer_name: str

@router.post("/rooms", response_model=dict)
async def create_chat_room(data: dict, chat_service: ChatService = Depends(get_chat_service), current_user: dict = Depends(get_current_user)):
    customer_id = data.get("customer_id")
    customer_name = data.get("customer_name", customer_id)
    if not customer_id:
        raise HTTPException(status_code=400, detail="customer_id required")
    room = await chat_service.create_room(customer_id, customer_name)
    return room

@router.get("/rooms", response_model=List[dict])
async def get_chat_rooms(chat_service: ChatService = Depends(get_chat_service), current_user: dict = Depends(get_current_user)):
    rooms = await chat_service.get_active_rooms()
    return rooms

@router.get("/rooms/{room_id}", response_model=dict)
async def get_chat_room(room_id: str, chat_service: ChatService = Depends(get_chat_service), current_user: dict = Depends(get_current_user)):
    room = await chat_service.get_room_by_id(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Chat room not found")
    return room

@router.get("/rooms/{room_id}/messages", response_model=List[dict])
async def get_messages(room_id: str, chat_service: ChatService = Depends(get_chat_service), current_user: dict = Depends(get_current_user)):
    messages = await chat_service.get_messages_by_room_id(room_id)
    return messages

@router.post("/rooms/{room_id}/messages", response_model=dict)
async def send_message(room_id: str, data: dict, chat_service: ChatService = Depends(get_chat_service), current_user: dict = Depends(get_current_user), ai_service: AIService = Depends()):
    user_id = current_user["id"]
    user_type = current_user["user_type"]
    content = data.get("content")
    if not content:
        raise HTTPException(status_code=400, detail="Missing content")
    msg = await chat_service.save_message(room_id, user_id, user_type, content)
    # Nếu cần AI phân tích thì gọi ai_service.analyze_message(content)
    return msg

@router.post("/rooms/{room_id}/close")
async def close_chat_room(room_id: str, chat_service: ChatService = Depends(get_chat_service), current_user: dict = Depends(get_current_user)):
    await chat_service.close_chat_room(room_id)
    return {"message": "Chat room closed successfully"}

@router.get("/rooms/{room_id}/statistics", response_model=dict)
async def get_chat_statistics(
    room_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get statistics for a specific chat room"""
    try:
        chat_service = ChatService()
        stats = await chat_service.get_chat_statistics(room_id)
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get chat statistics: {str(e)}"
        )

@router.get("/logs", response_model=List[dict])
async def get_chat_logs(
    chat_service: ChatService = Depends(get_chat_service),
    current_user: dict = Depends(get_current_user)
):
    """
    Retrieves all chat rooms to be displayed as logs.
    This endpoint fetches all rooms, regardless of status, and formats them.
    """
    try:
        all_rooms = await chat_service.get_all_rooms()
        
        # Format the data to match the expected structure for the frontend chat log component.
        formatted_logs = []
        for room in all_rooms:
            # Basic duration calculation
            duration = "In progress"
            if room.get("created_at") and room.get("closed_at"):
                delta = room["closed_at"] - room["created_at"]
                duration = str(delta).split('.')[0] # Simple string format
            
            log_entry = {
                "id": str(room["_id"]),
                "customerName": room.get("customer_name", "N/A"),
                "customerEmail": room.get("customer_email", "N/A"), # Assuming this field exists
                "startTime": room.get("created_at").isoformat() if room.get("created_at") else None,
                "endTime": room.get("closed_at").isoformat() if room.get("closed_at") else None,
                "duration": duration,
                "messageCount": room.get("message_count", 0), # Assuming this field exists
                "status": room.get("status", "unknown"),
                "satisfaction": room.get("satisfaction_rating"), # Assuming this field exists
                "intent": room.get("dominant_intent"), # Assuming this field exists
                "aiUsage": room.get("ai_usage_percentage", 0) # Assuming this field exists
            }
            formatted_logs.append(log_entry)
            
        return formatted_logs
    except Exception as e:
        # Log the error for debugging
        print(f"Error fetching chat logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch chat logs."
        )

class MessageInput(BaseModel):
    message: str

@router.post("/analyze", response_model=dict)
async def analyze_message(
    body: MessageInput,
    current_user: dict = Depends(get_current_user)
):
    """Analyze a message with AI (intent classification and response suggestions)"""
    try:
        ai_service = AIService()
        analysis = await ai_service.analyze_message(body.message)
        return analysis
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze message: {str(e)}"
        )

@router.get("/search", response_model=List[dict])
async def search_messages(
    keyword: Optional[str] = None,
    intent: Optional[str] = None,
    customer_id: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Search messages with various filters"""
    try:
        from models.schemas import IntentType
        chat_service = ChatService()
        
        intent_enum = None
        if intent:
            try:
                intent_enum = IntentType(intent)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid intent type"
                )
        
        messages = await chat_service.search_messages(
            keyword=keyword,
            intent=intent_enum,
            customer_id=customer_id,
            date_from=date_from,
            date_to=date_to,
            limit=limit
        )
        
        return messages
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search messages: {str(e)}"
        )

@router.get("/uncategorized", response_model=List[dict])
async def get_uncategorized_messages(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get messages that haven't been classified yet"""
    try:
        chat_service = ChatService()
        messages = await chat_service.get_uncategorized_messages(limit)
        return messages
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get uncategorized messages: {str(e)}"
        )

@router.put("/messages/{message_id}/intent")
async def update_message_intent(
    message_id: str,
    intent: str,
    confidence: Optional[float] = None,
    current_user: dict = Depends(get_current_user)
):
    """Update the intent classification of a message"""
    try:
        from models.schemas import IntentType
        chat_service = ChatService()
        
        try:
            intent_enum = IntentType(intent)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid intent type"
            )
        
        success = await chat_service.update_message_intent(message_id, intent_enum, confidence)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )
        
        return {"message": "Intent updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update message intent: {str(e)}"
        ) 