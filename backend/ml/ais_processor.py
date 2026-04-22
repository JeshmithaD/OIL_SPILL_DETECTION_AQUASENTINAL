"""
AIS Data Processing & Isolation Forest Anomaly Detection
Module 1: Ingest AIS data (CSV + DB), engineer features, detect anomalies
Supports both CSV file ingestion and database-stored vessel data.
"""
import numpy as np
import os
import json

# Try pandas import for CSV processing
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

from sklearn.ensemble import IsolationForest
from models import db, Vessel, Anomaly
from datetime import datetime, timezone

# Try joblib for model persistence
try:
    import joblib
    JOBLIB_AVAILABLE = True
except ImportError:
    JOBLIB_AVAILABLE = False


MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'ml_models', 'isolation_forest.pkl')


def load_ais_csv(path=None):
    """
    Load AIS data from CSV file and perform feature engineering.
    Returns DataFrame with engineered features.
    """
    if not PANDAS_AVAILABLE:
        return None

    if path is None:
        path = os.path.join(os.path.dirname(__file__), '..', 'data', 'ais_data.csv')

    if not os.path.exists(path):
        return None

    df = pd.read_csv(path)

    # Feature Engineering
    df['speed_change'] = df.groupby('MMSI')['SOG'].diff().fillna(0)
    df['direction_change'] = df.groupby('MMSI')['COG'].diff().fillna(0)
    df['speed_anomaly'] = (df['SOG'] - df['SOG'].mean()).abs() / df['SOG'].std()
    df['is_stopped'] = (df['SOG'] < 0.5).astype(int)

    return df


def train_anomaly_model(df=None):
    """
    Train Isolation Forest model on AIS data.
    Saves model to disk for reuse.
    """
    if df is None:
        df = load_ais_csv()

    if df is None or len(df) < 5:
        return None

    if df is not None:
        features = df[['SOG', 'COG', 'speed_change', 'direction_change']].fillna(0)
    else:
        return None

    model = IsolationForest(
        n_estimators=100,
        contamination=0.15,
        random_state=42
    )
    model.fit(features)

    # Save model
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    if JOBLIB_AVAILABLE:
        joblib.dump(model, MODEL_PATH)
        print(f"✅ Isolation Forest model saved to {MODEL_PATH}")

    return model


def load_trained_model():
    """Load previously trained model from disk."""
    if JOBLIB_AVAILABLE and os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    return None


def generate_ais_features(vessels):
    """
    Feature engineering from vessel AIS data in database:
    - SOG (Speed Over Ground)
    - COG (Course Over Ground)
    - speed_change (assumed 0 for snapshot)
    - direction_change (assumed 0 for snapshot)
    """
    features = []
    vessel_refs = []

    for v in vessels:
        speed = float(v.speed) if v.speed is not None else 0.0
        heading = float(v.heading) if v.heading is not None else 0.0
        # To match the trained model ['SOG', 'COG', 'speed_change', 'direction_change']
        features.append([speed, heading, 0.0, 0.0])
        vessel_refs.append(v)

    return np.array(features) if features else np.array([]).reshape(0, 4), vessel_refs


def detect_csv_anomalies():
    """
    Run anomaly detection on CSV AIS data.
    Returns list of anomalous records.
    """
    df = load_ais_csv()
    if df is None or len(df) < 5:
        return []

    model = load_trained_model()
    if model is None:
        model = train_anomaly_model(df)

    if model is None:
        return []

    if df is not None:
        features = df[['SOG', 'COG', 'speed_change', 'direction_change']].fillna(0)
        predictions = model.predict(features)
        scores = model.decision_function(features)
    else:
        return []

    if df is not None:
        df['prediction'] = predictions
        df['anomaly_score'] = scores

    if df is not None:
        anomalies = df[df['prediction'] == -1].copy()
    else:
        anomalies = pd.DataFrame()

    result = []
    for _, row in anomalies.iterrows():
        result.append({
            'mmsi': str(int(row['MMSI'])),
            'latitude': float(row['LAT']),
            'longitude': float(row['LON']),
            'speed': float(row['SOG']),
            'heading': float(row['COG']),
            'anomaly_score': float("{:.4f}".format(float(row['anomaly_score']))),
            'status': 'anomaly'
        })

    return result


def process_ais_data():
    """
    Run Isolation Forest on all vessel AIS data from database.
    Returns list of detected anomalies.
    """
    vessels = Vessel.query.all()
    if not vessels:
        return []

    features, vessel_refs = generate_ais_features(vessels)
    if len(features) < 2:
        return []

    model = load_trained_model()
    if model is None:
        model = IsolationForest(
            n_estimators=100,
            contamination=0.2,
            random_state=42
        )
        model.fit(features)
    
    predictions = model.predict(features)
    scores = model.decision_function(features)

    anomalies_found = []
    for i, (pred, score) in enumerate(zip(predictions, scores)):
        vessel = vessel_refs[i]
        if pred == -1:
            anomaly_type = 'speed' if features[i][1] > 0.5 else (
                'stop' if features[i][3] == 1.0 else 'heading'
            )

            anomaly = Anomaly(
                vessel_id=vessel.id,
                anomaly_type=anomaly_type,
                anomaly_score=float("{:.4f}".format(float(score))),
                latitude=vessel.latitude,
                longitude=vessel.longitude,
                description=f'Isolation Forest detected {anomaly_type} anomaly. Score: {score:.4f}'
            )
            db.session.add(anomaly)
            vessel.status = 'anomaly'

            anomalies_found.append({
                'vessel_id': vessel.id,
                'mmsi': vessel.mmsi,
                'latitude': vessel.latitude,
                'longitude': vessel.longitude,
                'anomaly_score': float("{:.4f}".format(float(score))),
                'anomaly_type': anomaly_type,
                'status': 'anomaly'
            })

    db.session.commit()
    return anomalies_found


def process_live_vessels(vessels):
    """
    Run the pre-trained Isolation Forest model strictly on live AISStream dictionary objects.
    Returns: List of vessel dicts that are identified as ML anomalies.
    """
    if not vessels:
        return []
    
    # Needs to match features used in training: ['SOG', 'COG', 'speed_change', 'direction_change']
    # For live streaming snapshot, speed_change and direction_change are approx 0
    features = []
    
    for v in vessels:
        sog = float(v.get('sog', 0) or 0)
        cog = float(v.get('cog', 0) or 0)
        features.append([sog, cog, 0.0, 0.0])
        
    features = np.array(features)
    
    model = load_trained_model()
    if model is None:
        # Fallback to a quick newly trained model if absent
        model = IsolationForest(n_estimators=100, contamination=0.15, random_state=42)
        model.fit(features if len(features) > 10 else np.array([[10, 180, 0, 0], [0, 0, 0, 0]]*10))
        
    predictions = model.predict(features)
    scores = model.decision_function(features)
    
    anomalies = []
    for i, (pred, score) in enumerate(zip(predictions, scores)):
        if pred == -1:
            vessels[i]['status'] = 'anomaly'
            vessels[i]['anomaly_score'] = float("{:.4f}".format(float(score)))
            vessels[i]['anomaly_reason'] = f'ML IsolationForest Anomaly (Score: {score:.3f})'
            anomalies.append(vessels[i])
            
    return anomalies
