"""
Dataset Downloader for AquaSentinel
Downloads real datasets from Kaggle:
1. Sentinel-1 SAR Oil Spill Detection Dataset (for SAR data/analysis)
2. Oil Spill Dataset - Binary Image Classification (for CNN training)
"""
import os
import sys
import shutil

try:
    import kagglehub
    from kagglehub import KaggleDatasetAdapter
    KAGGLE_AVAILABLE = True
except ImportError:
    KAGGLE_AVAILABLE = False
    print("⚠️  kagglehub not installed. Run: pip install kagglehub")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')


def download_sar_dataset():
    """
    Download Sentinel-1 SAR Oil Spill Detection Dataset.
    Source: harikrishnacs/sentinel-1-sar-oil-spill-detection-dataset
    """
    if not KAGGLE_AVAILABLE:
        print("⚠️  kagglehub not available, skipping download.")
        return None

    print("📥 Downloading Sentinel-1 SAR Oil Spill Detection Dataset...")
    try:
        df = kagglehub.load_dataset(
            KaggleDatasetAdapter.PANDAS,
            "harikrishnacs/sentinel-1-sar-oil-spill-detection-dataset",
            "",
        )
        print(f"✅ SAR dataset loaded: {len(df)} records")
        print("First 5 records:")
        print(df.head())

        # Save locally
        csv_path = os.path.join(DATA_DIR, 'sar_oil_spill_data.csv')
        os.makedirs(DATA_DIR, exist_ok=True)
        df.to_csv(csv_path, index=False)
        print(f"💾 Saved to {csv_path}")
        return df
    except Exception as e:
        print(f"❌ Failed to download SAR dataset: {e}")
        return None


def download_oil_spill_images():
    """
    Download Oil Spill Dataset - Binary Image Classification.
    Source: vighneshanand/oil-spill-dataset-binary-image-classification
    Used for CNN model training, testing, and classification.
    """
    if not KAGGLE_AVAILABLE:
        print("⚠️  kagglehub not available, skipping download.")
        return None

    print("📥 Downloading Oil Spill Binary Image Classification Dataset...")
    try:
        path = kagglehub.dataset_download(
            "vighneshanand/oil-spill-dataset-binary-image-classification"
        )
        print(f"✅ Oil Spill Image dataset downloaded to: {path}")

        # Copy to project data directory
        target_dir = os.path.join(DATA_DIR, 'images')
        os.makedirs(target_dir, exist_ok=True)

        # List dataset structure
        print("\n📁 Dataset structure:")
        for root, dirs, files in os.walk(path):
            level = root.replace(path, '').count(os.sep)
            indent = ' ' * 2 * level
            print(f'{indent}{os.path.basename(root)}/')
            if level < 2:
                subindent = ' ' * 2 * (level + 1)
                file_count = len(files)
                if file_count > 5:
                    for f in files[:3]:
                        print(f'{subindent}{f}')
                    print(f'{subindent}... and {file_count - 3} more files')
                else:
                    for f in files:
                        print(f'{subindent}{f}')

        # Copy images to local data directory
        copied = 0
        for root, dirs, files in os.walk(path):
            for d in dirs:
                src_subdir = os.path.join(root, d)
                rel_path = os.path.relpath(src_subdir, path)
                dst_subdir = os.path.join(target_dir, rel_path)
                os.makedirs(dst_subdir, exist_ok=True)

            for f in files:
                if f.lower().endswith(('.png', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp')):
                    src = os.path.join(root, f)
                    rel_path = os.path.relpath(src, path)
                    dst = os.path.join(target_dir, rel_path)
                    os.makedirs(os.path.dirname(dst), exist_ok=True)
                    if not os.path.exists(dst):
                        shutil.copy2(src, dst)
                        copied += 1

        print(f"\n💾 Copied {copied} images to {target_dir}")
        return path
    except Exception as e:
        print(f"❌ Failed to download image dataset: {e}")
        return None


def download_all():
    """Download all required datasets."""
    print("=" * 60)
    print("🌊 AquaSentinel Dataset Downloader")
    print("=" * 60)

    print("\n--- Dataset 1: Sentinel-1 SAR Data ---")
    sar_df = download_sar_dataset()

    print("\n--- Dataset 2: Oil Spill Image Classification ---")
    img_path = download_oil_spill_images()

    print("\n" + "=" * 60)
    print("📊 Summary:")
    print(f"  SAR Data: {'✅ Loaded' if sar_df is not None else '❌ Not available'}")
    print(f"  Images:   {'✅ Downloaded' if img_path is not None else '❌ Not available'}")
    print("=" * 60)


if __name__ == '__main__':
    download_all()
