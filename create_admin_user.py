import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.connection import init_db, get_users_collection
from passlib.context import CryptContext
from datetime import datetime

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

async def create_admin_user():
    """Create a test admin account"""
    print("🔧 Creating test admin account...")
    
    # Initialize database first
    await init_db()
    
    users_collection = get_users_collection()
    
    # Test admin user
    test_admin = {
        "username": "admin",
        "email": "admin@example.com",
        "hashed_password": get_password_hash("admin123"),
        "user_type": "admin",
        "created_at": datetime.utcnow()
    }
    
    # Check if user already exists
    existing_user = await users_collection.find_one({"username": "admin"})
    if existing_user:
        print("⚠️ Admin user already exists!")
        return
    
    # Insert test user
    result = await users_collection.insert_one(test_admin)
    print("✅ Admin user created successfully!")
    print(f"   Username: admin")
    print(f"   Password: admin123")
    print(f"   Email: admin@example.com")
    print(f"   User ID: {result.inserted_id}")

if __name__ == "__main__":
    asyncio.run(create_admin_user()) 