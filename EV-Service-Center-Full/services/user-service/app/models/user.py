from sqlalchemy import Column, Integer, String, Enum
from config.config import Base
import enum

class UserRole(str, enum.Enum):
    customer = "customer"
    staff = "staff"
    technician = "technician"
    admin = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(Enum(UserRole), default=UserRole.customer)
