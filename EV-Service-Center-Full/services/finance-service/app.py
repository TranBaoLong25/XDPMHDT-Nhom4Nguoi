import os
import time
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

# THƯ VIỆN BỔ SUNG: để ping DB
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError

load_dotenv()

# Khởi tạo Extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager() 

def wait_for_db(db_url, max_retries=10, delay=5):
    """Buộc ứng dụng chờ kết nối DB trước khi khởi tạo SQLAlchemy"""
    print("--- Bắt đầu kiểm tra kết nối Database từ Python ---")
    engine = create_engine(db_url)
    for i in range(max_retries):
        try:
            conn = engine.connect()
            conn.close()
            print(f"✅ DB connection successful after {i+1} attempts.")
            return True
        except OperationalError as e:
            print(f"❌ DB connection failed (Attempt {i+1}/{max_retries}). Retrying in {delay}s...")
            print(f"    Error: {e}")
            time.sleep(delay)
    print("❌ Critical: Database never became available. Exiting.")
    return False

def create_app():
    """Tạo và cấu hình Flask app chính cho Finance Service"""
    app = Flask(__name__)
    CORS(app)
    
    # ⚠️ THÊM CHECK MÔI TRƯỜNG: Chỉ chạy logic chờ DB khi đang chạy Gunicorn (Production)
    # Lệnh CLI như 'flask db init' sẽ bỏ qua bước này.
    is_running_gunicorn = os.environ.get('GUNICORN_ENV') == 'true'
    
    # Chỉ ngủ 2s khi chạy Gunicorn để DNS ổn định
    if is_running_gunicorn:
        time.sleep(2) 

    # ===== CẤU HÌNH (Lấy từ .env) =====
    db_url = os.getenv("DATABASE_URL")
    app.config["SQLALCHEMY_DATABASE_URI"] = db_url

    # ⚠️ GỌI HÀM CHỜ DB CHỈ KHI KHÔNG PHẢI LỆNH CLI
    if is_running_gunicorn and not wait_for_db(db_url):
        raise RuntimeError("Database connection could not be established.")


    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
    app.config["INTERNAL_SERVICE_TOKEN"] = os.getenv("INTERNAL_SERVICE_TOKEN")
    app.config["BOOKING_SERVICE_URL"] = os.getenv("BOOKING_SERVICE_URL")
    app.config["INVENTORY_SERVICE_URL"] = os.getenv("INVENTORY_SERVICE_URL")
    
    # ===== KHỞI TẠO EXTENSIONS =====
    db.init_app(app)
    # ... (Các phần khác giữ nguyên) ...

    jwt.init_app(app)
    migrate.init_app(app, db, directory='migrations', version_table='alembic_version_finance')

    # ===== IMPORT MODELS & TẠO TABLES =====
    with app.app_context():
        from models.finance_model import Invoice, InvoiceItem 

    # ===== ĐĂNG KÝ BLUEPRINTS (Controllers) =====
    from controllers.finance_controller import invoice_bp
    app.register_blueprint(invoice_bp) 

    # ===== HEALTH CHECK =====
    @app.route("/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "Finance Service is running!"}), 200

    return app