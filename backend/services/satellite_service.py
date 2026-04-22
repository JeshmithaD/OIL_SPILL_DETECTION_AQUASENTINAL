import os
import random
import logging
import requests
from datetime import datetime, timedelta
from config import Config

logger = logging.getLogger('aquasentinel.gee')

_ee_initialized = False

def init_gee():
    """Initialize Google Earth Engine."""
    global _ee_initialized
    if _ee_initialized: return True
    
    try:
        import ee
        # Attempt standard initialization (assumes environment has credentials via `earthengine authenticate` 
        # or GOOGLE_APPLICATION_CREDENTIALS)
        ee.Initialize()
        _ee_initialized = True
        logger.info("🌍 Google Earth Engine (GEE) Initialized successfully.")
        return True
    except Exception as e:
        logger.warning(f"⚠️ GEE Initialization failed: {e}. (Run `earthengine authenticate` first). Using fallback.")
        return False

def fetch_satellite_image(lat, lon):
    """
    Automated Satellite Image Fetcher via Google Earth Engine (GEE).
    1. Receives Lat/Lon from AIS Anomaly
    2. Creates Bounding Box (ROI)
    3. Queries Sentinel-2 (Recent date, Cloud cover < 10%)
    4. Downloads the image locally for AI processing
    """
    dataset_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'dataset')
    gee_out_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'gee_downloads')
    os.makedirs(gee_out_dir, exist_ok=True)
    
    # Check if we should attempt GEE
    gee_api_key = getattr(Config, 'GEE_API_KEY', 'AIzaSyAQI-rZC_eCghLlnSw9CjQYiu1bAWtfGfI')
    
    # If GEE initializes safely, try fetching real-time data
    if init_gee():
        try:
            import ee
            logger.info(f"🛰️ [GEE] Fetching Sentinel-2 imagery for Coordinates: {lat:.5f}, {lon:.5f}")
            
            # 1. Define ROI (bounding box ~5km around the vessel)
            point = ee.Geometry.Point([lon, lat])
            roi = point.buffer(5000).bounds()
            
            # 2. Define Timeframe (Last 30 days)
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            
            # 3. Query Sentinel-2 Surface Reflectance
            collection = (ee.ImageCollection('COPERNICUS/S2_SR')
                          .filterBounds(roi)
                          .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
                          .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
                          .sort('system:time_start', False)) # Latest first
            
            # Get the latest image
            count = collection.size().getInfo()
            if count > 0:
                image = ee.Image(collection.first())
                
                # Select RGB bands and enhance for visual/CNN processing
                vis_params = {
                    'bands': ['B4', 'B3', 'B2'],
                    'min': 0,
                    'max': 3000,
                    'gamma': 1.4,
                    'region': roi,
                    'scale': 10,  # 10m/px resolution
                    'format': 'png'
                }
                
                # 4. Generate URL and Download
                url = image.getThumbURL(vis_params)
                logger.info(f"🌍 GEE Image URL generated: {url}")
                
                filename = f"gee_s2_{lat:.4f}_{lon:.4f}_{datetime.now().strftime('%Y%m%d_%H%M')}.png"
                filepath = os.path.join(gee_out_dir, filename)
                
                # Download the image
                r = requests.get(url, stream=True, timeout=15)
                if r.status_code == 200:
                    with open(filepath, 'wb') as f:
                        for chunk in r:
                            f.write(chunk)
                    logger.info(f"✅ GEE Image successfully downloaded -> {filepath}")
                    return filepath
            else:
                logger.warning("☁️ No clear Sentinel-2 images found for this region in the last 30 days.")
                
        except Exception as e:
            logger.error(f"❌ GEE Fetching Error: {e}")
            
    # Graceful fallback: Serve a local image from the Kaggle dataset to the CNN test pipeline
    logger.info(f"🔄 Falling back to local dataset image for CNN pipeline at ({lat:.5f}, {lon:.5f})...")
    
    spill_dir = os.path.join(dataset_dir, 'oil_spill')
    clear_dir = os.path.join(dataset_dir, 'no_oil_spill')
    
    selected_dir = spill_dir if random.random() > 0.4 else clear_dir
    if not os.path.exists(selected_dir):
        selected_dir = spill_dir if os.path.exists(spill_dir) else None
        
    if selected_dir:
        images = [f for f in os.listdir(selected_dir) if f.endswith(('.jpg', '.png'))]
        if images:
            img_path = os.path.join(selected_dir, random.choice(images))
            logger.info(f"📸 Fallback Image automatically acquired -> {img_path}")
            return img_path
            
    logger.error("❌ No satellite images available for pipeline!")
    return None
