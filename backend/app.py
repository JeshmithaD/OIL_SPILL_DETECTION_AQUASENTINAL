"""
AquaSentinel – Flask Application Factory
Real-time AI Oil Spill Detection Platform
"""
import os
import sys
import logging
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from config import Config
from extensions import db, socketio, jwt, bcrypt

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    jwt.init_app(app)
    bcrypt.init_app(app)
    socketio.init_app(app)

    # Register blueprints
    from auth import auth_bp
    from routes import api_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(api_bp)

    # Register SocketIO events
    from services.realtime_service import register_socketio_events
    register_socketio_events(socketio)

    # Root health check
    @app.route('/')
    def health_check():
        return {"status": "AquaSentinel Backend API is running", "version": "1.0.0"}

    # Create database tables
    with app.app_context():
        db.create_all()
        logger.info("Database tables created")

    return app


# Create the app instance
app = create_app()

if __name__ == '__main__':
    # Start AISStream real-time WebSocket
    from services.ais_stream import start_ais_stream
    start_ais_stream(socketio, app)
    logger.info("🌊 AquaSentinel starting on http://localhost:5000")
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader=False, allow_unsafe_werkzeug=True)
