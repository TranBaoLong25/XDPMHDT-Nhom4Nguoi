from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from config.config import Base, engine, get_db
from routes import router as main_router
from sqlalchemy.orm import Session
from models.user import User

app = FastAPI(title="User Service - EV System")

# 🧩 Bật CORS để cho phép frontend (8080) truy cập
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # hoặc ["http://localhost:8080"] nếu muốn giới hạn
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🧱 Tạo bảng trong database
Base.metadata.create_all(bind=engine)

# 🧭 Gắn router
app.include_router(main_router)

# 👑 Tạo tài khoản admin mặc định
def init_admin():
    db: Session = next(get_db())
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        new_admin = User(username="admin", password="123456", role="admin")
        db.add(new_admin)
        db.commit()
        print("✅ Admin account created: username=admin, password=123456")
    else:
        print("ℹ️ Admin account already exists.")
    db.close()

# 🚀 Chạy init_admin khi app khởi động
@app.on_event("startup")
def on_startup():
    init_admin()
