from flask import Blueprint, request, jsonify, current_app
import os
from functools import wraps
from .controllers.notification_controller import list_notifications, send_notification, health_check


bp = Blueprint('notification', __name__, url_prefix='/api/notifications')


def require_internal_token(f):
	@wraps(f)
	def decorated(*args, **kwargs):
		token = os.environ.get('INTERNAL_SERVICE_TOKEN')
		header = request.headers.get('X-Internal-Token') or request.headers.get('Authorization')
		if not token:
			return jsonify({"error": "Internal token not configured"}), 500
		# allow 'Bearer <token>' as well
		if header and header.startswith('Bearer '):
			header = header.split(' ', 1)[1]
		if header != token:
			return jsonify({"error": "Unauthorized"}), 401
		return f(*args, **kwargs)

	return decorated


@bp.route('/health', methods=['GET'])
def route_health():
	return jsonify(health_check())


@bp.route('/', methods=['GET'])
def get_notifications():
	return jsonify(list_notifications())


@bp.route('/send', methods=['POST'])
@require_internal_token
def post_send():
	data = request.get_json() or {}
	result = send_notification(data)
	return jsonify(result), 201
