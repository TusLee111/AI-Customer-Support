import asyncio
import os
from datetime import datetime
from passlib.context import CryptContext
from database.connection import init_db, get_users_collection, get_system_config_collection
from models.schemas import UserType, ResponseStyle

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_default_admin():
    """Create default admin user"""
    try:
        # Initialize database
        await init_db()
        
        users_collection = get_users_collection()
        
        # Check if admin already exists
        existing_admin = await users_collection.find_one({"username": "admin"})
        if existing_admin:
            print("✅ Admin user already exists")
            return
        
        # Create admin user
        admin_user = {
            "username": "admin",
            "email": "admin@example.com",
            "hashed_password": pwd_context.hash("admin123"),
            "user_type": UserType.ADMIN,
            "created_at": datetime.utcnow(),
            "is_active": True
        }
        
        await users_collection.insert_one(admin_user)
        print("✅ Default admin user created successfully!")
        print("   Username: admin")
        print("   Password: admin123")
        
    except Exception as e:
        print(f"❌ Failed to create admin user: {e}")

async def create_default_config():
    """Create default system configuration"""
    try:
        config_collection = get_system_config_collection()
        
        # Check if config already exists
        existing_config = await config_collection.find_one({"type": "main"})
        if existing_config:
            print("✅ System configuration already exists")
            return
        
        # Create default config
        default_config = {
            "type": "main",
            "auto_reply_enabled": True,
            "max_response_length": 500,
            "ai_confidence_threshold": 0.7,
            "response_style_default": ResponseStyle.FRIENDLY.value,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await config_collection.insert_one(default_config)
        print("✅ Default system configuration created successfully!")
        
    except Exception as e:
        print(f"❌ Failed to create system configuration: {e}")

async def main():
    """Main initialization function"""
    print("🚀 Initializing AI Customer Support System...")
    
    await create_default_admin()
    await create_default_config()
    
    print("🎉 Database initialization completed!")

if __name__ == "__main__":
    asyncio.run(main()) 