from fastapi import FastAPI
from config.config import Base, engine
from controllers import user_controller, profile_controller

app = FastAPI(title="User Service - EV System")

# Khởi tạo DB
Base.metadata.create_all(bind=engine)

# Gắn route
app.include_router(user_controller.router)
app.include_router(profile_controller.router)
