from flask_socketio import emit, join_room, leave_room, rooms
from src.services.chat_service import ChatService

# Store connected users: {socket_id: {user_id, user_name, role}}
connected_users = {}

def register_socket_events(socketio):
    """Đăng ký các socket events"""

    @socketio.on('connect')
    def handle_connect():
        """Client kết nối"""
        print(f"🔌 Client connected: {request.sid}")
        emit('connected', {'sid': request.sid})

    @socketio.on('disconnect')
    def handle_disconnect():
        """Client ngắt kết nối"""
        sid = request.sid
        if sid in connected_users:
            user_info = connected_users.pop(sid)
            print(f"👋 User disconnected: {user_info['user_name']} ({user_info['user_id']})")

    @socketio.on('authenticate')
    def handle_authenticate(data):
        """Xác thực user khi kết nối"""
        try:
            user_id = data.get('user_id')
            user_name = data.get('user_name')
            role = data.get('role', 'user')

            connected_users[request.sid] = {
                'user_id': user_id,
                'user_name': user_name,
                'role': role
            }

            print(f"✅ User authenticated: {user_name} ({user_id}) - Role: {role}")
            emit('authenticated', {
                'success': True,
                'user_id': user_id,
                'user_name': user_name
            })
        except Exception as e:
            emit('error', {'message': str(e)})

    @socketio.on('join_room')
    def handle_join_room(data):
        """User tham gia room"""
        try:
            room_id = str(data.get('room_id'))
            user_info = connected_users.get(request.sid, {})

            join_room(room_id)
            print(f"👥 {user_info.get('user_name', 'Unknown')} joined room {room_id}")

            # Đánh dấu tin nhắn đã đọc
            if user_info.get('user_id'):
                ChatService.mark_messages_as_read(int(room_id), user_info['user_id'])

            emit('joined_room', {
                'room_id': room_id,
                'user_name': user_info.get('user_name')
            }, room=room_id)

        except Exception as e:
            emit('error', {'message': str(e)})

    @socketio.on('leave_room')
    def handle_leave_room(data):
        """User rời room"""
        try:
            room_id = str(data.get('room_id'))
            user_info = connected_users.get(request.sid, {})

            leave_room(room_id)
            print(f"👋 {user_info.get('user_name', 'Unknown')} left room {room_id}")

            emit('left_room', {
                'room_id': room_id,
                'user_name': user_info.get('user_name')
            }, room=room_id)

        except Exception as e:
            emit('error', {'message': str(e)})

    @socketio.on('send_message')
    def handle_send_message(data):
        """Gửi tin nhắn"""
        try:
            room_id = str(data.get('room_id'))
            user_info = connected_users.get(request.sid, {})

            if not user_info:
                emit('error', {'message': 'Not authenticated'})
                return

            # Lưu tin nhắn vào database
            message_data = {
                'room_id': int(room_id),
                'sender_id': user_info['user_id'],
                'sender_name': user_info['user_name'],
                'sender_role': user_info['role'],
                'message': data.get('message'),
                'message_type': data.get('message_type', 'text'),
                'attachment_url': data.get('attachment_url')
            }

            message, error = ChatService.send_message(message_data)
            if error:
                emit('error', {'message': error})
                return

            # Broadcast tin nhắn đến tất cả users trong room
            print(f"💬 Message from {user_info['user_name']} in room {room_id}: {data.get('message')}")
            emit('new_message', message.to_dict(), room=room_id)

            # Emit notification đến user khác (nếu họ không online trong room)
            emit('message_notification', {
                'room_id': int(room_id),
                'sender_name': user_info['user_name'],
                'message_preview': data.get('message')[:50]
            }, broadcast=True, skip_sid=request.sid)

        except Exception as e:
            print(f"❌ Error sending message: {str(e)}")
            emit('error', {'message': str(e)})

    @socketio.on('typing')
    def handle_typing(data):
        """User đang gõ"""
        try:
            room_id = str(data.get('room_id'))
            user_info = connected_users.get(request.sid, {})

            emit('user_typing', {
                'user_name': user_info.get('user_name'),
                'is_typing': data.get('is_typing', True)
            }, room=room_id, skip_sid=request.sid)

        except Exception as e:
            emit('error', {'message': str(e)})

    @socketio.on('assign_support')
    def handle_assign_support(data):
        """Admin/Technician nhận phòng chat"""
        try:
            room_id = data.get('room_id')
            user_info = connected_users.get(request.sid, {})

            if user_info.get('role') not in ['admin', 'technician']:
                emit('error', {'message': 'Unauthorized'})
                return

            room, error = ChatService.assign_support(
                room_id,
                user_info['user_id'],
                user_info['user_name'],
                user_info['role']
            )

            if error:
                emit('error', {'message': error})
                return

            # Notify room về support đã join
            emit('support_assigned', room.to_dict(), room=str(room_id))

        except Exception as e:
            emit('error', {'message': str(e)})

    @socketio.on('close_room')
    def handle_close_room(data):
        """Đóng phòng chat"""
        try:
            room_id = data.get('room_id')
            user_info = connected_users.get(request.sid, {})

            room, error = ChatService.close_room(room_id)
            if error:
                emit('error', {'message': error})
                return

            # Notify room đã đóng
            emit('room_closed', room.to_dict(), room=str(room_id))

        except Exception as e:
            emit('error', {'message': str(e)})

from flask import request
