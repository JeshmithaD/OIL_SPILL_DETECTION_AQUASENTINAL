"""
GNN Behavior Analysis – Module 2
Graph Neural Network for understanding vessel behavior in context.
Uses NetworkX for graph construction + custom GNN-style propagation.
Falls back gracefully if PyTorch Geometric is not installed.
"""
import numpy as np
import networkx as nx
from models import db, Vessel
from math import radians, sin, cos, sqrt, atan2


def haversine(lat1, lon1, lat2, lon2):
    """Calculate distance in km between two lat/lon points."""
    R = 6371
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    return R * c


def build_vessel_graph(vessels, proximity_km=50):
    """
    Build a graph where:
    - Nodes = vessels (with features: speed, heading, lat, lon)
    - Edges = proximity-based connections (within proximity_km)
    """
    G = nx.Graph()

    for v in vessels:
        G.add_node(v.id, **{
            'mmsi': v.mmsi,
            'name': v.name,
            'speed': v.speed or 0,
            'heading': v.heading or 0,
            'lat': v.latitude or 0,
            'lon': v.longitude or 0,
            'status': v.status
        })

    # Add edges based on proximity
    for i, v1 in enumerate(vessels):
        for v2 in vessels[i+1:]:
            if v1.latitude and v1.longitude and v2.latitude and v2.longitude:
                dist = haversine(v1.latitude, v1.longitude, v2.latitude, v2.longitude)
                if dist < proximity_km:
                    G.add_edge(v1.id, v2.id, weight=1.0 / (dist + 0.1))

    return G


def gnn_message_passing(G, iterations=3):
    """
    Simplified GNN-style message passing:
    Each node aggregates features from its neighbors,
    creating a contextual representation.
    """
    node_features = {}
    for node in G.nodes():
        data = G.nodes[node]
        node_features[node] = np.array([
            data['speed'], data['heading'],
            data['lat'], data['lon']
        ])

    # Message passing iterations
    for _ in range(iterations):
        new_features = {}
        for node in G.nodes():
            neighbors = list(G.neighbors(node))
            if neighbors:
                # Aggregate neighbor features (mean)
                neighbor_feats = np.mean([node_features[n] for n in neighbors], axis=0)
                # Update: combine self + neighbor info
                new_features[node] = 0.5 * node_features[node] + 0.5 * neighbor_feats
            else:
                new_features[node] = node_features[node]
        node_features = new_features

    return node_features


def detect_cluster_anomalies(G, node_features):
    """
    Detect suspicious clusters based on:
    - High-degree nodes (many nearby vessels)
    - Low-speed clusters (potential coordinated stops)
    - Unusual speed variance within clusters
    """
    risks = []

    # Find connected components (clusters)
    for component in nx.connected_components(G):
        if len(component) < 2:
            continue

        subgraph = G.subgraph(component)
        speeds = [G.nodes[n]['speed'] for n in component]
        avg_speed = np.mean(speeds)
        speed_var = np.var(speeds)

        # Risk scoring
        risk_score = 0
        patterns = []

        if avg_speed < 2.0 and len(component) >= 3:
            risk_score += 0.4
            patterns.append('coordinated_stop')

        if speed_var > 50:
            risk_score += 0.3
            patterns.append('speed_inconsistency')

        density = nx.density(subgraph)
        if density > 0.7 and len(component) >= 3:
            risk_score += 0.3
            patterns.append('tight_cluster')

        if risk_score > 0:
            risk_level = 'high' if risk_score > 0.6 else ('medium' if risk_score > 0.3 else 'low')
            risks.append({
                'cluster_vessels': list(component),
                'cluster_size': len(component),
                'cluster_risk': risk_level,
                'risk_score': round(risk_score, 2),
                'avg_speed': round(avg_speed, 2),
                'patterns': patterns
            })

    return risks


def analyze_vessel_graph():
    """
    Main GNN analysis pipeline.
    Returns risk assessment of vessel fleet behavior.
    """
    vessels = Vessel.query.all()
    if len(vessels) < 2:
        return {
            'cluster_risk': 'low',
            'clusters': [],
            'total_vessels_analyzed': len(vessels),
            'pattern': 'insufficient data'
        }

    # Build graph
    G = build_vessel_graph(vessels)

    # Run message passing
    node_features = gnn_message_passing(G)

    # Detect cluster anomalies
    cluster_risks = detect_cluster_anomalies(G, node_features)

    # Overall risk assessment
    if any(c['cluster_risk'] == 'high' for c in cluster_risks):
        overall_risk = 'high'
        pattern = 'suspicious fleet behavior detected'
    elif any(c['cluster_risk'] == 'medium' for c in cluster_risks):
        overall_risk = 'medium'
        pattern = 'moderate fleet anomaly patterns'
    else:
        overall_risk = 'low'
        pattern = 'normal fleet behavior'

    return {
        'cluster_risk': overall_risk,
        'clusters': cluster_risks,
        'total_vessels_analyzed': len(vessels),
        'edges': G.number_of_edges(),
        'pattern': pattern
    }
