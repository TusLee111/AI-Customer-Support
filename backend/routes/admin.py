from fastapi import APIRouter, HTTPException, Depends, status, Body, Path
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse

from models.schemas import AdminDashboard, SystemConfig, UserType, User, UserUpdate, IntentHistory
from services.chat_service import get_chat_service, ChatService
from services.ai_service import AIService, IntentHistoryService
from routes.auth import get_current_user, get_current_admin_user
from database.connection import get_analytics_collection, get_system_config_collection, get_database, get_users_collection
from services.token_service import verify_admin_access

router = APIRouter()

@router.get("/dashboard", response_model=AdminDashboard, dependencies=[Depends(verify_admin_access)])
async def get_dashboard(chat_service: ChatService = Depends(get_chat_service)):
    # Lấy tổng số room
    total_chats = await chat_service.chat_rooms.count_documents({})
    # Lấy số room đang active
    active_chats = await chat_service.chat_rooms.count_documents({"status": "active"})
    # Lấy số room đã resolved/closed
    resolved_chats = await chat_service.chat_rooms.count_documents({"status": {"$in": ["resolved", "closed"]}})
    # Tính avg response time (phút)
    pipeline = [
        {"$match": {"user_type": {"$in": ["admin", "customer"]}}},
        {"$sort": {"room_id": 1, "created_at": 1}},
        {"$group": {
            "_id": "$room_id",
            "messages": {"$push": {"user_type": "$user_type", "created_at": "$created_at"}}
        }}
    ]
    response_times = []
    async for room in chat_service.messages.aggregate(pipeline):
        msgs = room["messages"]
        for i in range(1, len(msgs)):
            if msgs[i]["user_type"] == "admin" and msgs[i-1]["user_type"] == "customer":
                t1 = msgs[i-1]["created_at"]
                t2 = msgs[i]["created_at"]
                if t1 and t2:
                    diff = (t2 - t1).total_seconds() / 60
                    if 0 < diff < 120:
                        response_times.append(diff)
    avg_response_time = round(sum(response_times)/len(response_times), 1) if response_times else 0
    # Satisfaction rate: trung bình satisfaction_rating các room (nếu có)
    cursor = chat_service.chat_rooms.find({"satisfaction_rating": {"$exists": True}})
    ratings = []
    async for room in cursor:
        if room.get("satisfaction_rating") is not None:
            ratings.append(room["satisfaction_rating"])
    satisfaction_rate = round(sum(ratings)/len(ratings), 1) if ratings else 0
    return AdminDashboard(
        totalChats=total_chats,
        activeChats=active_chats,
        resolvedChats=resolved_chats,
        avgResponseTime=avg_response_time,
        satisfactionRate=satisfaction_rate
    )

@router.get("/rooms/customers", response_model=List[dict])
async def get_customers(current_user: dict = Depends(verify_admin_access), chat_service: ChatService = Depends(get_chat_service)):
    """Get list of all customers with their chat statistics"""
    try:
        rooms = await chat_service.get_active_chat_rooms()
        customers = []
        
        for room in rooms:
            # Get customer statistics
            stats = await chat_service.get_chat_statistics(room["_id"])
            
            customer_info = {
                "customer_id": room["customer_id"],
                "customer_name": room["customer_name"],
                "room_id": room["_id"],
                "message_count": stats["message_count"],
                "last_activity": room.get("last_message_at"),
                "status": room["status"],
                "ai_usage_percentage": stats["ai_usage_percentage"]
            }
            customers.append(customer_info)
        
        return customers
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get customers: {str(e)}"
        )

@router.get("/rooms/intent-statistics", response_model=List[dict])
async def get_intent_statistics(
    days: int = 7,
    current_user: dict = Depends(verify_admin_access),
    chat_service: ChatService = Depends(get_chat_service)
):
    """Get intent classification statistics"""
    try:
        from models.schemas import IntentType
        
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Aggregate intent statistics
        pipeline = [
            {
                "$match": {
                    "created_at": {"$gte": start_date, "$lte": end_date},
                    "intent": {"$ne": None}
                }
            },
            {
                "$group": {
                    "_id": "$intent",
                    "count": {"$sum": 1}
                }
            },
            {
                "$sort": {"count": -1}
            }
        ]
        
        messages_collection = chat_service.messages
        intent_stats = []
        
        # Get total messages in the period for percentage calculation
        total_messages = await messages_collection.count_documents({
            "created_at": {"$gte": start_date, "$lte": end_date},
            "intent": {"$ne": None}
        })

        async for stat in messages_collection.aggregate(pipeline):
            intent_stats.append({
                "intent": stat["_id"],
                "count": stat["count"],
                "percentage": (stat["count"] / total_messages * 100) if total_messages > 0 else 0
            })
        
        return intent_stats
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get intent statistics: {str(e)}"
        )

@router.get("/system-config", response_model=SystemConfig)
async def get_system_config(current_user: dict = Depends(verify_admin_access), db: AsyncIOMotorDatabase = Depends(get_database)):
    """Get current system configuration"""
    try:
        config_collection = db["system_config"]
        config = await config_collection.find_one({"type": "main"})
        
        if not config:
            return SystemConfig()
        
        return SystemConfig(**config)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get system configuration: {str(e)}"
        )

@router.put("/system-config", response_model=SystemConfig)
async def update_system_config(
    config: SystemConfig,
    current_user: dict = Depends(verify_admin_access),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update system configuration"""
    try:
        config_collection = db["system_config"]
        
        config_data = config.model_dump()
        config_data["type"] = "main"
        config_data["updated_at"] = datetime.utcnow()
        config_data["updated_by"] = current_user["_id"]
        
        await config_collection.update_one(
            {"type": "main"},
            {"$set": config_data},
            upsert=True
        )
        
        return config
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update system configuration: {str(e)}"
        )

@router.get("/ai-performance", response_model=dict)
async def get_ai_performance(
    days: int = 7,
    current_user: dict = Depends(verify_admin_access),
    chat_service: ChatService = Depends(get_chat_service)
):
    """Get AI model performance metrics"""
    try:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        messages_collection = chat_service.messages
        
        total_messages = await messages_collection.count_documents({
            "created_at": {"$gte": start_date, "$lte": end_date}
        })
        
        ai_messages = await messages_collection.count_documents({
            "created_at": {"$gte": start_date, "$lte": end_date},
            "is_ai_generated": True
        })
        
        intent_accuracy = 85.5
        
        return {
            "total_messages": total_messages,
            "ai_generated_messages": ai_messages,
            "ai_usage_rate": (ai_messages / total_messages * 100) if total_messages > 0 else 0,
            "intent_accuracy": intent_accuracy,
            "avg_response_time": 1.2,
            "confidence_threshold": 0.7
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get AI performance: {str(e)}"
        )

@router.post("/rooms/export-data")
async def export_chat_data(
    room_id: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    current_user: dict = Depends(verify_admin_access),
    chat_service: ChatService = Depends(get_chat_service)
):
    """Export chat data to CSV or JSON"""
    try:
        # Build query
        query = {}
        if room_id:
            query["room_id"] = room_id
        if date_from or date_to:
            date_query = {}
            if date_from:
                date_query["$gte"] = date_from
            if date_to:
                date_query["$lte"] = date_to
            query["timestamp"] = date_query
        
        # Get messages
        messages_collection = chat_service.messages_collection
        cursor = messages_collection.find(query).sort("timestamp", 1)
        
        messages = []
        async for message in cursor:
            message["id"] = str(message["_id"])
            message.pop("_id")
            messages.append(message)
        
        return {
            "export_date": datetime.utcnow(),
            "total_messages": len(messages),
            "date_range": {
                "from": date_from,
                "to": date_to
            },
            "messages": messages
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export data: {str(e)}"
        )


# Routes that were in rooms_router
@router.get("/rooms/active")
async def get_active_rooms_admin(chat_service: ChatService = Depends(get_chat_service), user=Depends(get_current_admin_user)):
    """
    Lấy danh sách các phòng chat đang hoạt động, trả về các trường cần thiết cho chatlog.
    """
    try:
        rooms = await chat_service.get_active_rooms()
        result = []
        for room in rooms:
            stats = await chat_service.get_chat_statistics(room["_id"])
            result.append({
                "customer_id": room["customer_id"],
                "customer_name": room.get("customer_name", "N/A"),
                "room_id": room["_id"],
                "created_at": room.get("created_at"),
                "status": room.get("status", "unknown"),
                "message_count": stats["message_count"],
                "last_message": room.get("last_message"),
                "last_message_at": room.get("last_message_at"),
                "unread_count": room.get("unread_count", 0)
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get active rooms: {str(e)}")

@router.get("/rooms/{room_id}/messages")
async def get_messages(room_id: str, chat_service: ChatService = Depends(get_chat_service), user=Depends(get_current_admin_user)):
    messages = await chat_service.get_messages_by_room_id(room_id)
    if messages is None:
        raise HTTPException(status_code=404, detail="Messages not found for this room.")
    return messages

@router.get("/rooms/{room_id}/customer-messages")
async def get_customer_messages(room_id: str = Path(...), db = Depends(get_database)):
    chat_service = ChatService(db)
    cursor = db['messages'].find({
        'room_id': room_id,
        'user_type': 'customer',
        'is_deleted': { '$ne': True }
    }).sort('timestamp', 1)
    messages = []
    async for msg in cursor:
        msg['_id'] = str(msg['_id'])
        messages.append({
            'id': msg['_id'],
            'content': msg['content'],
            'intent': msg.get('intent'),
            'intent_confidence': msg.get('intent_confidence'),
            'timestamp': msg.get('created_at')
        })
    return messages

# User management routes
@router.get("/users")
async def get_all_customers(current_user: dict = Depends(verify_admin_access), db: AsyncIOMotorDatabase = Depends(get_database)):
    users_collection = db["users"]
    cursor = users_collection.find({"user_type": "customer"})
    users_list = await cursor.to_list(length=None)
    
    # Manually construct the response to ensure the correct format (_id -> id)
    response_data = []
    for user in users_list:
        response_data.append({
            "id": str(user["_id"]),
            "username": user.get("username"),
            "email": user.get("email"),
            "name": user.get("name"),
            "phone": user.get("phone"),
            "user_type": user.get("user_type"),
            "created_at": user.get("created_at"),
        })
        
    return response_data

@router.get("/users/{user_id}", response_model=User)
async def get_customer_detail(user_id: str, current_user: dict = Depends(verify_admin_access), db: AsyncIOMotorDatabase = Depends(get_database)):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    user_from_db = await db["users"].find_one({"_id": ObjectId(user_id), "user_type": "customer"})
    
    if user_from_db:
        # Convert ObjectId to string before validation
        user_from_db["id"] = str(user_from_db["_id"])
        del user_from_db["_id"]
        return User.model_validate(user_from_db)
        
    raise HTTPException(status_code=404, detail="Customer not found")

@router.put("/users/{user_id}")
async def update_customer(user_id: str, data: UserUpdate, current_user: dict = Depends(verify_admin_access), db: AsyncIOMotorDatabase = Depends(get_database)):
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    update_data = data.model_dump(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")

    result = await db["users"].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    updated_user = await db["users"].find_one({"_id": ObjectId(user_id)})
    
    # Manually format the response to ensure 'id' is present
    return {
        "id": str(updated_user["_id"]),
        "username": updated_user.get("username"),
        "email": updated_user.get("email"),
        "name": updated_user.get("name"),
        "phone": updated_user.get("phone"),
        "user_type": updated_user.get("user_type"),
        "created_at": updated_user.get("created_at"),
    }

@router.delete("/users/{user_id}")
async def delete_customer(user_id: str, current_user: dict = Depends(verify_admin_access), db: AsyncIOMotorDatabase = Depends(get_database)):
    """
    Xóa user và toàn bộ room, message liên quan đến user đó.
    """
    try:
        chat_service = ChatService(db)
        # Xóa user
        await db["users"].delete_one({"_id": ObjectId(user_id)})
        # Xóa room và message liên quan
        await chat_service.delete_rooms_and_messages_by_customer_id(user_id)
        return {"message": "User and related chat data deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete user and related data: {str(e)}")

@router.delete("/rooms/messages/{message_id}", response_model=dict)
async def delete_message(message_id: str, db = Depends(get_database), user=Depends(get_current_admin_user)):
    # Chỉ set is_deleted=True thay vì xóa thật
    result = await db["messages"].update_one({"_id": ObjectId(message_id)}, {"$set": {"is_deleted": True}})
    if result.modified_count == 1:
        return {"success": True}
    else:
        raise HTTPException(status_code=404, detail="Message not found")

@router.post("/rooms/{room_id}/messages/{message_id}/intent", response_model=dict)
async def add_intent_history(
    room_id: str,
    message_id: str,
    intent: str = Body(...),
    confidence: float = Body(...),
    classified_by: str = Body(...),
    note: str = Body(None),
    db = Depends(get_database),
    user=Depends(get_current_admin_user)
):
    service = IntentHistoryService(db)
    intent_id = await service.add_intent(message_id, room_id, intent, confidence, classified_by, note)
    return {"success": True, "intent_id": intent_id}

@router.get("/rooms/{room_id}/intent-history", response_model=List[IntentHistory])
async def get_intent_history_by_room(room_id: str, db = Depends(get_database), user=Depends(get_current_admin_user)):
    service = IntentHistoryService(db)
    return await service.get_intents_by_room(room_id)

@router.get("/messages/{message_id}/intent-history", response_model=List[IntentHistory])
async def get_intent_history_by_message(message_id: str, db = Depends(get_database), user=Depends(get_current_admin_user)):
    service = IntentHistoryService(db)
    return await service.get_intents_by_message(message_id)

@router.delete("/intent-history/{intent_id}", response_model=dict)
async def delete_intent_history(intent_id: str, db = Depends(get_database), user=Depends(get_current_admin_user)):
    service = IntentHistoryService(db)
    ok = await service.delete_intent(intent_id)
    if ok:
        return {"success": True}
    else:
        raise HTTPException(status_code=404, detail="Intent history not found")

@router.put("/intent-history/{intent_id}", response_model=dict)
async def update_intent_history(intent_id: str, update_fields: dict = Body(...), db = Depends(get_database), user=Depends(get_current_admin_user)):
    service = IntentHistoryService(db)
    ok = await service.update_intent(intent_id, update_fields)
    if ok:
        return {"success": True}
    else:
        raise HTTPException(status_code=404, detail="Intent history not found")

@router.post("/messages/{message_id}/classify-intent", response_model=dict)
async def classify_intent_for_message(message_id: str, db = Depends(get_database), user=Depends(get_current_admin_user)):
    # Lấy content message gốc
    msg = await db["messages"].find_one({"_id": ObjectId(message_id)})
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    content = msg["content"]
    ai_service = AIService()
    intent, confidence = ai_service.classify_intent(content)
    return {"intent": intent, "confidence": confidence}

@router.post("/rooms/{room_id}/mark-read")
async def mark_room_as_read(room_id: str, chat_service: ChatService = Depends(get_chat_service), user=Depends(get_current_admin_user)):
    """Admin đánh dấu đã đọc room này (cập nhật admin_last_read_at)."""
    await chat_service.mark_room_as_read_by_admin(room_id)
    return {"success": True}

@router.get("/rooms/{room_id}/last-seen")
async def get_last_seen_message(room_id: str, chat_service: ChatService = Depends(get_chat_service), user=Depends(get_current_admin_user)):
    """Trả về trạng thái last seen của admin cho phòng này."""
    result = await chat_service.get_last_seen_message_by_customer(room_id)
    if not result:
        return {"user_id": None, "user_type": "customer", "last_message_id": None}
    return result 