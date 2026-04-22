"""
AquaSentinel YOLO-based Oil Spill Region Detector
Uses YOLOv8 if available, otherwise falls back to OpenCV contour detection.
Returns bounding boxes + confidence for oil spill regions.
"""
import os
import cv2
import numpy as np
import logging
import base64

logger = logging.getLogger('aquasentinel.yolo')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
YOLO_MODEL_PATH = os.path.join(BASE_DIR, '..', 'ml_models', 'yolo_oil_spill.pt')

_yolo_model = None


def get_yolo_model():
    """Load YOLOv8 model if available."""
    global _yolo_model
    if _yolo_model is not None:
        return _yolo_model

    if os.path.exists(YOLO_MODEL_PATH):
        try:
            from ultralytics import YOLO
            _yolo_model = YOLO(YOLO_MODEL_PATH)
            logger.info(f"🎯 YOLO model loaded from {YOLO_MODEL_PATH}")
            return _yolo_model
        except ImportError:
            logger.warning("ultralytics not installed. Using OpenCV fallback.")
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")

    return None


def detect_spill_regions(img_path):
    """
    Detect oil spill regions in an image.

    Pipeline:
    1. Try YOLOv8 model (if available)
    2. Fallback to OpenCV contour-based detection

    Returns:
        dict with 'detections' (list of bboxes), 'annotated_image_b64', 'method'
    """
    model = get_yolo_model()

    if model is not None:
        return _yolo_detect(model, img_path)
    else:
        return _opencv_detect(img_path)


def _yolo_detect(model, img_path):
    """Use YOLOv8 for bounding box detection."""
    results = model(img_path, verbose=False)
    detections = []

    for r in results:
        boxes = r.boxes
        for box in boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            conf = float(box.conf[0])
            cls = int(box.cls[0])
            detections.append({
                'bbox': [round(x1), round(y1), round(x2), round(y2)],
                'confidence': round(conf, 4),
                'class': cls,
                'label': 'oil_spill'
            })

    # Generate annotated image
    annotated = results[0].plot()
    _, buffer = cv2.imencode('.png', annotated)
    img_b64 = base64.b64encode(buffer).decode('utf-8')

    return {
        'detections': detections,
        'count': len(detections),
        'annotated_image_b64': f"data:image/png;base64,{img_b64}",
        'method': 'yolov8'
    }


def _opencv_detect(img_path):
    """
    OpenCV contour-based oil spill detection fallback.
    Detects dark smooth regions (characteristic of oil on water in SAR/optical imagery).
    """
    img = cv2.imread(img_path)
    if img is None:
        return {'detections': [], 'count': 0, 'method': 'error', 'error': 'Could not read image'}

    original = img.copy()
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 1. Adaptive threshold to find dark regions (oil appears dark in SAR)
    # Also try bright regions (oil appears bright in some optical imagery)
    blur = cv2.GaussianBlur(gray, (7, 7), 0)

    # Dark region detection (SAR-like)
    _, dark_thresh = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Morphological operations to clean up
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    dark_thresh = cv2.morphologyEx(dark_thresh, cv2.MORPH_CLOSE, kernel, iterations=2)
    dark_thresh = cv2.morphologyEx(dark_thresh, cv2.MORPH_OPEN, kernel, iterations=1)

    # Find contours
    contours, _ = cv2.findContours(dark_thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    detections = []
    min_area = img.shape[0] * img.shape[1] * 0.01  # At least 1% of image area

    for contour in contours:
        area = cv2.contourArea(contour)
        if area < min_area:
            continue

        x, y, w, h = cv2.boundingRect(contour)

        # Calculate a "confidence" based on area ratio and smoothness
        area_ratio = area / (img.shape[0] * img.shape[1])
        smoothness = area / (w * h) if w * h > 0 else 0  # How circular/smooth
        confidence = min(0.95, area_ratio * 2 + smoothness * 0.3)

        detections.append({
            'bbox': [x, y, x + w, y + h],
            'confidence': round(confidence, 4),
            'class': 0,
            'label': 'potential_spill',
            'area_pixels': int(area),
            'area_percent': round(area_ratio * 100, 2)
        })

        # Draw bounding box on annotated image
        color = (0, 0, 255) if confidence > 0.5 else (0, 165, 255)
        cv2.rectangle(original, (x, y), (x + w, y + h), color, 2)
        label_text = f"Spill {confidence:.0%}"
        cv2.putText(original, label_text, (x, y - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    # Sort by confidence
    detections.sort(key=lambda d: d['confidence'], reverse=True)

    # Encode annotated image
    _, buffer = cv2.imencode('.png', original)
    img_b64 = base64.b64encode(buffer).decode('utf-8')

    return {
        'detections': detections[:10],  # Top 10 detections
        'count': len(detections),
        'annotated_image_b64': f"data:image/png;base64,{img_b64}",
        'method': 'opencv_contour'
    }


if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        result = detect_spill_regions(sys.argv[1])
        print(f"Detections: {result['count']}")
        print(f"Method: {result['method']}")
        for d in result['detections']:
            print(f"  BBox: {d['bbox']}, Confidence: {d['confidence']}")
    else:
        print("Usage: python yolo_detector.py <image_path>")
