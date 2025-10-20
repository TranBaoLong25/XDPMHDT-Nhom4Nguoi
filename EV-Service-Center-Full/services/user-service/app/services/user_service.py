from models.user import User
from config.config import SessionLocal

class UserService:
    def __init__(self, db):
        self.db = db

    def create_user(self, email, password, full_name, role):
        new_user = User(email=email, password=password, full_name=full_name, role=role)
        self.db.add(new_user)
        self.db.commit()
        self.db.refresh(new_user)
        return new_user

    def get_user_by_email(self, email):
        return self.db.query(User).filter(User.email == email).first()

    def get_all_users(self):
        return self.db.query(User).all()

    def delete_user(self, user_id):
        user = self.db.query(User).filter(User.id == user_id).first()
        if user:
            self.db.delete(user)
            self.db.commit()
        return user
