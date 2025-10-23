import sqlite3
from datetime import datetime

DB_PATH = "booking.db"

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS bookings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        customer_name TEXT,
                        service_type TEXT,
                        technician_id INTEGER,
                        station_id INTEGER,
                        start_time TEXT,
                        end_time TEXT,
                        status TEXT
                    )''')
        conn.commit()

def is_time_available(technician_id, station_id, start_time, end_time):
    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute('''SELECT COUNT(*) FROM bookings
                     WHERE technician_id=? AND station_id=? 
                     AND status='confirmed'
                     AND (
                        (start_time <= ? AND end_time > ?) OR
                        (start_time < ? AND end_time >= ?) OR
                        (start_time >= ? AND end_time <= ?)
                     )''',
                  (technician_id, station_id, start_time, start_time,
                   end_time, end_time, start_time, end_time))
        return c.fetchone()[0] == 0

def create_booking(customer_name, service_type, technician_id, station_id, start_time, end_time):
    if not is_time_available(technician_id, station_id, start_time, end_time):
        return {"error": "Thời gian này đã được đặt."}

    with sqlite3.connect(DB_PATH) as conn:
        c = conn.cursor()
        c.execute('''INSERT INTO bookings
                     (customer_name, service_type, technician_id, station_id, start_time, end_time, status)
                     VALUES (?, ?, ?, ?, ?, ?, 'confirmed')''',
                  (customer_name, service_type, technician_id, station_id, start_time, end_time))
        conn.commit()
        return {"message": "Đặt lịch thành công!"}

def get_all_bookings():
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("SELECT * FROM bookings")
        return [dict(row) for row in c.fetchall()]
