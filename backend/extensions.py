from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt

db = SQLAlchemy()
socketio = SocketIO(cors_allowed_origins="*", async_mode='threading')
jwt = JWTManager()
bcrypt = Bcrypt()
