from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from config.config import Base

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    phone = Column(String)
    address = Column(String)
    vehicle_model = Column(String, nullable=True)
    vin_number = Column(String, nullable=True)

    user = relationship("User", backref="profile")
