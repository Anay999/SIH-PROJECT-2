import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import type { GeoJsonObject } from 'geojson';
import {
  ArrowRight,
  TrendingUp,
  Activity,
  ChevronRight,
  Layers,
  Map as MapIcon,
  Megaphone
} from 'lucide-react';
import { useWorkspace, type MunicipalAction } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';

// Custom Leaflet DivIcons
const coolingCenterIcon = L.divIcon({
  className: 'custom-cooling-marker',
  html: `<div style="background-color: #0284c7; color: #ffffff; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(2,132,199,0.6); border: 2px solid white; font-weight: 900; font-size: 11px;">❄</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const hospitalMarkerIcon = L.divIcon({
  className: 'custom-hospital-marker',
  html: `<div style="background-color: #dc2626; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(220,38,38,0.6); border: 2px solid white; font-weight: 900; font-size: 13px;">+</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const waterPointIcon = L.divIcon({
  className: 'custom-water-marker',
  html: `<div style="background-color: #0891b2; color: #ffffff; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(8,145,178,0.6); border: 2px solid white; font-weight: 900; font-size: 11px;">💧</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const schoolIcon = L.divIcon({
  className: 'custom-school-marker',
  html: `<div style="background-color: #059669; color: #ffffff; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(5,150,105,0.6); border: 2px solid white; font-weight: 900; font-size: 11px;">🏫</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Map View Recenter helper
function MapRecenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'CITIZEN') {
      navigate('/citizen', { replace: true });
    }
  }, [user, navigate]);

  const {
    selectWard,
    selectedWardId,
    actionPlans,
    updateActionStatus,
    activityFeed,
    demoClockTime,
    temporalDelta,
    cityProfile
  } = useWorkspace();

  const [geoJsonData, setGeoJsonData] = useState<GeoJsonObject | null>(null);
  const [facilities, setFacilities] = useState<any>({ cooling_centers: [], hospitals: [] });
  const [waterPoints, setWaterPoints] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [communityReports, setCommunityReports] = useState<any[]>([]);
  const [reportFilter, setReportFilter] = useState<string>('ALL');
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Map Basemap mode - SATELLITE DEFAULT
  const [basemapMode, setBasemapMode] = useState<'satellite' | 'street'>('satellite');

  // Single active dominant layer on Overview
  const [activeLayer, setActiveLayer] = useState<'heat' | 'priority' | 'cooling'>('heat');

  // Facilities visibility toggles
  const [showCooling, setShowCooling] = useState<boolean>(true);
  const [showHospitals, setShowHospitals] = useState<boolean>(true);
  const [showWater, setShowWater] = useState<boolean>(true);
  const [showSchools, setShowSchools] = useState<boolean>(true);

  // Review Modal State
  const [reviewAction, setReviewAction] = useState<MunicipalAction | null>(null);

  useEffect(() => {
    const loadGis = async () => {
      try {
        setLoading(true);
        const [wardsRes, facRes, wpRes, schRes, repRes] = await Promise.all([
          fetch('http://127.0.0.1:8000/api/gis/wards').catch(() => null),
          fetch('http://127.0.0.1:8000/api/gis/facilities').catch(() => null),
          fetch('/api/community/water-points').catch(() => null),
          fetch('/api/community/schools').catch(() => null),
          fetch('/api/community/reports').catch(() => null),
        ]);

        if (wardsRes && wardsRes.ok) {
          const wData = await wardsRes.json();
          setGeoJsonData(wData);
        }
        if (facRes && facRes.ok) {
          const fData = await facRes.json();
          setFacilities(fData);
        }
        if (wpRes && wpRes.ok) {
          const wpData = await wpRes.json();
          setWaterPoints(wpData.data || []);
        }
        if (schRes && schRes.ok) {
          const schData = await schRes.json();
          setSchools(schData.data || []);
        }
        if (repRes && repRes.ok) {
          const repData = await repRes.json();
          setCommunityReports(repData.data || []);
        }
      } catch (err) {
        console.warn('Overview GIS load error, using default context', err);
      } finally {
        setLoading(false);
      }
    };
    loadGis();
  }, []);

  const handleUpdateReportStatus = async (reportId: string, newStatus: string) => {
    setUpdatingReportId(reportId);
    try {
      const res = await fetch(`/api/community/reports/${reportId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          notes: `Status updated to ${newStatus} by Municipal Health Officer at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
        })
      });
      if (res.ok) {
        const json = await res.json();
        setCommunityReports(prev =>
          prev.map(r => r.id === reportId ? { ...r, status: newStatus, status_notes: json.data?.status_notes || r.status_notes } : r)
        );
      }
    } catch (err) {
      console.error('Failed to update report status:', err);
    } finally {
      setUpdatingReportId(null);
    }
  };

  const defaultCenter: [number, number] = [
    cityProfile?.coordinates?.lat || 13.045,
    cityProfile?.coordinates?.lon || 80.225
  ];

  // Tile layer URL based on basemap selection - High-Res Satellite
  const tileUrl =
    basemapMode === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  // Choropleth style function
  const styleFeature = (feature: any) => {
    const props = feature.properties;
    const isSelected = selectedWardId === props.ward_id;

    let fillColor = '#10b981';
    if (activeLayer === 'heat') {
      const htsi = props.htsi_score || 60;
      if (htsi >= 75) fillColor = '#ef4444';
      else if (htsi >= 65) fillColor = '#f97316';
      else if (htsi >= 50) fillColor = '#eab308';
      else fillColor = '#3b82f6';
    } else if (activeLayer === 'priority') {
      const vuln = props.vulnerability_score || 50;
      if (vuln >= 65) fillColor = '#dc2626';
      else if (vuln >= 50) fillColor = '#ea580c';
      else fillColor = '#2563eb';
    } else {
      fillColor = props.builtup_fraction > 0.8 ? '#f43f5e' : '#10b981';
    }

    return {
      fillColor,
      weight: isSelected ? 3.5 : 1.5,
      opacity: 1,
      color: isSelected ? '#ffffff' : '#e2e8f0',
      fillOpacity: isSelected ? 0.75 : 0.55,
    };
  };

  const onEachFeature = (feature: any, layer: L.Layer) => {
    const props = feature.properties;

    layer.bindTooltip(
      `<div style="font-family: system-ui, sans-serif; font-size: 11px; padding: 4px 8px; line-height: 1.3; background: rgba(255,255,255,0.95); border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
        <strong style="color:#0f172a">${props.name} (Ward ${props.ward_number})</strong><br/>
        <span style="color:#475569">HTSI: ${props.htsi_score?.toFixed(1) || 'N/A'} · Temp: ${props.air_temp_c?.toFixed(1) || 'N/A'}°C</span>
      </div>`,
      { sticky: true, opacity: 0.98 }
    );

    layer.on({
      click: () => {
        selectWard(props.ward_id, props);
      },
    });
  };

  const priorityFocusAreas = [
    {
      id: 'ward_04_tondiarpet',
      name: 'Tondiarpet (Ward 04)',
      priority: 'CRITICAL',
      why: 'High nighttime heat retention (>29.5°C) combined with dense uncooled tin-roof dwellings.',
      temp: '38.8°C',
      nightMin: '29.7°C',
      coolingAccess: 'Deficit (1.8km to hub)',
      status: 'Action Required',
      badgeBg: 'bg-rose-50 text-rose-700 border border-rose-200',
      cardBg: 'bg-white border border-slate-200 hover:border-rose-400 text-slate-900 shadow-xs'
    },
    {
      id: 'ward_05_royapuram',
      name: 'Royapuram (Ward 05)',
      priority: 'HIGH',
      why: '34,000 outdoor logistics and harbor laborers exposed to severe solar radiation with WBGT >32.8°C.',
      temp: '38.2°C',
      nightMin: '29.2°C',
      coolingAccess: 'Low (NDVI 0.12)',
      status: 'Review required',
      badgeBg: 'bg-orange-50 text-orange-700 border border-orange-200',
      cardBg: 'bg-white border border-slate-200 hover:border-orange-400 text-slate-900 shadow-xs'
    },
    {
      id: 'ward_06_thiruvika_nagar',
      name: 'Thiru-Vi-Ka Nagar (Ward 06)',
      priority: 'ELEVATED',
      why: 'High-density uncooled residences combined with 18% elderly citizen concentration.',
      temp: '38.4°C',
      nightMin: '28.9°C',
      coolingAccess: 'Moderate',
      status: 'Monitoring',
      badgeBg: 'bg-amber-50 text-amber-700 border border-amber-200',
      cardBg: 'bg-white border border-slate-200 hover:border-amber-400 text-slate-900 shadow-xs'
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 font-sans text-slate-800">
      {/* ============================================================ */}
      {/* SECTION 1: CURRENT HEAT SITUATION (WARM COLOR-FRIENDLY HERO) */}
      {/* ============================================================ */}
      <section className="bg-gradient-to-br from-amber-50 via-orange-50/40 to-yellow-50/30 border border-amber-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="text-xs font-mono uppercase tracking-wider text-amber-800 font-bold">
              Current Heat Operations ({cityProfile.name})
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500 font-medium">
            Observation at {demoClockTime}
          </span>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
            {temporalDelta.situationNarrative}
          </h1>
          <p className="text-sm text-slate-700 font-medium">
            <span className="text-amber-800 font-bold">{temporalDelta.priorityWardsCount} operational wards</span> currently require monitoring due to sustained afternoon thermal stress and limited overnight recovery.
          </p>
        </div>

        {/* Clean Light Metric Cards matching Screenshot 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Card 1: Daytime Temp */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-slate-900 hover:border-amber-400 hover:shadow-md transition">
            <span className="text-[11px] text-amber-600 block mb-0.5 font-bold uppercase tracking-wider">1. Daytime Temperature</span>
            <div className="text-2xl font-black text-slate-900 font-mono">{temporalDelta.temp.toFixed(1)}°C</div>
            <span className="text-[11px] text-amber-700 font-sans font-medium">
              {temporalDelta.tempDelta > 0 ? `+${temporalDelta.tempDelta.toFixed(1)}°C peak rise` : temporalDelta.tempDelta < 0 ? `${temporalDelta.tempDelta.toFixed(1)}°C morning baseline` : 'Elevated peak'}
            </span>
          </div>

          {/* Card 2: Humidity */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-slate-900 hover:border-sky-400 hover:shadow-md transition">
            <span className="text-[11px] text-sky-600 block mb-0.5 font-bold uppercase tracking-wider">2. Humidity Burden</span>
            <div className="text-2xl font-black text-sky-700 font-mono">{temporalDelta.humidity}% RH</div>
            <span className="text-[11px] text-slate-500 font-sans">Suppresses sweat evaporation</span>
          </div>

          {/* Card 3: Nighttime Heat */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-slate-900 hover:border-rose-400 hover:shadow-md transition">
            <span className="text-[11px] text-rose-600 block mb-0.5 font-bold uppercase tracking-wider">3. Night Heat Retention</span>
            <div className="text-2xl font-black text-rose-600 font-mono">{temporalDelta.nighttimeMin.toFixed(1)}°C min</div>
            <span className="text-[11px] text-slate-500 font-sans">Reduced physiological recovery</span>
          </div>

          {/* Card 4: Network Status */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-slate-900 hover:border-emerald-400 hover:shadow-md transition">
            <span className="text-[11px] text-emerald-600 block mb-0.5 font-bold uppercase tracking-wider">4. Relief Stations</span>
            <div className="text-2xl font-black text-emerald-600 font-mono">Verified Active</div>
            <span className="text-[11px] text-slate-500 font-sans">Cold ORS hydration operational</span>
          </div>
        </div>

        {/* Operational Navigation Anchors */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/priority-areas')}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition flex items-center gap-2 shadow-sm"
          >
            <span>Review priority areas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/forecast')}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition border border-slate-300 shadow-xs"
          >
            View 5-day forecast outlook
          </button>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 2: WHAT CHANGED? (TEMPORAL MOVEMENT - SKY/BLUE PALETTE) */}
      {/* ============================================================ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
              Temporal Trajectory: Shift from Morning Baseline
            </h2>
            <p className="text-xs text-slate-500">
              Diurnal progression across {cityProfile.name} from 07:30 IST morning baseline to current afternoon peak
            </p>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            6-Hour Movement
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Movement Metric 1: Temperature - Clean Light Card */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-xs text-slate-900 hover:shadow-md transition">
            <div className="flex items-center justify-between text-xs text-slate-700 font-semibold">
              <span>Dry-Bulb Temperature</span>
              <span className="text-rose-600 font-mono font-bold flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Rising
              </span>
            </div>
            <div className="flex items-baseline justify-between font-mono">
              <span className="text-slate-500 text-sm">35.9°C</span>
              <span className="text-slate-400 text-xs">→</span>
              <span className="text-xl font-bold text-slate-900">38.5°C</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                +2.6°C
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              Afternoon solar accumulation peaking across high-density industrial and tin-roof sectors.
            </p>
          </div>

          {/* Movement Metric 2: Humidity - Clean Light Card */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-xs text-slate-900 hover:shadow-md transition">
            <div className="flex items-center justify-between text-xs text-slate-700 font-semibold">
              <span>Relative Humidity</span>
              <span className="text-sky-600 font-mono font-bold flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Moisture Influx
              </span>
            </div>
            <div className="flex items-baseline justify-between font-mono">
              <span className="text-slate-500 text-sm">61%</span>
              <span className="text-slate-400 text-xs">→</span>
              <span className="text-xl font-bold text-sky-700">68%</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                +7%
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              Maritime moisture compounding human heat index and wet-bulb globe temperature.
            </p>
          </div>

          {/* Movement Metric 3: Nighttime Minimum - Clean Light Card */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-xs text-slate-900 hover:shadow-md transition">
            <div className="flex items-center justify-between text-xs text-slate-700 font-semibold">
              <span>Nighttime Minimum Forecast</span>
              <span className="text-amber-600 font-mono font-bold flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Elevated Heat Island
              </span>
            </div>
            <div className="flex items-baseline justify-between font-mono">
              <span className="text-slate-500 text-sm">27.7°C</span>
              <span className="text-slate-400 text-xs">→</span>
              <span className="text-xl font-bold text-amber-700">29.5°C</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                +1.8°C
              </span>
            </div>
            <p className="text-[11px] text-slate-600 leading-snug">
              Concrete urban surfaces retaining heat through late night hours, diminishing cardiovascular rest.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 3: WHERE IS THE PROBLEM? (GIS SATELLITE WORKSPACE)   */}
      {/* ============================================================ */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-blue-600" />
              Spatial Heat Distribution & Priority Focus
            </h2>
            <p className="text-xs text-slate-500">
              High-resolution satellite view with municipal ward boundaries, microclimate readings, and facilities
            </p>
          </div>

          {/* Map Layer Controls */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Basemap Toggle - SATELLITE FIRST */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 shadow-xs">
              <button
                type="button"
                onClick={() => setBasemapMode('satellite')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  basemapMode === 'satellite'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Satellite Imagery</span>
              </button>
              <button
                type="button"
                onClick={() => setBasemapMode('street')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  basemapMode === 'street'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Street Map</span>
              </button>
            </div>

            {/* Dominant Layer Selector */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs shadow-xs">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <select
                value={activeLayer}
                onChange={e => setActiveLayer(e.target.value as any)}
                className="bg-transparent border-none text-slate-800 text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="heat">Layer: Heat Stress (HTSI)</option>
                <option value="priority">Layer: Vulnerability Triage</option>
                <option value="cooling">Layer: Cooling Deficit</option>
              </select>
            </div>

            {/* Facilities Visibility Toggles */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setShowCooling(p => !p)}
                className={`px-2 py-1 rounded-lg transition flex items-center gap-1 ${
                  showCooling ? 'bg-sky-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Toggle Cooling Centers"
              >
                <span>❄</span>
                <span>Cooling</span>
              </button>
              <button
                type="button"
                onClick={() => setShowHospitals(p => !p)}
                className={`px-2 py-1 rounded-lg transition flex items-center gap-1 ${
                  showHospitals ? 'bg-red-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Toggle Hospitals"
              >
                <span>+</span>
                <span>Hospitals</span>
              </button>
              <button
                type="button"
                onClick={() => setShowWater(p => !p)}
                className={`px-2 py-1 rounded-lg transition flex items-center gap-1 ${
                  showWater ? 'bg-cyan-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Toggle Public Water Points"
              >
                <span>💧</span>
                <span>Water</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSchools(p => !p)}
                className={`px-2 py-1 rounded-lg transition flex items-center gap-1 ${
                  showSchools ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Toggle School Heat Safety"
              >
                <span>🏫</span>
                <span>Schools</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2-Column Layout: Dominant Satellite Map + Priority Focus Stack */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Satellite Map Workspace */}
          <div className="lg:col-span-7 bg-[#0b121e] border-2 border-slate-300 rounded-3xl overflow-hidden relative h-[520px] shadow-md">
            {loading && (
              <div className="absolute inset-0 z-20 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center text-xs text-white font-mono">
                Loading satellite GIS boundaries...
              </div>
            )}

            <MapContainer
              center={defaultCenter}
              zoom={11}
              style={{ width: '100%', height: '100%', backgroundColor: '#090d16' }}
              zoomControl={true}
            >
              <MapRecenter center={defaultCenter} zoom={11} />
              <TileLayer attribution="&copy; Esri, Maxar, Earthstar Geographics" url={tileUrl} maxZoom={19} />

              {geoJsonData && (
                <GeoJSON
                  key={`${activeLayer}-${basemapMode}`}
                  data={geoJsonData}
                  style={styleFeature}
                  onEachFeature={onEachFeature}
                />
              )}

              {/* Cooling Centers Pins */}
              {showCooling && facilities.cooling_centers?.map((cc: any) => (
                <Marker key={cc.id} position={[cc.latitude, cc.longitude]} icon={coolingCenterIcon}>
                  <Popup>
                    <div className="text-xs font-sans text-slate-900 p-1">
                      <strong>{cc.name}</strong>
                      <p className="text-[11px] text-slate-600">{cc.address}</p>
                      <p className="text-[10px] font-mono text-cyan-700 mt-1 font-semibold">
                        Occupancy: {cc.occupancy}/{cc.capacity} ({cc.occupancy_rate}%)
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Hospital Pins */}
              {showHospitals && facilities.hospitals?.map((h: any) => (
                <Marker key={h.id} position={[h.latitude, h.longitude]} icon={hospitalMarkerIcon}>
                  <Popup>
                    <div className="text-xs font-sans text-slate-900 p-1">
                      <strong>{h.name}</strong>
                      <p className="text-[11px] text-slate-600">{h.type}</p>
                      <p className="text-[10px] font-mono text-rose-700 mt-1 font-semibold">
                        ICU Beds: {h.icu_beds} | Total Beds: {h.total_beds}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Drinking Water Point Pins */}
              {showWater && waterPoints.map((wp: any) => (
                <Marker key={wp.id} position={[wp.latitude, wp.longitude]} icon={waterPointIcon}>
                  <Popup>
                    <div className="text-xs font-sans text-slate-900 p-1">
                      <div className="flex items-center gap-1 text-cyan-700 font-bold">
                        <span>💧</span>
                        <strong>{wp.name}</strong>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">{wp.address}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{wp.ward} · {wp.type?.replace(/_/g, ' ')}</p>
                      <div className="mt-1 flex items-center justify-between gap-1 text-[10px] font-mono">
                        <span className={`px-1.5 py-0.2 rounded font-bold ${
                          wp.operational_status === 'OPERATIONAL' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {wp.operational_status}
                        </span>
                        <span className="text-cyan-700 font-bold">{wp.daily_capacity_liters}L/day</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* School Heat Safety Pins */}
              {showSchools && schools.map((sch: any) => (
                <Marker key={sch.id} position={[sch.latitude, sch.longitude]} icon={schoolIcon}>
                  <Popup>
                    <div className="text-xs font-sans text-slate-900 p-1">
                      <div className="flex items-center gap-1 text-emerald-700 font-bold">
                        <span>🏫</span>
                        <strong>{sch.name}</strong>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">{sch.address}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{sch.ward} · {sch.category}</p>
                      <div className="mt-1.5 p-1 rounded bg-amber-50 border border-amber-200 text-[10px] text-amber-900">
                        <strong>Heat Protocol:</strong> {sch.heat_action_protocol}
                      </div>
                      <p className="text-[10px] text-slate-600 mt-1 font-mono">
                        Students: {sch.total_students} | AC: {sch.ac_classrooms ? 'Yes' : 'No'}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Layer Legend Overlay in Map */}
            <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-slate-300 text-xs space-y-1 shadow-lg max-w-sm">
              <div className="font-bold text-slate-900 text-[11px]">
                {activeLayer === 'heat'
                  ? 'Heat Stress (HTSI): Combined ambient heat, solar radiation & humidity.'
                  : activeLayer === 'priority'
                  ? 'Vulnerability Triage: Demographic frailty & outdoor labor density.'
                  : 'Cooling Deficit: Concrete cover fraction & low tree canopy.'}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-600 pt-0.5">
                <span className="w-2.5 h-2.5 rounded bg-blue-500" /> Low
                <span className="w-2.5 h-2.5 rounded bg-yellow-500 ml-1" /> Moderate
                <span className="w-2.5 h-2.5 rounded bg-orange-500 ml-1" /> High
                <span className="w-2.5 h-2.5 rounded bg-red-500 ml-1" /> Extreme
              </div>
            </div>
          </div>

          {/* Right: Priority Areas Needing Attention */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider">
                Priority Areas Needing Attention
              </span>
              <button
                type="button"
                onClick={() => navigate('/priority-areas')}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition"
              >
                <span>View all wards</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {priorityFocusAreas.map(area => (
                <div
                  key={area.id}
                  onClick={() => selectWard(area.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                    selectedWardId === area.id
                      ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/30 shadow-md text-slate-900'
                      : area.cardBg
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 tracking-tight">{area.name}</h3>
                      <span className="text-[10px] font-mono text-blue-600 uppercase font-bold tracking-wider">
                        Municipal High Priority Zone
                      </span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${area.badgeBg}`}>
                      {area.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 leading-relaxed font-sans">
                    <strong className="text-slate-900 font-bold">Why:</strong> {area.why}
                  </p>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-200 text-xs font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-500 block font-sans font-medium">Afternoon Heat</span>
                      <span className="text-slate-900 font-bold">{area.temp}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-sans font-medium">Night Minimum</span>
                      <span className="text-rose-600 font-bold">{area.nightMin}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-sans font-medium">Cooling Access</span>
                      <span className="text-sky-700 font-semibold truncate">{area.coolingAccess}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 4: WHAT SHOULD BE REVIEWED? (RECOMMENDED ACTIONS)   */}
      {/* ============================================================ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
              Recommended Operational Directives
            </h2>
            <p className="text-xs text-slate-500">
              Review and dispatch municipal heat-action directives based on current biometeorological risk signals
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/heat-action-plan')}
            className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition"
          >
            <span>Full action plan workflow</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actionPlans.slice(0, 3).map((action, idx) => {
            const glowBorder =
              idx === 0
                ? 'hover:border-rose-300'
                : idx === 1
                ? 'hover:border-amber-300'
                : 'hover:border-blue-300';

            return (
              <div
                key={action.id}
                className={`bg-white border border-slate-200 ${glowBorder} rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-xs text-slate-900 hover:shadow-md transition`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-blue-600 uppercase font-bold tracking-wider">
                      {action.department}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        action.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : action.status === 'Under Review'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {action.status}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 leading-snug tracking-tight">{action.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans">
                    <strong className="text-slate-900 font-bold">Why:</strong> {action.reason}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono font-medium">{action.wardName}</span>
                  <button
                    type="button"
                    onClick={() => setReviewAction(action)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition border border-slate-200 shadow-2xs"
                  >
                    Review action
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 4.5: CITIZEN HEAT & INFRASTRUCTURE REPORTS           */}
      {/* ============================================================ */}
      <section className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-amber-600" />
              <h2 className="text-base font-bold text-slate-900 tracking-tight font-sans">
                Citizen Heat & Infrastructure Reports ({cityProfile.name})
              </h2>
              {communityReports.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  {communityReports.filter(r => r.status !== 'RESOLVED').length} Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Field reports submitted by citizens regarding broken water kiosks, extreme unshaded work sites, and cooling shelter deficits.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {['ALL', 'PENDING', 'UNDER_REVIEW', 'ACTION_INITIATED', 'RESOLVED'].map(filterStatus => {
              const count = filterStatus === 'ALL'
                ? communityReports.length
                : communityReports.filter(r => r.status === filterStatus).length;
              const label = filterStatus === 'ALL' ? 'All'
                : filterStatus === 'PENDING' ? 'Pending'
                : filterStatus === 'UNDER_REVIEW' ? 'Verified'
                : filterStatus === 'ACTION_INITIATED' ? 'Relief Dispatched'
                : 'Resolved';
              return (
                <button
                  key={filterStatus}
                  onClick={() => setReportFilter(filterStatus)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    reportFilter === filterStatus
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    reportFilter === filterStatus ? 'bg-white/30 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {communityReports
            .filter(r => reportFilter === 'ALL' || r.status === reportFilter)
            .map((report) => (
              <div
                key={report.id}
                className="bg-[#faf9f6] border border-[#ede7de] hover:border-amber-400 rounded-2xl p-4.5 space-y-3 transition flex flex-col justify-between shadow-2xs"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200">
                      {report.category}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        report.severity === 'CRITICAL'
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : report.severity === 'HIGH'
                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                          : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                      }`}
                    >
                      {report.severity}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 font-medium leading-relaxed">
                    {report.description}
                  </p>

                  <div className="bg-white p-2.5 rounded-xl border border-[#ede7de] text-[11px] space-y-1 text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Location:</span>
                      <strong className="text-slate-800 font-semibold">{report.ward}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Reporter:</span>
                      <span className="text-slate-700">{report.reporter_name}</span>
                    </div>
                    {report.status_notes && (
                      <div className="pt-1 border-t border-slate-100 text-amber-900 font-medium text-[10px]">
                        <strong>Officer Note:</strong> {report.status_notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Indicator & Action Buttons */}
                <div className="pt-2 border-t border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-mono text-slate-500">Status:</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        report.status === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : report.status === 'ACTION_INITIATED'
                          ? 'bg-purple-100 text-purple-800 border border-purple-300'
                          : report.status === 'UNDER_REVIEW'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {report.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                    <button
                      disabled={updatingReportId === report.id || report.status === 'UNDER_REVIEW'}
                      onClick={() => handleUpdateReportStatus(report.id, 'UNDER_REVIEW')}
                      className="px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold border border-blue-200 transition disabled:opacity-40"
                    >
                      Verify
                    </button>
                    <button
                      disabled={updatingReportId === report.id || report.status === 'ACTION_INITIATED'}
                      onClick={() => handleUpdateReportStatus(report.id, 'ACTION_INITIATED')}
                      className="px-2 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-800 font-bold border border-orange-200 transition disabled:opacity-40"
                    >
                      Dispatch
                    </button>
                    <button
                      disabled={updatingReportId === report.id || report.status === 'RESOLVED'}
                      onClick={() => handleUpdateReportStatus(report.id, 'RESOLVED')}
                      className="px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 transition disabled:opacity-40"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECTION 5: WHAT HAPPENED RECENTLY? (ACTIVITY FEED)          */}
      {/* ============================================================ */}
      <section className="bg-gradient-to-br from-slate-50 via-white to-blue-50/30 border border-blue-100 rounded-3xl p-5 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
              Recent Municipal Operations Activity
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500 font-semibold">Live Operational Feed</span>
        </div>

        <div className="divide-y divide-slate-100">
          {activityFeed.slice(0, 5).map(event => (
            <div key={event.id} className="py-2.5 flex items-start justify-between gap-4 text-xs">
              <div className="flex items-start gap-3">
                <span className="font-mono text-slate-500 text-[11px] mt-0.5 shrink-0 font-medium">
                  {event.time}
                </span>
                <p className="text-slate-800 leading-snug">{event.message}</p>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 shrink-0 border border-slate-200 font-semibold">
                {event.category}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Action Review Modal */}
      {reviewAction && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-2xl text-xs text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-mono text-blue-600 uppercase font-bold">
                  Action Review & Dispatch
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">{reviewAction.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewAction(null)}
                className="text-slate-400 hover:text-slate-700 p-1 text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-slate-600">
              <p>
                <strong className="text-slate-800">Department:</strong> {reviewAction.department}
              </p>
              <p>
                <strong className="text-slate-800">Target Area:</strong> {reviewAction.wardName}
              </p>
              <p>
                <strong className="text-slate-800">Operational Justification:</strong> {reviewAction.reason}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px]">
              Reviewing or approving this action will log the state transition into the operational audit log and dispatch notification prototypes to field coordinators.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  updateActionStatus(reviewAction.id, 'Dismissed', 'Dismissed by officer review');
                  setReviewAction(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-bold transition border border-slate-200"
              >
                Dismiss
              </button>

              <button
                type="button"
                onClick={() => {
                  updateActionStatus(reviewAction.id, 'Under Review', 'Placed under inter-departmental review');
                  setReviewAction(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition border border-slate-200"
              >
                Mark Under Review
              </button>

              <button
                type="button"
                onClick={() => {
                  updateActionStatus(reviewAction.id, 'Approved', 'Approved by Municipal Officer');
                  setReviewAction(null);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-xs"
              >
                Approve & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
