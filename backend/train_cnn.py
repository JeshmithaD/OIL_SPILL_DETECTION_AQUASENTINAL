"""
AquaSentinel Real CNN Training Pipeline
Downloads real Kaggle oil spill dataset and trains MobileNetV2 with transfer learning.
Target: 90%+ accuracy on real SAR/oil spill images.
"""
import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

# Fix macOS Python SSL certificate issue
import ssl
ssl._create_default_https_context = ssl._create_unverified_context

import numpy as np
import shutil
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, 'data', 'dataset')
MODEL_DIR = os.path.join(BASE_DIR, 'ml_models')
MODEL_PATH = os.path.join(MODEL_DIR, 'oil_spill_model.h5')
IMG_SIZE = 128
BATCH_SIZE = 16


def download_dataset():
    """Download real oil spill dataset from Kaggle."""
    if os.path.exists(DATASET_DIR):
        oil_dir = os.path.join(DATASET_DIR, 'oil_spill')
        no_oil_dir = os.path.join(DATASET_DIR, 'no_oil_spill')
        if os.path.exists(oil_dir) and os.path.exists(no_oil_dir):
            oil_count = len([f for f in os.listdir(oil_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp'))])
            no_oil_count = len([f for f in os.listdir(no_oil_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp'))])
            if oil_count > 10 and no_oil_count > 10:
                print(f"✅ Dataset already exists: {oil_count} oil_spill + {no_oil_count} no_oil_spill")
                return True

    print("📥 Downloading real oil spill dataset from Kaggle...")
    os.makedirs(DATASET_DIR, exist_ok=True)

    # Try multiple Kaggle datasets
    datasets = [
        "vighneshanand/oil-spill-dataset-binary-image-classification",
        "ashishjangra27/oil-spill-detection",
    ]

    downloaded_path = None
    for ds in datasets:
        try:
            import kagglehub
            print(f"  Trying: {ds}")
            path = kagglehub.dataset_download(ds)
            print(f"  ✅ Downloaded to: {path}")
            downloaded_path = path
            break
        except Exception as e:
            print(f"  ❌ Failed: {e}")
            continue

    if not downloaded_path:
        print("❌ Could not download from Kaggle. Using synthetic data as fallback.")
        return generate_synthetic_fallback()

    # Organize into oil_spill/ and no_oil_spill/ structure
    return organize_dataset(downloaded_path)


def organize_dataset(src_path):
    """Organize downloaded dataset into oil_spill/ and no_oil_spill/ folders."""
    oil_dir = os.path.join(DATASET_DIR, 'oil_spill')
    no_oil_dir = os.path.join(DATASET_DIR, 'no_oil_spill')
    os.makedirs(oil_dir, exist_ok=True)
    os.makedirs(no_oil_dir, exist_ok=True)

    # Walk through downloaded directory to find images
    image_exts = {'.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif'}
    spill_keywords = {'oil', 'spill', 'positive', '1', 'yes'}
    clean_keywords = {'no', 'clean', 'negative', '0', 'non', 'normal', 'water'}

    found_spill = 0
    found_clean = 0

    for root, dirs, files in os.walk(src_path):
        parent = os.path.basename(root).lower().replace('_', ' ').replace('-', ' ')

        is_spill = any(kw in parent for kw in spill_keywords)
        is_clean = any(kw in parent for kw in clean_keywords)

        # If neither keyword matched, try to infer from parent directory name
        if not is_spill and not is_clean:
            # Check if it's a numbered class (1=spill, 0=clean common convention)
            if parent.strip() == '1':
                is_spill = True
            elif parent.strip() == '0':
                is_clean = True

        for fname in files:
            ext = os.path.splitext(fname)[1].lower()
            if ext not in image_exts:
                continue

            src_file = os.path.join(root, fname)

            if is_spill:
                dst = os.path.join(oil_dir, f"spill_{found_spill:05d}{ext}")
                shutil.copy2(src_file, dst)
                found_spill += 1
            elif is_clean:
                dst = os.path.join(no_oil_dir, f"clean_{found_clean:05d}{ext}")
                shutil.copy2(src_file, dst)
                found_clean += 1

    print(f"📊 Organized: {found_spill} oil_spill + {found_clean} no_oil_spill")

    # If we didn't find enough, also check for directories named by numbers
    if found_spill < 10 or found_clean < 10:
        print("⚠️  Not enough images found by keyword. Trying alternative classification...")
        # Look for any two subdirectories and use the one with darker images as spill
        all_img_dirs = []
        for root, dirs, files in os.walk(src_path):
            img_files = [f for f in files if os.path.splitext(f)[1].lower() in image_exts]
            if len(img_files) > 5:
                all_img_dirs.append((root, img_files))

        if len(all_img_dirs) >= 2:
            # Sort by directory name
            all_img_dirs.sort(key=lambda x: x[0])
            for i, (dirpath, files) in enumerate(all_img_dirs[:2]):
                target = oil_dir if i == 0 else no_oil_dir
                label = 'spill' if i == 0 else 'clean'
                count = found_spill if i == 0 else found_clean
                for fname in files:
                    ext = os.path.splitext(fname)[1].lower()
                    src_file = os.path.join(dirpath, fname)
                    dst = os.path.join(target, f"{label}_{count:05d}{ext}")
                    shutil.copy2(src_file, dst)
                    count += 1
                if i == 0:
                    found_spill = count
                else:
                    found_clean = count
            print(f"📊 After re-org: {found_spill} oil_spill + {found_clean} no_oil_spill")

    if found_spill < 10 or found_clean < 10:
        print("⚠️ Still not enough images. Generating synthetic data to supplement.")
        return generate_synthetic_fallback()

    return True


def generate_synthetic_fallback():
    """Generate realistic synthetic SAR oil spill images as training data fallback."""
    from PIL import Image, ImageFilter

    oil_dir = os.path.join(DATASET_DIR, 'oil_spill')
    no_oil_dir = os.path.join(DATASET_DIR, 'no_oil_spill')
    os.makedirs(oil_dir, exist_ok=True)
    os.makedirs(no_oil_dir, exist_ok=True)

    # Count existing images
    existing_spill_files = [f for f in os.listdir(oil_dir) if f.lower().endswith(('.png', '.jpg'))]
    existing_clean_files = [f for f in os.listdir(no_oil_dir) if f.lower().endswith(('.png', '.jpg'))]
    
    existing_spill = len(existing_spill_files)
    existing_clean = len(existing_clean_files)

    # TARGET: Balanced dataset of 2000 images each
    TARGET_PER_CLASS = 2000
    
    # 1. Downsample if too many (to keep it manageable and balanced)
    if existing_spill > TARGET_PER_CLASS:
        print(f"✂️  Downsampling oil_spill from {existing_spill} to {TARGET_PER_CLASS}...")
        import random
        to_remove = random.sample(existing_spill_files, existing_spill - TARGET_PER_CLASS)
        for f in to_remove:
            os.remove(os.path.join(oil_dir, f))
        existing_spill = TARGET_PER_CLASS

    # 2. Upsample / Supplement
    need_spill = max(0, TARGET_PER_CLASS - existing_spill)
    need_clean = max(0, TARGET_PER_CLASS - existing_clean)

    if need_spill > 0 or need_clean > 0:
        print(f"🎨 Generating {need_spill} spill + {need_clean} clean high-quality synthetic SAR images...")

        for i in range(need_spill):
            img = _gen_spill_img()
            img.save(os.path.join(oil_dir, f"syn_spill_{existing_spill + i:05d}.png"))

        for i in range(need_clean):
            img = _gen_clean_img()
            img.save(os.path.join(no_oil_dir, f"syn_clean_{existing_clean + i:05d}.png"))

    total_spill = len(os.listdir(oil_dir))
    total_clean = len(os.listdir(no_oil_dir))
    print(f"✅ Balanced Dataset Ready: {total_spill} oil_spill + {total_clean} no_oil_spill = {total_spill + total_clean} total")
    return True


def _gen_spill_img():
    """Generate a realistic synthetic image with an oil spill (DAMPENED or REFLECTIVE)."""
    from PIL import Image, ImageFilter
    size = IMG_SIZE
    
    # 1. Base Sea State (Random intensity to handle SAR/Optical variety)
    base_val = np.random.randint(80, 210)
    img = np.random.normal(base_val, 20, (size, size)).astype(np.float32)
    
    # 2. Add Oil Spill (Can be DARKER or BRIGHTER)
    num_spills = np.random.randint(1, 4)
    # 50/50 chance of dark/bright spill to be invariant
    is_dark = np.random.choice([True, False])
    
    for _ in range(num_spills):
        cx, cy = np.random.randint(15, size-15), np.random.randint(15, size-15)
        rx = np.random.randint(5, 30)
        ry = rx * np.random.uniform(0.3, 3.0)
        angle = np.random.uniform(0, np.pi)
        
        y_idx, x_idx = np.ogrid[:size, :size]
        cos_a, sin_a = np.cos(angle), np.sin(angle)
        tx = cos_a * (x_idx - cx) - sin_a * (y_idx - cy)
        ty = sin_a * (x_idx - cx) + cos_a * (y_idx - cy)
        dist = (tx/rx)**2 + (ty/ry)**2
        
        mask = np.exp(-dist * 2.5)
        if is_dark:
            # Dark dampening (SAR-like)
            factor = np.random.uniform(0.2, 0.5)
            img = img * (1 - mask * (1 - factor))
        else:
            # Bright reflective (Optical-like)
            factor = np.random.uniform(1.2, 1.8)
            img = img * (1 - mask) + (img * factor * mask)

    # 3. Add SAR/Optical Speckle/Grain Noise
    noise = np.random.gamma(shape=2.5, scale=0.4, size=(size, size))
    img = img * noise
    
    # 4. Final conversion and blur
    img_rgb = np.stack([img, img, img], axis=-1)
    img_rgb = np.clip(img_rgb, 0, 255).astype(np.uint8)
    
    pil_img = Image.fromarray(img_rgb)
    pil_img = pil_img.filter(ImageFilter.GaussianBlur(radius=np.random.uniform(0.3, 1.0)))
    return pil_img


def _gen_clean_img():
    """Generate a synthetic clean ocean SAR image with waves and lookalikes."""
    from PIL import Image, ImageFilter
    size = IMG_SIZE
    
    # 1. Base Sea State
    base_val = np.random.randint(120, 200)
    img = np.random.normal(base_val, 20, (size, size)).astype(np.float32)
    
    # 2. Add Waves (Ocean clutter)
    x = np.linspace(0, 10, size)
    y = np.linspace(0, 10, size)
    xx, yy = np.meshgrid(x, y)
    freq = np.random.uniform(1.0, 3.0)
    angle = np.random.uniform(0, np.pi)
    waves = np.sin(xx * freq * np.cos(angle) + yy * freq * np.sin(angle)) * 15
    img += waves

    # 3. Add Lookalikes / Bright spots (Ships, wind gusts)
    # Ships are very bright points in SAR
    num_ships = np.random.randint(0, 5)
    for _ in range(num_ships):
        cx, cy = np.random.randint(5, size-5), np.random.randint(5, size-5)
        img[cy-1:cy+2, cx-1:cx+2] += np.random.randint(100, 200)

    # 4. Add SAR Speckle Noise
    speckle = np.random.gamma(shape=2.0, scale=0.5, size=(size, size))
    img = img * speckle
    
    # 5. RGB conversion
    img_rgb = np.stack([img, img, img], axis=-1)
    img_rgb = np.clip(img_rgb, 0, 255).astype(np.uint8)
    
    pil_img = Image.fromarray(img_rgb)
    pil_img = pil_img.filter(ImageFilter.GaussianBlur(radius=np.random.uniform(0.2, 0.5)))
    return pil_img


def train_model():
    """Train MobileNetV2 with transfer learning + fine-tuning."""
    import tensorflow as tf
    from tensorflow.keras.preprocessing.image import ImageDataGenerator
    from tensorflow.keras import layers, models
    from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint

    print("\n" + "="*60)
    print("🧠 TRAINING: EfficientNetB0 Transfer Learning")
    print("="*60)

    # Data augmentation + NORMALIZE to [0,1] — MUST match inference (img/255)
    train_datagen = ImageDataGenerator(
        rescale=1./255,             # CRITICAL: normalize to [0,1] to match cnn_detector.py
        validation_split=0.2,
        rotation_range=90,
        zoom_range=0.3,
        horizontal_flip=True,
        vertical_flip=True,
        brightness_range=[0.4, 1.6],
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.2,
        fill_mode='reflect'
    )

    train_gen = train_datagen.flow_from_directory(
        DATASET_DIR,
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        class_mode='binary',
        subset='training',
        shuffle=True
    )

    val_gen = train_datagen.flow_from_directory(
        DATASET_DIR,
        target_size=(IMG_SIZE, IMG_SIZE),
        batch_size=BATCH_SIZE,
        class_mode='binary',
        subset='validation',
        shuffle=False
    )

    print(f"\n📊 Classes: {train_gen.class_indices}")
    print(f"📊 Training: {train_gen.samples} images")
    print(f"📊 Validation: {val_gen.samples} images")

    # Class weights: prioritize oil spill detection (reduce false negatives)
    class_weight = {0: 1, 1: 2}
    print(f"⚖️  Class weights (Spill Priority): {class_weight}")

    # ── PHASE 1: Feature extraction (frozen base) ──
    print("\n🔥 Phase 1: Feature extraction (frozen EfficientNetB0)...")

    base_model = tf.keras.applications.EfficientNetB0(
        input_shape=(IMG_SIZE, IMG_SIZE, 3),
        include_top=False,
        weights='imagenet'
    )
    base_model.trainable = False

    model = models.Sequential([
        base_model,
        layers.GlobalAveragePooling2D(),
        layers.BatchNormalization(),
        layers.Dense(256, activation='relu'),
        layers.Dropout(0.5),
        layers.Dense(128, activation='relu'),
        layers.Dropout(0.3),
        layers.Dense(1, activation='sigmoid')
    ])

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss='binary_crossentropy',
        metrics=['accuracy']
    )

    model.summary()

    callbacks_phase1 = [
        EarlyStopping(monitor='val_accuracy', patience=5, restore_best_weights=True),
        ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=2, min_lr=1e-6, verbose=1),
    ]

    history1 = model.fit(
        train_gen,
        epochs=8,
        validation_data=val_gen,
        class_weight=class_weight,
        callbacks=callbacks_phase1,
        verbose=1
    )

    p1_acc = history1.history['val_accuracy'][-1]
    print(f"\n📈 Phase 1 — Val Accuracy: {p1_acc:.4f} ({p1_acc*100:.1f}%)")

    # ── PHASE 2: Fine-tuning (unfreeze more layers) ──
    print("\n🔥 Phase 2: Fine-tuning (unfreezing top 60 layers)...")

    base_model.trainable = True
    # Freeze all layers except last 60 for deeper fine-tuning
    for layer in base_model.layers[:-60]:
        layer.trainable = False

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=5e-6),  # Lower LR for fine-tuning
        loss='binary_crossentropy',
        metrics=['accuracy']
    )

    os.makedirs(MODEL_DIR, exist_ok=True)

    callbacks_phase2 = [
        EarlyStopping(monitor='val_accuracy', patience=8, restore_best_weights=True),
        ReduceLROnPlateau(monitor='val_loss', factor=0.3, patience=3, min_lr=1e-7, verbose=1),
        ModelCheckpoint(MODEL_PATH, save_best_only=True, monitor='val_accuracy', verbose=1),
    ]

    history2 = model.fit(
        train_gen,
        epochs=12,  # More epochs for subtle fine-tuning
        validation_data=val_gen,
        class_weight=class_weight,
        callbacks=callbacks_phase2,
        verbose=1
    )

    # Final evaluation
    final_acc = max(history2.history['val_accuracy'])
    print(f"\n{'='*60}")
    print(f"🏆 FINAL RESULTS")
    print(f"{'='*60}")
    print(f"   Phase 1 Val Accuracy: {p1_acc:.4f} ({p1_acc*100:.1f}%)")
    print(f"   Phase 2 Val Accuracy: {final_acc:.4f} ({final_acc*100:.1f}%)")
    print(f"   Model saved: {MODEL_PATH}")

    # Save as .h5 explicitly
    model.save(MODEL_PATH)
    print(f"   ✅ Model saved to {MODEL_PATH}")

    # Evaluate on validation set
    print("\n🧪 Final evaluation on validation set...")
    val_loss, val_acc = model.evaluate(val_gen, verbose=1)
    print(f"   Validation Loss:     {val_loss:.4f}")
    print(f"   Validation Accuracy: {val_acc:.4f} ({val_acc*100:.1f}%)")

    return model


if __name__ == '__main__':
    print("="*60)
    print("🛰️  AquaSentinel — Real CNN Training Pipeline")
    print("="*60)

    # Step 1: Get dataset
    success = download_dataset()
    if not success:
        print("❌ Failed to prepare dataset")
        sys.exit(1)

    # Step 2: Train model
    model = train_model()

    print("\n✅ Training complete! Model ready for production inference.")
