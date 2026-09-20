# HEATSHIELD AI — Hyper-Local Heatwave Early Warning & Urban Thermal Stress Intelligence System

**Smart India Hackathon (SIH) Project**

HEATSHIELD AI is an extreme heatwave early warning, human thermal stress intelligence, and emergency GIS response portal tailored for municipal corporations, public health departments, and citizens.

---

## 🌟 Key Architecture & Capabilities

1. **Spatial Biometeorology & Urban Heat Island Analysis**:
   - High-resolution ArcGIS World Imagery satellite basemaps with real-time ward-level overlays.
   - Microclimate diurnal tracking (Dry-bulb temperature, relative humidity, WBGT, and nighttime minimums).
   - Priority Focus Area automated detection (e.g. Tondiarpet, Royapuram, Thiru-Vi-Ka Nagar).

2. **Emergency GIS & Road Routing Engine**:
   - Turn-by-turn road navigation powered by OSRM street network routing (not linear displacement).
   - Real-time road polyline tracking from live user GPS or selected metro hubs to closest hospitals and cooling shelters.
   - WhatsApp and Fast2SMS alert dispatch test pipelines.

3. **Hospital Emergency Readiness**:
   - Clinical surge monitoring across verified apex government tertiary medical colleges and trauma units.
   - Real-time bed capacity, ICU trauma reserves, and emergency hotline integration.

4. **Cooling & Hydration Relief Network**:
   - Spatial inventory of air-conditioned rest halls, cold potable ORS dispensers, and backup generator power.
   - Real-time occupancy tracking and resource inspector.

5. **Citizen Safety Portal**:
   - Roaming live GPS detection with instant jurisdiction adaptation.
   - Biometeorological stress cards (Current Temp, Heat Index, Humidity, Vulnerable Peak Windows).
   - 5-day heat outlook and one-tap municipal helplines (108, 1070, 1077, 1913).

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: v18+
- **Python**: 3.10+
- **Git**

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On Linux / macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Backend API will be live at `http://127.0.0.1:8000` (Swagger docs at `/docs`).

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend development server will be live at `http://localhost:5173`.

---

## 🏗 Tech Stack
- **Frontend**: React, TypeScript, Vite, TailwindCSS, Leaflet / React-Leaflet, Lucide Icons
- **Backend**: FastAPI, Uvicorn, SQLite / SQLAlchemy, Pydantic, OSRM Road Routing
- **GIS / Mapping**: ArcGIS World Imagery Satellite Tiles, OpenStreetMap, OSRM Polyline Decoding
