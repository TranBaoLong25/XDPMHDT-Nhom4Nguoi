from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.config import Base, engine
from routes import routers  # Danh sách các router
import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

app = FastAPI(title="Inventory Service - EV System")

# Cho phép truy cập CORS từ mọi nguồn
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Tạo bảng trong DB (nếu chưa có)
Base.metadata.create_all(bind=engine)

# Gắn router (nếu có nhiều router trong routes/)
for router in routers:
    app.include_router(router)
