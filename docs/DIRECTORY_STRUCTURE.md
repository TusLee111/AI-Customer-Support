# SƠ ĐỒ THƯ MỤC HỆ THỐNG AI CUSTOMER SUPPORT

## Tổng quan cấu trúc dự án

```
CodeWeb/
├── 📁 backend/                    # Backend FastAPI Application
├── 📁 frontend/                   # Frontend React Applications
├── 📁 docs/                       # Tài liệu dự án
├── 📁 backup/                     # Backup files
├── 📄 docker-compose.yml          # Docker orchestration
├── 📄 run.bat                     # Windows startup script
├── 📄 run.sh                      # Linux/Mac startup script
├── 📄 setup.sh                    # Setup script
├── 📄 README.md                   # Tài liệu chính
└── 📄 BACKUP_GUIDE.md             # Hướng dẫn backup
```

## Chi tiết cấu trúc Backend

```   
backend/
├── 📄 app.py                      # Main FastAPI application
├── 📄 requirements.txt            # Python dependencies
├── 📄 Dockerfile                  # Backend container config
├── 📄 env.example                 # Environment variables template
├── 📄 init_db.py                  # Database initialization
├── 📄 clean_db.py                 # Database cleanup utility
├── 📄 create_admin_user.py        # Admin user creation script
├── 📄 create_test_user.py         # Test user creation script
├── 📄 test_api.py                 # API testing script
├── 📄 test_ai_models.py           # AI models testing
│
├── 📁 database/                   # Database layer
│   ├── 📄 __init__.py
│   └── 📄 connection.py           # MongoDB connection
│
├── 📁 models/                     # Data models & schemas
│   ├── 📄 __init__.py
│   ├── 📄 user.py                 # User model
│   ├── 📄 chat.py                 # Chat models
│   ├── 📄 ai.py                   # AI models
│   └── 📄 analytics.py            # Analytics models
│
├── 📁 routes/                     # API endpoints
│   ├── 📄 __init__.py
│   ├── 📄 auth.py                 # Authentication endpoints
│   ├── 📄 chat.py                 # Chat endpoints
│   ├── 📄 admin.py                # Admin endpoints
│   ├── 📄 analytics.py            # Analytics endpoints
│   ├── 📄 ai.py                   # AI endpoints
│   └── 📄 public.py               # Public endpoints
│
├── 📁 services/                   # Business logic layer
│   ├── 📄 __init__.py
│   ├── 📄 chat_service.py         # Chat business logic
│   ├── 📄 ai_service.py           # AI processing logic
│   └── 📄 token_service.py        # JWT token management
│
├── 📄 socketio_instance.py        # Socket.IO configuration
└── 📁 venv/                       # Python virtual environment
```

## Chi tiết cấu trúc Frontend

### Admin Frontend
```
frontend/admin/
├── 📄 package.json                # Node.js dependencies
├── 📄 package-lock.json           # Locked dependencies
├── 📄 Dockerfile                  # Admin container config
├── 📄 tailwind.config.js          # Tailwind CSS config
├── 📄 postcss.config.js           # PostCSS config
│
├── 📁 public/                     # Static files
│   ├── 📄 index.html              # Main HTML template
│   ├── 📄 favicon.ico             # Favicon
│   └── 📄 manifest.json           # PWA manifest
│
└── 📁 src/                        # Source code
    ├── 📄 index.js                # React entry point
    ├── 📄 App.js                  # Main App component
    ├── 📄 index.css               # Global styles
    ├── 📄 config.js               # Configuration
    ├── 📄 setupProxy.js           # Development proxy
    │
    ├── 📁 components/             # React components
    │   ├── 📄 Login.js            # Login component
    │   ├── 📄 Dashboard.js        # Main dashboard
    │   ├── 📄 Analytics.js        # Analytics dashboard
    │   ├── 📄 UserManagement.js   # User management
    │   ├── 📄 Settings.js         # Settings panel
    │   ├── 📄 TestAPI.js          # API testing
    │   ├── 📄 Sidebar.js          # Navigation sidebar
    │   ├── 📄 MainLayout.js       # Layout wrapper
    │   ├── 📄 ChatLog.js          # Chat history
    │   │
    │   └── 📁 chat/               # Chat components
    │       ├── 📄 ChatInterface.js    # Main chat interface
    │       ├── 📄 ChatWindow.js       # Chat window
    │       ├── 📄 ChatMessage.js      # Individual message
    │       ├── 📄 RoomList.js         # Room list
    │       └── 📄 AiPanel.js          # AI suggestions panel
    │
    ├── 📁 contexts/               # React contexts
    │   ├── 📄 AuthContext.js      # Authentication context
    │   └── 📄 SocketContext.js    # Socket.IO context
    │
    └── 📁 services/               # API services
        └── 📄 api.js              # API client
```

### Customer Frontend
```
frontend/customer/
├── 📄 package.json                # Node.js dependencies
├── 📄 package-lock.json           # Locked dependencies
├── 📄 Dockerfile                  # Customer container config
├── 📄 tailwind.config.js          # Tailwind CSS config
├── 📄 postcss.config.js           # PostCSS config
│
├── 📁 public/                     # Static files
│   ├── 📄 index.html              # Main HTML template
│   ├── 📄 favicon.ico             # Favicon
│   └── 📄 manifest.json           # PWA manifest
│
└── 📁 src/                        # Source code
    ├── 📄 index.js                # React entry point
    ├── 📄 App.js                  # Main App component
    ├── 📄 App.css                 # App styles
    ├── 📄 index.css               # Global styles
    ├── 📄 config.js               # Configuration
    ├── 📄 setupProxy.js           # Development proxy
    │
    ├── 📁 components/             # React components
    │   ├── 📄 Login.js            # Login component
    │   ├── 📄 LandingPage.js      # Landing page
    │   └── 📄 ChatInterface.js    # Chat interface
    │
    └── 📁 contexts/               # React contexts
        ├── 📄 AuthContext.js      # Authentication context
        └── 📄 SocketContext.js    # Socket.IO context
```

## Chi tiết cấu trúc Documentation

```
docs/
├── 📄 API_DOCUMENTATION.md        # API documentation
├── 📄 ARCHITECTURE_OVERVIEW.md    # System architecture
└── 📄 DIRECTORY_STRUCTURE.md      # This file
```

## Chi tiết cấu trúc Backup

```
backup/
├── 📁 backend/                    # Backend backups
├── 📁 frontend/                   # Frontend backups
├── 📄 docker-compose.yml          # Backup docker config
├── 📄 README.md                   # Backup documentation
└── 📄 check-requirements.bat      # Requirements checker
```

## Mô tả các thành phần chính

### Backend Components

#### 📁 routes/
- **auth.py**: Xử lý đăng ký, đăng nhập, refresh token
- **chat.py**: Quản lý phòng chat, tin nhắn, real-time
- **admin.py**: API cho admin dashboard, quản lý người dùng
- **analytics.py**: Thống kê, báo cáo, metrics
- **ai.py**: AI endpoints cho phân loại ý định và gợi ý
- **public.py**: API công khai không cần xác thực

#### 📁 services/
- **chat_service.py**: Logic xử lý chat, phòng, tin nhắn
- **ai_service.py**: AI processing, intent classification, response generation
- **token_service.py**: JWT token creation, validation, refresh

#### 📁 models/
- **user.py**: User schemas và validation
- **chat.py**: Chat room, message schemas
- **ai.py**: AI suggestion, intent schemas
- **analytics.py**: Analytics data schemas

### Frontend Components

#### Admin Components
- **Dashboard.js**: Dashboard chính với overview
- **Analytics.js**: Biểu đồ thống kê, metrics
- **UserManagement.js**: Quản lý người dùng, roles
- **Settings.js**: Cài đặt hệ thống, AI models
- **ChatInterface.js**: Giao diện chat chính
- **AiPanel.js**: Panel hiển thị gợi ý AI

#### Customer Components
- **LandingPage.js**: Trang chủ giới thiệu
- **Login.js**: Đăng nhập/đăng ký
- **ChatInterface.js**: Giao diện chat đơn giản

### Configuration Files

#### Docker Configuration
- **docker-compose.yml**: Orchestration cho tất cả services
- **backend/Dockerfile**: Backend container
- **frontend/admin/Dockerfile**: Admin frontend container
- **frontend/customer/Dockerfile**: Customer frontend container

#### Development Scripts
- **run.bat**: Windows startup script
- **run.sh**: Linux/Mac startup script
- **setup.sh**: Initial setup script
- **check-requirements.bat**: Check system requirements

## Luồng dữ liệu trong hệ thống

```
1. User Request Flow:
   Frontend → API Gateway → Route → Service → Database

2. Real-time Communication:
   Frontend ↔ Socket.IO ↔ Backend ↔ Database

3. AI Processing Flow:
   Message → AI Service → Intent Classification → Response Generation

4. Authentication Flow:
   Login → Auth Service → JWT Token → Protected Routes
```

## Cấu trúc Database Collections

```
MongoDB Collections:
├── users          # Thông tin người dùng
├── rooms          # Phòng chat
├── messages       # Tin nhắn
├── ai_suggestions # Gợi ý AI
└── analytics      # Dữ liệu thống kê
```

## Port Configuration

```
Development Ports:
├── Backend API:    8000
├── Admin UI:       3000
├── Customer UI:    3001
└── MongoDB:        27017

Production Ports (Docker):
├── Backend API:    8000
├── Admin UI:       3000
├── Customer UI:    3001
└── MongoDB:        27017
```

## Environment Variables

```
Backend Environment:
├── MONGO_URL           # MongoDB connection string
├── DATABASE_NAME       # Database name
├── SECRET_KEY          # JWT secret key
└── DEBUG              # Debug mode

Frontend Environment:
├── REACT_APP_API_URL    # Backend API URL
└── REACT_APP_SOCKET_URL # Socket.IO URL
``` 