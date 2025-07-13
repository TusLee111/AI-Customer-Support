# This file holds the global Socket.IO server instance for use across the backend.
import socketio
from fastapi import FastAPI
import logging
from typing import Dict, List, Any
from datetime import datetime
from services.chat_service import ChatService, get_chat_service
from services.ai_service import AIService, get_ai_service, IntentHistoryService
from services.token_service import get_user_from_token_str
from bson.objectid import ObjectId
from models.schemas import UserType
from database.connection import get_database

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create a Socket.IO server instance
# We disable socketio's own CORS handling by providing an empty list,
# as FastAPI's CORSMiddleware will handle it for all requests.
sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins=[])
sio_app = socketio.ASGIApp(sio)

# Store active users and their rooms
active_users = {}  # sid: {user_id, user_type}
active_rooms = {}  # room_id: set of sid

# Constants
ADMIN_ROOM_NAME = "admin_room"

async def handle_user_authentication(sid, auth):
    """Authenticates a user and saves their info to the session."""
    print(f"[DEBUG] handle_user_authentication called for SID {sid}")
    print(f"[DEBUG] auth object: {auth}")
    print(f"[DEBUG] auth type: {type(auth)}")
    
    token = auth.get('token')
    print(f"[DEBUG] token extracted: {token}")
    
    if not token:
        logger.warning(f"Authentication failed for SID {sid}: No token provided.")
        return False

    # Get database connection
    db = get_database()
    
    # Use the existing function to decode token and get user
    user = await get_user_from_token_str(token, db)
    print(f"[DEBUG] user from token: {user}")
    
    if not user:
        logger.warning(f"Authentication failed for SID {sid}: Invalid or expired token.")
        return False

    user_id = str(user.get('id'))
    user_type = user.get('user_type')
    
    # Save user info to the session
    await sio.save_session(sid, {'user_id': user_id, 'user_type': user_type})
    logger.info(f"User {user_id} authenticated as {user_type} (SID: {sid})")

    # If the user is an admin, have them join the admin room
    if user_type == UserType.ADMIN.value:
        await sio.enter_room(sid, ADMIN_ROOM_NAME)
        logger.info(f"Admin {user_id} joined {ADMIN_ROOM_NAME}")

    return True

@sio.event
async def connect(sid, environ, auth):
    logger.info(f"connection open")
    logger.info(f"[SOCKET] Client connected: {sid}")
    
    # --- CRITICAL FIX: Actually call the authentication handler ---
    authenticated = await handle_user_authentication(sid, auth)
    if not authenticated:
        # If authentication fails, disconnect the user.
        # This prevents unauthenticated users from proceeding.
        await sio.disconnect(sid)
        logger.info(f"Disconnected unauthenticated user {sid}")

@sio.event
async def authenticate(sid, data):
    """Authenticate user and store their data"""
    user_id = data.get('user_id')
    user_type = data.get('user_type')
    if not user_id or not user_type:
        await sio.emit('auth_error', {'message': 'Missing credentials'}, room=sid)
        return
    active_users[sid] = {'user_id': user_id, 'user_type': user_type}
    logger.info(f"User {user_id} authenticated as {user_type} (SID: {sid})")
    if user_type == 'admin':
        await sio.enter_room(sid, 'admin_room')
        logger.info(f"Admin {user_id} joined admin_room")
    await sio.emit('authenticated', {'status': 'success'}, room=sid)

@sio.event
async def join_room(sid, data):
    room_id = data.get("room_id")
    user_id = data.get("user_id")
    user_type = data.get("user_type")
    await sio.enter_room(sid, room_id)
    print(f"[SOCKET] {user_type} {user_id} joined room {room_id} (sid={sid})")
    if room_id not in active_rooms:
        active_rooms[room_id] = set()
    active_rooms[room_id].add(sid)
    await sio.emit('room_joined', {'room_id': room_id}, room=sid)

@sio.event
async def leave_room(sid, data):
    """Handle room leave request"""
    room_id = data.get('room_id')
    if not room_id:
        return
    await sio.leave_room(sid, room_id)
    if room_id in active_rooms:
        active_rooms[room_id].discard(sid)
        if not active_rooms[room_id]:
            del active_rooms[room_id]
    logger.info(f"Client {sid} left room {room_id}")

async def classify_and_update_intent(message_id: str, content: str):
    """
    A background task to classify message intent and update the database.
    This runs separately and does not block the message flow.
    """
    chat_service = get_chat_service()
    ai_service = get_ai_service()
    db = get_database()
    try:
        logging.info(f"Starting background intent classification for message {message_id}")
        intent, confidence = ai_service.classify_intent(content)
        # Luôn lưu intent và confidence vào intent_history (bản sao audit)
        # Lấy room_id từ message
        msg = await db["messages"].find_one({"_id": ObjectId(message_id)})
        room_id = msg["room_id"] if msg else None
        if room_id:
            intent_service = IntentHistoryService(db)
            await intent_service.add_intent(message_id, room_id, intent, confidence, "ai")
        # (Tùy chọn) vẫn update intent vào message để hiển thị nhanh
        await chat_service.update_message_intent(message_id, intent, confidence)
        logging.info(f"Classified intent for message {message_id} as '{intent}' with confidence {confidence:.2f} and saved to intent_history")
    except Exception as e:
        logging.error(f"Error in background task for message {message_id}: {e}")


@sio.on('send_message')
async def send_message(sid, data):
    # ... (existing code from inside the original send_message)
    room_id = data.get('room_id')
    
    session = await sio.get_session(sid)
    # --- DEBUGGING: Log the entire session object ---
    logging.info(f"[DEBUG] Session data for SID {sid}: {session}")

    user_id = session.get('user_id')
    user_type = session.get('user_type')

    content = data.get('content')
    reply_to_message_id = data.get('reply_to')

    logging.info(f"[SEND_MESSAGE] Received from SID {sid}: room_id={room_id}, user_id={user_id}, user_type={user_type}, content='{content[:20]}...', reply_to='{reply_to_message_id}'")

    if not all([room_id, user_id, user_type, content]):
        logging.warning(f"[SEND_MESSAGE] Missing data from SID {sid}. Aborting.")
        return

    chat_service: ChatService = get_chat_service()
    db = get_database()
    try:
        # Kiểm tra nếu là customer gửi tin nhắn đầu tiên (phòng vừa tạo)
        room = await db["chat_rooms"].find_one({"_id": room_id})
        is_first_message = False
        if room:
            msg_count = await db["messages"].count_documents({"room_id": room_id})
            is_first_message = (msg_count == 0)
        new_message = await chat_service.save_message(
            room_id=room_id,
            user_id=user_id,
            user_type=user_type,
            content=content,
            reply_to_message_id=reply_to_message_id
        )
        await sio.emit('new_message', new_message, room=room_id)
        await sio.emit('update_room_list', room=ADMIN_ROOM_NAME)
        if user_type == 'customer':
            sio.start_background_task(classify_and_update_intent, new_message['_id'], content)
            # Nếu là tin nhắn đầu tiên, gửi auto-reply từ admin
            if is_first_message:
                auto_reply = "Thank you for reaching out to our design team! We specialize in providing custom website and application design solutions. Our team will get back to you as soon as possible."
                admin_user = await db["users"].find_one({"user_type": "admin"})
                admin_id = str(admin_user["_id"]) if admin_user else "admin"
                auto_msg = await chat_service.save_message(
                    room_id=room_id,
                    user_id=admin_id,
                    user_type="admin",
                    content=auto_reply
                )
                await sio.emit('new_message', auto_msg, room=room_id)
    except Exception as e:
        logging.error(f"[SEND_MESSAGE] Error processing message for room {room_id}: {e}")
        await sio.emit('message_error', {'error': str(e)}, room=sid)

@sio.event
def disconnect(sid):
    print(f"[SOCKET] Client disconnected: {sid}")
    if sid in active_users:
        del active_users[sid]
    for room_id, sids in list(active_rooms.items()):
        if sid in sids:
            sids.remove(sid)
            if not sids:
                del active_rooms[room_id]

def init_app(app: FastAPI):
    """Mount the Socket.IO application to the main FastAPI app."""
    # This is the standard and more stable way to mount the app
    app.mount('/socket.io', sio_app)

async def add_user_to_room(room: str, user_data: dict) -> None:
    """Add a user to a room"""
    if room not in active_rooms:
        active_rooms[room] = set()
    active_rooms[room].add(user_data['sid'])

async def remove_user_from_room(room: str, user_data: dict) -> None:
    """Remove a user from a room"""
    if room in active_rooms:
        active_rooms[room].remove(user_data['sid'])
        if not active_rooms[room]:
            del active_rooms[room]

async def cleanup_user(sid: str) -> None:
    """Clean up user data when they disconnect"""
    if sid in active_users:
        user_data = active_users[sid]
        for room in user_data.get('rooms', []):
            await remove_user_from_room(room, user_data)
        del active_users[sid]

async def get_room_users(room: str) -> List[dict]:
    """Get list of users in a room"""
    if room not in active_rooms:
        return []
    return [
        {
            'user': user['user'],
            'user_type': user['user_type'],
            'joined_at': user['joined_at']
        }
        for user in active_rooms[room]
    ]

@sio.on('typing')
async def handle_typing(sid, data):
    room_id = data.get('room_id')
    user_id = data.get('user_id')
    user_type = data.get('user_type')
    if room_id and user_id and user_type:
        await sio.emit('typing', {'room_id': room_id, 'user_id': user_id, 'user_type': user_type}, room=room_id, skip_sid=sid)

@sio.on('stop_typing')
async def handle_stop_typing(sid, data):
    room_id = data.get('room_id')
    user_id = data.get('user_id')
    user_type = data.get('user_type')
    if room_id and user_id and user_type:
        await sio.emit('stop_typing', {'room_id': room_id, 'user_id': user_id, 'user_type': user_type}, room=room_id, skip_sid=sid)

@sio.on('seen')
async def handle_seen(sid, data):
    room_id = data.get('room_id')
    user_id = data.get('user_id')
    user_type = data.get('user_type')
    last_message_id = data.get('last_message_id')
    if room_id and user_id and last_message_id:
        await sio.emit('seen', {'room_id': room_id, 'user_id': user_id, 'user_type': user_type, 'last_message_id': last_message_id}, room=room_id, skip_sid=sid) 