"""
AIS Hub Real-Time Service
Fetches live vessel data from AIS Hub API, caches results,
and streams updates via WebSocket.

API: https://data.aishub.net/ws.php
Rate limit: 1 request per minute
"""
import time
import json
import logging
import threading
import requests
from datetime import datetime, timezone

logger = logging.getLogger('aquasentinel.ais_live')

# In-memory cache (replaces Redis for zero-config setup)
_cache = {
    'vessels': [],
    'last_fetch': None,
    'fetch_count': 0,
    'errors': 0,
    'status': 'idle'  # idle, fetching, ok, error
}
_cache_lock = threading.Lock()
_polling_thread = None
_polling_active = False


def fetch_ais_data(config):
    """
    Fetch live vessel data from AIS Hub web service API.
    
    Args:
        config: dict with keys: username, latmin, latmax, lonmin, lonmax
    
    Returns:
        list of vessel dicts or None on error
    """
    url = 'https://data.aishub.net/ws.php'
    params = {
        'username': config.get('AIS_HUB_USERNAME', ''),
        'format': 1,       # 1 = AIS format
        'output': 'json',
        'compress': 0,
        'latmin': config.get('AIS_LAT_MIN', 18),
        'latmax': config.get('AIS_LAT_MAX', 20),
        'lonmin': config.get('AIS_LON_MIN', 72),
        'lonmax': config.get('AIS_LON_MAX', 73),
    }

    try:
        logger.info(f"[AIS] Fetching live data from AIS Hub... (region: {params['latmin']}-{params['latmax']}N, {params['lonmin']}-{params['lonmax']}E)")
        
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()

        data = response.json()

        # AIS Hub returns a list: [metadata, vessel_list]
        if isinstance(data, list) and len(data) >= 2:
            metadata = data[0]
            vessels_raw = data[1]

            # Check for API errors
            if isinstance(metadata, dict) and metadata.get('ERROR', False):
                error_msg = metadata.get('ERROR_MESSAGE', 'Unknown AIS Hub error')
                logger.error(f"[AIS] API error: {error_msg}")
                return None

            vessels = []
            for v in vessels_raw:
                vessel = {
                    'mmsi': str(v.get('MMSI', '')),
                    'lat': _safe_float(v.get('LATITUDE', v.get('LAT'))),
                    'lon': _safe_float(v.get('LONGITUDE', v.get('LON'))),
                    'sog': _safe_float(v.get('SOG', 0)) / 10.0,  # SOG is in 1/10 knot
                    'cog': _safe_float(v.get('COG', 0)) / 10.0,  # COG is in 1/10 degree
                    'heading': _safe_float(v.get('HEADING', 511)),
                    'name': v.get('NAME', '').strip(),
                    'imo': str(v.get('IMO', '')),
                    'type': _vessel_type(v.get('TYPE', 0)),
                    'timestamp': v.get('TIME', ''),
                    'status': 'normal'  # default, anomaly detection updates this
                }

                # Handle invalid heading (511 = not available)
                if vessel['heading'] == 511:
                    vessel['heading'] = vessel['cog']

                # Skip vessels with obviously invalid coordinates
                if vessel['lat'] and vessel['lon'] and abs(vessel['lat']) <= 90 and abs(vessel['lon']) <= 180:
                    vessels.append(vessel)

            logger.info(f"[AIS] Fetched {len(vessels)} vessels from AIS Hub")
            return vessels
        else:
            logger.warning(f"[AIS] Unexpected response format: {str(data)[:200]}")
            return None

    except requests.Timeout:
        logger.error("[AIS] Request timed out")
        return None
    except requests.ConnectionError:
        logger.error("[AIS] Connection error - network issue")
        return None
    except requests.HTTPError as e:
        logger.error(f"[AIS] HTTP error: {e}")
        return None
    except json.JSONDecodeError:
        logger.error("[AIS] Invalid JSON response")
        return None
    except Exception as e:
        logger.error(f"[AIS] Unexpected error: {e}")
        return None


def _safe_float(val, default=0.0):
    """Safely convert a value to float."""
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _vessel_type(type_code):
    """Convert AIS vessel type code to human-readable string."""
    type_code = int(type_code) if type_code else 0
    type_map = {
        range(20, 30): 'Wing In Ground',
        range(30, 40): 'Fishing',
        range(40, 50): 'High Speed Craft',
        range(50, 60): 'Special Craft',
        range(60, 70): 'Passenger',
        range(70, 80): 'Cargo',
        range(80, 90): 'Tanker',
        range(90, 100): 'Other',
    }
    for r, name in type_map.items():
        if type_code in r:
            return name
    return 'Unknown'


def get_cached_vessels():
    """Get the latest cached vessel data."""
    with _cache_lock:
        return {
            'vessels': _cache['vessels'],
            'last_fetch': _cache['last_fetch'],
            'fetch_count': _cache['fetch_count'],
            'errors': _cache['errors'],
            'status': _cache['status'],
            'vessel_count': len(_cache['vessels'])
        }


def update_cache(vessels):
    """Update the vessel cache with new data."""
    with _cache_lock:
        if vessels is not None:
            _cache['vessels'] = vessels
            _cache['last_fetch'] = datetime.now(timezone.utc).isoformat()
            _cache['fetch_count'] += 1
            _cache['status'] = 'ok'
        else:
            _cache['errors'] += 1
            _cache['status'] = 'error'
            # Keep previous cached data on error (graceful degradation)


def run_anomaly_hook(vessels):
    """
    Hook: Run anomaly detection on live vessel data.
    Marks suspicious vessels before emitting to frontend.
    """
    if not vessels:
        return vessels

    for v in vessels:
        sog = v.get('sog', 0)
        # Quick heuristic anomaly flags
        if sog < 0.5 and v.get('type') in ('Cargo', 'Tanker'):
            v['status'] = 'anomaly'
            v['anomaly_reason'] = 'Unexpected stop (cargo/tanker)'
        elif sog > 25:
            v['status'] = 'anomaly'
            v['anomaly_reason'] = 'Excessive speed'
        elif v.get('heading', 0) != 511 and abs(v.get('heading', 0) - v.get('cog', 0)) > 45:
            v['status'] = 'anomaly'
            v['anomaly_reason'] = 'Heading/course mismatch'
        else:
            v['status'] = 'normal'

    return vessels


def _polling_loop(app, socketio, interval=60):
    """
    Background polling loop.
    Fetches AIS data every `interval` seconds and emits via WebSocket.
    Respects AIS Hub rate limit of 1 request per minute.
    """
    global _polling_active

    with app.app_context():
        logger.info(f"[AIS] Polling loop started (interval: {interval}s)")

        while _polling_active:
            try:
                with _cache_lock:
                    _cache['status'] = 'fetching'

                config = app.config
                vessels = fetch_ais_data(config)

                if vessels:
                    # Run anomaly detection hook
                    vessels = run_anomaly_hook(vessels)
                    update_cache(vessels)

                    # Emit via WebSocket
                    socketio.emit('vessel_update', vessels, namespace='/')

                    # Check for anomalies and emit alerts
                    anomalies = [v for v in vessels if v.get('status') == 'anomaly']
                    if anomalies:
                        for a in anomalies[:3]:  # Limit alerts
                            socketio.emit('alert', {
                                'type': 'anomaly',
                                'severity': 'high',
                                'title': f'⚠️ Vessel Anomaly: {a.get("name", a["mmsi"])}',
                                'message': a.get('anomaly_reason', 'Suspicious behavior'),
                                'lat': a['lat'],
                                'lon': a['lon'],
                                'mmsi': a['mmsi']
                            }, namespace='/')

                    logger.info(f"[AIS] Update emitted: {len(vessels)} vessels, {len(anomalies)} anomalies")
                else:
                    update_cache(None)
                    logger.warning("[AIS] No data received, using cached data")

            except Exception as e:
                logger.error(f"[AIS] Polling error: {e}")
                update_cache(None)

            # Sleep for interval (respect rate limit)
            time.sleep(interval)

        logger.info("[AIS] Polling loop stopped")


def start_polling(app, socketio, interval=60):
    """Start the background AIS polling thread."""
    global _polling_thread, _polling_active

    if _polling_active:
        logger.warning("[AIS] Polling already active")
        return

    _polling_active = True
    _polling_thread = threading.Thread(
        target=_polling_loop,
        args=(app, socketio, interval),
        daemon=True,
        name='ais-polling'
    )
    _polling_thread.start()
    logger.info("[AIS] Background polling started")


def stop_polling():
    """Stop the background AIS polling thread."""
    global _polling_active
    _polling_active = False
    logger.info("[AIS] Polling stop requested")


def fetch_once(app):
    """
    Fetch AIS data once (for manual /live-data endpoint calls).
    Uses cache if data is fresh (< 60 seconds old).
    """
    cached = get_cached_vessels()

    # Return cache if fresh
    if cached['last_fetch']:
        last = datetime.fromisoformat(cached['last_fetch'])
        age = (datetime.now(timezone.utc) - last).total_seconds()
        if age < 60 and cached['vessels']:
            return cached

    # Otherwise fetch fresh
    with app.app_context():
        vessels = fetch_ais_data(app.config)
        if vessels:
            vessels = run_anomaly_hook(vessels)
            update_cache(vessels)
        return get_cached_vessels()
