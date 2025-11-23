from flask import Blueprint, request, jsonify
from src.services.chat_service import ChatService

chat_bp = Blueprint("chat", __name__, url_prefix="/api/chat")

@chat_bp.route("/rooms", methods=["POST"])
def create_room():
    """Tạo chat room mới"""
    data = request.json
    room, error = ChatService.create_room(data)

    if error:
        return jsonify({"error": error}), 400

    return jsonify(room.to_dict()), 201


@chat_bp.route("/rooms/user/<int:user_id>", methods=["GET"])
def get_user_rooms(user_id):
    """Lấy tất cả rooms của user"""
    rooms = ChatService.get_user_rooms(user_id)
    return jsonify([room.to_dict() for room in rooms]), 200


@chat_bp.route("/rooms/support/<int:support_user_id>", methods=["GET"])
def get_support_rooms(support_user_id):
    """Lấy rooms mà support user đang xử lý"""
    rooms = ChatService.get_support_rooms(support_user_id)
    return jsonify([room.to_dict() for room in rooms]), 200


@chat_bp.route("/rooms/waiting", methods=["GET"])
def get_waiting_rooms():
    """Lấy rooms đang chờ hỗ trợ (cho admin/technician)"""
    rooms = ChatService.get_waiting_rooms()
    return jsonify([room.to_dict() for room in rooms]), 200


@chat_bp.route("/rooms/<int:room_id>", methods=["GET"])
def get_room(room_id):
    """Lấy thông tin room"""
    room = ChatService.get_room(room_id)
    if not room:
        return jsonify({"error": "Room not found"}), 404

    return jsonify(room.to_dict()), 200


@chat_bp.route("/rooms/<int:room_id>/messages", methods=["GET"])
def get_messages(room_id):
    """Lấy tin nhắn của room"""
    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)

    messages = ChatService.get_messages(room_id, limit, offset)
    # Reverse để hiển thị tin nhắn cũ -> mới
    messages.reverse()

    return jsonify([msg.to_dict() for msg in messages]), 200


@chat_bp.route("/rooms/<int:room_id>/assign", methods=["PUT"])
def assign_support(room_id):
    """Assign support user vào room"""
    data = request.json

    # Validate required fields
    if not data or "support_user_id" not in data:
        return jsonify({"error": "Missing support_user_id"}), 400

    room, error = ChatService.assign_support(
        room_id,
        data.get("support_user_id"),
        data.get("support_user_name", "Support"),
        data.get("support_role", "admin")
    )

    if error:
        return jsonify({"error": error}), 400

    return jsonify(room.to_dict()), 200


@chat_bp.route("/rooms/<int:room_id>/close", methods=["PUT"])
def close_room(room_id):
    """Đóng chat room"""
    room, error = ChatService.close_room(room_id)

    if error:
        return jsonify({"error": error}), 400

    return jsonify(room.to_dict()), 200


@chat_bp.route("/rooms/<int:room_id>/read", methods=["PUT"])
def mark_as_read(room_id):
    """Đánh dấu tin nhắn đã đọc"""
    data = request.json
    user_id = data.get("user_id")

    success, error = ChatService.mark_messages_as_read(room_id, user_id)

    if error:
        return jsonify({"error": error}), 400

    return jsonify({"success": True}), 200


@chat_bp.route("/unread/<int:user_id>", methods=["GET"])
def get_unread_count(user_id):
    """Lấy số tin nhắn chưa đọc"""
    count = ChatService.get_unread_count(user_id)
    return jsonify({"unread_count": count}), 200
