# Backend

Thư mục này chứa toàn bộ mã nguồn backend của hệ thống CodeWeb - AI Customer Support.

## Chức năng chính
- Xử lý API (FastAPI)
- Kết nối và thao tác với MongoDB
- Xử lý logic chat real-time qua Socket.IO
- Tích hợp AI (phân loại ý định, gợi ý trả lời)

## Các thư mục/file quan trọng
- `app.py`: Điểm khởi động backend
- `routes/`: Định nghĩa các API endpoint (auth, chat, admin, ai...)
- `services/`: Xử lý logic nghiệp vụ, AI, chat, token...
- `models/`: Định nghĩa schema dữ liệu (Pydantic, MongoDB)
- `database/`: Kết nối và khởi tạo database
- `socketio_instance.py`: Khởi tạo Socket.IO server
- `requirements.txt`: Danh sách thư viện Python cần thiết

## Hướng dẫn
- Cài đặt Python 3.8+, MongoDB
- Cài dependencies: `pip install -r requirements.txt`
- Chạy server: `python -m uvicorn app:socket_app --reload` 