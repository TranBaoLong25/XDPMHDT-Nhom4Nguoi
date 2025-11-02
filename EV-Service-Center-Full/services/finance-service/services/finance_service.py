# File: services/finance-service/services/finance_service.py
import os
import requests
from flask import current_app
from app import db
from models.finance_model import Invoice, InvoiceItem 

class FinanceService:
    """Service xử lý logic nghiệp vụ Tài chính và Hóa đơn"""

    @staticmethod
    def _call_internal_api(service_url, endpoint, method="GET", json_data=None):
        """Hàm nội bộ gọi Internal API của các service khác"""
        internal_token = current_app.config.get("INTERNAL_SERVICE_TOKEN")
        url = f"{service_url}{endpoint}"
        headers = {"X-Internal-Token": internal_token}
        
        if not service_url or not internal_token:
             return None, "Lỗi cấu hình Service URL hoặc Internal Token."

        try:
            if method == "GET":
                response = requests.get(url, headers=headers)
            elif method == "PUT":
                response = requests.put(url, headers=headers, json=json_data)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=json_data)
            else:
                return None, "Lỗi: Phương thức không hỗ trợ."

            if response.status_code == 200 or response.status_code == 201:
                return response.json(), None
            else:
                # Trích xuất lỗi từ response body nếu có
                error_msg = response.json().get('error', f"Lỗi Service (HTTP {response.status_code})")
                return None, error_msg
        except requests.exceptions.RequestException as e:
            return None, f"Lỗi kết nối Service: {str(e)}"

    @staticmethod
    def _get_booking_details(booking_id):
        """Lấy chi tiết Booking từ Booking Service"""
        booking_url = current_app.config.get("BOOKING_SERVICE_URL")
        # Endpoint NỘI BỘ mới (đã được bảo vệ bằng X-Internal-Token)
        return FinanceService._call_internal_api(booking_url, f"/internal/bookings/items/{booking_id}")
    
    @staticmethod
    def _get_inventory_item(item_id):
        """Lấy chi tiết Vật tư từ Inventory Service"""
        inventory_url = current_app.config.get("INVENTORY_SERVICE_URL")
        # Endpoint GET BY ID (đã được bảo vệ bằng Internal Token)
        return FinanceService._call_internal_api(inventory_url, f"/api/inventory/items/{item_id}")

    @staticmethod
    def _update_inventory_quantity(item_id, new_quantity):
        """Cập nhật tồn kho bằng cách gọi PUT Inventory Service (đã được bảo vệ Admin)"""
        inventory_url = current_app.config.get("INVENTORY_SERVICE_URL")
        endpoint = f"/api/inventory/items/{item_id}"
        
        # Dùng phương thức PUT để cập nhật
        return FinanceService._call_internal_api(inventory_url, endpoint, "PUT", {"quantity": new_quantity})


    @staticmethod
    def create_invoice_from_booking(booking_id, parts_data):
        """
        Tạo Hóa đơn mới từ Booking ID, bao gồm cả việc trừ tồn kho.
        """
        # 1. Lấy chi tiết Booking
        booking_data, error = FinanceService._get_booking_details(booking_id)
        if error:
            return None, f"Lỗi khi lấy Booking: {error}"

        user_id = booking_data.get('user_id')
        
        # Kiểm tra trùng lặp
        if Invoice.query.filter_by(booking_id=booking_id).first():
            return None, "Hóa đơn cho Booking này đã tồn tại."

        # TẠO TRANSACTION CHUNG
        try:
            total_amount = 0.0
            
            new_invoice = Invoice(
                booking_id=booking_id,
                user_id=user_id,
                total_amount=0.0 
            )
            db.session.add(new_invoice)
            db.session.flush() # Lấy ID của Invoice mới

            # 2. Thêm Dịch vụ (Service Item)
            service_price = 500000.0 # Giá công thợ cố định
            service_item = InvoiceItem(
                invoice_id=new_invoice.id,
                item_type="service",
                description=f"Dịch vụ: {booking_data.get('service_type', 'Bảo dưỡng')}",
                quantity=1,
                unit_price=service_price,
                sub_total=service_price
            )
            db.session.add(service_item)
            total_amount += service_price
            
            # 3. Thêm Phụ tùng (Part Items) VÀ TRỪ TỒN KHO (FIX LỖI)
            for part in parts_data:
                item_id = part.get('item_id')
                quantity = part.get('quantity')
                
                if not item_id or not isinstance(quantity, int) or quantity <= 0:
                    continue 

                # Lấy thông tin vật tư
                inventory_item, error = FinanceService._get_inventory_item(item_id)
                if error:
                    db.session.rollback()
                    return None, f"Lỗi: Không tìm thấy phụ tùng ID {item_id} hoặc Inventory Service lỗi."
                
                current_quantity = inventory_item.get('quantity', 0)
                new_quantity = current_quantity - quantity

                if new_quantity < 0:
                    db.session.rollback()
                    return None, f"Lỗi: Tồn kho cho phụ tùng ID {item_id} không đủ. Cần {quantity}, hiện có {current_quantity}."

                # GỌI API ĐỂ TRỪ TỒN KHO THỰC TẾ
                update_response, update_error = FinanceService._update_inventory_quantity(item_id, new_quantity)

                if update_error:
                    db.session.rollback()
                    return None, f"Lỗi khi cập nhật tồn kho ID {item_id}: {update_error}"
                
                # Tính toán và lưu Invoice Item
                unit_price = inventory_item.get('price', 0.0)
                sub_total = unit_price * quantity
                
                part_item = InvoiceItem(
                    invoice_id=new_invoice.id,
                    item_type="part",
                    description=inventory_item.get('name', 'Phụ tùng không tên'),
                    quantity=quantity,
                    unit_price=unit_price,
                    sub_total=sub_total
                )
                db.session.add(part_item)
                total_amount += sub_total
            
            # 4. Cập nhật tổng tiền và Commit
            new_invoice.total_amount = total_amount
            db.session.commit()
            
            # 5. Cập nhật trạng thái Booking sang 'completed' (sau khi lập hóa đơn)
            booking_update_url = current_app.config.get("BOOKING_SERVICE_URL")
            FinanceService._call_internal_api(booking_update_url, f"/api/bookings/items/{booking_id}/status", "PUT", {"status": "completed"})

            return new_invoice, None

        except Exception as e:
            db.session.rollback()
            return None, f"Lỗi khi tạo hóa đơn: {str(e)}"
    
    @staticmethod
    def get_invoice_with_items(invoice_id):
        # ... (giữ nguyên logic) ...
        invoice = Invoice.query.get(invoice_id)
        if not invoice:
            return None, "Không tìm thấy Hóa đơn."
        
        items_list = [item.to_dict() for item in invoice.items.all()]

        result = invoice.to_dict()
        result["items"] = items_list
        return result, None

    @staticmethod
    def get_all_invoices():
        # ... (giữ nguyên logic) ...
        return Invoice.query.order_by(Invoice.created_at.desc()).all()
    
    @staticmethod
    def get_invoices_by_user(user_id):
        # ... (giữ nguyên logic) ...
        try:
            user_id_int = int(user_id)
        except ValueError:
            return []

        return Invoice.query.filter_by(user_id=user_id_int).order_by(Invoice.created_at.desc()).all()

    @staticmethod
    def update_invoice_status(invoice_id, new_status):
        # ... (giữ nguyên logic) ...
        invoice = Invoice.query.get(invoice_id)
        if not invoice:
            return None, "Không tìm thấy Hóa đơn."
        
        valid_statuses = [str(s.value) for s in Invoice.status.type.enums]
        if new_status not in valid_statuses:
            return None, f"Trạng thái '{new_status}' không hợp lệ. Phải là: {', '.join(valid_statuses)}"
        
        try:
            invoice.status = new_status
            db.session.commit()
            return invoice, None
        except Exception as e:
            db.session.rollback()
            return None, f"Lỗi khi cập nhật trạng thái: {str(e)}"