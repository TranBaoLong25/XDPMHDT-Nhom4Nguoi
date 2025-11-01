# services/inventory-service/controllers/inventory_controller.py
from flask import Blueprint, request, jsonify
from services.inventory_service import InventoryService

# ✅ Khởi tạo Blueprint (giống user-service)
inventory_bp = Blueprint('inventory', __name__)

@inventory_bp.route("/", methods=["POST"])
def create_item():
    data = request.get_json()
    
    # ✅ Validation thủ công (giống user-service)
    required_fields = ["name", "part_number", "quantity", "min_quantity", "price"]
    if not data or not all(k in data for k in required_fields):
        return jsonify({"error": f"Missing required fields: {required_fields}"}), 400
    
    item, error = InventoryService.create_item(data)
    if error:
        return jsonify({"error": error}), 409 # 409 Conflict
    
    return jsonify({
        "message": "Item created successfully", 
        "item": item.to_dict()
    }), 201

@inventory_bp.route("/", methods=["GET"])
def get_all_items():
    items = InventoryService.get_all_items()
    return jsonify([item.to_dict() for item in items]), 200

@inventory_bp.route("/<int:item_id>", methods=["GET"])
def get_item(item_id):
    item = InventoryService.get_item_by_id(item_id)
    if not item:
        return jsonify({"error": "Item not found"}), 404
    return jsonify(item.to_dict()), 200

@inventory_bp.route("/<int:item_id>", methods=["PUT"])
def update_item(item_id):
    data = request.get_json()
    item, error = InventoryService.update_item(item_id, data)
    
    if error:
        return jsonify({"error": error}), (404 if "not found" in error else 400)
    
    return jsonify({
        "message": "Item updated successfully",
        "item": item.to_dict()
    }), 200

@inventory_bp.route("/<int:item_id>", methods=["DELETE"])
def delete_item(item_id):
    success, message = InventoryService.delete_item(item_id)
    if not success:
        return jsonify({"error": message}), 404
    return jsonify({"message": message}), 200

@inventory_bp.route("/low-stock", methods=["GET"])
def get_low_stock():
    items = InventoryService.get_low_stock_items()
    return jsonify([item.to_dict() for item in items]), 200