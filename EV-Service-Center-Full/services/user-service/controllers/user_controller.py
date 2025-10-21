from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from services.user_service import UserService
from config.config import get_db

router = APIRouter(tags=["Users"])

@router.post("/")
def create_user(
    username: str = Body(...), 
    password: str = Body(...),
    db: Session = Depends(get_db)
):
    service = UserService(db)
    if service.get_user_by_username(username):
        raise HTTPException(status_code=400, detail="Username already exists")
    return service.create_user(username=username, password=password)

@router.get("/")
def get_all_users(db: Session = Depends(get_db)):
    return UserService(db).get_all_users()

@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = UserService(db).delete_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"deleted": user_id}
