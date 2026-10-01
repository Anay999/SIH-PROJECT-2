# RUNBOOK: Reproducing the Multi-Source Spatiotemporal AI Heatwave Platform

This runbook outlines the exact sequence of commands required to replicate the scientific results, train all six machine-learning / deep-learning models, execute the multi-lead evaluations, generate the research figures, and launch the operational dashboard.

---

## 1. System Requirements & Hardware Profile

- **Operating System:** Windows 10/11, Ubuntu 22.04 LTS, or macOS (Apple Silicon / Intel)
- **Python:** 3.11.x or 3.12.x
- **Node.js & npm:** Node 18+ and npm 9+
- **Memory (RAM):** 16 GB recommended
- **Compute:** NVIDIA CUDA GPU supported with automatic fallback to CPU (CUDA RTX 4050/3060 tested)
- **Disk Space:** ~2.5 GB free for ERA5 raw cache, processed datasets, and model checkpoints

---

## 2. Environment Setup & Dependency Installation

### Step 2.1: Clone & Navigate
```bash
git clone https://github.com/Anay999/SIH-PROJECT-2.git
cd SIH-PROJECT-2
```

### Step 2.2: Python Virtual Environment & Backend Dependencies
```bash
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
pip install pytest
```

### Step 2.3: Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

---

## 3. Data Acquisition (ECMWF ERA5 / ERA5-Land Reanalysis)

The pipeline uses official ECMWF ERA5 reanalysis data covering 2014-01-01 to 2024-12-31 across 8 Tamil Nadu regional districts and 15 Greater Chennai Corporation administrative wards (92,414 total daily records).

To download or refresh the raw reanalysis cache:
```bash
python -m src.data.download
```
*Note: Includes automated rate-limit exponential backoff and polite request pacing. If offline, the pipeline automatically detects the cached files in `data/raw/`.*

---

## 4. Geospatial Mapping & Ward Microclimate Downscaling

To run spatial intersection, area-weighted downscaling, and Local Climate Zone (LCZ) microclimate adjustments:
```bash
python -m src.data.spatial_mapping
```

---

## 5. Data Quality Inspection & Bound Validation

To execute automated quality audits (bounds, duplicates, missingness, timestamps):
```bash
python -m src.data.quality
```
*Output: `results/data_quality_report.json`.*

---

## 6. Official IMD Label Generation & Target Construction

Generates scientifically defensible heatwave targets based on official India Meteorological Department (IMD) standards for plains and coastal stations:
- Plains: $T_{\text{max}} \ge 40.0^\circ\text{C}$ and Departure $\ge 4.5^\circ\text{C}$, or $T_{\text{max}} \ge 45.0^\circ\text{C}$
- Coastal: $T_{\text{max}} \ge 37.0^\circ\text{C}$ and Departure $\ge 4.5^\circ\text{C}$, or $T_{\text{max}} \ge 42.0^\circ\text{C}$
- Targets: $Y(t+1)$, $Y(t+2)$, $Y(t+3)$ direct forecasting targets

```bash
python -m src.labels.generate
```
*Climatological normals are derived strictly from the 2014-2021 training partition to prevent lookahead target leakage.*

---

## 7. Feature Engineering & Target Leakage Prevention Audit

Extracts 82 certified physical, temporal, seasonal, and thermal stress features (NOAA Rothfusz Heat Index, Liljegren WBGT approximation, lags 1-7, rolling statistics 3-7d, trends, cyclical DOY):
```bash
python -m src.features.build
```
*Output: `results/leakage_audit.json` certifying 100% causal ordering.*

---

## 8. Master Model Training, Multi-Lead Evaluation & Ablation

To train all six models, freeze validation-optimized decision thresholds, evaluate on the untouched 2024 test split, execute T+1/T+2/T+3 evaluations, run Attention-GRU ablation studies, and render Figures 1 to 14:
```bash
python train_all.py
```

### Models Benchmarked:
1. **Logistic Regression:** Balanced linear statistical baseline
2. **Random Forest:** Nonlinear ensemble baseline
3. **XGBoost:** High-performance gradient boosted tree baseline
4. **LightGBM:** Fast leaf-wise gradient boosting classifier
5. **LSTM:** Deep recurrent temporal baseline
6. **Proposed Attention-GRU:** Spatiotemporal GRU with learnable temporal attention weights

### Generated Artifacts in `results/`:
- `model_comparison.csv`: Complete metrics across all 6 models on 2024 test split
- `lead_time_results.csv`: Degradation across T+1, T+2, T+3 horizons
- `ablation_results.csv`: Systematic feature group ablation performance
- `error_analysis.csv`: Itemized false negative and false positive inspection
- `research_results.md`: Complete compiled academic report with automated interpretation
- `plots/figure1_architecture.png` through `figure14_observed_vs_predicted_timeline.png`

---

## 9. Run Automated Test Suite

Execute the 22 comprehensive unit tests verifying data integrity, sequence boundaries, model inference, and metrics:
```bash
python -m pytest tests/test_spatiotemporal_ai.py -v
```

---

## 10. CLI Real Inference & Batch Prediction

### Single-Location Live Prediction:
```bash
python predict.py --location Chennai --horizon 1
python predict.py --location Madurai --horizon 2
python predict.py --location "Ward 42" --horizon 3
```

### Batch Operational Prediction across All 23 Locations:
```bash
python batch_predict.py
```
*Output saved to `results/predictions.csv`.*

---

## 11. Launching Backend FastAPI Service

Start the backend server on port 8000:
```bash
uvicorn backend.app.main:app --reload --port 8000
```
- Interactive API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health check: [http://localhost:8000/health](http://localhost:8000/health)
- Model comparison API: [http://localhost:8000/api/model-comparison](http://localhost:8000/api/model-comparison)
- GeoJSON Spatial API: [http://localhost:8000/api/spatial/predictions.geojson](http://localhost:8000/api/spatial/predictions.geojson)

---

## 12. Launching Frontend Research Dashboard

In a separate terminal:
```bash
cd frontend
npm run dev
```
- Dashboard URL: [http://localhost:5173/spatiotemporal-ai](http://localhost:5173/spatiotemporal-ai)
- Navigation: Click **"AI Heatwave Lab"** in the sidebar.
