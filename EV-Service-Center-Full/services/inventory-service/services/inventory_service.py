# File: services/inventory-service/services/inventory_service.py
from app import db
from models.inventory_model import Inventory # Giả định import model từ thư mục models

class InventoryService:
    """Service xử lý logic nghiệp vụ liên quan đến Inventory"""

    @staticmethod
    def get_item_by_id(item_id):
        """Lấy vật tư theo ID"""
        #
        return Inventory.query.get(item_id)

    @staticmethod
    def get_item_by_part_number(part_number):
        """Lấy vật tư theo Part Number (Mã phụ tùng)"""
        #
        return Inventory.query.filter_by(part_number=part_number).first()

    @staticmethod
    def get_all_items():
        """Lấy tất cả vật tư"""
        #
        return Inventory.query.all()

    @staticmethod
    def get_low_stock_items(min_quantity=10):
        """Lấy các vật tư có tồn kho thấp hơn mức tối thiểu"""
        #
        return Inventory.query.filter(Inventory.quantity <= Inventory.min_quantity).all()

    @staticmethod
    def create_item(data):
        """Tạo vật tư mới"""
        #
        part_number = data.get("part_number")
        if InventoryService.get_item_by_part_number(part_number):
            return None, f"Part number '{part_number}' already exists"

        new_item = Inventory(
            part_number=part_number,
            name=data.get("name"),
            quantity=data.get("quantity", 0),
            min_quantity=data.get("min_quantity", 10),
            price=data.get("price")
        )

        try:
            db.session.add(new_item)
            db.session.commit()
            return new_item, None
        except Exception as e:
            db.session.rollback()
            return None, f"Error creating item: {str(e)}"

    @staticmethod
    def update_item(item_id, data):
        """Cập nhật vật tư"""
        #
        item = InventoryService.get_item_by_id(item_id)
        if not item:
            return None, "Item not found"

        try:
            for field, value in data.items():
                if hasattr(item, field):
                    setattr(item, field, value)

            db.session.commit()
            return item, None
        except Exception as e:
            db.session.rollback()
            return None, f"Error updating item: {str(e)}"

    @staticmethod
    def delete_item(item_id):
        """Xóa vật tư"""
        #
        item = InventoryService.get_item_by_id(item_id)
        if not item:
            return False, "Item not found"

        try:
            db.session.delete(item)
            db.session.commit()
            return True, "Item deleted successfully"
        except Exception as e:
            db.session.rollback()
            return False, f"Error deleting item: {str(e)}"

# Giả định InventoryService được import từ controllers.