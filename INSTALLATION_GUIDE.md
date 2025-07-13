# Hướng dẫn cài đặt chi tiết - AI Customer Support System

## 📋 Yêu cầu hệ thống

### Phần mềm cần thiết
- **Python 3.8+**: [Tải Python](https://www.python.org/downloads/)
- **Node.js 16+**: [Tải Node.js](https://nodejs.org/)
- **MongoDB 6.0+**: [Tải MongoDB](https://www.mongodb.com/try/download/community)
- **Git**: [Tải Git](https://git-scm.com/downloads)

### Kiểm tra cài đặt
```bash
# Kiểm tra Python
python --version

# Kiểm tra Node.js
node --version

# Kiểm tra npm
npm --version

# Kiểm tra Git
git --version
```

## 🚀 Cài đặt nhanh (Windows)

### Bước 1: Tải và giải nén
```bash
# Clone repository
git clone https://github.com/TusLee111/AI-Customer-Support.git
cd AI-Customer-Support
```

### Bước 2: Kiểm tra yêu cầu hệ thống
```bash
# Chạy script kiểm tra
check-requirements.bat
```

### Bước 3: Chạy tự động
```bash
# Chạy toàn bộ hệ thống
run.bat
```

## 🔧 Cài đặt thủ công

### Bước 1: Cài đặt MongoDB

#### Sử dụng Docker (Khuyến nghị)
```bash
# Cài đặt Docker Desktop từ https://www.docker.com/
# Chạy MongoDB container
docker run -d -p 27017:27017 --name mongodb mongo:6.0
```

#### Cài đặt trực tiếp
- **Windows**: Tải từ [MongoDB Download Center](https://www.mongodb.com/try/download/community)
- **Ubuntu**: `sudo apt-get install mongodb`
- **macOS**: `brew install mongodb-community`

### Bước 2: Cấu hình Backend

```bash
cd backend

# Tạo virtual environment
python -m venv venv

# Kích hoạt virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Cài đặt dependencies
pip install -r requirements.txt

# Tạo file cấu hình
cp env.example .env

# Chỉnh sửa file .env (tùy chọn)
# MONGO_URI="mongodb://localhost:27017"
# DB_NAME="ai_customer_support"
# SECRET_KEY="your_super_secret_key_here"

# Khởi động backend
python -m uvicorn app:socket_app --reload --host 0.0.0.0 --port 8000
```

### Bước 3: Cài đặt Frontend Admin

```bash
cd frontend/admin

# Cài đặt dependencies
npm install

# Khởi động admin interface
npm start
```

### Bước 4: Cài đặt Frontend Customer

```bash
cd frontend/customer

# Cài đặt dependencies
npm install

# Khởi động customer interface
PORT=3001 npm start
```

## 🐳 Sử dụng Docker

### Cài đặt Docker
- **Windows/macOS**: [Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Ubuntu**: `sudo apt-get install docker.io`

### Chạy với Docker Compose
```bash
# Build và chạy tất cả services
docker-compose up --build

# Chạy ở background
docker-compose up -d --build

# Dừng services
docker-compose down
```

## 🔗 Download AI Models

Vì lý do dung lượng, các mô hình AI không được lưu trực tiếp trên GitHub.  
Bạn cần tải về thủ công và giải nén vào đúng thư mục:

- [Download intent_model_v8 (Google Drive)](https://drive.google.com/your-link)
- [Download flan_t5_trained_model (Google Drive)](https://drive.google.com/your-link)

**Sau khi tải về, giải nén vào:**

## 🌐 Truy cập ứng dụng

Sau khi khởi động thành công:

| Service | URL | Mô tả |
|---------|-----|-------|
| Admin Interface | http://localhost:3000 | Giao diện quản trị viên |
| Customer Interface | http://localhost:3001 | Giao diện khách hàng |
| API Documentation | http://localhost:8000/docs | Tài liệu API |
| MongoDB | localhost:27017 | Cơ sở dữ liệu |

## 🔐 Tài khoản mặc định

### Admin Account
- **Username**: `admin`
- **Password**: `admin123`

### Customer Account
- Tạo tài khoản mới qua giao diện đăng ký tại http://localhost:3001

## 🐛 Xử lý lỗi thường gặp

### Lỗi MongoDB
```bash
# Kiểm tra MongoDB đang chạy
# Windows:
netstat -an | findstr :27017
# Linux/Mac:
netstat -an | grep :27017

# Khởi động MongoDB
# Windows: Start MongoDB service
# Linux: sudo systemctl start mongodb
# macOS: brew services start mongodb-community
```

### Lỗi Port đã được sử dụng
```bash
# Tìm process sử dụng port
# Windows:
netstat -ano | findstr :8000
# Linux/Mac:
lsof -i :8000

# Kill process
# Windows:
taskkill /PID <PID> /F
# Linux/Mac:
kill -9 <PID>
```

### Lỗi Node modules
```bash
# Xóa và cài lại node_modules
rm -rf node_modules package-lock.json
npm install
```



### Lỗi Python dependencies
```bash
# Tạo lại virtual environment
rm -rf venv
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
pip install -r requirements.txt
```

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra [Troubleshooting](#-xử-lý-lỗi-thường-gặp)
2. Xem [API Documentation](docs/API_DOCUMENTATION.md)
3. Liên hệ: 21207249@student.hcmus.edu.vn

## 📚 Tài liệu tham khảo

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Documentation](https://reactjs.org/docs/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Socket.IO Documentation](https://socket.io/docs/) 
