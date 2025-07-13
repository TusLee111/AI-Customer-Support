from fastapi import APIRouter, Depends, HTTPException, Request, Body, Query, Path
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
import sys

from services.ai_service import AIService, get_ai_service
from services.chat_service import ChatService, get_chat_service
from database.connection import get_database
from bson.objectid import ObjectId
import logging
from models.schemas import AISuggestionFeedback
from fastapi import status

router = APIRouter()

class SuggestionRequest(BaseModel):
    message_id: str
    generation_style: str # 'formal', 'friendly', 'simple'
    model_version: str = 'v1.00'

class SuggestionDeleteRequest(BaseModel):
    message_id: str = Field(..., description="The ID of the message containing the suggestion.")
    suggestion_id: str = Field(..., description="The unique ID (creation timestamp) of the suggestion to delete.")

@router.post("/suggest")
async def get_suggestion(
    request_data: SuggestionRequest,
    fastapi_request: Request,
    ai_service: AIService = Depends(get_ai_service),
    db = Depends(get_database)
):
    """
    Generates a reply suggestion for a given message and style,
    and stores the suggestion in the database.
    """
    try:
        # --- DEBUGGING: Log the incoming raw body ---
        body = await fastapi_request.json()
        logging.info(f"[/api/ai/suggest] Received request body: {body}")

        chat_service = ChatService(db)
        
        # 1. Get the original message content from the database
        message = await chat_service.get_message_by_id(request_data.message_id)
        if not message or 'content' not in message:
            raise HTTPException(status_code=404, detail=f"Message with ID {request_data.message_id} not found or has no content.")
        
        # 2. Generate the suggestion using the AI service
        suggestion_text = ai_service.generate_suggestion(message['content'], request_data.generation_style, model_version=request_data.model_version)

        # 3. Prepare the suggestion document to be saved
        suggestion_doc = {
            "style": request_data.generation_style,
            "text": suggestion_text,
            "created_at": datetime.utcnow(),
            "model_version": request_data.model_version
        }
        
        # 4. Save the suggestion to the message's 'suggestions' array in the DB
        await chat_service.add_suggestion_to_message(request_data.message_id, suggestion_doc)

        # 5. Fetch the updated message to get the full list of suggestions
        updated_message = await chat_service.get_message_by_id(request_data.message_id)
        if not updated_message:
             raise HTTPException(status_code=404, detail="Message not found after update.")

        # 6. Return the complete list of suggestions for that message
        return {"suggestions": updated_message.get("suggestions", [])}
        
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=f"AI Model not found: {e}")
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=f"AI Service not available: {e}")
    except Exception as e:
        logging.error(f"Error in /api/ai/suggest: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@router.delete("/suggest")
async def delete_suggestion_route(
    request: SuggestionDeleteRequest,
    chat_service: ChatService = Depends(get_chat_service)
):
    """
    Deletes a specific AI suggestion from a message.
    """
    try:
        success = await chat_service.remove_suggestion_from_message(request.message_id, request.suggestion_id)
        if not success:
            # This could mean the message or suggestion was not found
            raise HTTPException(status_code=404, detail="Suggestion or message not found.")

        # After deleting, fetch the updated message to get the current list of suggestions
        updated_message = await chat_service.get_message_by_id(request.message_id)
        if not updated_message:
             raise HTTPException(status_code=404, detail="Message not found after suggestion deletion.")

        return {"suggestions": updated_message.get("suggestions", [])}
    except HTTPException as e:
        # Re-raise HTTP exceptions to avoid them being caught by the generic 500 error
        raise e
    except Exception as e:
        logging.error(f"Error deleting suggestion: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error while deleting suggestion.")

@router.post("/feedback", status_code=status.HTTP_201_CREATED)
async def submit_ai_feedback(
    feedback: dict = Body(...),
    db = Depends(get_database)
):
    """
    Nhận feedback cho AI suggestion và lưu vào collection 'ai_feedback'.
    Mỗi lần đánh giá là 1 record mới.
    """
    try:
        feedback_doc = dict(feedback)
        # Lưu thêm trường style nếu có
        if 'style' not in feedback_doc and 'suggestion' in feedback_doc:
            feedback_doc['style'] = feedback_doc['suggestion'].get('style', None)
        elif 'style' not in feedback_doc and 'output' in feedback_doc:
            feedback_doc['style'] = feedback.get('style', None)
        # Thêm trường model_version nếu chưa có
        if 'model_version' not in feedback_doc or not feedback_doc['model_version']:
            if 'timestamp' in feedback_doc and feedback_doc['timestamp']:
                try:
                    ts = feedback_doc['timestamp']
                    if isinstance(ts, str):
                        ts_date = datetime.fromisoformat(ts.replace('Z', '+00:00')) if 'T' in ts else datetime.strptime(ts, '%Y-%m-%dT%H:%M:%S.%fZ')
                    else:
                        ts_date = ts
                    if ts_date >= datetime(2025, 7, 1):
                        feedback_doc['model_version'] = 'v1.01'
                    else:
                        feedback_doc['model_version'] = 'v1.00'
                except Exception:
                    feedback_doc['model_version'] = 'v1.00'
            else:
                feedback_doc['model_version'] = 'v1.00'
        print('[AI_FEEDBACK][POST] feedback_doc:', feedback_doc, file=sys.stderr)
        if 'room_id' in feedback_doc:
            feedback_doc['input_room_id'] = feedback_doc['room_id']
        result = await db["ai_feedback"].insert_one(feedback_doc)
        print('[AI_FEEDBACK][POST] Inserted ID:', result.inserted_id, file=sys.stderr)
        return {"message": "Feedback saved successfully"}
    except Exception as e:
        print('[AI_FEEDBACK][POST][ERROR]', str(e), file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Failed to save feedback: {str(e)}")

@router.get("/feedback")
async def get_ai_feedback(room_id: str = Query(None), user: str = Query(None), db = Depends(get_database)):
    """
    Lấy tất cả feedback AI theo room_id hoặc user (không limit chỉ 1).
    """
    try:
        query = {}
        if room_id:
            query["input_room_id"] = room_id
        if user:
            query["user"] = user
        print('[AI_FEEDBACK][GET] query:', query, file=sys.stderr)
        feedbacks = await db["ai_feedback"].find(query).to_list(length=500)
        print(f'[AI_FEEDBACK][GET] found {len(feedbacks)} records', file=sys.stderr)
        # Serialize ObjectId to string, loại bỏ trường user
        for fb in feedbacks:
            if '_id' in fb:
                fb['_id'] = str(fb['_id'])
            if 'user' in fb:
                del fb['user']
        return feedbacks
    except Exception as e:
        print('[AI_FEEDBACK][GET][ERROR]', str(e), file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Failed to get feedback: {str(e)}")

@router.delete("/feedback/{feedback_id}")
async def delete_ai_feedback(feedback_id: str = Path(...), db = Depends(get_database)):
    """
    Xóa 1 feedback theo _id.
    """
    try:
        result = await db["ai_feedback"].delete_one({"_id": ObjectId(feedback_id)})
        if result.deleted_count == 1:
            return {"message": "Feedback deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Feedback not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete feedback: {str(e)}") 