import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'aquasentinel-secret-key-2024')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'aquasentinel-jwt-secret-2024')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(os.path.abspath(os.path.dirname(__file__)), 'instance', 'aquasentinel.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # SMTP Config
    SMTP_SERVER = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
    SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
    SMTP_USER = os.environ.get('SMTP_USER', '')
    SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
    ALERT_EMAIL_TO = os.environ.get('ALERT_EMAIL_TO', 'coastguard@example.com')

    # Twilio Config
    TWILIO_SID = os.environ.get('TWILIO_SID', '')
    TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', '')
    TWILIO_FROM = os.environ.get('TWILIO_FROM', '')
    TWILIO_TO = os.environ.get('TWILIO_TO', '')

    # Sentinel Hub
    SENTINEL_CLIENT_ID = os.environ.get('SENTINEL_CLIENT_ID', '')
    SENTINEL_CLIENT_SECRET = os.environ.get('SENTINEL_CLIENT_SECRET', '')

    # AISStream Real-Time WebSocket Config
    AISSTREAM_API_KEY = os.environ.get('AISSTREAM_API_KEY', '')
    AISSTREAM_URL = 'wss://stream.aisstream.io/v0/stream'
    AIS_BOUNDING_BOXES = [[[-10, 40], [40, 110]]]  # Expanded Indian Ocean Region
