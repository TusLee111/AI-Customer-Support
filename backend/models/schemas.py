from pydantic import BaseModel, Field, validator, EmailStr, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum
import re
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, *args, **kwargs):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema, *args, **kwargs):
        field_schema.update(type="string")
        return field_schema

class UserType(str, Enum):
    CUSTOMER = "customer"
    ADMIN = "admin"

class IntentType(str, Enum):
    INTENT_CLARIFICATION = "intent_clarification"
    INTENT_COMMITMENT = "intent_commitment"
    INTENT_DELAY = "intent_delay"
    INTENT_FOLLOW_UP = "intent_follow_up"
    INTENT_GREETING = "intent_greeting"
    INTENT_NEGOTIATION = "intent_negotiation"
    INTENT_PROPOSE_OFFER = "intent_propose_offer"
    INTENT_REJECTION = "intent_rejection"
    # Legacy types for backward compatibility
    GREETING = "greeting"
    COMPLAINT = "complaint"
    INQUIRY = "inquiry"
    SUPPORT = "support"
    FEEDBACK = "feedback"
    UNCATEGORIZED = "uncategorized"
    PRODUCT_INQUIRY = "product_inquiry"
    ORDER_STATUS = "order_status"
    TECHNICAL_SUPPORT = "technical_support"

class ResponseStyle(str, Enum):
    FORMAL = "formal"
    FRIENDLY = "friendly"
    SIMPLE = "simple"
    CONCISE = "concise"

class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str
    user_type: UserType = UserType.CUSTOMER

class User(UserBase):
    id: PyObjectId = Field(alias="_id")
    user_type: UserType

    model_config = ConfigDict(
        from_attributes=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    phone: Optional[str] = None

class UserRegister(UserCreate):
    pass

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    username: str
    user_type: str
    name: Optional[str] = None

class Suggestion(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    style: str
    text: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Message(BaseModel):
    id: PyObjectId = Field(alias="_id")
    room_id: str
    user_id: str
    user_type: str
    content: str
    created_at: datetime
    suggestions: List[Suggestion] = []
    is_deleted: bool = False
    
    model_config = ConfigDict(
        from_attributes=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda dt: dt.isoformat()}
    )

class ChatRoom(BaseModel):
    id: PyObjectId = Field(alias="_id")
    customer_id: str
    customer_name: str
    status: str
    created_at: datetime
    last_message_content: Optional[str] = None
    last_message_at: Optional[datetime] = None

    model_config = ConfigDict(
        from_attributes=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )

# Các schema cho phần admin
class AdminDashboard(BaseModel):
    totalChats: int
    activeChats: int
    resolvedChats: int
    avgResponseTime: float  # in minutes
    satisfactionRate: float # percentage

class ConversationSearch(BaseModel):
    keyword: Optional[str] = None
    intent: Optional[IntentType] = None
    customer_id: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    limit: int = Field(default=50, ge=1, le=100)

class SystemConfig(BaseModel):
    auto_reply_enabled: bool = True
    max_response_length: int = 500
    ai_confidence_threshold: float = 0.7
    response_style_default: ResponseStyle = ResponseStyle.FRIENDLY

# Analytics schemas
class IntentStats(BaseModel):
    intent: IntentType
    count: int
    percentage: float

class ResponseTimeStats(BaseModel):
    avg_ai_response_time: float
    avg_human_response_time: float
    total_responses: int

class CustomerStats(BaseModel):
    customer_id: str
    customer_name: str
    message_count: int
    avg_response_time: float
    last_activity: datetime

# Socket.IO event schemas
class SocketMessage(BaseModel):
    room: str
    message: str
    user_type: UserType
    timestamp: Optional[datetime] = None

class JoinRoom(BaseModel):
    room: str
    user: str
    user_type: UserType

class AIAnalysisEvent(BaseModel):
    room: str
    message: str
    intent: IntentType
    suggestion: str

class CreateMessageSchema(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)

class MessageSchema(BaseModel):
    id: str
    room_id: str
    content: str
    user_type: UserType
    user_id: str
    timestamp: datetime # Note: This is 'created_at' in the Message model
    intent: Optional[IntentType] = None
    suggestions: List[Suggestion] = []

    model_config = ConfigDict(
        from_attributes=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda dt: dt.isoformat()}
    )

class RoomSchema(BaseModel):
    id: str
    customer_id: str
    customer_name: str
    admin_id: Optional[str] = None
    status: str
    created_at: datetime
    last_message_at: Optional[datetime] = None
    message_count: int
    last_message_content: Optional[str] = None

class MessageResponse(BaseModel):
    message_id: str
    status: str
    message: Message

class SuggestionResponse(BaseModel):
    suggestions: List[Suggestion]

class DeletedSuggestionResponse(BaseModel):
    message: str
    suggestions: List[Suggestion]

class UserResponse(User):
    pass

class AISuggestionFeedback(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    input: str
    output: str
    rating: str  # 'good', 'bad', or 'none'
    user: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(
        from_attributes=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda dt: dt.isoformat()}
    )

class IntentHistory(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    message_id: PyObjectId
    room_id: str
    intent: IntentType
    confidence: float
    classified_by: str  # 'ai' hoặc username nếu do người sửa
    created_at: datetime = Field(default_factory=datetime.utcnow)
    note: Optional[str] = None

    model_config = ConfigDict(
        from_attributes=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str, datetime: lambda dt: dt.isoformat()}
    ) 