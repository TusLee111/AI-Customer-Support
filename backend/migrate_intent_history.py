import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "ai_customer_support"  # Đổi tên nếu DB khác

async def migrate():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    messages = db["messages"]
    intent_history = db["intent_history"]

    count = 0
    async for msg in messages.find({"intent": {"$ne": None}}):
        # Check if already migrated
        exists = await intent_history.find_one({
            "message_id": msg["_id"],
            "intent": msg["intent"]
        })
        if exists:
            continue
        doc = {
            "message_id": msg["_id"],
            "room_id": msg["room_id"],
            "intent": msg["intent"],
            "confidence": msg.get("intent_confidence", 0),
            "classified_by": "ai",  # Có thể bổ sung user nếu có
            "created_at": msg.get("created_at", datetime.utcnow()),
            "note": None
        }
        await intent_history.insert_one(doc)
        count += 1
    print(f"Migrated {count} intent records.")
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate()) 