# ⚡ EV-Service-Center Microservice System

Hệ thống quản lý trung tâm dịch vụ xe điện (EV Service Center), được thiết kế theo kiến trúc **Microservice** sử dụng **FastAPI**, **PostgreSQL**, **Redis**, và **Docker Compose**.

---

## 🏗️ Kiến trúc hệ thống

- **api-gateway/** → Nginx làm cổng giao tiếp
- **frontend/** → Giao diện chính (HTML/CSS/JS)
- **services/**
  - `user-service/` → Đăng ký, đăng nhập, quản lý tài khoản
  - `listing-service/` → Quản lý danh sách dịch vụ
  - (Có thể mở rộng thêm các service khác sau)
- **PostgreSQL** → Database chính
- **Redis** → Lưu cache & session
- **Docker Compose** → Dàn orchestration toàn hệ thống

---

## ⚙️ Chạy hệ thống

```bash
# Bước 1: Build và khởi động tất cả container
docker compose up --build

# Bước 2: Truy cập
# API Gateway: http://localhost
# User Service: http://localhost:5000/docs
# Listing Service: http://localhost:5001/docs
# Frontend: http://localhost:8080
```
