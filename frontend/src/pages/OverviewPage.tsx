import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  TrendingUp,
  Map as MapIcon,
  Sun,
  Droplets,
  Thermometer,
  Flame,
  Gauge,
  Users,
  Compass,
  Bell
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';

// Custom Leaflet DivIcons
const coolingCenterIcon = L.divIcon({
  className: 'custom-cooling-marker',
  html: `<div style="background-color: #059669; color: #ffffff; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(5,150,105,0.6); border: 2px solid white; font-weight: 900; font-size: 13px;">❄</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13]
});

const hospitalMarkerIcon = L.divIcon({
  className: 'custom-hospital-marker',
  html: `<div style="background-color: #0284c7; color: white; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(2,132,199,0.6); border: 2px solid white; font-weight: 900; font-size: 14px;">+</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13]
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
    cityProfile
  } = useWorkspace();

  const [geoJsonData, setGeoJsonData] = useState<GeoJsonObject | null>(null);
  const [facilities, setFacilities] = useState<any>({ cooling_centers: [], hospitals: [] });
  const [communityReports, setCommunityReports] = useState<any[]>([]);

  // Time Filter State matching Image 1: [Now] [Forecast] [24h] [5 Days]
  const [timeFilter, setTimeFilter] = useState<'Now' | 'Forecast' | '24h' | '5 Days'>('Now');

  // Layer mode: Heat Risk (HTSI), WBGT, Vulnerability
  const [activeLayer, setActiveLayer] = useState<'htsi' | 'wbgt' | 'vulnerability'>('htsi');

  useEffect(() => {
    const loadGis = async () => {
      try {
        const [wardsRes, facRes, repRes] = await Promise.all([
          fetch('http://127.0.0.1:8000/api/gis/wards').catch(() => null),
          fetch('http://127.0.0.1:8000/api/gis/facilities').catch(() => null),
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
        if (repRes && repRes.ok) {
          const repData = await repRes.json();
          setCommunityReports(repData.data || []);
        }
      } catch (err) {
        console.warn('Overview GIS load error, using default context', err);
      }
    };
    loadGis();
  }, []);

  const defaultCenter: [number, number] = [
    cityProfile?.coordinates?.lat || 13.065,
    cityProfile?.coordinates?.lon || 80.245
  ];

  // Satellite basemap URL
  const tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

  // Choropleth style function matching Image 1
  const styleFeature = (feature: any) => {
    const props = feature.properties;
    const isSelected = selectedWardId === props.ward_id;

    const htsi = props.htsi_score !== undefined ? props.htsi_score : 68;

    let fillColor = '#10b981'; // Low (< 0.2 / < 40)
    if (htsi >= 80) fillColor = '#991b1b'; // Extreme (≥ 0.8)
    else if (htsi >= 65) fillColor = '#dc2626'; // Very High (0.6 - 0.8)
    else if (htsi >= 50) fillColor = '#f97316'; // High (0.4 - 0.6)
    else if (htsi >= 35) fillColor = '#eab308'; // Moderate (0.2 - 0.4)
    else fillColor = '#10b981'; // Low

    return {
      fillColor,
      weight: isSelected ? 3 : 1.2,
      opacity: 1,
      color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.7)',
      fillOpacity: 0.72,
    };
  };

  const onEachFeature = (feature: any, layer: any) => {
    const props = feature.properties;
    layer.on({
      click: () => {
        selectWard(props.ward_id);
      }
    });

    const htsiDecimal = ((props.htsi_score || 72) / 100).toFixed(2);
    layer.bindTooltip(
      `<strong>${props.ward_name || props.name || 'Ward'}</strong><br/>HTSI: ${htsiDecimal} • Pop: ${(props.population || 120000).toLocaleString()}`,
      { direction: 'top', sticky: true, className: 'leaflet-custom-tooltip' }
    );
  };

  // High Priority Wards matching Image 1
  const PRIORITY_WARDS = [
    { rank: 1, id: 'ward_04_tondiarpet', name: 'Tondiarpet (Ward 04)', htsi: 0.86, risk: 'Extreme', badgeColor: 'bg-red-800 text-white', pop: '142,300', barColor: 'bg-red-800' },
    { rank: 2, id: 'ward_05_royapuram', name: 'Royapuram (Ward 05)', htsi: 0.78, risk: 'Very High', badgeColor: 'bg-red-600 text-white', pop: '128,400', barColor: 'bg-red-600' },
    { rank: 3, id: 'ward_01_thiruvottiyur', name: 'Thiruvottiyur (Ward 01)', htsi: 0.74, risk: 'Very High', badgeColor: 'bg-red-600 text-white', pop: '165,900', barColor: 'bg-red-600' },
    { rank: 4, id: 'ward_11_anna_nagar', name: 'Anna Nagar (Ward 11)', htsi: 0.68, risk: 'High', badgeColor: 'bg-orange-600 text-white', pop: '123,600', barColor: 'bg-orange-500' },
    { rank: 5, id: 'ward_176_adyar', name: 'Adyar (Ward 176)', htsi: 0.62, risk: 'High', badgeColor: 'bg-orange-600 text-white', pop: '98,200', barColor: 'bg-orange-500' },
  ];

  // Recent Alerts & Actions matching Image 1
  const RECENT_ALERTS = [
    { time: '10:32 AM', icon: '⚠️', title: 'Extreme Heat Alert (12–4 PM)', area: 'North Chennai', status: 'Active', badgeClass: 'bg-red-100 text-red-700 font-bold border border-red-200' },
    { time: '08:15 AM', icon: '❄️', title: 'Cooling Centre Activation', area: 'Wards 04, 05, 06', status: 'Completed', badgeClass: 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-200' },
    { time: '07:50 AM', icon: '👷', title: 'Outdoor Work Advisory', area: 'Citywide', status: 'In Progress', badgeClass: 'bg-blue-100 text-blue-700 font-bold border border-blue-200' },
  ];

  return (
    <div className="space-y-6 max-w-[1920px] mx-auto animate-fadeIn">
      
      {/* ======================================================== */}
      {/* 1. TOP PANORAMIC BANNER (Matching Image 1 Exactly)       */}
      {/* ======================================================== */}
      <div className="relative rounded-3xl overflow-hidden shadow-sm border border-[#ede7de] bg-[#fdfbf7]">
        {/* Background Artwork: India Landmark Skyline and Solar Horizon */}
        <img
          src="/assets/india_banner.jpg"
          alt="Government of India National Heat Resilience Mission"
          className="w-full h-44 sm:h-52 md:h-60 object-cover object-center"
        />

        {/* Gradient Overlay for Crisp Text Contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-transparent flex items-center justify-between p-6 sm:p-8 lg:p-10" />

        {/* Left Headline */}
        <div className="absolute inset-y-0 left-0 p-6 sm:p-8 lg:p-10 flex flex-col justify-center max-w-xl z-10 space-y-1 sm:space-y-1.5">
          <span className="text-[11px] font-black tracking-wider uppercase text-red-600 block">
            NATIONAL HEAT RISK RESILIENCE MISSION • GOVERNMENT OF INDIA
          </span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#1c1917] tracking-tight leading-tight">
            Beat the Heat, <br className="hidden sm:inline" />
            <span className="text-[#ea580c]">Build a Safer India</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#57534e] font-medium pt-0.5 max-w-lg">
            Real-time heat risk insights. Early warnings. Targeted action. Healthier communities across India.
          </p>
        </div>

        {/* Right Floating Clock & Weather Card (Exact match to Image 1) */}
        <div className="hidden sm:flex absolute right-6 lg:right-10 top-1/2 -translate-y-1/2 z-10">
          <div className="bg-white/95 backdrop-blur-md border border-white/80 rounded-2xl p-4 sm:p-5 shadow-xl space-y-1 text-right min-w-[210px]">
            <div className="text-xs font-semibold text-[#78716c]">
              Tue, 27 May 2025
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#1c1917] tracking-tight font-mono">
              01:42 PM
            </div>
            <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-amber-700 pt-1">
              <Sun className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
              <span>Hot Conditions • Clear Sky • No Rain</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. FIVE HORIZONTAL METRIC CARDS (Matching Image 1)       */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        
        {/* Card 1: Temperature */}
        <div className="bg-white border border-[#ede7de] rounded-2xl p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <Thermometer className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-[#78716c]">Temperature</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#1c1917] tracking-tight">38.5°C</span>
              <span className="px-1.5 py-0.5 rounded-md bg-red-50 text-red-700 text-[10px] font-bold">
                +2.6°C
              </span>
            </div>
            <p className="text-[11px] text-[#78716c] font-medium mt-1">Feels like 42.1°C</p>
          </div>
        </div>

        {/* Card 2: Relative Humidity */}
        <div className="bg-white border border-[#ede7de] rounded-2xl p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Droplets className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-[#78716c]">Relative Humidity</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#1c1917] tracking-tight">68%</span>
              <span className="px-1.5 py-0.5 rounded-md bg-red-50 text-red-700 text-[10px] font-bold">
                +12%
              </span>
            </div>
            <p className="text-[11px] text-[#78716c] font-medium mt-1">High moisture burden</p>
          </div>
        </div>

        {/* Card 3: WBGT (Avg.) */}
        <div className="bg-white border border-[#ede7de] rounded-2xl p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-[#78716c]">WBGT (Avg.)</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#1c1917] tracking-tight">30.5°C</span>
              <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-bold flex items-center gap-1">
                <span>▲</span> High
              </span>
            </div>
            <p className="text-[11px] text-[#78716c] font-medium mt-1">Approaching risk threshold</p>
          </div>
        </div>

        {/* Card 4: Heat Stress Index (HTSI) */}
        <div className="bg-white border border-[#ede7de] rounded-2xl p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <Gauge className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-[#78716c]">Heat Stress Index (HTSI)</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#1c1917] tracking-tight">0.78</span>
              <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-bold flex items-center gap-1">
                <span>▲</span> Very High
              </span>
            </div>
            <p className="text-[11px] text-[#78716c] font-medium mt-1">Elevated thermal stress</p>
          </div>
        </div>

        {/* Card 5: At Risk Population */}
        <div className="bg-white border border-[#ede7de] rounded-2xl p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-[#78716c]">At Risk Population</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#1c1917] tracking-tight">2.3M</span>
              <span className="px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold">
                +18%
              </span>
            </div>
            <p className="text-[11px] text-[#78716c] font-medium mt-1">Across 12 high-risk wards</p>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 3. MAIN CONTENT GRID (Left: Map ~58% | Right: Stats ~42%) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ---------------------------------------------------- */}
        {/* LEFT COLUMN: ThermoMap — Chennai (7 Columns on Large) */}
        {/* ---------------------------------------------------- */}
        <div className="lg:col-span-7 bg-white border border-[#ede7de] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col space-y-4">
          
          {/* Header Controls matching Image 1 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <MapIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-[#1c1917] tracking-tight">
                  ThermoMap — {cityProfile?.name || 'Chennai'}
                </h3>
                <p className="text-xs text-[#78716c] font-medium">
                  Live heat risk across wards with key facilities
                </p>
              </div>
            </div>

            {/* Layer Dropdown + Time Pills */}
            <div className="flex items-center flex-wrap gap-2">
              <select
                value={activeLayer}
                onChange={(e) => setActiveLayer(e.target.value as any)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917] focus:outline-none cursor-pointer"
              >
                <option value="htsi">Heat Risk (HTSI)</option>
                <option value="wbgt">Wet-Bulb Globe Temp (WBGT)</option>
                <option value="vulnerability">Vulnerability Profile</option>
              </select>

              {/* Time Pills */}
              <div className="flex items-center gap-1 p-1 bg-[#faf9f6] border border-[#ede7de] rounded-xl text-xs font-bold">
                {(['Now', 'Forecast', '24h', '5 Days'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeFilter(t)}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      timeFilter === t
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'text-[#78716c] hover:text-[#1c1917]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive GIS Map Viewport */}
          <div className="relative h-[480px] sm:h-[530px] rounded-2xl overflow-hidden border border-[#ede7de] shadow-inner bg-slate-900">
            <MapContainer
              center={defaultCenter}
              zoom={11}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
            >
              <MapRecenter center={defaultCenter} zoom={11} />
              <TileLayer
                attribution="&copy; Esri & OpenStreetMap"
                url={tileUrl}
                maxZoom={18}
              />

              {/* Ward GeoJSON Polygons */}
              {geoJsonData && (
                <GeoJSON
                  key={`${activeLayer}-${selectedWardId || 'none'}`}
                  data={geoJsonData}
                  style={styleFeature}
                  onEachFeature={onEachFeature}
                />
              )}

              {/* Facility Markers: Hospitals */}
              {facilities.hospitals?.slice(0, 10).map((h: any) => (
                <Marker
                  key={h.id || h.name}
                  position={[h.latitude, h.longitude]}
                  icon={hospitalMarkerIcon}
                >
                  <Popup>
                    <div className="p-1 space-y-1 text-xs">
                      <strong className="text-blue-900">{h.name}</strong>
                      <div className="text-slate-600">Surge Readiness: {h.heat_capacity || 'Prepared'}</div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Facility Markers: Cooling Centers */}
              {facilities.cooling_centers?.slice(0, 10).map((c: any) => (
                <Marker
                  key={c.id || c.name}
                  position={[c.latitude, c.longitude]}
                  icon={coolingCenterIcon}
                >
                  <Popup>
                    <div className="p-1 space-y-1 text-xs">
                      <strong className="text-emerald-900">{c.name}</strong>
                      <div className="text-slate-600">Capacity: {c.capacity || 150} people</div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Top Right: 3D Command Quicklink */}
            <div className="absolute top-3 right-3 z-[1000]">
              <Link
                to="/thermal-terrain"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md hover:bg-white text-[#1c1917] border border-[#ede7de] text-xs font-bold shadow-md hover:scale-105 transition"
              >
                <Compass className="w-3.5 h-3.5 text-orange-600" />
                <span>Open 3D Command →</span>
              </Link>
            </div>

            {/* Floating Legend Bottom Left (Matching Image 1 Exactly) */}
            <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-md border border-[#ede7de] rounded-2xl p-3 shadow-xl space-y-1.5 text-xs text-[#1c1917]">
              <span className="font-black text-[11px] block">Heat Risk Level (HTSI)</span>
              <div className="grid grid-cols-1 gap-1 text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#991b1b]" />
                  <span>Extreme (≥ 0.8)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#dc2626]" />
                  <span>Very High (0.6 – 0.8)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
                  <span>High (0.4 – 0.6)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
                  <span>Moderate (0.2 – 0.4)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                  <span>Low (&lt; 0.2)</span>
                </div>
              </div>
              <div className="pt-1.5 border-t border-[#ede7de] flex items-center gap-3 text-[10px] font-semibold text-[#44403c]">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[9px]">+</span>
                  <span>Hospitals</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[9px]">❄</span>
                  <span>Cooling Centres</span>
                </div>
              </div>
            </div>

            {/* Bottom Right: Scale and North Indicator */}
            <div className="absolute bottom-3 right-3 z-[1000] bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-white text-[10px] font-mono flex items-center gap-2 pointer-events-none">
              <span>0 — 5 — 10 km</span>
              <span className="font-bold text-amber-400">▲ N</span>
            </div>
          </div>

        </div>

        {/* ---------------------------------------------------- */}
        {/* RIGHT COLUMN: 3 STAT WIDGETS (5 Columns on Large)    */}
        {/* ---------------------------------------------------- */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* 1. 5-Day Thermal Stress Forecast Widget */}
          <div className="bg-white border border-[#ede7de] rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-orange-600" />
                <h4 className="text-sm font-black text-[#1c1917]">5-Day Thermal Stress Forecast</h4>
              </div>
              <Link to="/forecast" className="text-xs font-bold text-orange-600 hover:text-orange-700 transition">
                View Full Forecast →
              </Link>
            </div>

            {/* Area Chart SVG (Matching Image 1) */}
            <div className="h-44 w-full pt-2">
              <svg viewBox="0 0 400 150" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="htsugrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Gridlines */}
                {[0, 30, 60, 90, 120].map((y, i) => (
                  <line key={i} x1="35" y1={y} x2="380" y2={y} stroke="#f0ece6" strokeWidth="1" />
                ))}

                {/* Y-axis Labels */}
                <text x="25" y="10" fontSize="9" fill="#a8a29e" textAnchor="end">1.0</text>
                <text x="25" y="40" fontSize="9" fill="#a8a29e" textAnchor="end">0.8</text>
                <text x="25" y="70" fontSize="9" fill="#a8a29e" textAnchor="end">0.6</text>
                <text x="25" y="100" fontSize="9" fill="#a8a29e" textAnchor="end">0.4</text>
                <text x="25" y="130" fontSize="9" fill="#a8a29e" textAnchor="end">0.2</text>
                <text x="12" y="70" fontSize="8" fill="#78716c" fontWeight="bold" textAnchor="middle" transform="rotate(-90 12,70)">HTSI</text>

                {/* Area Gradient Path: Points: (60,42), (135,28), (210,36), (285,57), (360,78) */}
                <path
                  d="M 60 42 L 135 28 L 210 36 L 285 57 L 360 78 L 360 130 L 60 130 Z"
                  fill="url(#htsugrad)"
                />

                {/* Line Path */}
                <path
                  d="M 60 42 L 135 28 L 210 36 L 285 57 L 360 78"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                />

                {/* Data Points & Value Badges */}
                {[
                  { x: 60, y: 42, val: '0.72', day: 'Today', date: '27 May' },
                  { x: 135, y: 28, val: '0.81', day: 'Wed', date: '28 May' },
                  { x: 210, y: 36, val: '0.76', day: 'Thu', date: '29 May' },
                  { x: 285, y: 57, val: '0.62', day: 'Fri', date: '30 May' },
                  { x: 360, y: 78, val: '0.48', day: 'Sat', date: '31 May' },
                ].map((pt, i) => (
                  <g key={i}>
                    <circle cx={pt.x} cy={pt.y} r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                    <text x={pt.x} y={pt.y - 7} fontSize="10" fontWeight="bold" fill="#1c1917" textAnchor="middle">
                      {pt.val}
                    </text>
                    <text x={pt.x} y="142" fontSize="9" fontWeight="bold" fill="#44403c" textAnchor="middle">
                      {pt.day}
                    </text>
                    <text x={pt.x} y="152" fontSize="8" fill="#a8a29e" textAnchor="middle">
                      {pt.date}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* 2. High Priority Wards Widget */}
          <div className="bg-white border border-[#ede7de] rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-red-600" />
                <h4 className="text-sm font-black text-[#1c1917]">High Priority Wards</h4>
              </div>
              <Link to="/vulnerability" className="text-xs font-bold text-orange-600 hover:text-orange-700 transition">
                View All Wards →
              </Link>
            </div>

            {/* Wards Ranked Table */}
            <div className="space-y-2.5 pt-1">
              {PRIORITY_WARDS.map((w) => (
                <div
                  key={w.id}
                  onClick={() => selectWard(w.id)}
                  className={`flex items-center justify-between gap-3 p-2.5 rounded-2xl hover:bg-[#faf9f6] transition cursor-pointer border ${
                    selectedWardId === w.id ? 'border-orange-500 bg-orange-50/50' : 'border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 text-xs font-bold text-[#78716c] shrink-0">#{w.rank}</span>
                    <div className="truncate">
                      <div className="text-xs font-bold text-[#1c1917] truncate">{w.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-20 bg-stone-100 rounded-full h-1.5 overflow-hidden">
                          <div className={`h-full rounded-full ${w.barColor}`} style={{ width: `${w.htsi * 100}%` }} />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-[#44403c]">{w.htsi}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${w.badgeColor}`}>
                      {w.risk}
                    </span>
                    <span className="text-[10px] text-[#78716c] flex items-center gap-1 font-medium hidden sm:flex">
                      <Users className="w-3 h-3 text-[#a8a29e]" />
                      {w.pop}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Recent Alerts & Actions Widget */}
          <div className="bg-white border border-[#ede7de] rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-orange-600" />
                <h4 className="text-sm font-black text-[#1c1917]">Recent Alerts & Actions</h4>
              </div>
              <Link to="/alerts" className="text-xs font-bold text-orange-600 hover:text-orange-700 transition">
                View All →
              </Link>
            </div>

            <div className="space-y-2 pt-1">
              {RECENT_ALERTS.map((alert, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#faf9f6] border border-[#ede7de] text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-sm shrink-0">{alert.icon}</span>
                    <div className="truncate">
                      <div className="font-bold text-[#1c1917] truncate">{alert.title}</div>
                      <div className="text-[10px] text-[#78716c] flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{alert.time}</span>
                        <span>•</span>
                        <span>{alert.area}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-lg text-[10px] shrink-0 ${alert.badgeClass}`}>
                    {alert.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ======================================================== */}
      {/* 4. ACTIVE COMMUNITY REPORTS & HEAT ACTION PLAN DIRECTIVES */}
      {/* (Keeps all existing reporting & action features 100% live) */}
      {/* ======================================================== */}
      <div className="bg-white border border-[#ede7de] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ede7de] pb-4">
          <div>
            <h3 className="text-base font-black text-[#1c1917] tracking-tight">
              Community Ground Evidence & Priority Directives
            </h3>
            <p className="text-xs text-[#78716c]">
              Real-time crowdsourced reports from citizens & automated Heat Action Plan (HAP) deployments
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/heat-action-plan"
              className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-xs"
            >
              Manage Heat Action Plan →
            </Link>
          </div>
        </div>

        {/* Community Reports List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {communityReports.slice(0, 3).map((rep) => (
            <div key={rep.id} className="p-3.5 rounded-2xl bg-[#faf9f6] border border-[#ede7de] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#1c1917] uppercase tracking-wide text-[10px]">
                  {rep.report_type || 'Heat Hazard'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                  {rep.status || 'Reported'}
                </span>
              </div>
              <p className="text-xs text-[#44403c] line-clamp-2">{rep.description}</p>
              <div className="text-[10px] text-[#78716c] flex items-center justify-between pt-1 border-t border-[#ede7de]">
                <span>{rep.address_text || rep.ward_id || 'Chennai Ward'}</span>
                <span>{rep.created_at ? new Date(rep.created_at).toLocaleDateString() : 'Active'}</span>
              </div>
            </div>
          ))}
          {communityReports.length === 0 && (
            <div className="col-span-3 p-4 text-center text-xs text-[#78716c]">
              No active community hazard reports pending. All municipal water points operational.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
