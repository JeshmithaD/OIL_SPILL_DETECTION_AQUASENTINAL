"""
Demo Data Generator
Generates realistic vessel AIS data for demonstration purposes.
"""
import numpy as np
import random
from datetime import datetime, timezone, timedelta


# Realistic vessel names and types
VESSEL_NAMES = [
    "MV Oceanic Star", "SS Neptune's Grace", "MV Coral Voyager", "SS Sea Falcon",
    "MV Arctic Pioneer", "SS Blue Horizon", "MV Storm Chaser", "SS Golden Wave",
    "MV Iron Eagle", "SS Pacific Titan", "MV Crystal Bay", "SS Thunder Pearl",
    "MV Wind Runner", "SS Emerald Isle", "MV Silver Crest", "SS Red Phoenix",
    "MV Deep Venture", "SS Harbor King", "MV Sunset Breeze", "SS Polar Guardian"
]

VESSEL_TYPES = ["Cargo", "Tanker", "Fishing", "Passenger", "Tug", "Research"]
FLAGS = ["Panama", "Liberia", "Marshall Islands", "Hong Kong", "Singapore", "Greece", "India", "Japan"]

# Major shipping regions (lat, lon, name)
REGIONS = [
    (19.07, 72.87, "Mumbai Coast"),
    (1.35, 103.82, "Singapore Strait"),
    (22.28, 114.17, "Hong Kong"),
    (35.68, 139.69, "Tokyo Bay"),
    (25.06, 55.17, "Persian Gulf"),
    (51.50, 1.35, "English Channel"),
    (29.95, -90.07, "Gulf of Mexico"),
    (37.77, -122.42, "San Francisco Bay"),
]


def generate_vessels(count=20, region_idx=0):
    """Generate a set of realistic vessel data around a region."""
    region = REGIONS[region_idx % len(REGIONS)]
    base_lat, base_lon, region_name = region

    vessels = []
    used_names = set()

    for i in range(count):
        # Pick a unique name
        name = random.choice([n for n in VESSEL_NAMES if n not in used_names])
        used_names.add(name)

        # Scatter around region center
        lat = base_lat + random.uniform(-2, 2)
        lon = base_lon + random.uniform(-2, 2)

        # Normal vessels
        speed = random.uniform(5, 18)
        heading = random.uniform(0, 360)

        # Make some vessels anomalous
        status = 'normal'
        if i < 4:  # ~20% anomalous
            anomaly_type = random.choice(['stopped', 'fast', 'erratic'])
            if anomaly_type == 'stopped':
                speed = random.uniform(0, 0.3)
            elif anomaly_type == 'fast':
                speed = random.uniform(25, 35)
            elif anomaly_type == 'erratic':
                heading = random.uniform(0, 360)
                speed = random.uniform(0.5, 3)

        mmsi = f"{random.randint(200, 770)}{random.randint(100000, 999999)}"

        vessels.append({
            'mmsi': mmsi,
            'name': name,
            'vessel_type': random.choice(VESSEL_TYPES),
            'flag': random.choice(FLAGS),
            'latitude': round(lat, 6),
            'longitude': round(lon, 6),
            'speed': round(speed, 2),
            'heading': round(heading, 1),
            'status': status
        })

    return vessels


def generate_demo_anomalies(vessels, count=5):
    """Generate anomaly records for demo."""
    anomalies = []
    anomaly_types = ['speed', 'heading', 'stop', 'cluster']

    for i in range(min(count, len(vessels))):
        v = vessels[i]
        days_ago = random.randint(0, 6)
        anomalies.append({
            'vessel_idx': i,
            'anomaly_type': random.choice(anomaly_types),
            'anomaly_score': round(random.uniform(-0.9, -0.3), 4),
            'latitude': v['latitude'],
            'longitude': v['longitude'],
            'description': f"Detected {random.choice(anomaly_types)} anomaly near ({v['latitude']:.2f}, {v['longitude']:.2f})",
            'days_ago': days_ago
        })

    return anomalies


def generate_demo_spills(vessels, count=3):
    """Generate spill records for demo."""
    spills = []
    severities = ['low', 'medium', 'high', 'critical']

    for i in range(min(count, len(vessels))):
        v = vessels[i]
        days_ago = random.randint(0, 6)
        conf = round(random.uniform(0.6, 0.98), 4)
        spills.append({
            'vessel_idx': i,
            'latitude': v['latitude'] + random.uniform(-0.1, 0.1),
            'longitude': v['longitude'] + random.uniform(-0.1, 0.1),
            'confidence': conf,
            'severity': 'critical' if conf > 0.9 else random.choice(severities),
            'area_km2': round(random.uniform(0.5, 15.0), 2),
            'source': 'cnn',
            'days_ago': days_ago
        })

    return spills
