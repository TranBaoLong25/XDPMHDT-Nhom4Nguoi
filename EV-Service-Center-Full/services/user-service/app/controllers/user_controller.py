from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from config.config import get_db
from services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("/")
def create_user(email: str, password: str, full_name: str, role: str, db: Session = Depends(get_db)):
    service = UserService(db)
    if service.get_user_by_email(email):
        raise HTTPException(status_code=400, detail="Email already registered")
    return service.create_user(email, password, full_name, role)

@router.get("/")
def get_all_users(db: Session = Depends(get_db)):
    return UserService(db).get_all_users()

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = UserService(db).delete_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"deleted": user_id}
