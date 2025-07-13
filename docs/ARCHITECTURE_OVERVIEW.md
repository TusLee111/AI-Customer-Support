# KIẾN TRÚC TỔNG QUAN HỆ THỐNG AI CUSTOMER SUPPORT

## 1. Tổng quan hệ thống

Hệ thống AI Customer Support là một ứng dụng web full-stack được thiết kế theo kiến trúc microservices, hỗ trợ chat real-time giữa admin và khách hàng với các tính năng AI thông minh.

### 1.1 Kiến trúc tổng thể
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Admin UI      │    │  Customer UI    │    │   API Gateway   │
│   (React)       │    │   (React)       │    │   (FastAPI)     │
│   Port: 3000    │    │   Port: 3001    │    │   Port: 8000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Socket.IO     │
                    │  (Real-time)    │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │    MongoDB      │
                    │   Database      │
                    │   Port: 27017   │
                    └─────────────────┘
```

### 1.2 Các thành phần chính

#### Backend (FastAPI)
- **API Gateway**: Xử lý tất cả HTTP requests
- **Authentication Service**: Quản lý đăng nhập, JWT tokens
- **Chat Service**: Xử lý tin nhắn và phòng chat
- **AI Service**: Phân loại ý định và tạo gợi ý phản hồi
- **Analytics Service**: Thống kê và báo cáo
- **Socket.IO**: Giao tiếp real-time

#### Frontend
- **Admin Interface**: Dashboard quản lý, chat với khách hàng
- **Customer Interface**: Giao diện chat đơn giản cho khách hàng

#### Database
- **MongoDB**: Lưu trữ dữ liệu người dùng, tin nhắn, phòng chat

## 2. Kiến trúc chi tiết

### 2.1 Backend Architecture

```
FastAPI Application
├── Main App (app.py)
├── Routes Layer
│   ├── auth.py - Xác thực người dùng
│   ├── chat.py - Quản lý chat
│   ├── admin.py - API admin
│   ├── analytics.py - Thống kê
│   ├── ai.py - AI services
│   └── public.py - API công khai
├── Services Layer
│   ├── chat_service.py - Logic chat
│   ├── ai_service.py - AI processing
│   └── token_service.py - JWT management
├── Models Layer
│   └── Pydantic schemas
└── Database Layer
    └── MongoDB connection
```

### 2.2 Frontend Architecture

#### Admin Frontend
```
React Application
├── Components
│   ├── chat/
│   │   ├── ChatInterface.js - Giao diện chat chính
│   │   ├── ChatWindow.js - Cửa sổ chat
│   │   ├── ChatMessage.js - Component tin nhắn
│   │   ├── RoomList.js - Danh sách phòng
│   │   └── AiPanel.js - Panel AI gợi ý
│   ├── Dashboard.js - Dashboard chính
│   ├── Analytics.js - Thống kê
│   ├── UserManagement.js - Quản lý người dùng
│   └── Settings.js - Cài đặt
├── Contexts
│   ├── AuthContext.js - Quản lý authentication
│   └── SocketContext.js - Quản lý socket
└── Services
    └── api.js - API calls
```

#### Customer Frontend
```
React Application
├── Components
│   ├── ChatInterface.js - Giao diện chat
│   ├── LandingPage.js - Trang chủ
│   └── Login.js - Đăng nhập
├── Contexts
│   ├── AuthContext.js - Quản lý authentication
│   └── SocketContext.js - Quản lý socket
```

### 2.3 Data Flow

#### Chat Flow
1. **Customer gửi tin nhắn** → Frontend → API → Database
2. **AI phân loại ý định** → AI Service → Gợi ý phản hồi
3. **Admin nhận thông báo** → Socket.IO → Real-time update
4. **Admin phản hồi** → API → Database → Customer nhận qua Socket.IO

#### Authentication Flow
1. **User login** → Auth Service → JWT Token
2. **API calls** → Token validation → Protected routes
3. **Token refresh** → Automatic renewal

## 3. Công nghệ sử dụng

### 3.1 Backend Stack
- **FastAPI**: Framework API hiệu suất cao
- **MongoDB**: NoSQL database
- **Socket.IO**: Real-time communication
- **JWT**: Authentication
- **Pydantic**: Data validation
- **Uvicorn**: ASGI server

### 3.2 Frontend Stack
- **React**: UI library
- **Tailwind CSS**: Styling framework
- **Socket.IO Client**: Real-time client
- **React Router**: Navigation
- **React Hot Toast**: Notifications

### 3.3 AI/ML Stack
- **BERT**: Intent classification
- **FLAN-T5**: Response generation
- **Transformers**: Hugging Face library

### 3.4 DevOps Stack
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **Git**: Version control

## 4. Bảo mật

### 4.1 Authentication & Authorization
- JWT-based authentication
- Role-based access control (Admin/Customer)
- Token refresh mechanism
- Secure password hashing

### 4.2 Data Security
- CORS configuration
- Input validation
- SQL injection prevention (MongoDB)
- XSS protection

### 4.3 API Security
- Rate limiting
- Request validation
- Error handling
- Logging and monitoring

## 5. Scalability & Performance

### 5.1 Horizontal Scaling
- Stateless API design
- Container-based deployment
- Load balancer ready
- Database sharding support

### 5.2 Performance Optimization
- Async/await patterns
- Database indexing
- Caching strategies
- CDN ready

### 5.3 Monitoring
- Health check endpoints
- Logging system
- Error tracking
- Performance metrics

## 6. Deployment Architecture

### 6.1 Development Environment
```
Local Development
├── Backend: localhost:8000
├── Admin UI: localhost:3000
├── Customer UI: localhost:3001
└── MongoDB: localhost:27017
```

### 6.2 Production Environment
```
Docker Deployment
├── MongoDB Container
├── Backend Container
├── Admin Frontend Container
└── Customer Frontend Container
```

## 7. API Design

### 7.1 RESTful Endpoints
- **Authentication**: `/api/auth/*`
- **Chat**: `/api/chat/*`
- **Admin**: `/api/admin/*`
- **Analytics**: `/api/analytics/*`
- **AI**: `/api/ai/*`
- **Public**: `/api/public/*`

### 7.2 WebSocket Events
- **Connection**: `connect`, `disconnect`
- **Chat**: `join_room`, `leave_room`, `new_message`
- **AI**: `ai_suggestion`, `intent_classification`

## 8. Database Schema

### 8.1 Collections
- **users**: Thông tin người dùng
- **rooms**: Phòng chat
- **messages**: Tin nhắn
- **ai_suggestions**: Gợi ý AI
- **analytics**: Dữ liệu thống kê

### 8.2 Relationships
- User ↔ Room (1:N)
- Room ↔ Message (1:N)
- Message ↔ AI Suggestion (1:1)

## 9. Future Enhancements

### 9.1 Planned Features
- Multi-language support
- File sharing
- Voice messages
- Advanced analytics
- Machine learning model training

### 9.2 Technical Improvements
- Redis caching
- Message queue (RabbitMQ)
- Microservices architecture
- Kubernetes deployment
- CI/CD pipeline 