# services/inventory-service/services/inventory_service.py
from app import db # ✅ Import 'db' từ app.py
from models.inventory_model import Inventory

class InventoryService:

    @staticmethod
    def get_item_by_id(item_id):
        return Inventory.query.get(item_id)

    @staticmethod
    def get_item_by_part_number(part_number):
        return Inventory.query.filter_by(part_number=part_number).first()

    @staticmethod
    def get_all_items():
        return Inventory.query.all()

    @staticmethod
    def get_low_stock_items():
        return Inventory.query.filter(Inventory.quantity < Inventory.min_quantity).all()

    @staticmethod
    def create_item(data):
        """Tạo vật tư mới từ dictionary."""
        if InventoryService.get_item_by_part_number(data['part_number']):
            return None, f"Part number '{data['part_number']}' already exists"

        try:
            new_item = Inventory(
                name=data['name'],
                part_number=data['part_number'],
                quantity=data['quantity'],
                min_quantity=data['min_quantity'],
                price=data['price']
            )
            db.session.add(new_item)
            db.session.commit()
            return new_item, None
        except Exception as e:
            db.session.rollback()
            return None, f"Error creating item: {str(e)}"

    @staticmethod
    def update_item(item_id, data):
        """Cập nhật vật tư từ dictionary."""
        item = InventoryService.get_item_by_id(item_id)
        if not item:
            return None, "Item not found"

        try:
            # Cập nhật các trường nếu chúng tồn tại trong 'data'
            for field in ['name', 'quantity', 'min_quantity', 'price']:
                if field in data:
                    setattr(item, field, data[field])
            
            db.session.commit()
            return item, None
        except Exception as e:
            db.session.rollback()
            return None, f"Error updating item: {str(e)}"

    @staticmethod
    def delete_item(item_id):
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