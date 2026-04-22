"""
AquaSentinel Alert Service
Sends alerts via Email (SMTP), SMS (Twilio), and WebSocket.
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger('aquasentinel.alerts')


def send_email(message, config=None):
    """Send alert email via SMTP (Gmail)."""
    # Dynamic settings override Environment variables
    try:
        from services.settings_service import get_smtp_config
        smtp_cfg = get_smtp_config()
    except Exception as e:
        logger.error(f"Error loading SMTP dynamic config: {e}")
        smtp_cfg = {}

    email_user = smtp_cfg.get('SMTP_USER', '')
    email_pass = smtp_cfg.get('SMTP_PASSWORD', '')
    email_to = smtp_cfg.get('ALERT_EMAIL_TO', '')
    smtp_server = smtp_cfg.get('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = smtp_cfg.get('SMTP_PORT', 587)

    if not email_user or not email_pass:
        logger.warning("[ALERT] Email not configured (SMTP_USER/SMTP_PASSWORD empty). Skipping email.")
        print("⚠️ Email not sent (no credentials configured)")
        return False

    try:
        msg = MIMEMultipart()
        msg['From'] = email_user
        msg['To'] = email_to or email_user
        msg['Subject'] = '🚨 AquaSentinel Oil Spill Alert'
        msg.attach(MIMEText(message, 'plain'))

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(email_user, email_pass)
        server.sendmail(email_user, email_to or email_user, msg.as_string())
        server.quit()

        logger.info("[ALERT] ✅ Email sent successfully")
        print("✅ Email Sent")
        return True

    except Exception as e:
        logger.error(f"[ALERT] ❌ Email error: {e}")
        print(f"❌ Email Error: {e}")
        return False


def send_sms(message, config=None):
    """Send alert SMS via Twilio."""
    if config is None:
        from config import Config
        config = Config

    sid = getattr(config, 'TWILIO_SID', '') or ''
    auth = getattr(config, 'TWILIO_AUTH_TOKEN', '') or ''
    from_phone = getattr(config, 'TWILIO_FROM', '') or ''
    to_phone = getattr(config, 'TWILIO_TO', '') or ''

    if not sid or not auth:
        logger.warning("[ALERT] Twilio not configured (SID/AUTH empty). Skipping SMS.")
        print("⚠️ SMS not sent (no Twilio credentials)")
        return False

    try:
        from twilio.rest import Client
        client = Client(sid, auth)
        client.messages.create(
            body=message,
            from_=from_phone,
            to=to_phone
        )
        logger.info("[ALERT] ✅ SMS sent successfully")
        print("✅ SMS Sent")
        return True

    except ImportError:
        logger.warning("[ALERT] Twilio library not installed. Run: pip3 install twilio")
        print("⚠️ SMS not sent (twilio not installed)")
        return False
    except Exception as e:
        logger.error(f"[ALERT] ❌ SMS error: {e}")
        print(f"❌ SMS Error: {e}")
        return False


def trigger_spill_alert(vessel, socketio=None, config=None):
    """
    Full alert pipeline for a detected oil spill.
    Sends email + SMS + WebSocket popup.
    """
    message = f"""
🚨 OIL SPILL ALERT — AquaSentinel
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Vessel: {vessel.get('name', vessel.get('mmsi', 'Unknown'))}
MMSI: {vessel.get('mmsi', 'N/A')}
Location: {vessel.get('lat', 0):.4f}°N, {vessel.get('lon', 0):.4f}°E
Confidence: {vessel.get('confidence', 0):.0%}
Speed: {vessel.get('sog', 0)} knots
Type: {vessel.get('type', 'Unknown')}
Reason: {vessel.get('anomaly_reason', 'Anomalous behavior detected')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Action Required: Dispatch Coast Guard immediately.
"""

    logger.warning(f"[ALERT] 🚨 SPILL DETECTED: {vessel.get('name', vessel.get('mmsi'))} "
                   f"conf={vessel.get('confidence', 0):.0%} "
                   f"at ({vessel.get('lat', 0):.4f}, {vessel.get('lon', 0):.4f})")

    # 1. Send Email
    email_sent = send_email(message, config)

    # 2. Send SMS
    sms_sent = send_sms(message, config)

    # 3. WebSocket alert (always works)
    if socketio:
        socketio.emit('alert', {
            'type': 'spill',
            'severity': 'critical',
            'title': f"🛢️ Oil Spill Detected near {vessel.get('name', vessel.get('mmsi', 'Unknown'))}",
            'message': f"Confidence: {vessel.get('confidence', 0):.0%} at ({vessel.get('lat', 0):.4f}, {vessel.get('lon', 0):.4f})",
            'lat': vessel.get('lat'),
            'lon': vessel.get('lon'),
            'mmsi': vessel.get('mmsi'),
            'confidence': vessel.get('confidence', 0),
            'email_sent': email_sent,
            'sms_sent': sms_sent,
        }, namespace='/')

    return {'email_sent': email_sent, 'sms_sent': sms_sent, 'ws_sent': True}


def send_sos_alert(alert_obj, config=None):
    """Send SOS emergency alert via all channels."""
    message = f"""
🚨🚨🚨 SOS EMERGENCY — AquaSentinel
━━━━━━━━━━━━━━━━━━━━━━━━━━━
{alert_obj.message if hasattr(alert_obj, 'message') else str(alert_obj)}
Location: {getattr(alert_obj, 'latitude', 0)}, {getattr(alert_obj, 'longitude', 0)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMMEDIATE ACTION REQUIRED
"""
    send_email(message, config)
    send_sms(message, config)
