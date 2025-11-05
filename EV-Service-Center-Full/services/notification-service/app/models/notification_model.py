"""Placeholder models for notification service.

For this minimal implementation we keep an in-memory representation.
If later you add a DB, move dataclass definitions here.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class Notification:
	id: int
	to: Optional[str]
	message: Optional[str]
	sent: bool = False
