import os
import sys
from datetime import datetime, timedelta, timezone

# Add current directory to path
sys.path.append(os.getcwd())

from app import create_app
from extensions import db
from models import Anomaly, Vessel

def seed_anomalies():
    app = create_app()
    with app.app_context():
        # Only seed if empty
        if Anomaly.query.count() > 0:
            print("Anomalies already exist. skipping.")
            return

        print("Seeding sample anomalies...")
        
        # Create some vessels if not exist
        if Vessel.query.count() == 0:
            v1 = Vessel(mmsi="232003456", name="OCEAN MARINER", vessel_type="Tanker", status="anomaly", 
                        latitude=18.5, longitude=72.4, speed=12.5, heading=180)
            v2 = Vessel(mmsi="566001223", name="GLOBAL CARRIER", vessel_type="Cargo", status="anomaly", 
                        latitude=19.2, longitude=71.8, speed=1.2, heading=90)
            db.session.add_all([v1, v2])
            db.session.commit()
        
        vessels = Vessel.query.all()
        types = ['Route Deviation', 'Speed Spike', 'AIS Silence', 'Restricted Zone']
        
        for i in range(15):
            days_ago = i % 7
            detected_at = datetime.now(timezone.utc) - timedelta(days=days_ago, hours=i)
            
            a = Anomaly(
                vessel_id=vessels[i % len(vessels)].id,
                anomaly_type=types[i % len(types)],
                anomaly_score=0.75 + (i * 0.01),
                detected_at=detected_at,
                latitude=15.0 + (i * 0.1),
                longitude=70.0 + (i * 0.1),
                description=f"Automated detection of {types[i % len(types)]}"
            )
            db.session.add(a)
        
        db.session.commit()
        print(f"Successfully seeded {Anomaly.query.count()} anomalies.")

if __name__ == "__main__":
    seed_anomalies()
