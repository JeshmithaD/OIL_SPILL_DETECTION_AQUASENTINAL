import os
import json
import logging

# Configure logging
logging.basicConfig(
    filename='settings_debug.log',
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger('aquasentinel.settings')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SETTINGS_PATH = os.path.join(BASE_DIR, '..', 'instance', 'settings.json')

def get_settings():
    """Read dynamic settings from JSON file."""
    if not os.path.exists(SETTINGS_PATH):
        return {}
    
    try:
        with open(SETTINGS_PATH, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading settings: {e}")
        return {}

def save_settings(new_settings):
    """Save dynamic settings to JSON file."""
    os.makedirs(os.path.dirname(SETTINGS_PATH), exist_ok=True)
    try:
        # Merge with existing
        current = get_settings()
        current.update(new_settings)
        
        logging.info(f"Saving settings to {SETTINGS_PATH}")
        with open(SETTINGS_PATH, 'w') as f:
            json.dump(current, f, indent=4)
        logging.info("Settings saved successfully")
        return True
    except Exception as e:
        logging.error(f"Error saving settings: {str(e)}", exc_info=True)
        return False

def get_smtp_config():
    """
    Get merged SMTP configuration: 
    Dynamic settings override Environment variables.
    """
    from flask import current_app
    
    # 1. Start with Environment/Config
    config = {
        'SMTP_USER': current_app.config.get('SMTP_USER', ''),
        'SMTP_PASSWORD': current_app.config.get('SMTP_PASSWORD', ''),
        'ALERT_EMAIL_TO': current_app.config.get('ALERT_EMAIL_TO', ''),
        'SMTP_SERVER': current_app.config.get('SMTP_SERVER', 'smtp.gmail.com'),
        'SMTP_PORT': current_app.config.get('SMTP_PORT', 587)
    }
    
    # 2. Layer Dynamic Settings
    dynamic = get_settings()
    for key in config.keys():
        if key in dynamic and dynamic[key]:
            config[key] = dynamic[key]
            
    return config
