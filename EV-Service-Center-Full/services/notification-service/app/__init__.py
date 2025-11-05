from flask import Flask
from .routes import bp as notification_bp


def create_app():
	app = Flask(__name__)
	app.register_blueprint(notification_bp)
	return app
