# AquaSentinel

## Real-Time AI-Powered Maritime Oil Spill Detection and Vessel Monitoring Platform

AquaSentinel is an intelligent maritime surveillance system that combines deep learning, computer vision, and real-time vessel tracking to detect oil spills from satellite and SAR imagery, identify anomalous vessel behavior, and deliver instant alerts to maritime authorities. The platform ingests live AIS vessel data, processes satellite imagery through multiple AI models, and provides a rich interactive dashboard for monitoring and incident response.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [System Architecture](#system-architecture)
4. [Technology Stack](#technology-stack)
5. [Machine Learning Models](#machine-learning-models)
6. [Evaluation Metrics](#evaluation-metrics)
7. [Training Pipeline](#training-pipeline)
8. [Dataset Information](#dataset-information)
9. [Installation and Setup](#installation-and-setup)
10. [Usage Guide](#usage-guide)
11. [API Endpoints](#api-endpoints)
12. [Project Structure](#project-structure)
13. [Future Enhancements](#future-enhancements)

---

## Project Overview

Maritime oil spills cause severe ecological damage, yet early detection remains a significant challenge. AquaSentinel addresses this by deploying a multi-model AI pipeline that processes Synthetic Aperture Radar (SAR) imagery and Automatic Identification System (AIS) vessel data in real time. The system is designed for use by coast guard agencies, environmental monitoring organizations, and port authorities to detect oil spills within minutes and correlate them with nearby vessel activity for rapid incident attribution and response.

---

## Key Features

- Real-time vessel tracking using the AISStream WebSocket API with live position updates on an interactive map
- Oil spill detection from uploaded SAR and optical satellite imagery using a trained EfficientNetB0 convolutional neural network
- Spill region localization using YOLOv8 object detection with an OpenCV contour-based fallback
- Grad-CAM heatmap visualization to highlight spill regions and provide model interpretability
- Vessel behavior anomaly detection using the Isolation Forest algorithm on AIS kinematic features
- Fleet-level behavioral analysis using Graph Neural Network style message passing over a vessel proximity graph
- Automated PDF report generation with analysis results, confidence scores, and heatmap overlays
- Email and SMS alert notifications for high-severity spill and anomaly events
- Interactive 3D globe landing page with cinematic ocean transitions built using Three.js and React Three Fiber
- Comprehensive analytics dashboard with historical trend charts, severity distributions, and comparison views
- JWT-based user authentication with secure registration and login
- Real-time WebSocket communication between backend and frontend using Socket.IO

---

## System Architecture

The platform follows a modular client-server architecture with four distinct layers.

The Presentation Layer is a React single-page application that provides the user interface including dashboards, maps, analysis tools, and report viewers.

The API Layer is a Flask RESTful backend that handles authentication, image upload, model inference orchestration, report generation, and alert dispatch.

The Intelligence Layer contains four machine learning modules that process data independently and feed results back through the API layer.

The Data Layer uses SQLite for persistent storage of vessels, anomalies, spill detections, alerts, and analysis reports.

```
Frontend (React + Vite)
    |
    |--- REST API (Axios) ---> Flask Backend (Port 5000)
    |--- WebSocket (Socket.IO) ---> Real-Time Events
                                        |
                            +-----------+-----------+
                            |           |           |
                        CNN Model   YOLO Model   AIS Processor
                     (EfficientNetB0) (YOLOv8)  (Isolation Forest)
                            |           |           |
                            +-----+-----+     GNN Analyzer
                                  |          (NetworkX Graph)
                                  |
                             SQLite Database
```

---

## Technology Stack

### Backend

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Web Framework | Flask 3.1 | REST API and application server |
| Real-Time Communication | Flask-SocketIO | WebSocket events for live vessel data |
| Database ORM | Flask-SQLAlchemy | Database abstraction and model definitions |
| Authentication | Flask-JWT-Extended | JSON Web Token based authentication |
| Password Hashing | Flask-Bcrypt | Secure password storage |
| Cross-Origin Support | Flask-CORS | Frontend-backend communication |
| PDF Generation | ReportLab | Automated analysis report documents |
| Image Processing | Pillow, OpenCV | Image preprocessing and manipulation |

### Machine Learning and AI

| Component | Technology | Purpose |
|-----------|-----------|---------|
| CNN Classification | TensorFlow and Keras | EfficientNetB0 transfer learning model |
| Object Detection | Ultralytics YOLOv8 | Spill region bounding box detection |
| Anomaly Detection | Scikit-learn | Isolation Forest for AIS data |
| Graph Analysis | NetworkX | Vessel proximity graph and GNN message passing |
| Model Persistence | Joblib | Serialization and loading of trained models |
| Data Processing | NumPy, Pandas | Feature engineering and numerical computation |
| Visualization | Matplotlib | Grad-CAM heatmap generation |

### Frontend

| Component | Technology | Purpose |
|-----------|-----------|---------|
| UI Framework | React 18 | Component-based user interface |
| Build Tool | Vite 5 | Development server and production bundler |
| Styling | Tailwind CSS 3 | Utility-first responsive styling |
| Routing | React Router v6 | Client-side page navigation |
| State Management | Zustand | Lightweight global state store |
| HTTP Client | Axios | API request handling |
| Real-Time Client | Socket.IO Client | WebSocket connection for live data |
| Interactive Maps | Leaflet and React-Leaflet | 2D vessel and spill map display |
| 3D Visualization | Three.js, React Three Fiber, Drei | 3D globe and ocean surface rendering |
| Animations | Framer Motion, GSAP | Page transitions and micro-animations |
| Charts | Recharts | Analytics and trend visualization |
| Notifications | React Hot Toast | In-app toast notifications |
| Icons | React Icons | UI iconography |

### Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Database | SQLite | Lightweight relational data storage |
| Vessel Data Feed | AISStream WebSocket API | Real-time global AIS vessel positions |
| Environment Config | python-dotenv | Secure environment variable management |

---

## Machine Learning Models

### 1. Oil Spill Classification CNN (EfficientNetB0)

This is the primary detection model. It classifies uploaded SAR or optical satellite images as either containing an oil spill or showing clean water.

- Base Architecture: EfficientNetB0 pretrained on ImageNet
- Training Strategy: Two-phase transfer learning
  - Phase 1: Feature extraction with frozen base layers, training only the classification head
  - Phase 2: Fine-tuning with the top 60 layers unfrozen at a reduced learning rate
- Input: 128 x 128 pixel RGB image normalized to the 0 to 1 range
- Output: Sigmoid probability score where values above 0.7 indicate a detected spill
- SAR Filter: A preprocessing heuristic checks color channel variance to determine if the input is genuine SAR imagery (grayscale radar data) versus an ordinary photograph
- Interpretability: Grad-CAM (Gradient-weighted Class Activation Mapping) generates heatmaps that highlight the image regions most influential in the classification decision

### 2. YOLOv8 Spill Region Detector

This model localizes the spatial boundaries of detected oil spills within an image.

- Architecture: YOLOv8 Nano (fast inference variant)
- Training: Custom training on SAR oil spill datasets with satellite-specific augmentations including 180-degree rotation, vertical and horizontal flipping, mosaic tiling, and mixup blending
- Output: Bounding boxes with per-region confidence scores
- Fallback: When the YOLO model weights are unavailable, the system uses an OpenCV contour-based detector that identifies dark smooth regions characteristic of oil in SAR imagery using adaptive thresholding, morphological operations, and contour area filtering

### 3. Isolation Forest Anomaly Detector

This unsupervised model identifies vessels exhibiting abnormal kinematic behavior that may indicate illegal dumping or distress situations.

- Algorithm: Isolation Forest (ensemble of random decision trees)
- Features: Speed Over Ground (SOG), Course Over Ground (COG), speed change, and direction change
- Configuration: 100 estimators with a contamination factor of 0.15 for CSV data and 0.20 for database data
- Anomaly Types Detected: Speed anomalies, heading anomalies, and unexplained stops
- Live Processing: Supports both batch CSV analysis and real-time inference on streaming AIS vessel data

### 4. GNN Vessel Behavior Analyzer

This module analyzes collective fleet behavior by constructing a graph where vessels are nodes and proximity relationships are edges.

- Graph Construction: Vessels within 50 kilometers are connected using Haversine distance
- Message Passing: Three iterations of GNN-style feature aggregation where each vessel combines its own kinematic features with the averaged features of its geographic neighbors
- Cluster Risk Detection: Identifies suspicious patterns including coordinated stops (multiple slow vessels clustered together), speed inconsistency within a cluster, and tight high-density groupings
- Risk Scoring: Combined risk score from pattern indicators with thresholds for low, medium, and high risk classification

---

## Evaluation Metrics

### CNN Oil Spill Classifier

| Metric | Description |
|--------|-------------|
| Validation Accuracy | Percentage of correctly classified images on the held-out validation set |
| Binary Cross-Entropy Loss | Training loss function measuring prediction probability error |
| Confidence Threshold | Set at 0.7 to minimize false positives while maintaining detection sensitivity |
| Grad-CAM Interpretability | Visual validation that the model attends to spill regions rather than background artifacts |

### Isolation Forest Anomaly Detector

| Metric | Description |
|--------|-------------|
| Anomaly Score | Decision function value from the Isolation Forest where more negative values indicate stronger anomalies |
| Contamination Rate | Expected proportion of anomalous data points tuned to 0.15 for CSV and 0.20 for live data |

### YOLOv8 Object Detector

| Metric | Description |
|--------|-------------|
| Mean Average Precision (mAP) | Standard object detection metric measuring bounding box overlap accuracy |
| Intersection over Union (IoU) | Overlap ratio between predicted and ground truth bounding boxes |
| Confidence Score | Per-detection probability indicating model certainty |

### GNN Cluster Analyzer

| Metric | Description |
|--------|-------------|
| Cluster Risk Score | Composite score from 0 to 1 based on speed, density, and coordination patterns |
| Graph Density | Ratio of actual edges to possible edges within a cluster indicating vessel proximity |

---

## Training Pipeline

### CNN Training (train_cnn.py)

1. Dataset Acquisition: Automatically downloads the oil spill binary classification dataset from Kaggle using kagglehub. If the download fails, the pipeline generates synthetic SAR images as a fallback with realistic speckle noise patterns and oil dampening effects.

2. Dataset Organization: Images are sorted into oil_spill and no_oil_spill directories based on folder naming conventions and keyword matching.

3. Data Augmentation: Training images undergo random rotation up to 90 degrees, zoom up to 30 percent, horizontal and vertical flipping, brightness adjustment between 0.4x and 1.6x, width and height shifting, and shear transformation with reflection fill mode.

4. Phase 1 Feature Extraction: The EfficientNetB0 base model is frozen and only the custom classification head layers including GlobalAveragePooling2D, BatchNormalization, two Dense layers with dropout, and a sigmoid output layer are trained using the Adam optimizer at a learning rate of 0.001 for up to 8 epochs.

5. Phase 2 Fine-Tuning: The top 60 layers of EfficientNetB0 are unfrozen and the entire model is trained end-to-end at a reduced learning rate of 5e-6 for up to 12 additional epochs with early stopping, learning rate reduction on plateau, and model checkpointing.

6. Class Weighting: Oil spill samples receive 2x weight to reduce false negatives in the safety-critical detection task.

### YOLO Training (train_yolo.py)

1. Dataset Preparation: Requires YOLO-formatted SAR images with annotation files containing class ID, center coordinates, and bounding box dimensions.

2. Model Initialization: Starts from pretrained YOLOv8 Nano weights for transfer learning.

3. Training Configuration: 100 epochs at 640 pixel resolution with batch size 16, 180-degree rotation, 50 percent vertical and horizontal flip probability, full mosaic augmentation, and 20 percent mixup blending.

4. Output: Best weights are saved and automatically used by the detection pipeline.

---

## Dataset Information

### Oil Spill Classification Dataset

- Source: Kaggle Oil Spill Dataset for Binary Image Classification
- Content: SAR satellite images labeled as oil spill or no oil spill
- Preprocessing: Resized to 128 x 128 pixels and normalized to the 0 to 1 range
- Augmentation: Extensive geometric and color space transformations to improve model generalization
- Synthetic Supplement: When real data is insufficient the pipeline generates 2000 images per class using realistic SAR noise models including gamma-distributed speckle, Gaussian wave patterns, and elliptical oil dampening regions

### AIS Vessel Data

- Source: AISStream.io real-time WebSocket API
- Content: Live vessel positions with MMSI, name, vessel type, flag, speed, heading, and geolocation
- Coverage: Configurable bounding box regions with default coverage of the Indian Ocean from -10 to 40 degrees latitude and 40 to 110 degrees longitude
- Feature Engineering: Speed change, direction change, speed anomaly score, and stopped state indicator computed per vessel

---

## Installation and Setup

### Prerequisites

- Python 3.10 or later
- Node.js 18 or later
- npm 9 or later

### Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
pip install opencv-python-headless

# Configure environment variables
cp .env.example .env
# Edit .env with your API keys and credentials

# Start the backend server
python3 app.py
```

The backend server will start on http://localhost:5000.

### Frontend Setup

```bash
cd frontend

# Install Node.js dependencies
npm install

# Start the development server
npm run dev
```

The frontend development server will start on http://localhost:5173.

### Training the CNN Model (Optional)

```bash
cd backend
python3 train_cnn.py
```

This will download the dataset from Kaggle (requires kagglehub authentication), organize it, and train the EfficientNetB0 model. The trained model is saved to backend/ml_models/oil_spill_model.h5.

### Training the YOLO Model (Optional)

```bash
cd backend
python3 train_yolo.py
```

This requires a YOLO-formatted dataset placed in backend/data/yolo_dataset with images and labels directories. The trained weights are saved to backend/ml_models/yolo_oil_spill.pt.

---

## Usage Guide

1. Open http://localhost:5173 in your browser to access the landing page with the interactive 3D globe
2. Register a new account or log in with existing credentials
3. Navigate to the Dashboard to see real-time vessel positions, active alerts, and recent spill detections
4. Use the Analysis page to upload SAR or satellite images for oil spill detection
5. View the Map page for a detailed 2D Leaflet map showing vessel locations, anomalies, and spill markers
6. Check the Alerts page for a chronological feed of system-generated alerts with severity indicators
7. Visit the Reports section to browse generated PDF analysis reports and view detailed detection results
8. Use the Compare page to review historical analysis data with side-by-side metric comparisons
9. Access the Analytics page for trend charts showing spill frequency, severity distributions, and detection performance over time
10. Configure notification preferences and API keys in the Settings page

---

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register a new user account |
| POST | /api/auth/login | Authenticate and receive JWT token |

### Vessel and AIS Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/vessels | Retrieve all tracked vessels |
| GET | /api/ais/anomalies | Run Isolation Forest anomaly detection |
| GET | /api/ais/csv-anomalies | Detect anomalies from CSV data |
| GET | /api/gnn/analysis | Run GNN fleet behavior analysis |

### Oil Spill Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/analyze | Upload and analyze an image for oil spills |
| GET | /api/analysis/history | Retrieve past analysis results |

### Alerts and Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/alerts | Retrieve all active alerts |
| GET | /api/reports | List generated PDF reports |
| GET | /api/reports/{id} | View a specific report |

---

## Project Structure

```
AquaSentinel/
|-- backend/
|   |-- app.py                    # Flask application factory and entry point
|   |-- auth.py                   # JWT authentication routes
|   |-- config.py                 # Application configuration
|   |-- extensions.py             # Flask extension initialization
|   |-- models.py                 # SQLAlchemy database models
|   |-- routes.py                 # API route definitions
|   |-- requirements.txt          # Python dependencies
|   |-- train_cnn.py              # CNN training pipeline
|   |-- train_yolo.py             # YOLO training pipeline
|   |-- ml/
|   |   |-- ais_processor.py      # Isolation Forest anomaly detection
|   |   |-- cnn_detector.py       # EfficientNetB0 inference and Grad-CAM
|   |   |-- gnn_analyzer.py       # Graph Neural Network vessel analysis
|   |   |-- yolo_detector.py      # YOLOv8 and OpenCV spill localization
|   |   |-- satellite_processor.py # Satellite image preprocessing
|   |-- services/
|   |   |-- ais_service.py        # AIS data management
|   |   |-- ais_stream.py         # AISStream WebSocket client
|   |   |-- alert_service.py      # Email and SMS alert dispatch
|   |   |-- image_processor.py    # Image upload handling
|   |   |-- realtime_service.py   # Socket.IO event registration
|   |   |-- report_service.py     # PDF report generation
|   |   |-- satellite_service.py  # Sentinel Hub API integration
|   |   |-- settings_service.py   # User settings management
|-- frontend/
|   |-- index.html                # HTML entry point
|   |-- package.json              # Node.js dependencies
|   |-- vite.config.js            # Vite build configuration
|   |-- tailwind.config.js        # Tailwind CSS configuration
|   |-- src/
|   |   |-- App.jsx               # Root component with routing
|   |   |-- main.jsx              # Application entry point
|   |   |-- index.css             # Global styles
|   |   |-- pages/
|   |   |   |-- Home.jsx          # 3D globe landing page
|   |   |   |-- Login.jsx         # User login
|   |   |   |-- Register.jsx      # User registration
|   |   |   |-- Dashboard.jsx     # Main monitoring dashboard
|   |   |   |-- MapView.jsx       # Leaflet vessel and spill map
|   |   |   |-- Analysis.jsx      # Image upload and CNN analysis
|   |   |   |-- AnalysisHistory.jsx # Past analysis results
|   |   |   |-- Analytics.jsx     # Trend charts and statistics
|   |   |   |-- Alerts.jsx        # Alert feed
|   |   |   |-- Compare.jsx       # Historical data comparison
|   |   |   |-- ReportsDashboard.jsx # Reports overview
|   |   |   |-- ReportsList.jsx   # Report listing
|   |   |   |-- ReportDetail.jsx  # Individual report view
|   |   |   |-- Settings.jsx      # User and system settings
|   |   |-- components/
|   |   |   |-- Navbar.jsx        # Navigation bar
|   |   |   |-- Footer.jsx        # Page footer
|   |   |   |-- Earth3D.jsx       # 3D Earth globe component
|   |   |   |-- OceanSurface.jsx  # 3D ocean rendering
|   |   |   |-- Ship.jsx          # 3D ship model
|   |   |   |-- CinematicLoader.jsx # Loading animation
|   |   |   |-- AudioSystem.jsx   # Ambient audio manager
```

---

## Future Enhancements

- Integration with Copernicus Sentinel-1 SAR data for automated periodic ocean monitoring
- Multi-GPU distributed training for larger datasets and higher resolution imagery
- Temporal GNN analysis using vessel trajectory history for pattern-of-life modeling
- Mobile application for field responders with push notifications
- Integration with maritime law enforcement databases for vessel history lookup
- Automated regulatory compliance reporting for MARPOL convention violations
- Support for additional pollutant types including chemical spills and plastic debris detection
