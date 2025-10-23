from datetime import datetime
from dataclasses import dataclass

@dataclass
class Booking:
    id: int
    customer_name: str
    service_type: str
    technician_id: int
    station_id: int
    start_time: datetime
    end_time: datetime
    status: str  # pending, confirmed, canceled
