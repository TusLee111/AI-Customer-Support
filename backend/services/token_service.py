from jose import jwt, JWTError
from bson import ObjectId
from fastapi import HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
import os
from database.connection import get_database

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"

# A dependency to get the bearer token from the Authorization header
from fastapi.security import OAuth2PasswordBearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_user_from_token_str(token: str, db: AsyncIOMotorDatabase):
    """Decodes token, fetches user from DB, and returns user document."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None
        
    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    
    if user:
        user["id"] = str(user["_id"])
        del user["_id"]

    return user

async def verify_admin_access(token: str = Depends(oauth2_scheme), db: AsyncIOMotorDatabase = Depends(get_database)):
    """
    Dependency that verifies the user is an admin.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    
    if user is None:
        raise credentials_exception
        
    if user.get("user_type") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    
    if user:
        user["id"] = str(user["_id"])
        del user["_id"]
    
    return user 