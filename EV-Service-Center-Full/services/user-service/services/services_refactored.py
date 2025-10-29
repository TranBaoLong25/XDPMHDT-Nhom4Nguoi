from models.user import User
from models.profile import Profile
from app import db  # ✅ Import từ app
from werkzeug.security import generate_password_hash

class UserService:
    """Service xử lý logic nghiệp vụ liên quan đến User"""
    
    @staticmethod
    def create_user(email, username, password, role="user"):
        """Tạo user mới"""
        # Kiểm tra email đã tồn tại
        if User.query.filter_by(email=email).first():
            return None, "Email đã được sử dụng"
        
        # Kiểm tra username đã tồn tại
        if User.query.filter_by(username=username).first():
            return None, "Tên đăng nhập đã được sử dụng"
        
        # Tạo user mới
        user = User(
            email=email,
            username=username,
            role=role,
            status="active"
        )
        user.set_password(password)
        
        try:
            db.session.add(user)
            db.session.commit()
            
            # Tự động tạo profile trống cho user
            profile = Profile(user_id=user.user_id)
            db.session.add(profile)
            db.session.commit()
            
            return user, None
        except Exception as e:
            db.session.rollback()
            return None, f"Lỗi khi tạo tài khoản: {str(e)}"
    
    @staticmethod
    def get_user_by_id(user_id):
        """Lấy user theo ID"""
        return User.query.get(user_id)
    
    @staticmethod
    def get_user_by_email(email):
        """Lấy user theo email"""
        return User.query.filter_by(email=email).first()
    
    @staticmethod
    def get_user_by_username(username):
        """Lấy user theo username"""
        return User.query.filter_by(username=username).first()
    
    @staticmethod
    def get_user_by_email_or_username(email_or_username):
        """Lấy user theo email HOẶC username"""
        user = User.query.filter(
            (User.email == email_or_username) | 
            (User.username == email_or_username)
        ).first()
        return user
    
    @staticmethod
    def get_all_users():
        """Lấy tất cả users (cho admin)"""
        return User.query.all()
    
    @staticmethod
    def toggle_user_lock(user_id):
        """Khóa/mở khóa user"""
        user = User.query.get(user_id)
        if not user:
            return None, "Không tìm thấy người dùng"
        
        # Toggle status
        user.status = "locked" if user.status == "active" else "active"
        
        try:
            db.session.commit()
            return user, None
        except Exception as e:
            db.session.rollback()
            return None, f"Lỗi khi cập nhật trạng thái: {str(e)}"
    
    @staticmethod
    def delete_user(user_id):
        """Xóa user"""
        user = User.query.get(user_id)
        if not user:
            return False, "Không tìm thấy người dùng"
        
        try:
            # Xóa profile trước (nếu có foreign key constraint)
            Profile.query.filter_by(user_id=user_id).delete()
            
            # Xóa user
            db.session.delete(user)
            db.session.commit()
            return True, "Xóa người dùng thành công"
        except Exception as e:
            db.session.rollback()
            return False, f"Lỗi khi xóa người dùng: {str(e)}"


class ProfileService:
    """Service xử lý logic nghiệp vụ liên quan đến Profile"""
    
    @staticmethod
    def get_profile_by_user_id(user_id):
        """Lấy profile theo user_id"""
        return Profile.query.filter_by(user_id=user_id).first()
    
    @staticmethod
    def update_profile(user_id, profile_data):
        """Cập nhật profile"""
        profile = Profile.query.filter_by(user_id=user_id).first()
        
        # Nếu chưa có profile thì tạo mới
        if not profile:
            profile = Profile(user_id=user_id)
            db.session.add(profile)
        
        # Cập nhật các trường
        if "phone_number" in profile_data:
            profile.phone_number = profile_data["phone_number"]
        if "address" in profile_data:
            profile.address = profile_data["address"]
        if "vehicle_model" in profile_data:
            profile.vehicle_model = profile_data["vehicle_model"]
        if "vin_number" in profile_data:
            profile.vin_number = profile_data["vin_number"]
        if "full_name" in profile_data:
            profile.full_name = profile_data["full_name"]
        
        try:
            db.session.commit()
            return profile, None
        except Exception as e:
            db.session.rollback()
            return None, f"Lỗi khi cập nhật hồ sơ: {str(e)}"
    
    @staticmethod
    def get_profile_details(user_id):
        """Lấy thông tin chi tiết profile"""
        profile = Profile.query.filter_by(user_id=user_id).first()
        if not profile:
            return None, "Không tìm thấy hồ sơ"
        
        return {
            "full_name": profile.full_name,
            "phone_number": profile.phone_number,
            "address": profile.address,
            "vehicle_model": profile.vehicle_model,
            "vin_number": profile.vin_number
        }, None