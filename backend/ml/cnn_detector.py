"""
AquaSentinel Real CNN Inference
Uses the trained EfficientNetB0 transfer learning model to classify oil spills.
Preprocessing MUST match training: resize to IMG_SIZE, normalize by /255.
"""
import os
import numpy as np

# Suppress TensorFlow logging
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
import matplotlib
matplotlib.use('Agg') # Headless mode
import matplotlib.cm as cm
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import logging
from datetime import datetime

logger = logging.getLogger('aquasentinel.cnn')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, '..', 'ml_models', 'oil_spill_model.h5')
IMG_SIZE = 128

# ── Tunable parameters ──
THRESHOLD = 0.7  # Stiffer threshold for Phase 17 accuracy. 0.7 is very conservative.

_model = None  # Cache model

def is_sar_candidate(img_array):
    """
    Heuristic to check if the image is a SAR candidate.
    SAR (Synthetic Aperture Radar) is Synthetic, so R, G, and B are nearly identical.
    High color variance indicates an optical/regular photo, not radar telemetry.
    """
    # img_array shape (1, 128, 128, 3)
    # Calculate std across the RGB channel axis
    std_devs = np.std(img_array[0], axis=-1)
    mean_std = np.mean(std_devs)
    
    # Threshold 0.04: grayscale/radar data is usually very low variance.
    logger.info(f"📊 Image Color Variance (SAR Filter): {mean_std:.5f}")
    return mean_std < 0.04

def get_model():
    """Load and cache the Keras model."""
    global _model
    if _model is not None:
        return _model
        
    if not os.path.exists(MODEL_PATH):
        logger.error(f"❌ CNN Model not found at {MODEL_PATH}")
        return None
        
    try:
        logger.info(f"🧠 Loading deep learning model from {MODEL_PATH}")
        _model = load_model(MODEL_PATH)
        return _model
    except Exception as e:
        logger.error(f"❌ Failed to load model: {e}")
        return None

def get_last_conv_layer_name(model):
    """Finds the last convolutional layer in the model for Grad-CAM."""
    for layer in reversed(model.layers):
        try:
            # Safer way to get output shape across Keras versions
            shape = layer.get_output_at(0).shape if hasattr(layer, 'get_output_at') else layer.output_shape
            if len(shape) == 4 and 'conv' in layer.name.lower():
                return layer.name
        except:
            continue
            
    # Fallback to finding any 4D layer
    for layer in reversed(model.layers):
        try:
            shape = layer.get_output_at(0).shape if hasattr(layer, 'get_output_at') else layer.output_shape
            if len(shape) == 4:
                return layer.name
        except:
            continue
    return None

def generate_gradcam_heatmap(img_path, img_array, model, pred_index=None):
    """Generates a Grad-CAM heatmap and saves it to the uploads folder."""
    try:
        # 1. Identify the base model (EfficientNetB0) and its last conv layer
        # If the model is Sequential, the base model is likely the first layer
        base_model = None
        if hasattr(model, 'layers'):
            for layer in model.layers:
                if 'efficientnet' in layer.name.lower():
                    base_model = layer
                    break
        
        # Fallback to the model itself if not wrapped
        if not base_model:
            base_model = model

        # Find the last conv layer in the base_model
        last_conv_layer_name = None
        for layer in reversed(base_model.layers):
            if isinstance(layer, (tf.keras.layers.Conv2D, tf.keras.layers.DepthwiseConv2D)) or 'conv' in layer.name.lower():
                last_conv_layer_name = layer.name
                break
        
        if not last_conv_layer_name:
            logger.error("Could not find suitable conv layer for Grad-CAM.")
            return None

        # 2. Build Gradient Model
        # We need to map the base_model's input to its last_conv_output
        grad_model = tf.keras.models.Model(
            inputs=[base_model.input],
            outputs=[base_model.get_layer(last_conv_layer_name).output, base_model.output]
        )

        # 3. Compute Gradients
        with tf.GradientTape() as tape:
            conv_outputs, predictions = grad_model(img_array)
            if pred_index is None:
                # Target the highest probability class (0 for oil, but we use index 0 in predict_image)
                pred_index = 0
            
            # Use the Sequential model's final output if it has top layers after EfficientNet
            # Otherwise use base_model's output
            loss = predictions[:, pred_index]

        # Get gradients of the target class w.r.t. the output feature map of the last conv layer
        grads = tape.gradient(loss, conv_outputs)
        
        # Global average pooling of gradients
        pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

        # Weight the feature map by the pooled gradients
        last_conv_layer_output = conv_outputs[0]
        heatmap = last_conv_layer_output @ pooled_grads[..., tf.newaxis]
        heatmap = tf.squeeze(heatmap)

        # 4. Normalize Heatmap
        heatmap = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + 1e-10)
        heatmap_numpy = heatmap.numpy()

        # Save superimposed image
        upload_dir = os.path.join(BASE_DIR, '..', 'data', 'uploads')
        os.makedirs(upload_dir, exist_ok=True)
        filename = f"heatmap_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{os.path.basename(img_path)}"
        cam_path = os.path.join(upload_dir, filename)

        # Load original image
        img = image.load_img(img_path)
        img = image.img_to_array(img)

        # Rescale heatmap
        heatmap_numpy = np.uint8(255 * heatmap_numpy)
        
        # Modern Matplotlib 3.x colormap access
        try:
            jet = matplotlib.colormaps["jet"]
        except:
            jet = cm.get_cmap("jet")
            
        jet_colors = jet(np.arange(256))[:, :3]
        jet_heatmap = jet_colors[heatmap_numpy]

        jet_heatmap = image.array_to_img(jet_heatmap)
        jet_heatmap = jet_heatmap.resize((img.shape[1], img.shape[0]))
        jet_heatmap = image.img_to_array(jet_heatmap)

        superimposed_img = jet_heatmap * 0.4 + img
        superimposed_img = image.array_to_img(superimposed_img)
        superimposed_img.save(cam_path)

        logger.info(f"✅ Successfully generated Grad-CAM heatmap: {filename}")
        return filename
    except Exception as e:
        logger.error(f"Failed to generate Grad-CAM: {e}")
        return None


def predict_image(img_path):
    """
    Predict if an image contains an oil spill using the trained EfficientNetB0 CNN.
    
    CRITICAL: Preprocessing must match training pipeline:
    1. Resize to IMG_SIZE x IMG_SIZE
    2. Normalize pixel values to [0, 1] by dividing by 255
    """
    model = get_model()
    
    if model is None:
        return {
            "spill": False,
            "confidence": 0.0,
            "area": 0.0,
            "intensity": 0.0,
            "severity": "low",
            "is_sar": False,
            "method": "model_not_found"
        }

    try:
        # 1. Load and preprocess image
        img = image.load_img(img_path, target_size=(IMG_SIZE, IMG_SIZE))
        img_array = image.img_to_array(img)           # Shape: (128, 128, 3), values 0-255
        
        # 1.1: SAR Integrity Filter (Heuristic)
        is_sar = is_sar_candidate(img_array / 255.0)
        
        img_array = img_array / 255.0                  # NORMALIZE to [0, 1] — MUST match training
        img_array = np.expand_dims(img_array, axis=0)  # Shape: (1, 128, 128, 3)

        # 2. Predict — raw sigmoid output (0.0 = no_spill, 1.0 = oil_spill)
        prediction_val = model.predict(img_array, verbose=0)[0][0]
        
        # Debug: Always print raw value so we can verify
        print(f"🔍 CNN Raw Prediction for {os.path.basename(img_path)}: {prediction_val:.4f} (threshold={THRESHOLD})")

        # 3. Apply threshold
        spill = bool(prediction_val > THRESHOLD)
        confidence = float(prediction_val) if spill else float(1.0 - prediction_val)
        
        # 4. Calculate metrics
        area = round(float(prediction_val) * 60, 2) if spill else 0.0
        intensity = round(float(prediction_val), 2) if spill else 0.0
        
        # Severity levels
        if spill:
            severity = 'critical' if prediction_val > 0.85 else 'high' if prediction_val > 0.65 else 'medium'
        else:
            severity = 'low'

        # 5. Generate Grad-CAM Heatmap if spill
        heatmap_filename = None
        try:
            if spill or True:  # We can generate it always to see what it's looking at, but usually if spill
                heatmap_filename = generate_gradcam_heatmap(img_path, img_array, model, pred_index=0) # Index 0 is oil_spill class in our setup
        except Exception as ex:
            logger.error(f"Grad-CAM generation failed but continuing pipeline: {ex}")

        return {
            "spill": spill,
            "confidence": round(confidence, 4),
            "area": area,
            "intensity": intensity,
            "severity": severity,
            "is_sar": is_sar,
            "method": "efficientnetb0_cnn",
            "raw_prediction": round(float(prediction_val), 4),
            "heatmap_filename": heatmap_filename
        }
    except Exception as e:
        logger.error(f"Error predicting image: {e}")
        return {
            "spill": False,
            "confidence": 0.0,
            "area": 0.0,
            "intensity": 0.0,
            "severity": "low",
            "method": "error",
            "error": str(e)
        }

if __name__ == '__main__':
    # Test script
    import sys
    if len(sys.argv) > 1:
        res = predict_image(sys.argv[1])
        print(f"\nPrediction for {sys.argv[1]}:")
        print(res)
    else:
        print("Usage: python cnn_detector.py <image_path>")
