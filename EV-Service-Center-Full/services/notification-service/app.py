import os
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
load_dotenv()

# Initialize Extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app():
    """Create and configure Flask app for Notification Service"""
    app = Flask(__name__)
    CORS(app)

    # ===== CONFIGURATION =====
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
    app.config["INTERNAL_SERVICE_TOKEN"] = os.getenv("INTERNAL_SERVICE_TOKEN")

    # ===== INITIALIZE EXTENSIONS =====
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db, directory='migrations', version_table='alembic_version_notification')

    # ===== IMPORT MODELS & CREATE TABLES =====
    # Add src directory to path for imports
    src_dir = os.path.join(os.path.dirname(__file__), 'src')
    if src_dir not in sys.path:
        sys.path.insert(0, src_dir)

    with app.app_context():
        from models.notification_model import Notification
        db.create_all()

    # ===== REGISTER BLUEPRINTS =====
    from controllers.notification_controller import notification_bp
    from controllers.internal_controller import internal_bp
    
    app.register_blueprint(notification_bp)
    app.register_blueprint(internal_bp)

    # ===== HEALTH CHECK =====
    @app.route("/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "Notification Service is running!"}), 200

    return app
