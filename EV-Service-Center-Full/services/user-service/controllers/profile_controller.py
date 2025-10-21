from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from services.profile_service import ProfileService
from config.config import get_db

router = APIRouter(prefix="/profiles", tags=["Profiles"])

@router.post("/")
def create_profile(user_id: int, phone: str, address: str, db: Session = Depends(get_db)):
    return ProfileService(db).create_profile(user_id, phone, address)

@router.get("/{user_id}")
def get_profile(user_id: int, db: Session = Depends(get_db)):
    service = ProfileService(db)
    profile = service.get_profile_by_user_id(user_id)  # ✅ sửa lại tên hàm
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile
