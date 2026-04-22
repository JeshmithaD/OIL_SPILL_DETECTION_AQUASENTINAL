"""
AISStream Real-Time WebSocket Service
Connects to AISStream.io for live vessel data streaming.
Includes geospatial filtering and alert integration.
"""
import json
import ssl
import threading
import logging
import random
import time

logger = logging.getLogger('aquasentinel.aisstream')

# In-memory vessel store
_vessels = {}
_vessel_lock = threading.Lock()
_stream_active = False

# Indian Ocean Region + SE Asia bounds (wide filter)
INDIA_LAT_MIN = -10
INDIA_LAT_MAX = 40
INDIA_LON_MIN = 40
INDIA_LON_MAX = 110


def is_valid_location(lat, lon):
    """Filter out vessels on land or with invalid coordinates."""
    if lat is None or lon is None:
        return False
    if lat == 0 or lon == 0:
        return False
    if not (INDIA_LAT_MIN <= lat <= INDIA_LAT_MAX and INDIA_LON_MIN <= lon <= INDIA_LON_MAX):
        return False
    return True


def start_ais_stream(socketio, app):
    """Start the AISStream WebSocket in a background thread."""
    global _stream_active

    def run():
        global _stream_active
        _stream_active = True

        try:
            import websocket as ws_lib
        except ImportError:
            logger.error("[AISStream] websocket-client not installed. pip3 install websocket-client")
            _stream_active = False
            return

        with app.app_context():
            api_key = app.config.get('AISSTREAM_API_KEY', '')
            stream_url = app.config.get('AISSTREAM_URL', 'wss://stream.aisstream.io/v0/stream')
            bounding_boxes = app.config.get('AIS_BOUNDING_BOXES', [[[8, 68], [23, 88]]])

            if not api_key:
                logger.error("[AISStream] ❌ CRITICAL: No AISStream API key found in .env or config. Real-time data will not be available.")
                _stream_active = False
                return

            logger.info(f"[AISStream] Connecting to {stream_url}...")
            retry_count = 0
            max_retries = 3

            while _stream_active:
                try:
                    ws = ws_lib.WebSocket(sslopt={"cert_reqs": ssl.CERT_NONE})
                    ws.connect(stream_url)
                    logger.info("[AISStream] ✅ Connected")
                    retry_count = 0

                    ws.send(json.dumps({
                        "APIKey": api_key,
                        "BoundingBoxes": bounding_boxes
                    }))
                    logger.info(f"[AISStream] Subscribed: {bounding_boxes}")

                    while _stream_active:
                        try:
                            raw = ws.recv()
                            if not raw:
                                continue

                            data = json.loads(raw)
                            if "Message" not in data:
                                continue

                            msg_type = data.get("MessageType", "")
                            msg = data["Message"]

                            if msg_type == "PositionReport":
                                pos = msg.get("PositionReport", msg)
                                vessel = _parse_position_report(pos, data)
                            else:
                                vessel = _parse_generic_message(msg, data)

                            if not vessel:
                                continue

                            # ── STRICT GEO FILTER ──
                            if not is_valid_location(vessel.get('lat'), vessel.get('lon')):
                                continue

                            # No automatic anomaly/spill detection - leave for explicit 'Run Detection' ML execution
                            vessel['spill'] = False
                            vessel['confidence'] = 0

                            # Store
                            with _vessel_lock:
                                _vessels[vessel['mmsi']] = vessel

                            # Emit to frontend
                            socketio.emit('vessel_update', vessel, namespace='/')

                            # ── SPILL ALERT: Email + SMS + WebSocket ──
                            if vessel.get('spill') and vessel.get('confidence', 0) > 0.9:
                                from services.alert_service import trigger_spill_alert
                                trigger_spill_alert(vessel, socketio=socketio, config=app.config)

                        except json.JSONDecodeError:
                            continue
                        except Exception as e:
                            err_msg = str(e).lower()
                            if 'closed' in err_msg or 'connection' in err_msg or 'eof' in err_msg:
                                logger.warning(f"[AISStream] Socket closed, will reconnect: {e}")
                                break  # Break inner loop to reconnect
                            logger.error(f"[AISStream] Msg error: {e}")
                            continue

                except Exception as e:
                    retry_count += 1
                    logger.error(f"[AISStream] Connection error ({retry_count}/{max_retries}): {e}")
                    if retry_count >= max_retries:
                        logger.error("[AISStream] ❌ CRITICAL: Max retries exhausted. Real-time data will not be available.")
                        _stream_active = False
                        return
                    if _stream_active:
                        time.sleep(5)

            logger.info("[AISStream] Stream stopped")

    threading.Thread(target=run, daemon=True, name='aisstream-worker').start()
    logger.info("[AISStream] Background thread started")


def _parse_position_report(pos, data):
    meta = data.get("MetaData", {})
    return {
        'mmsi': str(pos.get('UserID', meta.get('MMSI', ''))),
        'lat': pos.get('Latitude', 0),
        'lon': pos.get('Longitude', 0),
        'sog': pos.get('Sog', 0),
        'cog': pos.get('Cog', 0),
        'heading': pos.get('TrueHeading', 511),
        'name': meta.get('ShipName', '').strip(),
        'type': _vessel_type_name(meta.get('ShipType', 0)),
        'timestamp': meta.get('time_utc', ''),
        'status': 'normal',
        'source': 'aisstream'
    }


def _parse_generic_message(msg, data):
    meta = data.get("MetaData", {})
    lat = msg.get('Latitude', msg.get('Position', {}).get('Latitude', 0))
    lon = msg.get('Longitude', msg.get('Position', {}).get('Longitude', 0))
    return {
        'mmsi': str(msg.get('UserID', meta.get('MMSI', ''))),
        'lat': lat, 'lon': lon,
        'sog': msg.get('SpeedOverGround', msg.get('Sog', 0)),
        'cog': msg.get('CourseOverGround', msg.get('Cog', 0)),
        'heading': msg.get('TrueHeading', 511),
        'name': meta.get('ShipName', '').strip(),
        'type': _vessel_type_name(meta.get('ShipType', 0)),
        'timestamp': meta.get('time_utc', ''),
        'status': 'normal',
        'source': 'aisstream'
    }


def _detect_anomaly(vessel):
    sog = vessel.get('sog', 0) or 0
    heading = vessel.get('heading', 0) or 0
    cog = vessel.get('cog', 0) or 0

    if sog < 0.5 and vessel.get('type') in ('Cargo', 'Tanker'):
        vessel['status'] = 'anomaly'
        vessel['anomaly_reason'] = 'Unexpected stop (cargo/tanker)'
    elif sog > 25:
        vessel['status'] = 'anomaly'
        vessel['anomaly_reason'] = 'Excessive speed'
    elif heading != 511 and abs(heading - cog) > 45:
        vessel['status'] = 'anomaly'
        vessel['anomaly_reason'] = 'Heading/course mismatch'
    else:
        vessel['status'] = 'normal'
        vessel['anomaly_reason'] = ''
    return vessel


def _vessel_type_name(type_code):
    try:
        code = int(type_code)
    except (ValueError, TypeError):
        return 'Unknown'
    if 30 <= code < 40: return 'Fishing'
    if 40 <= code < 50: return 'High Speed Craft'
    if 60 <= code < 70: return 'Passenger'
    if 70 <= code < 80: return 'Cargo'
    if 80 <= code < 90: return 'Tanker'
    return 'Other'


def _run_demo_mode(socketio, app):
    """Demo mode: 15 animated vessels in India ocean region (real-time simulation)."""
    global _stream_active
    import math

    logger.info("[AISStream] 🎮 DEMO mode active")

    base_vessels = [
        {'mmsi': '366999001', 'name': 'MV Oceanic Star', 'type': 'Cargo', 'lat': 19.076, 'lon': 72.878, 'sog': 12.5, 'cog': 245, 'heading': 243},
        {'mmsi': '366999002', 'name': 'SS Neptune Grace', 'type': 'Tanker', 'lat': 19.120, 'lon': 72.910, 'sog': 14.2, 'cog': 180, 'heading': 178},
        {'mmsi': '366999003', 'name': 'MV Coral Voyager', 'type': 'Fishing', 'lat': 18.950, 'lon': 72.820, 'sog': 0.2, 'cog': 90, 'heading': 88},
        {'mmsi': '366999004', 'name': 'SS Sea Falcon', 'type': 'Cargo', 'lat': 19.200, 'lon': 72.700, 'sog': 28.5, 'cog': 315, 'heading': 310},
        {'mmsi': '366999005', 'name': 'MV Arctic Pioneer', 'type': 'Tanker', 'lat': 19.050, 'lon': 72.750, 'sog': 11.0, 'cog': 200, 'heading': 198},
        {'mmsi': '366999006', 'name': 'SS Blue Horizon', 'type': 'Fishing', 'lat': 18.880, 'lon': 72.680, 'sog': 1.5, 'cog': 45, 'heading': 40},
        {'mmsi': '366999007', 'name': 'MV Storm Chaser', 'type': 'Cargo', 'lat': 18.800, 'lon': 72.500, 'sog': 15.8, 'cog': 270, 'heading': 268},
        {'mmsi': '366999008', 'name': 'SS Golden Wave', 'type': 'Tanker', 'lat': 19.010, 'lon': 72.600, 'sog': 0.1, 'cog': 120, 'heading': 115},
        {'mmsi': '366999009', 'name': 'MV Iron Eagle', 'type': 'Cargo', 'lat': 18.700, 'lon': 72.450, 'sog': 13.0, 'cog': 160, 'heading': 158},
        {'mmsi': '366999010', 'name': 'SS Pacific Titan', 'type': 'Tanker', 'lat': 19.150, 'lon': 72.550, 'sog': 30.2, 'cog': 350, 'heading': 348},
        {'mmsi': '366999011', 'name': 'MV Crystal Bay', 'type': 'Passenger', 'lat': 19.000, 'lon': 72.800, 'sog': 10.5, 'cog': 225, 'heading': 222},
        {'mmsi': '366999012', 'name': 'SS Thunder Pearl', 'type': 'Cargo', 'lat': 18.920, 'lon': 72.720, 'sog': 8.3, 'cog': 135, 'heading': 130},
        {'mmsi': '366999013', 'name': 'MV Wind Runner', 'type': 'Fishing', 'lat': 18.780, 'lon': 72.580, 'sog': 0.3, 'cog': 0, 'heading': 355},
        {'mmsi': '366999014', 'name': 'SS Emerald Isle', 'type': 'Tanker', 'lat': 19.040, 'lon': 72.650, 'sog': 16.7, 'cog': 290, 'heading': 288},
        {'mmsi': '366999015', 'name': 'MV Silver Crest', 'type': 'Other', 'lat': 18.970, 'lon': 72.760, 'sog': 2.1, 'cog': 75, 'heading': 70},
    ]

    while _stream_active:
        for v in base_vessels:
            speed_factor = v['sog'] * 0.0001
            v['lat'] += random.uniform(-0.002, 0.002) + speed_factor * math.cos(math.radians(v['cog']))
            v['lon'] += random.uniform(-0.002, 0.002) + speed_factor * math.sin(math.radians(v['cog']))
            v['sog'] = max(0, v['sog'] + random.uniform(-0.5, 0.5))
            v['cog'] = (v['cog'] + random.uniform(-5, 5)) % 360

            # Keep in ocean region (west of Mumbai coast)
            v['lat'] = max(18.5, min(19.5, v['lat']))
            v['lon'] = max(72.2, min(73.0, v['lon']))

            vessel = {**v, 'status': 'normal', 'source': 'aisstream-demo', 'spill': False, 'confidence': 0}

            # Geo filter
            if not is_valid_location(vessel['lat'], vessel['lon']):
                continue

            # No automatic simulated anomalies - await manual trigger
            with _vessel_lock:
                _vessels[vessel['mmsi']] = vessel

            socketio.emit('vessel_update', vessel, namespace='/')

            # Alert with email + SMS
            if vessel.get('spill') and vessel.get('confidence', 0) > 0.9:
                from services.alert_service import trigger_spill_alert
                trigger_spill_alert(vessel, socketio=socketio)

        # Batch emit
        with _vessel_lock:
            all_vessels = list(_vessels.values())
        
        if all_vessels:
            logger.info(f"[AISStream] 📡 Emitting batch of {len(all_vessels)} vessels via SocketIO")
            socketio.emit('vessel_batch', all_vessels, namespace='/')

        time.sleep(3)


def get_all_vessels():
    """Return all currently tracked vessels (real-time only)."""
    with _vessel_lock:
        return list(_vessels.values())


def stop_stream():
    global _stream_active
    _stream_active = False
