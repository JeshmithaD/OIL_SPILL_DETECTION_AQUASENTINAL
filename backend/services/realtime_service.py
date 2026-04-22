"""
Real-Time Service – Module 7
Flask-SocketIO event handlers for live updates.
"""
import logging

logger = logging.getLogger('aquasentinel.realtime')


def register_socketio_events(socketio):
    """Register all SocketIO event handlers."""

    @socketio.on('connect')
    def handle_connect():
        logger.info('[WS] Client connected')
        socketio.emit('connected', {'status': 'connected', 'message': 'Welcome to AquaSentinel'})

    @socketio.on('disconnect')
    def handle_disconnect():
        logger.info('[WS] Client disconnected')

    @socketio.on('request_vessel_update')
    def handle_vessel_update():
        """Client requests latest vessel data."""
        from models import Vessel
        vessels = Vessel.query.all()
        socketio.emit('vessel_update', [v.to_dict() for v in vessels])

    @socketio.on('request_alerts')
    def handle_alert_request():
        """Client requests latest alerts."""
        from models import Alert
        alerts = Alert.query.order_by(Alert.created_at.desc()).limit(20).all()
        socketio.emit('alerts_update', [a.to_dict() for a in alerts])

    @socketio.on('run_detection')
    def handle_run_detection():
        """Client triggers detection pipeline via WebSocket."""
        from ml.ais_processor import process_ais_data
        from ml.gnn_analyzer import analyze_vessel_graph
        from ml.cnn_detector import detect_spill

        socketio.emit('detection_status', {'status': 'running', 'step': 'AIS Analysis'})
        anomalies = process_ais_data()

        socketio.emit('detection_status', {'status': 'running', 'step': 'GNN Analysis'})
        gnn_result = analyze_vessel_graph()

        socketio.emit('detection_status', {'status': 'running', 'step': 'CNN Spill Detection'})

        socketio.emit('detection_status', {
            'status': 'complete',
            'anomalies': len(anomalies),
            'gnn_risk': gnn_result.get('cluster_risk', 'low')
        })

    logger.info('[WS] SocketIO events registered')
