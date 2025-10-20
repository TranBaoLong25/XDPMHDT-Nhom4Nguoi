from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from config.config import get_db
from services.profile_service import ProfileService

router = APIRouter(prefix="/profiles", tags=["Profiles"])

@router.post("/")
def create_profile(user_id: int, phone: str, address: str, db: Session = Depends(get_db)):
    return ProfileService(db).create_profile(user_id, phone, address)

@router.get("/{user_id}")
def get_profile(user_id: int, db: Session = Depends(get_db)):
    profile = ProfileService(db).get_profile_by_user(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile
