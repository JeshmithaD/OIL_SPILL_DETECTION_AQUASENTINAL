"""
AquaSentinel YOLOv8 Model Training Pipeline
----------------------------------------------
This script sets up the dataset structure and trains a YOLOv8 model for oil spill detection 
using REAL datasets (Kaggle SAR, MKLab, Roboflow). 

Since deep learning datasets are massive, run this script locally once you have 
downloaded the datasets into the `dataset/` structure below:

REQUIRED STRUCTURE:
dataset/
 ├── images/
 │   ├── train/
 │   ├── val/
 │   └── test/
 └── labels/
     ├── train/
     ├── val/
     └── test/

Labels must be in YOLO format (txt files with: `class_id center_x center_y width height`).
Class ID mapping:
0: oil_spill
1: look_alike
"""
import os
import yaml
import shutil
from pathlib import Path

# Try to import ultralytics
try:
    from ultralytics import YOLO
except ImportError:
    print("Please install ultralytics: pip install ultralytics")
    exit(1)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, 'data', 'yolo_dataset')
OUTPUT_MODEL_DIR = os.path.join(BASE_DIR, 'ml_models')

# Data configuration for YOLO
DATA_YAML_PATH = os.path.join(DATASET_DIR, 'oil_spill.yaml')

def create_yaml_config():
    """Generates the data.yaml file required by YOLOv8."""
    os.makedirs(DATASET_DIR, exist_ok=True)
    
    config = {
        'path': DATASET_DIR,
        'train': 'images/train',
        'val': 'images/val',
        'test': 'images/test',
        'names': {
            0: 'oil_spill',
            1: 'look_alike',
            2: 'ship',
            3: 'land'
        }
    }
    
    with open(DATA_YAML_PATH, 'w') as f:
        yaml.dump(config, f, default_flow_style=False)
    
    print(f"✅ Generated YOLO config at {DATA_YAML_PATH}")

def verify_dataset():
    """Checks if the required Kaggle/Roboflow data is present."""
    required_dirs = [
        os.path.join(DATASET_DIR, 'images', 'train'),
        os.path.join(DATASET_DIR, 'labels', 'train')
    ]
    
    missing = False
    for d in required_dirs:
        if not os.path.exists(d):
            print(f"⚠️ Missing directory: {d}")
            os.makedirs(d, exist_ok=True)
            missing = True
            
    if missing:
        print("\n❌ DATASET NOT FOUND!")
        print("Please download the Kaggle 'Oil Spill Detection SAR Dataset' or Roboflow datasets")
        print(f"and extract them into: {DATASET_DIR}")
        print("Then run this script again.")
        return False
        
    # Check if there are actually files
    train_images = list(Path(required_dirs[0]).glob('*.jpg')) + list(Path(required_dirs[0]).glob('*.png'))
    if len(train_images) == 0:
        print("\n❌ DATASET FOLDERS ARE EMPTY!")
        print(f"Please place your YOLO formatted images in {required_dirs[0]}")
        return False
        
    print(f"✅ Found {len(train_images)} training images. Dataset verified.")
    return True

def train_yolo():
    """Trains the YOLOv8 model for Oil Spill Detection."""
    print("\n🚀 Starting YOLOv8 Training Pipeline for AquaSentinel")
    print("="*60)
    
    # 1. Load a pretrained YOLOv8 nano model (best for real-time inference speed)
    print("📦 Loading pretrained YOLOv8n model...")
    model = YOLO('yolov8n.pt') 
    
    # 2. Train the model
    print("🔥 Starting training loop (this may take hours depending on GPU)...")
    res = model.train(
        data=DATA_YAML_PATH, # Dataset configuration
        epochs=100,          # Full training loop
        imgsz=640,           # Standard YOLO resolution
        batch=16,            # Batch size
        device='',           # Auto-select GPU if available (CUDA/MPS)
        project=OUTPUT_MODEL_DIR,
        name='yolov8_oil_spill',
        exist_ok=True,
        # Augmentations for Satellite/SAR data
        degrees=180.0,       # Random rotation (satellite imagery is non-directional)
        flipud=0.5,          # Vertical flip
        fliplr=0.5,          # Horizontal flip
        mosaic=1.0,          # Combine 4 images into 1 (great for small spills)
        mixup=0.2            # Image blending
    )
    
    # 3. Save the best weights manually just in case
    best_weights_path = os.path.join(OUTPUT_MODEL_DIR, 'yolov8_oil_spill', 'weights', 'best.pt')
    final_dest = os.path.join(OUTPUT_MODEL_DIR, 'yolo_oil_spill.pt')
    
    if os.path.exists(best_weights_path):
        os.makedirs(OUTPUT_MODEL_DIR, exist_ok=True)
        shutil.copy2(best_weights_path, final_dest)
        print(f"\n✅ Training Complete! Best model saved to: {final_dest}")
        print("The platform will now automatically use this model for pipeline detections.")
    else:
        print("\n⚠️ Training finished, but couldn't locate best.pt weights.")

if __name__ == '__main__':
    create_yaml_config()
    if verify_dataset():
        train_yolo()
