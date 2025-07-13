from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials, OAuth2PasswordBearer
from fastapi.responses import JSONResponse
from fastapi.exception_handlers import RequestValidationError
from fastapi.exceptions import RequestValidationError as FastAPIRequestValidationError
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorDatabase

from models.schemas import UserLogin, UserRegister, Token, UserType, User
from database.connection import get_users_collection, is_db_connected, get_database
from bson import ObjectId
from services.chat_service import ChatService
from services.token_service import get_user_from_token_str

load_dotenv()

router = APIRouter()
security = HTTPBearer()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 43200))  # 30 days

# Mock data for when MongoDB is not available
MOCK_USERS = [
    {
        "_id": "507f1f77bcf86cd799439011",
        "username": "admin",
        "email": "admin@example.com",
        "hashed_password": pwd_context.hash("admin123"),
        "user_type": "admin",
        "created_at": datetime.utcnow()
    },
    {
        "_id": "507f1f77bcf86cd799439012", 
        "username": "customer1",
        "email": "customer1@example.com",
        "hashed_password": pwd_context.hash("customer123"),
        "user_type": "customer",
        "created_at": datetime.utcnow()
    }
]

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_user(db, username: str):
    user = await db["users"].find_one({"username": username})
    return user

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncIOMotorDatabase = Depends(get_database)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    user = await get_user_from_token_str(token, db)
    if user is None:
        raise credentials_exception
    return user

@router.post("/register", response_model=Token)
async def register(form_data: UserRegister, db: AsyncIOMotorDatabase = Depends(get_database)):
    existing_user = await get_user(db, form_data.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Check if email already exists
    existing_email = await get_users_collection().find_one({"email": form_data.email})
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(form_data.password)
    user = {
        "username": form_data.username,
        "email": form_data.email,
        "hashed_password": hashed_password,
        "user_type": form_data.user_type.value,
        "created_at": datetime.utcnow()
    }
    
    result = await get_users_collection().insert_one(user)
    user_id = str(result.inserted_id)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_id}, expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user_id,
        username=form_data.username,
        user_type=form_data.user_type
    )

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    try:
        if is_db_connected():
            users_collection = get_users_collection()
            
            # Find user by username
            user = await users_collection.find_one({"username": user_data.username})
        else:
            # Use mock data
            user = next((u for u in MOCK_USERS if u["username"] == user_data.username), None)
            
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Verify password
        if not verify_password(user_data.password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user["_id"])}, expires_delta=access_token_expires
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user_id=str(user["_id"]),
            username=user["username"],
            user_type=UserType(user["user_type"])
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return current_user

@router.post("/refresh")
async def refresh_token(current_user: dict = Depends(get_current_user)):
    # Create new access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": current_user["id"]}, expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=current_user["id"],
        username=current_user["username"],
        user_type=UserType(current_user["user_type"])
    )

@router.post("/customer/login", response_model=Token)
async def customer_login(user_data: UserLogin):
    try:
        if is_db_connected():
            users_collection = get_users_collection()
            
            # Find user by email (for customers) or username
            user = await users_collection.find_one({
                "$or": [
                    {"email": user_data.username},
                    {"username": user_data.username}
                ],
                "user_type": "customer"
            })
        else:
            # Use mock data
            user = next((u for u in MOCK_USERS if (u["email"] == user_data.username or u["username"] == user_data.username) and u["user_type"] == "customer"), None)
            
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Verify password
        if not verify_password(user_data.password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user["_id"])}, expires_delta=access_token_expires
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user_id=str(user["_id"]),
            username=user["username"],
            user_type=UserType(user["user_type"]),
            name=user.get("name")
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Customer login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.post("/customer/register", response_model=Token)
async def customer_register(user_data: UserRegister):
    users_collection = get_users_collection()
    
    # Check if username already exists
    existing_user = await users_collection.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    existing_email = await users_collection.find_one({"email": user_data.email})
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new customer user
    hashed_password = get_password_hash(user_data.password)
    user = {
        "username": user_data.username,
        "email": user_data.email,
        "hashed_password": hashed_password,
        "user_type": "customer",
        "name": getattr(user_data, 'name', ''),
        "phone": getattr(user_data, 'phone', ''),
        "created_at": datetime.utcnow()
    }
    
    result = await users_collection.insert_one(user)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(result.inserted_id)}, expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=str(result.inserted_id),
        username=user_data.username,
        user_type=UserType("customer"),
        name=user_data.name
    )

async def get_current_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("user_type") != "admin":
        raise HTTPException(status_code=403, detail="Not an admin")
    return current_user

@router.get("/customer/profile")
async def get_customer_profile(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "customer":
        raise HTTPException(status_code=403, detail="Only customer can access this endpoint")
    # Lấy thông tin user đầy đủ từ DB
    users_collection = get_users_collection()
    user = await users_collection.find_one({"_id": ObjectId(current_user["id"]), "user_type": "customer"})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Convert ObjectId to string and remove sensitive data
    user["id"] = str(user["_id"])
    del user["_id"]
    user.pop("hashed_password", None)
    return user 