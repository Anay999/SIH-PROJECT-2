import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Navigation,
  ShieldAlert,
  ExternalLink,
  Send,
  CheckCircle2,
  Phone,
  Compass,
  Award,
  Search,
  MessageSquare,
  LocateFixed,
  Car,
  ArrowLeft,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  fetchNearestFacilities,
  fetchRoute,
  type Facility,
  type RouteData
} from '../services/emergencyService';
import { ThermoMap } from '../components/thermomap/ThermoMap';

// Custom Map Centering & Auto-Bounding Hook
function MapAutoBounds({
  userCoord,
  destCoord,
  polyline
}: {
  userCoord: [number, number];
  destCoord?: [number, number];
  polyline?: [number, number][];
}) {
  const map = useMap();
  useEffect(() => {
    if (polyline && polyline.length > 1) {
      const bounds = L.latLngBounds(polyline.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else if (destCoord) {
      const bounds = L.latLngBounds([userCoord, destCoord]);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    } else {
      map.setView(userCoord, 14);
    }
  }, [userCoord, destCoord, polyline, map]);
  return null;
}

// Custom High-Contrast Leaflet Pin Icons
const userIcon = new L.DivIcon({
  className: 'custom-user-marker',
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 42px; height: 42px; border-radius: 50%; background: rgba(59, 130, 246, 0.45); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="width: 22px; height: 22px; border-radius: 50%; background: #2563eb; border: 3px solid #ffffff; box-shadow: 0 0 16px rgba(37,99,235,0.8); display: flex; align-items: center; justify-content: center; color: white; font-size: 11px; font-weight: 900;">
        •
      </div>
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
});

const hospitalIcon = new L.DivIcon({
  className: 'custom-hosp-marker',
  html: `
    <div style="background: #dc2626; color: white; width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.7); font-weight: 900; font-size: 18px;">
      +
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const hospitalSelectedIcon = new L.DivIcon({
  className: 'custom-hosp-selected-marker',
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 48px; height: 48px; border-radius: 14px; background: rgba(239, 68, 68, 0.5); animation: ping 1.2s infinite;"></div>
      <div style="background: #ef4444; color: white; width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; border: 3px solid #ffffff; box-shadow: 0 0 20px #ef4444; font-weight: 900; font-size: 22px;">
        +
      </div>
    </div>
  `,
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});

const clinicIcon = new L.DivIcon({
  className: 'custom-clinic-marker',
  html: `
    <div style="background: #ea580c; color: white; width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 4px 8px rgba(0,0,0,0.6); font-weight: bold; font-size: 15px;">
      🚑
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const coolingIcon = new L.DivIcon({
  className: 'custom-cool-marker',
  html: `
    <div style="background: #0891b2; color: white; width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 4px 8px rgba(0,0,0,0.6); font-size: 15px;">
      ❄️
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const coolingSelectedIcon = new L.DivIcon({
  className: 'custom-cool-selected-marker',
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 46px; height: 46px; border-radius: 14px; background: rgba(6, 182, 212, 0.5); animation: ping 1.2s infinite;"></div>
      <div style="background: #06b6d4; color: white; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; border: 3px solid #ffffff; box-shadow: 0 0 20px #06b6d4; font-size: 19px;">
        ❄️
      </div>
    </div>
  `,
  iconSize: [46, 46],
  iconAnchor: [23, 23],
});

// Regional Metro Presets
const LOCATION_PRESETS = [
  { name: '📍 Live GPS Location', lat: null, lon: null, isGPS: true },
  { name: 'Pune', lat: 18.5204, lon: 73.8567 },
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
  { name: 'Delhi NCR', lat: 28.6139, lon: 77.2090 },
  { name: 'Bengaluru', lat: 12.9716, lon: 77.5946 },
  { name: 'Hyderabad', lat: 17.3850, lon: 78.4867 },
  { name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
  { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
  { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714 },
  { name: 'Jaipur', lat: 26.9124, lon: 75.7873 },
  { name: 'Lucknow', lat: 26.8467, lon: 80.9462 },
];

export const EmergencyGisPage: React.FC = () => {
  const { user } = useAuth();
  const isCitizen = user?.role === 'CITIZEN';

  // Default coordinates: Chennai / Teynampet
  const [userLocation, setUserLocation] = useState<[number, number]>([13.0450, 80.2500]);
  const [detectedLocation, setDetectedLocation] = useState<string>('Chennai Metro Area, Tamil Nadu');
  const [isGpsActive, setIsGpsActive] = useState<boolean>(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [loadingFacilities, setLoadingFacilities] = useState<boolean>(false);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'all' | 'hospital' | 'emergency' | 'cooling_centre'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [alertSent, setAlertSent] = useState<boolean>(false);
  const [smsSent, setSmsSent] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<string>('Chennai');
  // Basemap mode - SATELLITE DEFAULT
  const [basemapMode, setBasemapMode] = useState<'satellite' | 'street'>('satellite');
  const [gisViewMode, setGisViewMode] = useState<'dispatcher' | 'thermomap'>('thermomap');

  // Automatic permission check on mount
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then(res => {
        if (res.state === 'granted') {
          handleDetectGPS();
        }
      }).catch(() => {});
    }
  }, []);

  // 1. Fetch nearest facilities whenever userLocation changes
  useEffect(() => {
    let isCurrent = true;
    const loadFacilities = async () => {
      setLoadingFacilities(true);
      try {
        const data = await fetchNearestFacilities(userLocation[0], userLocation[1], 'all', 16);
        if (isCurrent && data.facilities && data.facilities.length > 0) {
          setFacilities(data.facilities);
          setDetectedLocation(data.detected_location || `Coordinates (${userLocation[0].toFixed(3)}°N, ${userLocation[1].toFixed(3)}°E)`);
          // Default to recommended primary facility
          if (!selectedFacility || !data.facilities.some(f => f.id === selectedFacility.id)) {
            setSelectedFacility(data.recommended_primary || data.facilities[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load facilities:', err);
      } finally {
        if (isCurrent) setLoadingFacilities(false);
      }
    };
    loadFacilities();
    return () => {
      isCurrent = false;
    };
  }, [userLocation]);

  // 2. Fetch Real Road Route whenever selectedFacility or userLocation changes
  useEffect(() => {
    if (!selectedFacility) return;
    let isCurrent = true;
    const loadRoute = async () => {
      setLoadingRoute(true);
      try {
        const route = await fetchRoute(
          userLocation[0],
          userLocation[1],
          selectedFacility.latitude,
          selectedFacility.longitude,
          'driving'
        );
        if (isCurrent && route) {
          setRouteData(route);
        }
      } catch (err) {
        console.error('Failed to fetch route:', err);
      } finally {
        if (isCurrent) setLoadingRoute(false);
      }
    };
    loadRoute();
    return () => {
      isCurrent = false;
    };
  }, [selectedFacility, userLocation]);

  // Live GPS Geolocation Trigger
  const handleDetectGPS = () => {
    if (navigator.geolocation) {
      setActivePreset('📍 Live GPS Location');
      setLoadingFacilities(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setUserLocation([lat, lon]);
          setIsGpsActive(true);
          setGpsAccuracy(Math.round(pos.coords.accuracy || 15));
          setDetectedLocation(`Live GPS (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`);
        },
        (err) => {
          console.warn('Geolocation failed or denied:', err);
          alert('GPS permission not granted or timed out. Defaulted to metro coordinates.');
          setLoadingFacilities(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const handleSelectPreset = (preset: typeof LOCATION_PRESETS[0]) => {
    if (preset.isGPS) {
      handleDetectGPS();
    } else if (preset.lat !== null && preset.lon !== null) {
      setActivePreset(preset.name);
      setIsGpsActive(false);
      setUserLocation([preset.lat, preset.lon]);
    }
  };

  // Instant 1-Click Nearest Hospital Selector
  const handleSelectNearestHospital = () => {
    setActiveTab('hospital');
    const hospitals = facilities.filter(f => f.type === 'HOSPITAL');
    if (hospitals.length > 0) {
      const sorted = [...hospitals].sort((a, b) => a.distance_km - b.distance_km);
      setSelectedFacility(sorted[0]);
    }
  };

  // Instant 1-Click Nearest Cooling Shelter Selector
  const handleSelectNearestCoolingShelter = () => {
    setActiveTab('cooling_centre');
    const shelters = facilities.filter(f => f.type === 'COOLING_CENTRE');
    if (shelters.length > 0) {
      const sorted = [...shelters].sort((a, b) => a.distance_km - b.distance_km);
      setSelectedFacility(sorted[0]);
    }
  };

  // Tab switcher with auto-selection of nearest facility of that category
  const handleTabChange = (tab: 'all' | 'hospital' | 'emergency' | 'cooling_centre') => {
    setActiveTab(tab);
    if (tab === 'hospital') {
      const hosp = facilities.filter(f => f.type === 'HOSPITAL').sort((a, b) => a.distance_km - b.distance_km);
      if (hosp.length > 0) setSelectedFacility(hosp[0]);
    } else if (tab === 'cooling_centre') {
      const cool = facilities.filter(f => f.type === 'COOLING_CENTRE').sort((a, b) => a.distance_km - b.distance_km);
      if (cool.length > 0) setSelectedFacility(cool[0]);
    } else if (tab === 'emergency') {
      const emerg = facilities.filter(f => f.type === 'EMERGENCY_CENTRE').sort((a, b) => a.distance_km - b.distance_km);
      if (emerg.length > 0) setSelectedFacility(emerg[0]);
    }
  };

  // WhatsApp Alert Test via Backend
  const handleSendWhatsAppAlert = async () => {
    if (!selectedFacility) return;
    try {
      await fetch('/api/notifications/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ward: selectedFacility.ward_name,
          risk: 'VERY HIGH',
          htsi: 84.1,
          facility: selectedFacility.name,
          distance: `${routeData?.distance_km || selectedFacility.distance_km} km`,
        }),
      });
      setAlertSent(true);
      setTimeout(() => setAlertSent(false), 4000);
    } catch (err) {
      console.error('WhatsApp test dispatch error:', err);
    }
  };

  // SMS Alert Test via Fast2SMS Backend
  const handleSendSmsAlert = async () => {
    if (!selectedFacility) return;
    try {
      await fetch('/api/notifications/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ward: selectedFacility.ward_name,
          htsi: 84.1,
          facility: selectedFacility.name,
        }),
      });
      setSmsSent(true);
      setTimeout(() => setSmsSent(false), 4000);
    } catch (err) {
      console.error('SMS test dispatch error:', err);
    }
  };

  // Filtered & Searched Facilities
  const filteredFacilities = useMemo(() => {
    return facilities.filter((f) => {
      if (activeTab === 'hospital' && f.type !== 'HOSPITAL') return false;
      if (activeTab === 'emergency' && f.type !== 'EMERGENCY_CENTRE') return false;
      if (activeTab === 'cooling_centre' && f.type !== 'COOLING_CENTRE') return false;
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        return f.name.toLowerCase().includes(query) || f.ward_name.toLowerCase().includes(query) || f.subtype.toLowerCase().includes(query);
      }
      return true;
    });
  }, [facilities, activeTab, searchQuery]);

  const nearestHospital = useMemo(() => {
    const list = facilities.filter(f => f.type === 'HOSPITAL').sort((a, b) => a.distance_km - b.distance_km);
    return list[0] || null;
  }, [facilities]);

  const nearestShelter = useMemo(() => {
    const list = facilities.filter(f => f.type === 'COOLING_CENTRE').sort((a, b) => a.distance_km - b.distance_km);
    return list[0] || null;
  }, [facilities]);

  const countHosp = facilities.filter(f => f.type === 'HOSPITAL').length;
  const countEmerg = facilities.filter(f => f.type === 'EMERGENCY_CENTRE').length;
  const countCool = facilities.filter(f => f.type === 'COOLING_CENTRE').length;

  const getMarkerIcon = (f: Facility) => {
    const isSelected = selectedFacility?.id === f.id;
    if (f.type === 'HOSPITAL') return isSelected ? hospitalSelectedIcon : hospitalIcon;
    if (f.type === 'COOLING_CENTRE') return isSelected ? coolingSelectedIcon : coolingIcon;
    return isSelected ? hospitalSelectedIcon : clinicIcon;
  };

  return (
    <div className="space-y-4 pb-12 font-sans text-slate-800">
      {/* Return to Citizen Safety Portal Button for Citizens */}
      {isCitizen && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-xs">
          <Link
            to="/citizen"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>← Return to Citizen Safety Portal</span>
          </Link>
          <span className="text-xs text-emerald-800 font-mono hidden sm:inline font-semibold">
            Public Emergency Facility & Route Navigation
          </span>
        </div>
      )}

      {/* Top Emergency Control Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 shadow-xs">
              <Navigation className="w-6 h-6 animate-pulse" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                EMERGENCY GIS & ROAD ROUTING ENGINE
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                  OSRM Active
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time road network routing to verified government emergency hospitals, trauma ICUs, and municipal cooling shelters.
              </p>
            </div>
          </div>
        </div>

        {/* View Mode & GPS Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setGisViewMode('thermomap')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                gisViewMode === 'thermomap'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>ThermoMap H3 Grid</span>
            </button>
            <button
              onClick={() => setGisViewMode('dispatcher')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                gisViewMode === 'dispatcher'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>OSRM Dispatcher</span>
            </button>
          </div>

          <button
            onClick={handleDetectGPS}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-xs ${
              isGpsActive
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <LocateFixed className="w-4 h-4 animate-spin text-white" style={{ animationDuration: '3s' }} />
            <span>{isGpsActive ? `GPS Locked (±${gpsAccuracy}m)` : 'Detect My Live GPS'}</span>
          </button>
        </div>
      </div>

      {gisViewMode === 'thermomap' ? (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-orange-50/90 border border-orange-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-orange-950">
              <Layers className="w-4 h-4 text-orange-600 shrink-0" />
              <span>
                <strong>2D ThermoMap GIS Canvas:</strong> Real-time Uber H3 hexagonal microclimates (Res 8 / Res 7), biometeorological indices (WBGT, UTCI, Heat Index, HTSI), Overpass emergency facilities, and in-map OSRM road routing.
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-white border border-orange-200 font-mono text-[11px] text-orange-800 font-bold">
              GPS: {userLocation[0].toFixed(4)}°N, {userLocation[1].toFixed(4)}°E
            </span>
          </div>

          <ThermoMap
            latitude={userLocation[0]}
            longitude={userLocation[1]}
            locationName={detectedLocation}
            height="720px"
          />
        </div>
      ) : (
        <>
          {/* TWO PRIMARY 1-CLICK EMERGENCY ACTION CARDS - Sleek Dark Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Button 1: Nearest Hospital */}
        <button
          onClick={handleSelectNearestHospital}
          className={`p-4 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between group shadow-lg ${
            selectedFacility?.type === 'HOSPITAL'
              ? 'bg-[#0f172a] border-rose-500 ring-2 ring-rose-500/40'
              : 'bg-[#0f172a] border-slate-800 hover:border-rose-500/70'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-400 flex items-center justify-center font-black text-2xl group-hover:scale-110 transition-transform shadow-sm">
              +
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold block">
                Primary Heatstroke Emergency
              </span>
              <span className="text-base font-bold text-white block">
                Nearest Hospital
              </span>
              <span className="text-xs text-slate-300 font-medium line-clamp-1">
                {nearestHospital ? `${nearestHospital.name} (${nearestHospital.distance_km} km)` : 'Locating closest hospital...'}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-rose-600 text-white shadow-xs group-hover:bg-rose-500 transition">
              Road Route →
            </span>
          </div>
        </button>

        {/* Button 2: Nearest Cooling Shelter */}
        <button
          onClick={handleSelectNearestCoolingShelter}
          className={`p-4 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between group shadow-lg ${
            selectedFacility?.type === 'COOLING_CENTRE'
              ? 'bg-[#0f172a] border-cyan-500 ring-2 ring-cyan-500/40'
              : 'bg-[#0f172a] border-slate-800 hover:border-cyan-500/70'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-800/80 text-cyan-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm">
              ❄️
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold block">
                Rapid Shaded Heat Relief & ORS
              </span>
              <span className="text-base font-bold text-white block">
                Nearest Cooling Shelter
              </span>
              <span className="text-xs text-slate-300 font-medium line-clamp-1">
                {nearestShelter ? `${nearestShelter.name} (${nearestShelter.distance_km} km)` : 'Locating nearest shelter...'}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-cyan-600 text-white shadow-xs group-hover:bg-cyan-500 transition">
              Road Route →
            </span>
          </div>
        </button>
      </div>

      {/* Preset Regional Location Selector Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none text-xs">
        <span className="text-slate-500 font-mono text-[11px] shrink-0 mr-1 flex items-center gap-1">
          <Compass className="w-3.5 h-3.5 text-blue-600" />
          Test Metro:
        </span>
        {LOCATION_PRESETS.map((p) => {
          const isActive = activePreset === p.name;
          return (
            <button
              key={p.name}
              onClick={() => handleSelectPreset(p)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 shadow-xs ${
                isActive
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      {/* Target Area Heat Advisory Alert Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-50 via-white to-amber-50 border border-rose-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
                ACTIVE ZONE HEAT STRESS
              </span>
              <span className="text-[10px] bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded">
                EXTREME HEAT ADVISORY
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Active Location: <strong className="text-slate-900 underline decoration-rose-400">{detectedLocation}</strong>. Heat index is elevated with high humidity. Direct road routing active.
            </p>
          </div>
        </div>

        {/* WhatsApp & SMS Quick Dispatch Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSendWhatsAppAlert}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1.5"
            title="Dispatch road route to WhatsApp"
          >
            {alertSent ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" /> : <MessageSquare className="w-3.5 h-3.5" />}
            <span>{alertSent ? 'Sent to WhatsApp!' : 'WhatsApp Alert'}</span>
          </button>
          <button
            onClick={handleSendSmsAlert}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition flex items-center gap-1.5"
            title="Dispatch alert via Fast2SMS"
          >
            {smsSent ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-200" /> : <Send className="w-3.5 h-3.5" />}
            <span>{smsSent ? 'SMS Dispatched!' : 'Quick SMS'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Map (Left 7 Cols) & Facility Routing Navigator (Right 5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Interactive Map with Esri Satellite Basemap */}
        <div className="lg:col-span-7 bg-[#0b121e] border-2 border-slate-300 rounded-2xl overflow-hidden flex flex-col h-[640px] shadow-md relative">
          {/* Map Top Status Bar */}
          <div className="p-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200 z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-white">
                {selectedFacility ? selectedFacility.name : 'Select Destination'}
              </span>
              <span className="text-slate-300 text-[11px]">
                {loadingRoute ? 'Tracing road network...' : routeData?.summary}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/80 text-blue-200 border border-blue-700 font-bold">
                {routeData?.provider || 'OSRM Road Engine'}
              </span>
            </div>
          </div>

          {/* Leaflet Map with Real Road Polyline */}
          <div className="flex-1 w-full relative">
            <MapContainer
              center={userLocation}
              zoom={13}
              style={{ width: '100%', height: '100%', backgroundColor: '#090d16' }}
              zoomControl={true}
            >
              {/* Esri High-Resolution World Imagery Satellite as Default */}
              <TileLayer
                url={
                  basemapMode === 'satellite'
                    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                }
                attribution={
                  basemapMode === 'satellite'
                    ? '&copy; Esri, Maxar, Earthstar Geographics'
                    : '&copy; OpenStreetMap contributors'
                }
                maxZoom={19}
              />

              {/* User Location Marker */}
              <Marker position={userLocation} icon={userIcon}>
                <Popup>
                  <div className="p-1 text-slate-900 font-sans text-xs">
                    <strong className="text-blue-600 block font-bold">Your Location (GPS)</strong>
                    <span>{detectedLocation}</span>
                  </div>
                </Popup>
              </Marker>

              {/* Markers for ALL Facilities */}
              {facilities.map((f) => (
                <Marker
                  key={f.id}
                  position={[f.latitude, f.longitude]}
                  icon={getMarkerIcon(f)}
                  eventHandlers={{
                    click: () => setSelectedFacility(f),
                  }}
                >
                  <Popup>
                    <div className="p-1.5 text-slate-900 font-sans text-xs min-w-[200px]">
                      <strong className="text-rose-600 text-xs block">{f.name}</strong>
                      <span className="text-[11px] text-slate-600 block">{f.subtype}</span>
                      <div className="mt-1 pt-1 border-t border-slate-200 flex justify-between text-[11px] font-bold">
                        <span className="text-blue-600">{f.distance_km} km</span>
                        <span className="text-emerald-700">~{f.travel_time_minutes} mins</span>
                      </div>
                      <div className="mt-1.5">
                        <button
                          onClick={() => setSelectedFacility(f)}
                          className="w-full py-1 text-center bg-blue-600 text-white rounded text-[10px] font-bold"
                        >
                          Select Destination
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Real Road Polyline (OSRM Street Geometry - NOT Displacement) */}
              {routeData?.coordinates && (
                <Polyline
                  positions={routeData.coordinates}
                  pathOptions={{
                    color: '#38bdf8',
                    weight: 6,
                    opacity: 0.95,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                />
              )}

              <MapAutoBounds
                userCoord={userLocation}
                destCoord={selectedFacility ? [selectedFacility.latitude, selectedFacility.longitude] : undefined}
                polyline={routeData?.coordinates}
              />
            </MapContainer>

            {/* Basemap Switcher (Satellite Imagery / Street Map) */}
            <div className="absolute top-3 right-3 z-[1000] flex items-center bg-white/95 backdrop-blur-md p-1 rounded-xl border border-slate-300 shadow-md">
              <button
                type="button"
                onClick={() => setBasemapMode('satellite')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                  basemapMode === 'satellite'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Satellite Imagery
              </button>
              <button
                type="button"
                onClick={() => setBasemapMode('street')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                  basemapMode === 'street'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Street Map
              </button>
            </div>

            {/* Bottom Left Map Badge */}
            <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-md border border-slate-300 px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-700 shadow-xs">
              Satellite GIS Active · {facilities.length} Emergency Points Locked
            </div>
          </div>
        </div>

        {/* Right Column: Search, Filter Tabs, Facility List & Step-by-Step Directions */}
        <div className="lg:col-span-5 flex flex-col gap-3.5">
          {/* Search Input Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hospitals, ICUs, cooling shelters..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-xs"
            />
          </div>

          {/* Category Filter Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 text-xs font-semibold">
            <button
              onClick={() => handleTabChange('all')}
              className={`flex-1 py-1.5 rounded-lg transition text-center ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({facilities.length})
            </button>
            <button
              onClick={() => handleTabChange('hospital')}
              className={`flex-1 py-1.5 rounded-lg transition text-center ${
                activeTab === 'hospital'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hospitals ({countHosp})
            </button>
            <button
              onClick={() => handleTabChange('emergency')}
              className={`flex-1 py-1.5 rounded-lg transition text-center ${
                activeTab === 'emergency'
                  ? 'bg-orange-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Clinics ({countEmerg})
            </button>
            <button
              onClick={() => handleTabChange('cooling_centre')}
              className={`flex-1 py-1.5 rounded-lg transition text-center ${
                activeTab === 'cooling_centre'
                  ? 'bg-cyan-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Shelters ({countCool})
            </button>
          </div>

          {/* Facility List (Ranked by Proximity & Suitability) */}
          <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1 scrollbar-thin">
            {loadingFacilities ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                Finding facilities nearest to your coordinates...
              </div>
            ) : filteredFacilities.length > 0 ? (
              filteredFacilities.map((fac) => {
                const isSelected = selectedFacility?.id === fac.id;
                return (
                  <div
                    key={fac.id}
                    onClick={() => setSelectedFacility(fac)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all shadow-md ${
                      isSelected
                        ? 'bg-[#131d38] border-cyan-500 ring-2 ring-cyan-500/30'
                        : 'bg-[#0f172a] border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              fac.type === 'HOSPITAL'
                                ? 'bg-rose-950/90 text-rose-300 border border-rose-800/80'
                                : fac.type === 'COOLING_CENTRE'
                                ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-800/80'
                                : 'bg-amber-950/90 text-amber-300 border border-amber-800/80'
                            }`}
                          >
                            {fac.type === 'HOSPITAL'
                              ? 'HOSPITAL'
                              : fac.type === 'COOLING_CENTRE'
                              ? 'COOLING SHELTER'
                              : 'EMERGENCY CLINIC'}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate max-w-[180px]">
                            {fac.ward_name}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white mt-1 leading-snug">{fac.name}</h4>
                        {fac.official_authority && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5 font-medium">
                            <Award className="w-3 h-3 text-emerald-400" />
                            {fac.official_authority}
                          </span>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-amber-400 block">
                          {fac.distance_km} km
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          ~{fac.travel_time_minutes} min drive
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-800">
                      <span className="text-emerald-400 font-medium text-[10px] truncate max-w-[200px]">
                        {fac.status_label}
                      </span>
                      <span className="text-cyan-400 font-bold text-[10px]">
                        {isSelected ? 'Route Active ✓' : 'Select Destination →'}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 bg-[#0f172a] rounded-xl border border-slate-800">
                No facilities matching this search in immediate range.
              </div>
            )}
          </div>

          {/* Turn-by-Turn Road Navigation Card (OSRM Driving Directions) */}
          {selectedFacility && routeData && (
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 shadow-lg text-white flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-[10px] uppercase font-bold text-cyan-300 tracking-wide">
                        Road Navigation (OSRM)
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white truncate max-w-[220px]">
                      {selectedFacility.name}
                    </h4>
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation[0]},${userLocation[1]}&destination=${selectedFacility.latitude},${selectedFacility.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-cyan-300 hover:text-white flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 shadow-xs hover:border-slate-600 transition"
                  >
                    Google Maps
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Step-by-Step Maneuvers */}
                <div className="space-y-1.5 max-h-[135px] overflow-y-auto pr-1 scrollbar-thin">
                  {routeData.steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                      <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-cyan-800">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] leading-snug text-slate-200">{step.instruction}</p>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {step.distance_meters}m • ~{Math.max(1, Math.ceil(step.duration_seconds / 60))} min
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-800 mt-2 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1 text-[11px]">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Helpline: <strong className="text-emerald-300 font-bold">{selectedFacility.contact}</strong></span>
                </div>
                <span className="text-[10px] text-cyan-300 font-mono font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {routeData.distance_km} km • {routeData.duration_minutes} min
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      </>
    )}
    </div>
  );
};
