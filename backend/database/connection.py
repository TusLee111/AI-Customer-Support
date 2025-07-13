import motor.motor_asyncio
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection settings
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "ai_customer_support")

# Async client for FastAPI
client = None
database = None
is_connected = False

async def init_db():
    """Initialize database connection"""
    global client, database, is_connected
    try:
        client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
        database = client[DATABASE_NAME]
        
        # Test connection
        await client.admin.command('ping')
        print(f"✅ Connected to MongoDB: {DATABASE_NAME}")
        is_connected = True
        
        # Create indexes
        await create_indexes()
        
    except Exception as e:
        print(f"⚠️ Warning: Failed to connect to MongoDB: {e}")
        print("🔄 Running in mock mode - using in-memory data")
        is_connected = False
        # Don't raise exception, let the app continue with mock data

async def close_db():
    """Close database connection"""
    global client, is_connected
    if client and is_connected:
        client.close()
        print("🔌 MongoDB connection closed")
    is_connected = False

async def create_indexes():
    """Create database indexes for better performance"""
    if not is_connected:
        return
        
    try:
        # Messages collection indexes
        await database.messages.create_index("room_id")
        await database.messages.create_index("timestamp")
        await database.messages.create_index("user_type")
        await database.messages.create_index("intent")
        
        # Chat rooms collection indexes
        await database.chat_rooms.create_index("customer_id", unique=True)
        await database.chat_rooms.create_index("status")
        await database.chat_rooms.create_index("last_message_at")
        
        # Users collection indexes
        await database.users.create_index("username", unique=True)
        await database.users.create_index("email", unique=True)
        await database.users.create_index("user_type")
        
        # Analytics collection indexes
        await database.analytics.create_index("date")
        await database.analytics.create_index("intent")
        
        print("✅ Database indexes created successfully")
        
    except Exception as e:
        print(f"⚠️ Warning: Failed to create some indexes: {e}")

def get_database():
    """Get database instance"""
    return database

def get_client():
    """Get MongoDB client instance"""
    return client

def is_db_connected():
    """Check if database is connected"""
    return is_connected

# Collections
def get_messages_collection():
    """Get messages collection"""
    if database is None:
        raise Exception("Database not initialized. Please ensure MongoDB is running and connection is established.")
    return database.messages

def get_chat_rooms_collection():
    """Get chat rooms collection"""
    if database is None:
        raise Exception("Database not initialized. Please ensure MongoDB is running and connection is established.")
    return database.chat_rooms

def get_users_collection():
    """Get users collection"""
    if not is_connected:
        raise Exception("Database not connected. Running in mock mode.")
    return database.users

def get_analytics_collection():
    """Get analytics collection"""
    if not is_connected:
        raise Exception("Database not connected. Running in mock mode.")
    return database.analytics

def get_system_config_collection():
    """Get system configuration collection"""
    if not is_connected:
        raise Exception("Database not connected. Running in mock mode.")
    return database.system_config 