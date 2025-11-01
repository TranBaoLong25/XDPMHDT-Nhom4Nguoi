# services/inventory-service/models/inventory_model.py
from app import db # ✅ Import 'db' từ app.py
from sqlalchemy import Column, Integer, String, Float, DateTime, func

class Inventory(db.Model):
    __tablename__ = "inventory"

    id = db.Column(db.Integer, primary_key=True, index=True)
    name = db.Column(db.String(255), index=True, nullable=False)
    part_number = db.Column(db.String(100), unique=True, index=True, nullable=False)
    quantity = db.Column(db.Integer, default=0, nullable=False)
    min_quantity = db.Column(db.Integer, default=0, nullable=False)
    price = db.Column(db.Float, default=0.0, nullable=False)
    
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())

    def to_dict(self):
        """Hàm helper để serialize object thành dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "part_number": self.part_number,
            "quantity": self.quantity,
            "min_quantity": self.min_quantity,
            "price": self.price,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }