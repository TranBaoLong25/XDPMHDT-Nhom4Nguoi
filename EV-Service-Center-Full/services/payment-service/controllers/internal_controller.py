from flask import Blueprint, request, jsonify, current_app
from services.payment_service import PaymentService

internal_bp = Blueprint("internal_payment", __name__, url_prefix="/internal/payments")

@internal_bp.before_request
def verify_internal_token():
    """Xác thực Internal Service Token"""
    token = request.headers.get("X-Internal-Token")
    expected_token = current_app.config.get("INTERNAL_SERVICE_TOKEN")
    
    if not token or token != expected_token:
        return jsonify({"error": "Unauthorized internal request"}), 401

@internal_bp.route("/all", methods=["GET"])
def get_all_transactions():
    """Lấy tất cả giao dịch thanh toán (cho report-service)"""
    transactions = PaymentService.get_all_history()
    return jsonify([t.to_dict() for t in transactions]), 200
