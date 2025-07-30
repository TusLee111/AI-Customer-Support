# CodeWeb - AI Customer Support System

Hệ thống hỗ trợ khách hàng sử dụng AI, gồm các thành phần chính:

- **backend/**: API, xử lý logic, kết nối cơ sở dữ liệu, Socket.IO (FastAPI + MongoDB)
- **frontend/admin/**: Giao diện quản trị viên (React)
- **frontend/customer/**: Giao diện khách hàng (React)
- **backup/**: Lưu trữ các bản backup hệ thống
- **docs/**: Tài liệu hướng dẫn, mô tả API, kiến trúc

## 🚀 Cài đặt và chạy hệ thống

### Yêu cầu hệ thống
- Python 3.8+
- Node.js 16+
- MongoDB 6.0+
- npm hoặc yarn

---

### **Lưu ý về file cấu hình môi trường (`.env`)**

> **File `.env` KHÔNG được upload lên GitHub vì lý do bảo mật.**  
> **Bạn cần tự tạo file `.env` từ file mẫu `env.example` trước khi chạy backend.**

**Cách tạo file `.env`:**
```bash
# Trong thư mục backend, chạy:
cp env.example .env
# (Trên Windows: copy env.example .env)
# Sau đó chỉnh sửa file .env nếu cần (ví dụ: đổi tên database, secret key...)
```

---

### Cách 1: Chạy tự động (Khuyến nghị)

#### Trên Windows:
```bash
# Kiểm tra yêu cầu hệ thống
check-requirements.bat

# Chạy toàn bộ hệ thống
run.bat
```

#### Trên Linux/Mac:
```bash
# Cấp quyền thực thi
chmod +x run.sh setup.sh

# Chạy toàn bộ hệ thống
./run.sh
```

---

### Cách 2: Chạy thủ công

#### Bước 1: Cài đặt MongoDB
```bash
# Sử dụng Docker (khuyến nghị)
docker run -d -p 27017:27017 --name mongodb mongo:6.0

# Hoặc cài đặt trực tiếp
# Ubuntu: sudo apt-get install mongodb
# macOS: brew install mongodb-community
```

#### Bước 2: Cấu hình backend
```bash
cd backend

# Tạo virtual environment
python -m venv venv

# Kích hoạt virtual environment
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate

# Cài đặt dependencies
pip install -r requirements.txt

# Tạo file .env từ env.example (bắt buộc)
cp env.example .env
# (Trên Windows: copy env.example .env)
# Chỉnh sửa file .env theo cần thiết

# Khởi động backend
python -m uvicorn app:socket_app --reload --host 0.0.0.0 --port 8000
# Hoặc python app.py
```

#### Bước 3: Cài đặt frontend admin
```bash
cd frontend/admin

# Cài đặt dependencies
npm install

# Khởi động admin interface
npm start
```

#### Bước 4: Cài đặt frontend customer
```bash
cd frontend/customer

# Cài đặt dependencies
npm install

# Khởi động customer interface (port 3001)
PORT=3001 npm start
```

---

### Cách 3: Sử dụng Docker
```bash
# Build và chạy tất cả services
docker-compose up --build

# Chạy ở background
docker-compose up -d --build
```

---

## 🌐 Truy cập ứng dụng

Sau khi khởi động thành công:
- **Admin Interface**: http://localhost:3000
- **Customer Interface**: http://localhost:3001
- **API Documentation**: http://localhost:8000/docs
- **MongoDB**: localhost:27017

---

## 🔐 Tài khoản mặc định

### Admin Account
- **Username**: admin
- **Password**: admin123

### Test Customer
- Tạo tài khoản mới qua giao diện đăng ký

---

## 📁 Cấu trúc thư mục
- `backend/`: Source code backend, API, services, models, routes...
- `frontend/admin/`: Source code giao diện admin
- `frontend/customer/`: Source code giao diện khách hàng
- `backup/`: Các bản backup dữ liệu/code
- `docs/`: Tài liệu hệ thống

---

## 🐛 Troubleshooting

### Lỗi thường gặp
1. **MongoDB không kết nối**: Kiểm tra MongoDB đang chạy trên port 27017
2. **Port đã được sử dụng**: Tắt các service khác hoặc thay đổi port
3. **Node modules lỗi**: Xóa node_modules và cài lại `npm install`
4. **Python dependencies lỗi**: Tạo lại virtual environment và cài lại `pip install -r requirements.txt`
5. **Thiếu file .env**: Đảm bảo đã copy `env.example` thành `.env` trong thư mục backend

---

## 📞 Liên hệ
- Tác giả: Lê Hoàng Tú - 21207249
- Email: 21207249@student.hcmus.edu.vn 
