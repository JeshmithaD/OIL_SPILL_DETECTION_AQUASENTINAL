"""
Image Processor – Module 3 (Service Layer)
Wraps satellite_processor for direct image file processing.
Supports OpenCV if available, falls back to Pillow.
"""
import numpy as np
import os

# Try OpenCV first, fallback to Pillow
try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False

from PIL import Image, ImageFilter


def preprocess_image(path, target_size=(64, 64)):
    """
    Load and preprocess an image file for CNN inference.
    1. Load image
    2. Resize to target_size
    3. Normalize to 0-1 range
    """
    if CV2_AVAILABLE:
        img = cv2.imread(path)
        if img is None:
            return None
        img = cv2.resize(img, target_size)
        img = img / 255.0
    else:
        pil_img = Image.open(path)
        pil_img = pil_img.resize(target_size)
        img = np.array(pil_img, dtype=np.float64) / 255.0

    return img


def preprocess_image_array(img_array, target_size=(64, 64)):
    """
    Preprocess a numpy array image.
    """
    if CV2_AVAILABLE:
        img = cv2.resize(img_array.astype(np.uint8), target_size)
    else:
        pil_img = Image.fromarray(img_array.astype(np.uint8))
        pil_img = pil_img.resize(target_size)
        img = np.array(pil_img)

    return img / 255.0


def apply_clahe(image, clip_limit=2.0):
    """Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)."""
    if CV2_AVAILABLE:
        if len(image.shape) == 3:
            lab = cv2.cvtColor((image * 255).astype(np.uint8), cv2.COLOR_BGR2LAB)
            clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(8, 8))
            lab[:, :, 0] = clahe.apply(lab[:, :, 0])
            result = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)
            return result / 255.0
        else:
            clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(8, 8))
            result = clahe.apply((image * 255).astype(np.uint8))
            return result / 255.0
    else:
        # Simplified CLAHE using Pillow
        img = Image.fromarray((image * 255).astype(np.uint8))
        img = img.filter(ImageFilter.DETAIL)
        return np.array(img) / 255.0


def batch_preprocess(image_dir, target_size=(64, 64)):
    """
    Batch preprocess all images in a directory.
    Returns list of (filename, preprocessed_array) tuples.
    """
    results = []
    supported_ext = ('.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp')

    if not os.path.exists(image_dir):
        return results

    for fname in sorted(os.listdir(image_dir)):
        if fname.lower().endswith(supported_ext):
            path = os.path.join(image_dir, fname)
            img = preprocess_image(path, target_size)
            if img is not None:
                results.append((fname, img))

    return results
