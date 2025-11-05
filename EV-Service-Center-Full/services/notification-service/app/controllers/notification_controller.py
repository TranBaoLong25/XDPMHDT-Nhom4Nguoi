from ..services.notification_service import NotificationService

_service = NotificationService()


def list_notifications():
	return _service.list_all()


def send_notification(data: dict):
	return _service.create(data)


def health_check():
	# return simple health object; include redis status if available
	redis_ok = False
	try:
		redis_ok = _service.ping_redis()
	except Exception:
		redis_ok = False
	return {"status": "ok", "redis": redis_ok}
