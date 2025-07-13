# AI Customer Support System - API Documentation

## Overview

This document provides comprehensive documentation for the AI Customer Support System API. The API is built with FastAPI and provides endpoints for authentication, chat management, admin operations, and analytics.

## Base URL

- Development: `http://localhost:8000`
- Production: `https://your-domain.com`

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-token>
```

## API Endpoints

### Authentication

#### POST /api/auth/register
Register a new user.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "user_type": "admin" | "customer"
}
```

**Response:**
```json
{
  "access_token": "string",
  "token_type": "bearer",
  "user_id": "string",
  "username": "string",
  "user_type": "admin" | "customer"
}
```

#### POST /api/auth/login
Login with username and password.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "access_token": "string",
  "token_type": "bearer",
  "user_id": "string",
  "username": "string",
  "user_type": "admin" | "customer"
}
```

#### GET /api/auth/me
Get current user information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "user_type": "admin" | "customer"
}
```

### Chat Management

#### POST /api/chat/rooms
Create a new chat room.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "customer_name": "string"
}
```

**Response:**
```json
{
  "room_id": "string",
  "customer_id": "string",
  "customer_name": "string",
  "status": "active"
}
```

#### GET /api/chat/rooms
Get all active chat rooms.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "string",
    "customer_id": "string",
    "customer_name": "string",
    "status": "active",
    "created_at": "datetime",
    "last_message_at": "datetime",
    "message_count": 0
  }
]
```

#### GET /api/chat/rooms/{room_id}
Get specific chat room details.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "string",
  "customer_id": "string",
  "customer_name": "string",
  "status": "active",
  "created_at": "datetime",
  "last_message_at": "datetime",
  "message_count": 0
}
```

#### GET /api/chat/rooms/{room_id}/messages
Get messages for a specific chat room.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional): Number of messages to return (default: 50)
- `skip` (optional): Number of messages to skip (default: 0)

**Response:**
```json
[
  {
    "id": "string",
    "room_id": "string",
    "content": "string",
    "user_type": "admin" | "customer",
    "user_id": "string",
    "timestamp": "datetime",
    "intent": "greeting" | "complaint" | "inquiry" | "support" | "feedback" | "uncategorized",
    "ai_suggestion": "string",
    "is_ai_generated": false
  }
]
```

#### POST /api/chat/rooms/{room_id}/messages
Send a message to a chat room.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "content": "string",
  "user_type": "admin" | "customer"
}
```

**Response:**
```json
{
  "message_id": "string",
  "room_id": "string",
  "content": "string",
  "user_type": "admin" | "customer",
  "timestamp": "datetime",
  "ai_analysis": {
    "intent": "greeting",
    "confidence": 0.95,
    "suggestions": ["string"]
  }
}
```

#### POST /api/chat/analyze
Analyze a message with AI.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "message": "string"
}
```

**Response:**
```json
{
  "intent": "greeting",
  "confidence": 0.95,
  "suggestions": ["string"],
  "message": "string"
}
```

### Admin Operations

#### GET /api/admin/dashboard
Get admin dashboard statistics.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total_customers": 0,
  "active_chats": 0,
  "pending_chats": 0,
  "total_messages": 0,
  "ai_usage_rate": 0.0,
  "avg_response_time": 0.0
}
```

#### GET /api/admin/customers
Get list of all customers with their chat statistics.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "customer_id": "string",
    "customer_name": "string",
    "room_id": "string",
    "message_count": 0,
    "last_activity": "datetime",
    "status": "active",
    "ai_usage_percentage": 0.0
  }
]
```

#### GET /api/admin/intent-statistics
Get intent classification statistics.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `days` (optional): Number of days to analyze (default: 7)

**Response:**
```json
[
  {
    "intent": "greeting",
    "count": 0,
    "percentage": 0.0
  }
]
```

#### GET /api/admin/system-config
Get current system configuration.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "auto_reply_enabled": true,
  "max_response_length": 500,
  "ai_confidence_threshold": 0.7,
  "response_style_default": "friendly"
}
```

#### PUT /api/admin/system-config
Update system configuration.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "auto_reply_enabled": true,
  "max_response_length": 500,
  "ai_confidence_threshold": 0.7,
  "response_style_default": "friendly"
}
```

### Analytics

#### GET /api/analytics/overview
Get comprehensive analytics overview.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `days` (optional): Number of days to analyze (default: 30)

**Response:**
```json
{
  "period": {
    "start_date": "datetime",
    "end_date": "datetime",
    "days": 30
  },
  "overview": {
    "total_messages": 0,
    "total_chat_rooms": 0,
    "ai_generated_messages": 0,
    "ai_usage_rate": 0.0,
    "avg_messages_per_room": 0.0
  },
  "intent_distribution": [
    {
      "intent": "greeting",
      "count": 0,
      "percentage": 0.0
    }
  ],
  "daily_activity": [
    {
      "date": "string",
      "message_count": 0,
      "ai_count": 0,
      "human_count": 0
    }
  ]
}
```

#### GET /api/analytics/customer-behavior
Get customer behavior analytics.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `days` (optional): Number of days to analyze (default: 30)

**Response:**
```json
{
  "customer_engagement": {
    "total_customers": 0,
    "avg_messages_per_customer": 0.0,
    "avg_session_duration": 0.0,
    "top_customers": []
  },
  "response_times": {
    "avg_response_time_minutes": 0.0,
    "avg_ai_response_time_minutes": 0.0,
    "avg_human_response_time_minutes": 0.0,
    "total_responses": 0
  },
  "customer_details": []
}
```

## WebSocket Events

### Connection
Connect to the WebSocket server:
```javascript
const socket = io('http://localhost:8000');
```

### Events

#### join_room
Join a chat room.

**Emit:**
```javascript
socket.emit('join_room', {
  room: 'room_id',
  user: 'user_name',
  user_type: 'admin' | 'customer'
});
```

#### send_message
Send a message.

**Emit:**
```javascript
socket.emit('send_message', {
  room: 'room_id',
  message: 'message_content',
  user_type: 'admin' | 'customer',
  timestamp: new Date()
});
```

#### new_message
Receive a new message.

**Listen:**
```javascript
socket.on('new_message', (data) => {
  console.log('New message:', data);
  // data: { message, user_type, timestamp }
});
```

#### ai_analysis
Receive AI analysis for a customer message (admin only).

**Listen:**
```javascript
socket.on('ai_analysis', (data) => {
  console.log('AI Analysis:', data);
  // data: { room, message, intent, suggestion }
});
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "detail": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "detail": "Could not validate credentials"
}
```

### 403 Forbidden
```json
{
  "detail": "Admin access required"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error message"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse:
- 100 requests per minute per IP address
- 1000 requests per hour per authenticated user

## CORS

The API supports CORS for cross-origin requests:
- Allowed origins: Configured via environment variables
- Allowed methods: GET, POST, PUT, DELETE, OPTIONS
- Allowed headers: Content-Type, Authorization

## Testing

You can test the API using the interactive documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Examples

### JavaScript/Node.js
```javascript
const axios = require('axios');

// Login
const loginResponse = await axios.post('http://localhost:8000/api/auth/login', {
  username: 'admin',
  password: 'password'
});

const token = loginResponse.data.access_token;

// Get chat rooms
const roomsResponse = await axios.get('http://localhost:8000/api/chat/rooms', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Python
```python
import requests

# Login
login_response = requests.post('http://localhost:8000/api/auth/login', json={
    'username': 'admin',
    'password': 'password'
})

token = login_response.json()['access_token']

# Get chat rooms
headers = {'Authorization': f'Bearer {token}'}
rooms_response = requests.get('http://localhost:8000/api/chat/rooms', headers=headers)
```

### cURL
```bash
# Login
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'

# Get chat rooms
curl -X GET "http://localhost:8000/api/chat/rooms" \
  -H "Authorization: Bearer YOUR_TOKEN"
``` 