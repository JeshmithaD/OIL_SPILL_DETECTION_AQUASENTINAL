"""
Satellite Image Processing – Module 3
SAR image preprocessing: noise removal, CLAHE, patch extraction.
"""
import numpy as np
from PIL import Image, ImageFilter
import io


def preprocess_sar_image(image_array):
    """
    Preprocess SAR satellite image:
    1. Noise removal (median filter)
    2. CLAHE-style contrast enhancement
    3. Normalize to 0-1 range
    """
    img = Image.fromarray(image_array.astype(np.uint8))

    # Step 1: Noise removal via median filter
    img = img.filter(ImageFilter.MedianFilter(size=3))

    # Step 2: Contrast enhancement (adaptive histogram equalization simulation)
    img_array = np.array(img, dtype=np.float64)
    # Normalize
    if img_array.max() > img_array.min():
        img_array = (img_array - img_array.min()) / (img_array.max() - img_array.min())
    # CLAHE-like: clip and redistribute
    clip_limit = 0.8
    img_array = np.clip(img_array, 0, clip_limit) / clip_limit

    return img_array


def extract_patches(image_array, patch_size=64):
    """
    Extract non-overlapping patches of size patch_size x patch_size.
    Returns list of patches.
    """
    h, w = image_array.shape[:2]
    patches = []
    positions = []

    for i in range(0, h - patch_size + 1, patch_size):
        for j in range(0, w - patch_size + 1, patch_size):
            patch = image_array[i:i+patch_size, j:j+patch_size]
            patches.append(patch)
            positions.append((i, j))

    return patches, positions


def generate_synthetic_sar(lat, lon, size=256):
    """
    Generate synthetic SAR-like imagery for demo purposes.
    Creates a grayscale image with ocean-like patterns and potential spill features.
    """
    np.random.seed(int(abs(lat * 1000 + lon * 100)) % (2**31))

    # Base ocean texture (dark with noise)
    img = np.random.normal(40, 15, (size, size)).clip(0, 255)

    # Add wave patterns
    x = np.linspace(0, 4 * np.pi, size)
    y = np.linspace(0, 4 * np.pi, size)
    xx, yy = np.meshgrid(x, y)
    waves = 15 * np.sin(xx + np.random.uniform(0, 2*np.pi)) + 10 * np.cos(yy * 0.5)
    img += waves

    # Possibly add oil spill patch (dark smooth region)
    if np.random.random() > 0.4:  # 60% chance of spill in demo
        cx, cy = np.random.randint(60, 196, 2)
        radius = np.random.randint(20, 50)
        for i in range(size):
            for j in range(size):
                dist = np.sqrt((i - cx)**2 + (j - cy)**2)
                if dist < radius:
                    img[i, j] = max(5, img[i, j] * 0.3)  # Dark smooth region = spill

    img = np.clip(img, 0, 255).astype(np.uint8)
    return img


def process_satellite_image(lat, lon):
    """
    Full satellite processing pipeline:
    1. Get/generate SAR image for coordinates
    2. Preprocess
    3. Extract patches
    Returns patches ready for CNN inference.
    """
    # Generate synthetic SAR image (in production, fetch from Sentinel Hub)
    raw_image = generate_synthetic_sar(lat, lon)

    # Preprocess
    processed = preprocess_sar_image(raw_image)

    # Extract 64x64 patches
    patches, positions = extract_patches(processed, patch_size=64)

    return {
        'patches': patches,
        'positions': positions,
        'image_size': raw_image.shape,
        'num_patches': len(patches)
    }
