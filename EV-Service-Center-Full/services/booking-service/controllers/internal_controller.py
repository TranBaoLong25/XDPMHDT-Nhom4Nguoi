from flask import Blueprint, request, jsonify, current_app
from services.booking_service import BookingService

internal_bp = Blueprint("internal_booking", __name__, url_prefix="/internal/bookings")

@internal_bp.before_request
def verify_internal_token():
    """Xác thực Internal Service Token"""
    token = request.headers.get("X-Internal-Token")
    expected_token = current_app.config.get("INTERNAL_SERVICE_TOKEN")
    
    if not token or token != expected_token:
        return jsonify({"error": "Unauthorized internal request"}), 401

@internal_bp.route("/all", methods=["GET"])
def get_all_bookings():
    """Lấy tất cả bookings (cho report-service)"""
    bookings = BookingService.get_all_bookings()
    return jsonify([b.to_dict() for b in bookings]), 200

@internal_bp.route("/items/<int:booking_id>", methods=["GET"])
def get_booking_by_id(booking_id):
    """Lấy chi tiết booking theo ID (cho finance-service)"""
    booking = BookingService.get_booking_by_id(booking_id)
    if not booking:
        return jsonify({"error": "Booking not found"}), 404
    return jsonify(booking.to_dict()), 200
