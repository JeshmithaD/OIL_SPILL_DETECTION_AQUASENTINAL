"""
Database Seeder
Seeds the database with realistic demo data for AquaSentinel.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime, timezone, timedelta
import random


def seed_database():
    from app import app, db
    from models import User, Vessel, Anomaly, Spill, Alert
    from ml.demo_data import generate_vessels, generate_demo_anomalies, generate_demo_spills

    with app.app_context():
        print(f"DEBUG SEEDER: app.instance_path = {app.instance_path}")
        # Clear existing data
        Alert.query.delete()
        Spill.query.delete()
        Anomaly.query.delete()
        Vessel.query.delete()
        User.query.delete()
        db.session.commit()

        # Create admin user
        admin = User(username='admin', email='admin@aquasentinel.com', role='admin')
        admin.set_password('admin123')
        db.session.add(admin)

        # Create regular user
        user = User(username='operator', email='operator@aquasentinel.com', role='user')
        user.set_password('operator123')
        db.session.add(user)
        db.session.commit()

        # Generate vessels
        vessel_data = generate_vessels(count=20, region_idx=0)
        vessels = []
        for vd in vessel_data:
            v = Vessel(**vd)
            db.session.add(v)
            vessels.append(v)
        db.session.commit()

        # Generate anomalies
        anomaly_data = generate_demo_anomalies(vessel_data, count=8)
        for ad in anomaly_data:
            v = vessels[ad['vessel_idx']]
            anomaly = Anomaly(
                vessel_id=v.id,
                anomaly_type=ad['anomaly_type'],
                anomaly_score=ad['anomaly_score'],
                latitude=ad['latitude'],
                longitude=ad['longitude'],
                description=ad['description'],
                detected_at=datetime.now(timezone.utc) - timedelta(days=ad['days_ago'], hours=random.randint(0, 23))
            )
            db.session.add(anomaly)
            v.status = 'anomaly'
        db.session.commit()

        # Generate spills
        spill_data = generate_demo_spills(vessel_data, count=4)
        spills = []
        for sd in spill_data:
            v = vessels[sd['vessel_idx']]
            spill = Spill(
                vessel_id=v.id,
                latitude=sd['latitude'],
                longitude=sd['longitude'],
                confidence=sd['confidence'],
                severity=sd['severity'],
                area_km2=sd['area_km2'],
                source=sd['source'],
                detected_at=datetime.now(timezone.utc) - timedelta(days=sd['days_ago'], hours=random.randint(0, 23))
            )
            db.session.add(spill)
            spills.append(spill)
            v.status = 'spill'
        db.session.commit()

        # Generate alerts
        alert_types = [
            ('spill', 'critical', '🛢️ Oil Spill Detected', 'High-confidence oil spill detected. Deploy response team.'),
            ('anomaly', 'high', '⚠️ Vessel Anomaly', 'Suspicious vessel behavior detected.'),
            ('gnn', 'medium', '🕸️ Fleet Pattern Alert', 'Unusual fleet movement pattern detected.'),
            ('anomaly', 'high', '🚢 Speed Anomaly', 'Vessel exceeding normal speed parameters.'),
            ('spill', 'critical', '🛢️ Large Spill Alert', 'Significant oil spill confirmed via satellite.'),
            ('anomaly', 'medium', '⚓ Unauthorized Stop', 'Vessel stopped in restricted shipping lane.'),
        ]

        for i, (atype, sev, title, msg) in enumerate(alert_types):
            v = vessels[i % len(vessels)]
            alert = Alert(
                alert_type=atype,
                severity=sev,
                title=title,
                message=msg,
                latitude=v.latitude,
                longitude=v.longitude,
                vessel_id=v.id,
                spill_id=spills[0].id if atype == 'spill' and spills else None,
                email_sent=random.choice([True, False]),
                sms_sent=random.choice([True, False]),
                acknowledged=i > 3,  # some acknowledged
                created_at=datetime.now(timezone.utc) - timedelta(days=i, hours=random.randint(0, 23))
            )
            db.session.add(alert)

        db.session.commit()
        print("✅ Database seeded successfully!")
        print(f"   Users: 2 (admin/admin123, operator/operator123)")
        print(f"   Vessels: {len(vessels)}")
        print(f"   Anomalies: {len(anomaly_data)}")
        print(f"   Spills: {len(spill_data)}")
        print(f"   Alerts: {len(alert_types)}")


if __name__ == '__main__':
    seed_database()
