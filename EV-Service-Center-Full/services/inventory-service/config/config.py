# services/inventory-service/config/config.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Tải các biến môi trường từ file .env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Tạo "engine" kết nối CSDL
engine = create_engine(DATABASE_URL)

# Tạo một "phiên" (session) để giao tiếp CSDL
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Tạo một lớp Base cho tất cả các Model (định nghĩa bảng) kế thừa
Base = declarative_base()

# Hàm này sẽ được dùng để "tiêm" (inject) session CSDL vào các API
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()