# backend/routes

Chứa các file định nghĩa API endpoint cho từng chức năng:

- `admin.py`: API cho quản trị viên (quản lý user, phòng chat...)
- `ai.py`: API liên quan đến AI (gợi ý, phân loại ý định...)
- `analytics.py`: API thống kê, báo cáo
- `auth.py`: API xác thực, đăng nhập/đăng ký, refresh token
- `chat.py`: API chat, gửi/nhận tin nhắn, quản lý phòng
- `public.py`: API public, không cần xác thực (lấy danh sách phòng, đăng ký...)
- `__init__.py`: Khởi tạo router 