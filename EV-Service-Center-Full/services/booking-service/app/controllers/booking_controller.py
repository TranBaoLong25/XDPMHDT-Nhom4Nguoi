from flask import Blueprint, request, jsonify
import booking_service as service

booking_bp = Blueprint("booking", __name__)

@booking_bp.route("/bookings", methods=["GET"])
def get_bookings():
    return jsonify(service.get_all_bookings())

@booking_bp.route("/bookings", methods=["POST"])
def create_booking():
    data = request.json
    required = ["customer_name", "service_type", "technician_id", "station_id", "start_time", "end_time"]
    if not all(k in data for k in required):
        return jsonify({"error": "Thiếu thông tin đặt lịch."}), 400

    result = service.create_booking(
        data["customer_name"],
        data["service_type"],
        data["technician_id"],
        data["station_id"],
        data["start_time"],
        data["end_time"]
    )
    return jsonify(result)
