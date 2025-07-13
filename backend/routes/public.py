from fastapi import APIRouter, Depends, HTTPException
from database.connection import get_database
from services.chat_service import ChatService
from typing import List
from socketio_instance import sio
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/api/public/rooms", tags=["public-chat"])

def _to_json_serializable(item):
    """Recursively convert BSON types to JSON-serializable types."""
    if isinstance(item, dict):
        return {key: _to_json_serializable(value) for key, value in item.items()}
    if isinstance(item, list):
        return [_to_json_serializable(value) for value in item]
    if isinstance(item, ObjectId):
        return str(item)
    if isinstance(item, datetime):
        return item.isoformat()
    return item

def get_chat_service():
    db = get_database()
    return ChatService(db)

@router.post("")
async def create_room(data: dict, chat_service: ChatService = Depends(get_chat_service)):
    customer_id = data.get("customer_id")
    customer_name = data.get("customer_name", customer_id)
    if not customer_id:
        raise HTTPException(status_code=400, detail="customer_id required")
    
    room, created = await chat_service.create_room(customer_id, customer_name)
    
    # Only emit the 'new_room' event if the room was actually created.
    if created:
        serializable_room = _to_json_serializable(room)
        await sio.emit("new_room", serializable_room, room="admin_room")

    return _to_json_serializable(room)

@router.get("/{room_id}/messages")
async def get_messages(room_id: str, chat_service: ChatService = Depends(get_chat_service)):
    messages = await chat_service.get_messages_by_room_id(room_id)
    return _to_json_serializable(messages)

@router.post("/{room_id}/messages")
async def send_message(room_id: str, data: dict, chat_service: ChatService = Depends(get_chat_service)):
    user_id = data.get("user_id")
    user_type = data.get("user_type")
    content = data.get("content")
    if not all([user_id, user_type, content]):
        raise HTTPException(status_code=400, detail="Missing fields")
    msg = await chat_service.save_message(room_id, user_id, user_type, content)
    return _to_json_serializable(msg)

public_router = router 