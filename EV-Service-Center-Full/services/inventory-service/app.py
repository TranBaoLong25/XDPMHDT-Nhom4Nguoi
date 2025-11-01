# services/inventory-service/app.py
import os
<<<<<<< HEAD
from models.inventory_model import Inventory
=======
>>>>>>> 9a57403 ( cap nhat them)
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ✅ KHỞI TẠO EXTENSIONS (Giống hệt user-service)
db = SQLAlchemy()
migrate = Migrate()

def create_app():
    """Tạo và cấu hình Flask app cho Inventory Service"""
    app = Flask(__name__)
    CORS(app)

    # ===== CẤU HÌNH =====
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # ===== KHỞI TẠO EXTENSIONS =====
    db.init_app(app)
    
    # ✅ Quan trọng: Đặt tên bảng migrate khác với user-service
    # user-service dùng 'alembic_version_users'
    migrate.init_app(
        app, 
        db, 
        directory='migrations', 
        version_table='alembic_version_inventory'
    )

    # ===== IMPORT MODELS (Sau khi db đã init) =====
    with app.app_context():
        from models.inventory_model import Inventory
        # db.create_all() # Không dùng cái này, để migrate xử lý

    # ===== ĐĂNG KÝ BLUEPRINTS =====
    from controllers.inventory_controller import inventory_bp
    app.register_blueprint(inventory_bp, url_prefix='/api/inventory')

    # ===== Health Check Endpoint =====
    @app.route("/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "Inventory Service is running!"}), 200

    return app

# ===== CHẠY APP (CHỈ KHI CHẠY TRỰC TIẾP) =====
if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=8000, debug=True) # Chạy ở cổng 8000