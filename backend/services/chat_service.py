from database.connection import get_database
from bson.objectid import ObjectId
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from models.schemas import Message, ChatRoom, UserType, IntentType
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import PyMongoError
import logging

_chat_service_instance = None

class ChatService:
    def __init__(self, db: AsyncIOMotorDatabase):
        if db is None:
            raise ValueError("Database instance is required for ChatService.")
        self.db = db
        self.chat_rooms = db["chat_rooms"]
        self.messages = db["messages"]
        self.users = db["users"]

    def _serialize_message(self, message: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Recursively serializes a message dictionary, converting ObjectId and datetime.
        """
        if not message:
            return None

        serialized = {}
        for key, value in message.items():
            if isinstance(value, ObjectId):
                serialized[key] = str(value)
            elif isinstance(value, datetime):
                serialized[key] = value.isoformat()
            elif isinstance(value, dict):
                # Recursively serialize nested dictionaries, e.g., reply_to_message
                serialized[key] = self._serialize_message(value)
            elif isinstance(value, list):
                # Handle lists of dictionaries if necessary (e.g., suggestions)
                serialized[key] = [self._serialize_message(item) if isinstance(item, dict) else item for item in value]
            else:
                serialized[key] = value
        
        # Ensure critical IDs are present and are strings
        if "_id" in serialized:
            serialized["_id"] = str(serialized["_id"])
        if "user_id" in serialized:
            serialized["user_id"] = str(serialized.get("user_id"))

        return serialized

    def _serialize_room(self, room: Optional[dict]) -> Optional[dict]:
        if not room:
            return None
        
        # Ensure all necessary keys have default values for consistency
        serialized = {
            "_id": str(room["_id"]),
            "customer_id": room.get("customer_id"),
            "customer_name": room.get("customer_name"),
            "admin_id": room.get("admin_id"),
            "status": room.get("status", "unknown"),
            "created_at": room.get("created_at"),
            "closed_at": room.get("closed_at"),
            "last_message": room.get("last_message"),
            "last_message_at": room.get("last_message_at"),
            "message_count": room.get("message_count", 0),
            "satisfaction_rating": room.get("satisfaction_rating"),
            "dominant_intent": room.get("dominant_intent"),
            "ai_usage_percentage": room.get("ai_usage_percentage", 0)
        }
        return serialized

    async def create_room(self, customer_id: str, customer_name: str) -> (Dict[str, Any], bool):
        """
        Finds an existing room or creates a new one.
        Always fetches the latest user name and updates the room if necessary.
        Returns a tuple: (room_data, created_bool)
        """
        created = False
        
        # Try to get full name from users collection first
        final_customer_name = customer_name
        try:
            user_doc = await self.users.find_one({"_id": ObjectId(customer_id)})
            if user_doc and user_doc.get("name"):
                final_customer_name = user_doc["name"]
        except Exception:
            pass # Non-ObjectId, use name from request

        room = await self.chat_rooms.find_one({"_id": customer_id})
        
        if room:
            # Room exists, check if name needs updating
            if room.get("customer_name") != final_customer_name:
                await self.chat_rooms.update_one(
                    {"_id": customer_id},
                    {"$set": {"customer_name": final_customer_name}}
                )
                room["customer_name"] = final_customer_name
        else:
            # Room does not exist, create it
            created = True
            now = datetime.utcnow()
            room = {
                "_id": customer_id,
                "customer_id": customer_id,
                "customer_name": final_customer_name,
                "status": "active",
                "created_at": now,
                "last_message": None,
                "last_message_at": None
            }
            await self.chat_rooms.insert_one(room)

        return room, created

    async def get_room_by_id(self, room_id: str) -> Optional[Dict[str, Any]]:
        room = await self.db.chat_rooms.find_one({"_id": ObjectId(room_id)})
        return self._serialize_room(room) if room else None

    async def get_active_rooms(self) -> List[Dict[str, Any]]:
        rooms = []
        # Sort by last_message_at descending to get the most recent chats first
        async for room in self.chat_rooms.find({"status": "active"}).sort("last_message_at", -1):
            room["_id"] = str(room["_id"])
            display_name = room.get("customer_name")
            customer_id = room.get("customer_id")
            if customer_id:
                try:
                    user_doc = await self.users.find_one({"_id": ObjectId(customer_id)})
                    if user_doc and user_doc.get("name"):
                        display_name = user_doc.get("name")
                except Exception:
                    pass
            room["customer_name"] = display_name or f"User {str(room['_id'])[-6:]}"
            # Serialize last_message if it's an object
            if isinstance(room.get("last_message"), dict):
                last_msg = room["last_message"]
                if last_msg.get("_id"):
                    last_msg["_id"] = str(last_msg["_id"])
                if last_msg.get("user_id"):
                    last_msg["user_id"] = str(last_msg["user_id"])
                if last_msg.get("created_at") and isinstance(last_msg["created_at"], datetime):
                    last_msg["created_at"] = last_msg["created_at"].isoformat()
            # --- Bổ sung unread_count cho admin ---
            admin_last_read_at = room.get("admin_last_read_at")
            query = {"room_id": room["_id"], "user_type": "customer"}  # Chỉ tính tin nhắn của customer
            if admin_last_read_at:
                query["created_at"] = {"$gt": admin_last_read_at}
            unread_count = await self.messages.count_documents(query)
            room["unread_count"] = unread_count
            rooms.append(room)
        return rooms

    async def save_message(self, room_id: str, user_id: str, user_type: str, content: str, reply_to_message_id: str = None) -> Optional[Dict[str, Any]]:
        now = datetime.utcnow()
        
        # 1. Prepare the message document for insertion
        new_message_data = {
            "room_id": room_id,
            "user_id": user_id,
            "user_type": user_type,
            "content": content,
            "created_at": now
        }
        if reply_to_message_id:
            new_message_data["reply_to_message_id"] = reply_to_message_id

        # 2. Insert the new message
        result = await self.messages.insert_one(new_message_data)
        inserted_id = result.inserted_id
        
        # 3. Fetch the newly inserted message (now it's a dict)
        final_msg = await self.messages.find_one({"_id": inserted_id})

        # 4. If it's a reply, populate the `reply_to_message` field
        if reply_to_message_id:
            try:
                # Use ObjectId directly for the query
                replied_to_message = await self.messages.find_one({"_id": ObjectId(reply_to_message_id)})
                if replied_to_message:
                    # Just attach the raw document. Serialization will handle it.
                    final_msg["reply_to_message"] = replied_to_message
            except Exception as e:
                print(f"Error populating replied-to message {reply_to_message_id}: {e}")

        # 5. Update the room's last message with a serialized version of the message
        # We serialize here to ensure the last_message stored in the room is clean
        serialized_for_room = self._serialize_message(final_msg.copy())
        await self.update_room_last_message(room_id, serialized_for_room)

        # 6. Return the fully serialized message for socket emission
        return self._serialize_message(final_msg)

    async def get_messages_by_room_id(self, room_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        messages = []
        cursor = self.messages.find({"room_id": room_id}).sort("created_at", 1).limit(limit)
        async for msg in cursor:
            # Populate reply_to_message if this message is a reply
            if msg.get("reply_to_message_id"):
                try:
                    replied_to_message = await self.messages.find_one({"_id": ObjectId(msg["reply_to_message_id"])})
                    if replied_to_message:
                        msg["reply_to_message"] = replied_to_message
                except Exception as e:
                    print(f"Error populating replied-to message {msg.get('reply_to_message_id')}: {e}")
            
            # The full serialization is now needed here as well
            messages.append(self._serialize_message(msg))
        return messages

    async def update_room_last_message(self, room_id: str, message: Dict[str, Any]):
        await self.chat_rooms.update_one(
            {"_id": room_id}, 
            {"$set": {
                "last_message": message, 
                "last_message_at": message["created_at"]
            }}
        )

    async def close_chat_room(self, room_id: str):
        await self.chat_rooms.update_one({"_id": room_id}, {"$set": {"status": "closed"}})

    async def get_chat_room(self, room_id: str) -> Optional[Dict[str, Any]]:
        """Get chat room by room_id (string)"""
        try:
            room = await self.chat_rooms.find_one({"_id": room_id})
            if room:
                room["_id"] = str(room["_id"])
                return room
            return None
        except:
            # Try finding by customer_id if room_id is not a valid ObjectId
            room = await self.chat_rooms.find_one({"customer_id": room_id})
            if room:
                room["_id"] = str(room["_id"])
                return room
            return None

    async def get_active_chat_rooms(self) -> List[Dict[str, Any]]:
        """Get all active chat rooms, trả về đúng format cho frontend"""
        cursor = self.chat_rooms.find({"status": "active"})
        rooms = []
        name_count = {}
        async for room in cursor:
            # Ưu tiên customer_name, rồi name, rồi username, rồi customer_id
            name = room.get("customer_name") or room.get("name") or room.get("username") or room.get("customer_id")
            # Đếm số lần xuất hiện để thêm số nếu trùng
            if name in name_count:
                name_count[name] += 1
                display_name = f"{name} ({name_count[name]})"
            else:
                name_count[name] = 1
                display_name = name
            rooms.append({
                "customerId": room.get("_id"),
                "customerName": display_name,
                "status": room.get("status", "active"),
            })
        return rooms

    async def get_messages(self, room_id: str, limit: int = 50, skip: int = 0) -> List[Dict[str, Any]]:
        """Get messages for a specific room, finding the room first."""
        room = await self.get_room_by_id(room_id)
        if not room:
            print(f"[CHAT_SERVICE] Room not found for ID: {room_id}, cannot fetch messages.")
            return []

        print(f"[CHAT_SERVICE] Fetching messages from DB for room_id: {room_id}")
        cursor = self.messages.find({"room_id": room_id})
        cursor = cursor.sort("timestamp", 1).skip(skip).limit(limit)
        
        messages = []
        async for message in cursor:
            message["_id"] = str(message["_id"])
            messages.append(message)
        
        print(f"[CHAT_SERVICE] Messages fetched: {messages}")
        return messages

    async def search_messages(self, keyword: str = None, intent: IntentType = None, 
                            customer_id: str = None, date_from: datetime = None, 
                            date_to: datetime = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Search messages with filters"""
        query = {}
        
        if keyword:
            query["content"] = {"$regex": keyword, "$options": "i"}
        
        if intent:
            query["intent"] = intent.value
        
        if customer_id:
            # First get room IDs for this customer
            rooms = await self.chat_rooms.find({"customer_id": customer_id})
            room_ids = [str(room["_id"]) async for room in rooms]
            query["room_id"] = {"$in": room_ids}
        
        if date_from or date_to:
            date_query = {}
            if date_from:
                date_query["$gte"] = date_from
            if date_to:
                date_query["$lte"] = date_to
            query["timestamp"] = date_query
        
        cursor = self.messages.find(query)
        cursor = cursor.sort("timestamp", -1).limit(limit)
        
        messages = []
        async for message in cursor:
            message["id"] = str(message["_id"])
            message.pop("_id")
            messages.append(message)
        
        return messages

    async def update_message_intent(self, message_id: str, intent: str, confidence: float) -> bool:
        """Update message intent classification. Accepts intent as a string."""
        result = await self.messages.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": {"intent": intent, "intent_confidence": confidence}}
        )
        return result.modified_count > 0

    async def add_suggestion_to_message(self, message_id: str, suggestion_doc: Dict[str, Any]):
        """
        Adds a new suggestion to a message, replacing any existing suggestion of the same style.
        This method is not atomic but is more explicit.
        """
        # 1. Fetch the message
        message = await self.messages.find_one({"_id": ObjectId(message_id)})
        if not message:
            logging.error(f"Cannot add suggestion. Message with ID {message_id} not found.")
            return

        # 2. Manipulate the suggestions array in Python
        current_suggestions = message.get("suggestions", [])
        
        # Filter out any existing suggestion with the same style
        new_suggestions = [s for s in current_suggestions if s.get("style") != suggestion_doc["style"]]
        
        # Add the new suggestion
        new_suggestions.append(suggestion_doc)
        
        # 3. Update the message with the new suggestions array
        await self.messages.update_one(
            {"_id": ObjectId(message_id)},
            {"$set": {"suggestions": new_suggestions}}
        )

    async def remove_suggestion_from_message(self, message_id: str, suggestion_id: str) -> bool:
        """
        Removes a specific suggestion from a message's suggestions array using its creation date as a unique ID.
        """
        try:
            # MongoDB stores ISO date strings as datetime objects
            suggestion_dt_obj = datetime.fromisoformat(suggestion_id.replace('Z', '+00:00'))
            
            result = await self.messages.update_one(
                {"_id": ObjectId(message_id)},
                {"$pull": {"suggestions": {"created_at": suggestion_dt_obj}}}
            )
            return result.modified_count > 0
        except Exception as e:
            logging.error(f"Error removing suggestion {suggestion_id} from message {message_id}: {e}")
            return False

    async def get_uncategorized_messages(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch messages that do not have an intent classified yet."""
        query = {"intent": {"$exists": False}}
        cursor = self.messages.find(query)
        cursor = cursor.sort("timestamp", -1).limit(limit)
        
        messages = []
        async for message in cursor:
            message["id"] = str(message["_id"])
            message.pop("_id")
            messages.append(message)
        
        return messages

    async def get_chat_statistics(self, room_id: str) -> Dict[str, Any]:
        """Get statistics for a specific chat room"""
        # Get message count
        message_count = await self.messages.count_documents({"room_id": room_id})
        
        # Get intent distribution
        pipeline = [
            {"$match": {"room_id": room_id, "intent": {"$ne": None}}},
            {"$group": {"_id": "$intent", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        
        intent_stats = []
        async for stat in self.messages.aggregate(pipeline):
            intent_stats.append({
                "intent": stat["_id"],
                "count": stat["count"],
                "percentage": (stat["count"] / message_count * 100) if message_count > 0 else 0
            })
        
        # Get AI usage
        ai_messages = await self.messages.count_documents({
            "room_id": room_id,
            "is_ai_generated": True
        })
        
        return {
            "message_count": message_count,
            "intent_distribution": intent_stats,
            "ai_usage_count": ai_messages,
            "ai_usage_percentage": (ai_messages / message_count * 100) if message_count > 0 else 0
        }

    async def update_ai_analysis(self, message_id: str, ai_analysis: dict):
        """Update ai_analysis and push to ai_analysis_history"""
        await self.messages.update_one(
            {"_id": ObjectId(message_id)},
            {
                "$set": {"ai_analysis": ai_analysis},
                "$push": {"ai_analysis_history": ai_analysis}
            }
        )

    async def get_all_rooms(self) -> List[Dict[str, Any]]:
        """Fetches all chat rooms from the database."""
        rooms_cursor = self.db.chat_rooms.find({})
        rooms = await rooms_cursor.to_list(length=None) # Get all documents
        return [self._serialize_room(room) for room in rooms]

    async def update_room_status(self, room_id: str, status: str) -> bool:
        result = await self.db.chat_rooms.update_one(
            {"_id": ObjectId(room_id)},
            {"$set": {"status": status}}
        )
        return result.modified_count > 0

    async def delete_rooms_and_messages_by_customer_id(self, customer_id: str) -> int:
        """Xóa toàn bộ room và message liên quan đến customer_id"""
        # Xóa room
        delete_rooms_result = await self.chat_rooms.delete_many({"customer_id": customer_id})
        # Lấy danh sách room_id vừa xóa
        deleted_room_ids = [room["_id"] async for room in self.chat_rooms.find({"customer_id": customer_id})]
        # Xóa message liên quan đến các room_id này
        delete_messages_result = await self.messages.delete_many({"room_id": {"$in": [customer_id]}})
        # Ngoài ra, xóa message có user_id là customer_id (nếu có)
        await self.messages.delete_many({"user_id": customer_id})
        return delete_rooms_result.deleted_count + delete_messages_result.deleted_count 

    async def get_message_by_id(self, message_id: str) -> Optional[Dict[str, Any]]:
        """Get a message by its ID"""
        try:
            message = await self.messages.find_one({"_id": ObjectId(message_id)})
            if message:
                message["_id"] = str(message["_id"])
            return message
        except Exception as e:
            print(f"[CHAT_SERVICE] Error getting message by ID {message_id}: {e}")
            return None

    async def mark_room_as_read_by_admin(self, room_id: str):
        now = datetime.utcnow()
        await self.chat_rooms.update_one({"_id": room_id}, {"$set": {"admin_last_read_at": now}})

    async def get_last_seen_message_by_customer(self, room_id: str) -> Optional[Dict[str, Any]]:
        """Trả về message cuối cùng của customer mà admin đã đọc (dựa vào admin_last_read_at)."""
        room = await self.chat_rooms.find_one({"_id": room_id})
        if not room:
            return None
        admin_last_read_at = room.get("admin_last_read_at")
        if not admin_last_read_at:
            return None
        # Tìm message customer gần nhất trước hoặc bằng admin_last_read_at
        msg = await self.messages.find_one(
            {"room_id": room_id, "user_type": "customer", "created_at": {"$lte": admin_last_read_at}},
            sort=[("created_at", -1)]
        )
        if not msg:
            return None
        return {"user_id": msg.get("user_id"), "user_type": msg.get("user_type"), "last_message_id": str(msg["_id"])}

# --- Singleton instance provider ---
def get_chat_service() -> "ChatService":
    """
    Provides a singleton instance of the ChatService.
    """
    global _chat_service_instance
    if _chat_service_instance is None:
        db = get_database()
        if db is None:
            # This might happen if called before the app has fully started up.
            # Depending on the use case, you might want to handle this differently.
            raise RuntimeError("Database connection not available. Cannot initialize ChatService.")
        _chat_service_instance = ChatService(db)
    return _chat_service_instance 