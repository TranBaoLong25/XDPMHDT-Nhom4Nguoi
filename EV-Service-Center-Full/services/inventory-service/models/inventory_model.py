from sqlalchemy import Column, Integer, String, Float
from config.config import Base

class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    part_number = Column(String, unique=True, nullable=False)
    quantity = Column(Integer, default=0)
    min_quantity = Column(Integer, default=0)
    price = Column(Float, default=0.0)
