from extensions import db, bcrypt
from datetime import datetime, timezone

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'full_name': self.full_name,
            'email': self.email,
            'phone': self.phone,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Vessel(db.Model):
    __tablename__ = 'vessels'
    id = db.Column(db.Integer, primary_key=True)
    mmsi = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100))
    vessel_type = db.Column(db.String(50))
    flag = db.Column(db.String(50))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    speed = db.Column(db.Float)
    heading = db.Column(db.Float)
    status = db.Column(db.String(20), default='normal')  # normal, anomaly, spill
    last_updated = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    anomalies = db.relationship('Anomaly', backref='vessel', lazy=True)
    spills = db.relationship('Spill', backref='vessel', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'mmsi': self.mmsi,
            'name': self.name,
            'vessel_type': self.vessel_type,
            'flag': self.flag,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'speed': self.speed,
            'heading': self.heading,
            'status': self.status,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None
        }


class Anomaly(db.Model):
    __tablename__ = 'anomalies'
    id = db.Column(db.Integer, primary_key=True)
    vessel_id = db.Column(db.Integer, db.ForeignKey('vessels.id'), nullable=False)
    anomaly_type = db.Column(db.String(50))  # speed, heading, stop, cluster
    anomaly_score = db.Column(db.Float)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    description = db.Column(db.Text)
    detected_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    resolved = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            'id': self.id,
            'vessel_id': self.vessel_id,
            'vessel_mmsi': self.vessel.mmsi if self.vessel else None,
            'vessel_name': self.vessel.name if self.vessel else None,
            'anomaly_type': self.anomaly_type,
            'anomaly_score': self.anomaly_score,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'description': self.description,
            'detected_at': self.detected_at.isoformat() if self.detected_at else None,
            'resolved': self.resolved
        }


class Spill(db.Model):
    __tablename__ = 'spills'
    id = db.Column(db.Integer, primary_key=True)
    vessel_id = db.Column(db.Integer, db.ForeignKey('vessels.id'), nullable=True)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    confidence = db.Column(db.Float)
    severity = db.Column(db.String(20))  # low, medium, high, critical
    area_km2 = db.Column(db.Float)
    source = db.Column(db.String(50))  # cnn, manual
    image_path = db.Column(db.String(256))
    detected_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    resolved = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            'id': self.id,
            'vessel_id': self.vessel_id,
            'vessel_name': self.vessel.name if self.vessel else 'Unknown',
            'latitude': self.latitude,
            'longitude': self.longitude,
            'confidence': self.confidence,
            'severity': self.severity,
            'area_km2': self.area_km2,
            'source': self.source,
            'detected_at': self.detected_at.isoformat() if self.detected_at else None,
            'resolved': self.resolved
        }


class Alert(db.Model):
    __tablename__ = 'alerts'
    id = db.Column(db.Integer, primary_key=True)
    alert_type = db.Column(db.String(20), nullable=False)  # anomaly, spill, sos, gnn
    severity = db.Column(db.String(20), default='medium')  # low, medium, high, critical
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    vessel_id = db.Column(db.Integer, db.ForeignKey('vessels.id'), nullable=True)
    spill_id = db.Column(db.Integer, db.ForeignKey('spills.id'), nullable=True)
    email_sent = db.Column(db.Boolean, default=False)
    sms_sent = db.Column(db.Boolean, default=False)
    acknowledged = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'alert_type': self.alert_type,
            'severity': self.severity,
            'title': self.title,
            'message': self.message,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'vessel_id': self.vessel_id,
            'spill_id': self.spill_id,
            'email_sent': self.email_sent,
            'sms_sent': self.sms_sent,
            'acknowledged': self.acknowledged,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class AnalysisReport(db.Model):
    __tablename__ = 'analysis_reports'
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(256))
    spill = db.Column(db.Boolean, default=False)
    confidence = db.Column(db.Float)
    area = db.Column(db.Float)
    intensity = db.Column(db.Float)
    severity = db.Column(db.String(20))
    email = db.Column(db.String(120))
    pdf_path = db.Column(db.String(256))
    heatmap_filename = db.Column(db.String(256))
    yolo_filename = db.Column(db.String(256))
    email_sent = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'spill': self.spill,
            'confidence': self.confidence,
            'area': self.area,
            'intensity': self.intensity,
            'severity': self.severity,
            'email': self.email,
            'heatmap_filename': self.heatmap_filename,
            'yolo_filename': self.yolo_filename,
            'pdf_path': self.pdf_path,
            'email_sent': self.email_sent,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
