import requests
import os
from app import db
from models.inventory_model import Inventory
from sqlalchemy import and_

# Cố gắng import NotificationHelper, nếu không có thì bỏ qua (để tránh lỗi import vòng nếu chưa setup)
try:
    from helpers.notification_helper import NotificationHelper
except ImportError:
    NotificationHelper = None

class InventoryService:
    """Service xử lý logic nghiệp vụ liên quan đến Inventory"""

    @staticmethod
    def get_item_by_id(item_id):
        """Lấy vật tư theo ID"""
        return Inventory.query.get(item_id)

    @staticmethod
    def get_item_by_part_number(part_number, center_id=1):
        """Lấy vật tư theo Part Number và Center ID"""
        # Mặc định tìm center 1 nếu không truyền
        cid = center_id if center_id is not None else 1
        return Inventory.query.filter(
            and_(
                Inventory.part_number == part_number,
                Inventory.center_id == cid
            )
        ).first()

    @staticmethod
    def get_all_items(center_id=None):
        """Lấy tất cả vật tư, có thể lọc theo chi nhánh"""
        query = Inventory.query
        if center_id:
            query = query.filter_by(center_id=center_id)
        
        # Sắp xếp theo ID giảm dần (mới nhất lên đầu)
        return query.order_by(Inventory.id.desc()).all()

    @staticmethod
    def create_item(data):
        """Tạo vật tư mới"""
        part_number = data.get("part_number")
        # Lấy center_id, mặc định là 1 nếu không gửi lên
        center_id = data.get("center_id", 1) 

        # Kiểm tra trùng part_number trong cùng 1 chi nhánh
        existing_item = InventoryService.get_item_by_part_number(part_number, center_id)
        if existing_item:
            return None, f"Mã phụ tùng '{part_number}' đã tồn tại tại chi nhánh {center_id}"

        new_item = Inventory(
            part_number=part_number,
            name=data.get("name"),
            quantity=data.get("quantity", 0),
            min_quantity=data.get("min_quantity", 10),
            price=data.get("price", 0),
            center_id=center_id  # Lưu center_id
        )

        try:
            db.session.add(new_item)
            db.session.commit()
            return new_item, None
        except Exception as e:
            db.session.rollback()
            return None, f"Lỗi khi tạo vật tư: {str(e)}"

    @staticmethod
    def update_item(item_id, data):
        """Cập nhật thông tin vật tư"""
        item = InventoryService.get_item_by_id(item_id)
        if not item:
            return None, "Không tìm thấy vật tư"
        
        old_quantity = item.quantity
        
        try:
            # Cập nhật các trường được phép
            if "name" in data: item.name = data["name"]
            if "quantity" in data: item.quantity = int(data["quantity"])
            if "min_quantity" in data: item.min_quantity = int(data["min_quantity"])
            if "price" in data: item.price = float(data["price"])
            if "center_id" in data: item.center_id = int(data["center_id"])
            
            db.session.commit()
            
            # --- Logic gửi cảnh báo ---
            if NotificationHelper:
                # 1. Cảnh báo hết hàng (Vừa giảm về 0)
                if item.quantity == 0 and old_quantity > 0:
                    InventoryService._notify_out_of_stock(item)
                
                # 2. Cảnh báo tồn kho thấp (Vừa giảm xuống dưới mức tối thiểu)
                elif item.quantity < item.min_quantity and old_quantity >= item.min_quantity:
                    InventoryService._notify_low_stock(item)
            
            return item, None
        except Exception as e:
            db.session.rollback()
            return None, f"Lỗi cập nhật: {str(e)}"

    @staticmethod
    def delete_item(item_id):
        """Xóa vật tư"""
        item = InventoryService.get_item_by_id(item_id)
        if not item:
            return False, "Không tìm thấy vật tư"

        try:
            db.session.delete(item)
            db.session.commit()
            return True, "Đã xóa vật tư thành công"
        except Exception as e:
            db.session.rollback()
            return False, f"Lỗi xóa vật tư: {str(e)}"

    # ================= INTERNAL HELPER METHODS =================

    @staticmethod
    def _get_admin_user_ids():
        """
        Lấy danh sách ID của Admin từ User Service
        (Tạm thời hardcode ID 1 là Admin, sau này cần gọi API sang User Service)
        """
        return [1]

    @staticmethod
    def _notify_low_stock(item):
        """Gửi thông báo tồn kho thấp"""
        if not NotificationHelper: return
        
        admin_ids = InventoryService._get_admin_user_ids()
        title = "⚠️ Cảnh báo tồn kho thấp"
        message = f"Phụ tùng '{item.name}' (#{item.part_number}) tại Chi nhánh {item.center_id} sắp hết (Còn {item.quantity})."
        
        NotificationHelper.send_to_multiple_users(
            user_ids=admin_ids,
            notification_type="inventory_alert",
            title=title,
            message=message,
            priority="high",
            related_entity_type="inventory",
            related_entity_id=item.id
        )

    @staticmethod
    def _notify_out_of_stock(item):
        """Gửi thông báo hết hàng"""
        if not NotificationHelper: return

        admin_ids = InventoryService._get_admin_user_ids()
        title = "🚨 HẾT HÀNG KHẨN CẤP"
        message = f"Phụ tùng '{item.name}' (#{item.part_number}) tại Chi nhánh {item.center_id} ĐÃ HẾT HÀNG!"
        
        NotificationHelper.send_to_multiple_users(
            user_ids=admin_ids,
            notification_type="inventory_alert",
            title=title,
            message=message,
            priority="urgent",
            related_entity_type="inventory",
            related_entity_id=item.id
        )