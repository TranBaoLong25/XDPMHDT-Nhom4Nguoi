from app import create_app, socketio

# Tạo Flask app instance
application = create_app()
app = application

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=8007, debug=True)
