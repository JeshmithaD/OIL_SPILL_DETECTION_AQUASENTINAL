import os
import sys
# Add current directory to path
sys.path.append(os.getcwd())

from app import create_app
from extensions import db
from models import AnalysisReport, Alert, Spill, Vessel

app = create_app()
with app.app_context():
    print(f"Database URI: {app.config['SQLALCHEMY_DATABASE_URI']}")
    print(f"AnalysisReport Count: {AnalysisReport.query.count()}")
    print(f"Alert Count: {Alert.query.count()}")
    print(f"Spill Count: {Spill.query.count()}")
    print(f"Vessel Count: {Vessel.query.count()}")
    
    # Check for specific spills
    spills = AnalysisReport.query.filter_by(spill=True).all()
    print(f"Satellite Spills (AnalysisReport): {len(spills)}")
    for s in spills[:5]:
        print(f" - ID: {s.id}, File: {s.filename}, Severity: {s.severity}, Created at: {s.created_at}")

    # Check for Settings service logic
    from services.settings_service import SETTINGS_PATH
    print(f"Settings Path: {SETTINGS_PATH}")
    print(f"Settings Path Exists: {os.path.exists(SETTINGS_PATH)}")
