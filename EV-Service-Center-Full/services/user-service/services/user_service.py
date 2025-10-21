from models.user import User
from models.profile import Profile
from config.config import get_db



class UserService:
    def __init__(self, db):
        self.db = db

    def create_user(self, username, password, role="user"):
        new_user = User(username=username, password=password, role=role)
        self.db.add(new_user)
        self.db.commit()
        self.db.refresh(new_user)
        return new_user

    def get_user_by_username(self, username):
        return self.db.query(User).filter(User.username == username).first()

    def get_all_users(self):
        return self.db.query(User).all()

    def delete_user(self, user_id):
        user = self.db.query(User).filter(User.id == user_id).first()
        if user:
            self.db.delete(user)
            self.db.commit()
        return user
