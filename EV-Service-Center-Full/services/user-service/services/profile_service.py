from models.user import User
from models.profile import Profile
from config.config import get_db

class ProfileService:
    def __init__(self, db):
        self.db = db

    def create_profile(self, user_id, phone, address, vehicle_model=None, vin_number=None):
        profile = Profile(user_id=user_id, phone=phone, address=address,
                          vehicle_model=vehicle_model, vin_number=vin_number)
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(profile)
        return profile

    def get_profile_by_user(self, user_id):
        return self.db.query(Profile).filter(Profile.user_id == user_id).first()

    def update_profile(self, user_id, phone=None, address=None):
        profile = self.db.query(Profile).filter(Profile.user_id == user_id).first()
        if not profile:
            return None
        if phone:
            profile.phone = phone
        if address:
            profile.address = address
        self.db.commit()
        self.db.refresh(profile)
        return profile
