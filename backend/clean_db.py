import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
from services.chat_service import ChatService, get_chat_service
from services.ai_service import AIService, get_ai_service
from database.connection import get_database

async def clean_database():
    """
    Connects to the MongoDB database and drops the chat_rooms and messages collections.
    """
    # Construct the path to the .env file in the project root
    dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    load_dotenv(dotenv_path=dotenv_path)
    
    mongo_uri = os.getenv("MONGO_URI")
    db_name = os.getenv("DB_NAME")
    
    if not mongo_uri or not db_name:
        print("Error: MONGO_URI or DB_NAME not found in environment variables.")
        print("Please check your .env file in the root directory.")
        return

    print(f"Connecting to MongoDB at {mongo_uri}...")
    client = AsyncIOMotorClient(mongo_uri)
    db = client[db_name]
    print(f"Successfully connected to database '{db_name}'.")

    collections_to_drop = ["chat_rooms", "messages", "users"]
    
    for collection_name in collections_to_drop:
        try:
            print(f"Dropping collection '{collection_name}'...")
            await db.drop_collection(collection_name)
            print(f"Collection '{collection_name}' dropped successfully.")
        except Exception as e:
            # It's okay if the collection doesn't exist.
            if "ns not found" in str(e):
                print(f"Collection '{collection_name}' does not exist, skipping.")
            else:
                print(f"An error occurred while dropping collection '{collection_name}': {e}")
    
    print("\nDatabase cleaning process complete.")
    client.close()

async def classify_intent_for_old_messages():
    db = get_database()
    chat_service = ChatService(db)
    ai_service = AIService()
    print('Scanning for customer messages without intent...')
    cursor = db['messages'].find({
        'user_type': 'customer',
        '$or': [
            {'intent': {'$exists': False}},
            {'intent': None}
        ]
    })
    count = 0
    async for msg in cursor:
        msg_id = str(msg['_id'])
        content = msg['content']
        intent, confidence = ai_service.classify_intent(content)
        # Luôn lưu intent và confidence, không kiểm tra ngưỡng
        await chat_service.update_message_intent(msg_id, intent, confidence)
        print(f'Updated message {msg_id} with intent {intent} (conf={confidence:.2f})')
        count += 1
    print(f'Done. Updated {count} messages.')

if __name__ == "__main__":
    asyncio.run(clean_database())
    asyncio.run(classify_intent_for_old_messages()) 