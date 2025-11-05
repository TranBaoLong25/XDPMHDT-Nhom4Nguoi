import os
import json
from typing import List, Dict, Any, Optional

try:
	import redis
except Exception:
	redis = None


class NotificationService:
	"""Notification store with optional Redis backend and send simulation."""

	def __init__(self):
		self._store: List[Dict[str, Any]] = []
		self._next_id = 1
		self._redis = None
		redis_host = os.environ.get("REDIS_HOST")
		redis_port = int(os.environ.get("REDIS_PORT", 6379))
		if redis_host and redis:
			try:
				self._redis = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
				# quick ping to raise if not reachable
				self._redis.ping()
			except Exception:
				self._redis = None

	def ping_redis(self) -> bool:
		if not self._redis:
			return False
		try:
			return bool(self._redis.ping())
		except Exception:
			return False

	def list_all(self) -> List[Dict[str, Any]]:
		if self._redis:
			try:
				raw = self._redis.lrange("notifications", 0, -1)
				return [json.loads(x) for x in raw]
			except Exception:
				# fall back to memory
				pass
		return self._store

	def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
		item: Dict[str, Any] = {
			"id": self._next_id,
			"to": data.get("to"),
			"message": data.get("message"),
			"sent": False,
		}
		# Simulate send
		item["sent"] = True

		# persist to redis if available
		if self._redis:
			try:
				self._redis.rpush("notifications", json.dumps(item))
			except Exception:
				# fallback to memory
				self._store.append(item)
		else:
			self._store.append(item)

		self._next_id += 1
		return item
