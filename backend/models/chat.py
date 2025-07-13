from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ChatRoom(BaseModel):
    _id: str
    customer_id: str
    customer_name: str
    status: str
    created_at: datetime
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None

class Message(BaseModel):
    _id: str
    room_id: str
    user_id: str
    user_type: str
    content: str
    created_at: datetime 