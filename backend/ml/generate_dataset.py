"""
Generate synthetic SAR image samples for CNN training demo.
Creates spill and no_spill images in data/images/ directories.
"""
import numpy as np
from PIL import Image
import os


def generate_spill_image(size=64):
    """Generate a synthetic SAR image with an oil spill (dark smooth region)."""
    np.random.seed(None)
    # Ocean background
    img = np.random.normal(120, 30, (size, size, 3)).clip(0, 255)
    # Add oil spill (dark smooth patch)
    cx, cy = np.random.randint(15, 49, 2)
    radius = np.random.randint(10, 25)
    for i in range(size):
        for j in range(size):
            dist = np.sqrt((i - cx)**2 + (j - cy)**2)
            if dist < radius:
                factor = 0.2 + 0.1 * (dist / radius)
                img[i, j] = img[i, j] * factor
    return img.astype(np.uint8)


def generate_no_spill_image(size=64):
    """Generate a synthetic SAR image of clean ocean."""
    np.random.seed(None)
    img = np.random.normal(130, 35, (size, size, 3)).clip(0, 255)
    # Add wave patterns
    x = np.linspace(0, 4 * np.pi, size)
    wave = 10 * np.sin(x + np.random.uniform(0, 2*np.pi))
    for i in range(size):
        img[i, :, :] += wave[i]
    return np.clip(img, 0, 255).astype(np.uint8)


def generate_dataset(base_path='data/images', count=25):
    """Generate training dataset with spill and no_spill images."""
    spill_dir = os.path.join(base_path, 'spill')
    no_spill_dir = os.path.join(base_path, 'no_spill')
    os.makedirs(spill_dir, exist_ok=True)
    os.makedirs(no_spill_dir, exist_ok=True)

    for i in range(count):
        img = generate_spill_image()
        Image.fromarray(img).save(os.path.join(spill_dir, f'spill_{i:03d}.png'))

        img = generate_no_spill_image()
        Image.fromarray(img).save(os.path.join(no_spill_dir, f'clean_{i:03d}.png'))

    print(f"✅ Generated {count} spill + {count} no_spill images in {base_path}/")


if __name__ == '__main__':
    generate_dataset()
