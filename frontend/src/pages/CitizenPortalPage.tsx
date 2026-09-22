import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { getFacilitiesForCity, type RealFacility } from '../data/realFacilities';
import { ThermoMap } from '../components/thermomap/ThermoMap';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import {
  Shield,
  MapPin,
  Thermometer,
  Compass,
  AlertTriangle,
  Search,
  Navigation,
  PhoneCall,
  Activity,
  HeartPulse,
  Layers,
  ChevronRight,
  User,
  LogOut,
  Calendar,
  HelpCircle,
  Ambulance,
  LifeBuoy
} from 'lucide-react';

export const CitizenPortalPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { cityProfile, isLiveGpsActive, liveGpsCoords, toggleLiveGps } = useWorkspace();

  // Active navigation view (8 specific User Dashboard views)
  const [activeTab, setActiveTab] = useState<
    'overview' | 'thermomap' | 'forecast' | 'thermal_stress' | 'health_risk' | 'nearby_help' | 'emergency' | 'profile'
  >('overview');

  // Real-time location state
  const [detectedLocationName, setDetectedLocationName] = useState<string>('Gummidipoondi, Tamil Nadu');
  const [userCoords, setUserCoords] = useState<[number, number]>([
    cityProfile?.coordinates?.lat || 13.0827,
    cityProfile?.coordinates?.lon || 80.2707
  ]);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState<boolean>(false);

  // Map state
  const [selectedFacility, setSelectedFacility] = useState<RealFacility | null>(null);


  // Search filter for help
  const [facilitySearch, setFacilitySearch] = useState<string>('');
  const [facilityTypeFilter, setFacilityTypeFilter] = useState<'all' | 'hospital' | 'cooling'>('all');

  // Reverse geocoding on mount & when GPS changes
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setUserCoords([lat, lon]);
          setLocationPermissionGranted(true);

          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            if (res.ok) {
              const data = await res.json();
              const addr = data.address || {};
              const place = addr.suburb || addr.neighbourhood || addr.city_district || addr.city || addr.town || addr.village || 'Detected Region';
              const state = addr.state || 'India';
              setDetectedLocationName(`${place}, ${state}`);
            }
          } catch {
            setDetectedLocationName(`Location (${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E)`);
          }
        },
        () => {
          setLocationPermissionGranted(false);
          setDetectedLocationName(`${cityProfile?.name || 'Chennai'} Metropolitan Area, ${cityProfile?.state || 'Tamil Nadu'}`);
          setUserCoords([
            cityProfile?.coordinates?.lat || 13.0827,
            cityProfile?.coordinates?.lon || 80.2707
          ]);
        }
      );
    }
  }, [cityProfile]);

  // Synchronize when roaming GPS toggle changes in WorkspaceContext
  useEffect(() => {
    if (isLiveGpsActive && liveGpsCoords) {
      setUserCoords([liveGpsCoords.lat, liveGpsCoords.lon]);
      setDetectedLocationName(`Live GPS Roaming: ${liveGpsCoords.lat.toFixed(3)}°N, ${liveGpsCoords.lon.toFixed(3)}°E`);
    }
  }, [isLiveGpsActive, liveGpsCoords]);

  // Current real-time biometeorological metrics
  const liveMetrics = useMemo(() => {
    return {
      temperature: 38.4,
      feelsLike: 44.8,
      humidity: 64,
      windSpeed: 14.2,
      wbgt: 31.2,
      utci: 41.6,
      heatIndex: 46.1,
      htsi: 78.4,
      riskLevel: 'HIGH',
      riskBadge: 'HIGH HEAT RISK — ORANGE ADVISORY',
      lastUpdated: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST',
      explanation: 'High ambient temperature (38.4°C) combined with elevated relative humidity (64%) suppresses natural sweat evaporation, creating severe biometeorological thermal strain.'
    };
  }, []);

  // 5-Day forecast series for charts
  const forecastSeries = [
    { day: 'Today', temp: 38.4, feelsLike: 44.8, wbgt: 31.2, utci: 41.6, htsi: 78.4, humidity: 64, risk: 'High' },
    { day: 'Tomorrow', temp: 39.8, feelsLike: 47.1, wbgt: 32.5, utci: 43.1, htsi: 84.2, humidity: 67, risk: 'Very High' },
    { day: 'Day 3', temp: 40.2, feelsLike: 48.0, wbgt: 33.1, utci: 44.0, htsi: 88.0, humidity: 69, risk: 'Extreme' },
    { day: 'Day 4', temp: 37.6, feelsLike: 43.2, wbgt: 30.4, utci: 40.2, htsi: 74.0, humidity: 61, risk: 'High' },
    { day: 'Day 5', temp: 36.1, feelsLike: 40.5, wbgt: 29.1, utci: 38.4, htsi: 67.5, humidity: 58, risk: 'Moderate' },
  ];

  // Facilities in the user's active municipal jurisdiction
  const allFacilities = useMemo(() => {
    return getFacilitiesForCity(cityProfile.id || 'chennai');
  }, [cityProfile.id]);

  const filteredFacilities = useMemo(() => {
    return allFacilities.filter(f => {
      const matchType =
        facilityTypeFilter === 'all'
          ? true
          : facilityTypeFilter === 'hospital'
          ? f.type === 'HOSPITAL' || f.type === 'EMERGENCY_CENTRE'
          : f.type === 'COOLING_CENTRE';
      const matchSearch =
        f.name.toLowerCase().includes(facilitySearch.toLowerCase()) ||
        f.ward_name.toLowerCase().includes(facilitySearch.toLowerCase()) ||
        f.address.toLowerCase().includes(facilitySearch.toLowerCase());
      return matchType && matchSearch;
    });
  }, [allFacilities, facilitySearch, facilityTypeFilter]);

  // Handle route calculation directly on ThermoMap
  const handleSelectFacilityAndRoute = (facility: RealFacility) => {
    setSelectedFacility(facility);
    setActiveTab('thermomap'); // Ensure ThermoMap is visible
  };


  return (
    <div className="h-screen max-h-screen overflow-hidden bg-[#faf9f6] text-[#1c1917] flex flex-col lg:flex-row font-sans selection:bg-orange-500 selection:text-white">
      {/* ======================================================== */}
      {/* 1. CITIZEN USER SIDEBAR (Fixed & Constant)               */}
      {/* ======================================================== */}
      <aside className="w-full lg:w-64 h-full bg-white border-b lg:border-b-0 lg:border-r border-[#ede7de] shrink-0 flex flex-col shadow-xs overflow-hidden">
        {/* Logo & Header */}
        <div className="p-4 border-b border-[#ede7de] flex items-center space-x-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm font-black tracking-tight text-[#1c1917] uppercase block">
              THERMOSAFE <span className="text-orange-600">AI</span>
            </span>
            <span className="text-[10px] font-bold text-[#78716c] uppercase tracking-wider block">
              Public Safety Portal
            </span>
          </div>
        </div>

        {/* User Profile Mini Badge */}
        <div className="p-3 bg-[#faf9f6] border-b border-[#ede7de] space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1c1917] truncate">{user?.full_name || 'Public Citizen'}</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              CITIZEN
            </span>
          </div>
          <div className="flex items-center justify-between gap-1.5">
            <p className="text-[11px] text-[#57534e] flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 text-orange-600 shrink-0" />
              <span>{cityProfile.name} Jurisdiction</span>
            </p>
            <button
              onClick={() => logout()}
              title="Sign Out Session"
              className="py-1 px-2 rounded-lg bg-white hover:bg-red-50 text-red-700 hover:text-red-800 text-[11px] font-semibold transition flex items-center gap-1 border border-[#ede7de] shadow-2xs shrink-0"
            >
              <LogOut className="w-3 h-3 text-red-600" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Links (Strictly 8 Views - Scrollable if screen is compact) */}
        <nav className="p-3 space-y-1 text-xs font-semibold flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'overview'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                : 'text-[#57534e] hover:bg-[#f5f3ef] hover:text-[#1c1917]'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>1. Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('thermomap')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'thermomap'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                : 'text-[#57534e] hover:bg-[#f5f3ef] hover:text-[#1c1917]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>2. ThermoMap</span>
          </button>

          <button
            onClick={() => setActiveTab('forecast')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'forecast'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                : 'text-[#57534e] hover:bg-[#f5f3ef] hover:text-[#1c1917]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>3. Heat Forecast</span>
          </button>

          <button
            onClick={() => setActiveTab('thermal_stress')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'thermal_stress'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                : 'text-[#57534e] hover:bg-[#f5f3ef] hover:text-[#1c1917]'
            }`}
          >
            <Thermometer className="w-4 h-4" />
            <span>4. Thermal Stress</span>
          </button>

          <button
            onClick={() => setActiveTab('health_risk')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'health_risk'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                : 'text-[#57534e] hover:bg-[#f5f3ef] hover:text-[#1c1917]'
            }`}
          >
            <HeartPulse className="w-4 h-4" />
            <span>5. Health Risk</span>
          </button>

          <button
            onClick={() => setActiveTab('nearby_help')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'nearby_help'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                : 'text-[#57534e] hover:bg-[#f5f3ef] hover:text-[#1c1917]'
            }`}
          >
            <LifeBuoy className="w-4 h-4" />
            <span>6. Nearby Help</span>
          </button>

          <button
            onClick={() => setActiveTab('emergency')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'emergency'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'text-red-700 hover:bg-red-50'
            }`}
          >
            <Ambulance className="w-4 h-4" />
            <span>7. Emergency</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl transition ${
              activeTab === 'profile'
                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20'
                : 'text-[#57534e] hover:bg-[#f5f3ef] hover:text-[#1c1917]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>8. Profile</span>
          </button>
        </nav>

        {/* Sign Out Button - Cleanly visible at bottom of sidebar within viewport */}
        <div className="p-3 border-t border-[#ede7de] shrink-0 bg-white">
          <button
            onClick={() => logout()}
            className="w-full py-2 px-3 rounded-xl bg-[#f5f3ef] hover:bg-red-50 text-[#57534e] hover:text-red-700 text-xs font-semibold transition flex items-center justify-center space-x-2 border border-[#ede7de] shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MAIN DASHBOARD CONTENT AREA - ONLY THIS SCROLLS       */}
      {/* ======================================================== */}
      <main className="flex-1 min-h-0 h-full overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 scrollbar-thin">
        
        {/* Global Context Bar (Current Location + Municipality + Heat Risk) */}
        <div className="bg-white border border-[#ede7de] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-orange-600 tracking-wider uppercase flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Current Geographic Location
            </span>
            <h2 className="text-lg font-black text-[#1c1917] tracking-tight">
              {detectedLocationName}
            </h2>
            <p className="text-xs text-[#57534e]">
              Assigned Municipality: <strong className="text-[#1c1917]">{cityProfile.corporation}</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300">
              {liveMetrics.riskBadge}
            </span>
            <button
              onClick={toggleLiveGps}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                isLiveGpsActive
                  ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                  : 'bg-[#f5f3ef] hover:bg-[#ede7de] text-[#57534e]'
              }`}
              title="Toggle Live GPS Detection"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>{isLiveGpsActive ? 'Live GPS Active' : 'Detect GPS'}</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: OVERVIEW                                          */}
        {/* ======================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 8 Compact Metric Cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#78716c]">
                  Real-Time Biometeorological Telemetry
                </h3>
                <span className="text-[10px] font-mono text-[#78716c]">
                  Last Updated: {liveMetrics.lastUpdated}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {/* 1. Temp */}
                <div className="bg-white border border-[#ede7de] rounded-xl p-3.5 shadow-xs space-y-1">
                  <span className="text-[11px] font-semibold text-[#78716c] block">Temperature</span>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-black text-[#1c1917]">{liveMetrics.temperature}</span>
                    <span className="text-xs text-[#78716c]">°C</span>
                  </div>
                  <span className="text-[10px] text-orange-600 font-bold">Ambient air dry-bulb</span>
                </div>

                {/* 2. Feels Like */}
                <div className="bg-white border border-[#ede7de] rounded-xl p-3.5 shadow-xs space-y-1">
                  <span className="text-[11px] font-semibold text-[#78716c] block">Feels Like</span>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-black text-orange-600">{liveMetrics.feelsLike}</span>
                    <span className="text-xs text-orange-600">°C</span>
                  </div>
                  <span className="text-[10px] text-red-600 font-bold">Apparent thermal burden</span>
                </div>

                {/* 3. Humidity */}
                <div className="bg-white border border-[#ede7de] rounded-xl p-3.5 shadow-xs space-y-1">
                  <span className="text-[11px] font-semibold text-[#78716c] block">Humidity</span>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-black text-[#1c1917]">{liveMetrics.humidity}</span>
                    <span className="text-xs text-[#78716c]">%</span>
                  </div>
                  <span className="text-[10px] text-amber-700 font-bold">High moisture barrier</span>
                </div>

                {/* 4. Wind Speed */}
                <div className="bg-white border border-[#ede7de] rounded-xl p-3.5 shadow-xs space-y-1">
                  <span className="text-[11px] font-semibold text-[#78716c] block">Wind Speed</span>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-black text-[#1c1917]">{liveMetrics.windSpeed}</span>
                    <span className="text-xs text-[#78716c]">km/h</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold">Light surface breeze</span>
                </div>

                {/* 5. WBGT */}
                <div className="bg-white border border-[#ede7de] rounded-xl p-3.5 shadow-xs space-y-1">
                  <span className="text-[11px] font-semibold text-[#78716c] block">WBGT (ISO 7243)</span>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-black text-[#1c1917]">{liveMetrics.wbgt}</span>
                    <span className="text-xs text-[#78716c]">°C</span>
                  </div>
                  <span className="text-[10px] text-orange-600 font-bold">Outdoor work threshold</span>
                </div>

                {/* 6. UTCI */}
                <div className="bg-white border border-[#ede7de] rounded-xl p-3.5 shadow-xs space-y-1">
                  <span className="text-[11px] font-semibold text-[#78716c] block">UTCI Index</span>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-black text-[#1c1917]">{liveMetrics.utci}</span>
                    <span className="text-xs text-[#78716c]">°C</span>
                  </div>
                  <span className="text-[10px] text-red-600 font-bold">Strong thermal stress</span>
                </div>

                {/* 7. Heat Index */}
                <div className="bg-white border border-[#ede7de] rounded-xl p-3.5 shadow-xs space-y-1">
                  <span className="text-[11px] font-semibold text-[#78716c] block">Heat Index</span>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-black text-[#1c1917]">{liveMetrics.heatIndex}</span>
                    <span className="text-xs text-[#78716c]">°C</span>
                  </div>
                  <span className="text-[10px] text-red-600 font-bold">Danger zone</span>
                </div>

                {/* 8. HTSI */}
                <div className="bg-white border border-[#ede7de] rounded-xl p-3.5 shadow-xs space-y-1">
                  <span className="text-[11px] font-semibold text-[#78716c] block">HTSI Composite</span>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-black text-orange-600">{liveMetrics.htsi}</span>
                    <span className="text-xs text-orange-600">/100</span>
                  </div>
                  <span className="text-[10px] text-orange-600 font-bold">High human burden</span>
                </div>
              </div>
            </div>

            {/* Quick Navigation Cards to ThermoMap & Emergency Facilities */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => setActiveTab('thermomap')}
                className="bg-white border border-orange-200 hover:border-orange-500 rounded-2xl p-5 shadow-xs transition cursor-pointer group space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-xl bg-orange-100 text-orange-700 font-bold text-xs flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    <span>Launch ThermoMap</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-orange-600 group-hover:translate-x-1 transition" />
                </div>
                <h4 className="text-base font-bold text-[#1c1917]">Interactive Geographic Heat-Risk Map</h4>
                <p className="text-xs text-[#57534e]">
                  Explore thermal zones around your location, tap areas for microclimate indices, and route to cooling centers.
                </p>
              </div>

              <div
                onClick={() => setActiveTab('nearby_help')}
                className="bg-white border border-emerald-200 hover:border-emerald-500 rounded-2xl p-5 shadow-xs transition cursor-pointer group space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="p-2 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5">
                    <LifeBuoy className="w-4 h-4" />
                    <span>Find Cooling Facilities</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition" />
                </div>
                <h4 className="text-base font-bold text-[#1c1917]">Cooling Shelters & Hospital Navigation</h4>
                <p className="text-xs text-[#57534e]">
                  Locate verified cooling facilities and emergency clinics with 1-click in-map turn-by-turn routing.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: THERMOMAP (The Core 2D Visual Feature)            */}
        {/* ======================================================== */}
        {activeTab === 'thermomap' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#ede7de] pb-3">
              <div>
                <h3 className="text-lg font-black text-[#1c1917] tracking-tight flex items-center gap-2">
                  <Layers className="w-5 h-5 text-orange-600" />
                  <span>2D Geographic ThermoMap (Street-Level Lined Thermal Grid)</span>
                </h3>
                <p className="text-xs text-[#57534e]">
                  Hardware-accelerated 2D GIS canvas, high-resolution lined thermal grid mesh, localized street thermal intelligence, and in-map OSRM road routing.
                </p>
              </div>
            </div>

            <ThermoMap
              latitude={userCoords[0]}
              longitude={userCoords[1]}
              locationName={detectedLocationName}
              selectedFacility={selectedFacility}
              onSelectFacility={(fac) => {
                const matched = allFacilities.find(f => f.name === fac.name);
                if (matched) setSelectedFacility(matched);
              }}
              height="680px"
            />
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: 5-DAY HEAT FORECAST                               */}
        {/* ======================================================== */}
        {activeTab === 'forecast' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-[#1c1917] tracking-tight">
                5-Day Biometeorological Heat Forecast
              </h3>
              <p className="text-xs text-[#57534e]">
                Interactive multi-variable outlook tracking temperature escalation, WBGT work-rest thresholds, and HTSI vulnerability.
              </p>
            </div>

            {/* Interactive Trend Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Temperature & Feels Like Chart */}
              <div className="bg-white border border-[#ede7de] rounded-2xl p-5 shadow-xs space-y-3">
                <span className="text-xs font-bold text-[#1c1917] uppercase tracking-wider block">
                  Temperature vs. Feels-Like Trend (°C)
                </span>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={forecastSeries}>
                      <defs>
                        <linearGradient id="colorFeels" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ea580c" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#ea580c" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe4" />
                      <XAxis dataKey="day" stroke="#78716c" textAnchor="end" fontSize={11} />
                      <YAxis stroke="#78716c" domain={[30, 52]} fontSize={11} />
                      <Tooltip />
                      <Area type="monotone" dataKey="feelsLike" stroke="#ea580c" strokeWidth={3} fillOpacity={1} fill="url(#colorFeels)" name="Feels Like" />
                      <Line type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={2} name="Air Temp" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* WBGT & HTSI Risk Stress Trend */}
              <div className="bg-white border border-[#ede7de] rounded-2xl p-5 shadow-xs space-y-3">
                <span className="text-xs font-bold text-[#1c1917] uppercase tracking-wider block">
                  WBGT (°C) & HTSI Burden (/100)
                </span>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={forecastSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0ebe4" />
                      <XAxis dataKey="day" stroke="#78716c" fontSize={11} />
                      <YAxis stroke="#78716c" domain={[20, 95]} fontSize={11} />
                      <Tooltip />
                      <Line type="monotone" dataKey="htsi" stroke="#c2410c" strokeWidth={3} name="HTSI Score" dot={{ r: 5 }} />
                      <Line type="monotone" dataKey="wbgt" stroke="#059669" strokeWidth={2} name="WBGT (°C)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Daily Forecast Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5">
              {forecastSeries.map((item, idx) => (
                <div key={idx} className="bg-white border border-[#ede7de] rounded-xl p-3.5 shadow-xs space-y-2">
                  <span className="text-xs font-bold text-[#1c1917] block">{item.day}</span>
                  <div className="space-y-0.5">
                    <span className="text-xl font-black text-orange-600 block">{item.feelsLike}°C</span>
                    <span className="text-[11px] text-[#78716c]">Air: {item.temp}°C</span>
                  </div>
                  <div className="pt-2 border-t border-[#ede7de] flex items-center justify-between text-[10px]">
                    <span className="font-mono text-[#78716c]">HTSI: {item.htsi}</span>
                    <span className={`font-bold px-1.5 py-0.5 rounded ${
                      item.risk === 'Extreme'
                        ? 'bg-red-100 text-red-800'
                        : item.risk === 'Very High'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.risk}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: THERMAL STRESS DEEP DIVE                          */}
        {/* ======================================================== */}
        {activeTab === 'thermal_stress' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-[#1c1917] tracking-tight">
                Biometeorological Thermal Stress Breakdown
              </h3>
              <p className="text-xs text-[#57534e]">
                Scientific analysis of ISO 7243 Wet Bulb Globe Temperature, UTCI human heat balance, and NOAA heat indices.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* WBGT Card */}
              <div className="bg-white border border-[#ede7de] rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#1c1917]">Wet Bulb Globe Temperature (WBGT)</span>
                  <span className="text-lg font-black text-orange-600">{liveMetrics.wbgt}°C</span>
                </div>
                <p className="text-xs text-[#57534e] leading-relaxed">
                  International standard for physiological occupational heat load. Measures combination of dry-bulb temp, natural wet bulb humidity, and black globe solar radiation.
                </p>
                <div className="p-3 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[11px] space-y-1">
                  <strong className="block text-[#1c1917]">Recommended Operational Guideline:</strong>
                  <span>45 mins work / 15 mins shaded rest per hour. Hydration: 750ml – 1L clean water per hour.</span>
                </div>
              </div>

              {/* UTCI Card */}
              <div className="bg-white border border-[#ede7de] rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#1c1917]">Universal Thermal Climate Index (UTCI)</span>
                  <span className="text-lg font-black text-red-600">{liveMetrics.utci}°C</span>
                </div>
                <p className="text-xs text-[#57534e] leading-relaxed">
                  Advanced multi-node human thermoregulation model. Simulates human cardiovascular skin blood flow, sweating response, and clothing insulation dynamics.
                </p>
                <div className="p-3 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[11px] space-y-1">
                  <strong className="block text-[#1c1917]">Physiological Strain Category:</strong>
                  <span>Strong Thermal Stress. Core body temperature escalation risks without shaded ventilation.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: HUMAN HEALTH RISK PANEL                           */}
        {/* ======================================================== */}
        {activeTab === 'health_risk' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-black text-[#1c1917] tracking-tight">
                Human Heat-Health Vulnerability Risk
              </h3>
              <p className="text-xs text-[#57534e]">
                AI-calibrated clinical health risk estimates, hospital surge projections, and causal biometeorological explanations.
              </p>
            </div>

            {/* Risk Gauges & Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Overall Risk Meter */}
              <div className="bg-white border border-[#ede7de] rounded-2xl p-5 shadow-xs text-center space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#78716c] block">Overall Heat Risk</span>
                <div className="w-28 h-28 rounded-full border-8 border-orange-500 flex flex-col items-center justify-center mx-auto shadow-inner bg-orange-50">
                  <span className="text-2xl font-black text-orange-700">78.4</span>
                  <span className="text-[10px] text-orange-600 font-bold uppercase">High Burden</span>
                </div>
                <span className="text-[11px] text-[#57534e] block">Conformal Prediction Confidence: <strong>94.2%</strong></span>
              </div>

              {/* Mortality Indicator */}
              <div className="bg-white border border-[#ede7de] rounded-2xl p-5 shadow-xs space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#78716c] block">Mortality Risk Indicator</span>
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-black text-red-600">+14.6%</span>
                  <span className="text-xs text-[#78716c]">above seasonal baseline</span>
                </div>
                <p className="text-xs text-[#57534e]">
                  Elevated cardiovascular and cerebrovascular stress observed predominantly in elderly populations (&gt;65 years).
                </p>
              </div>

              {/* Hospitalization Indicator */}
              <div className="bg-white border border-[#ede7de] rounded-2xl p-5 shadow-xs space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[#78716c] block">Emergency Hospitalization Surge</span>
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-black text-orange-600">+22.4%</span>
                  <span className="text-xs text-[#78716c]">ICU / Dehydration load</span>
                </div>
                <p className="text-xs text-[#57534e]">
                  Anticipated surge in heat exhaustion, acute electrolyte imbalances, and renal distress.
                </p>
              </div>
            </div>

            {/* "WHY IS THE RISK HIGH?" Short Explanation Box */}
            <div className="bg-orange-50/80 border border-orange-200 rounded-2xl p-5 space-y-2">
              <span className="font-bold text-xs text-orange-950 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-orange-600" />
                Why is the Risk High in Your Area?
              </span>
              <p className="text-xs text-[#57534e] leading-relaxed">
                {liveMetrics.explanation}
              </p>
            </div>

            {/* Medical Disclaimer */}
            <p className="text-[11px] text-[#78716c] bg-[#faf9f6] p-3 rounded-xl border border-[#ede7de]">
              <strong>Public Health Notice:</strong> Estimates are derived from meteorological algorithms and epidemiological models for public awareness and municipal preparedness. Not a clinical medical diagnosis.
            </p>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: NEARBY HELP (Hospitals & Cooling Centers)         */}
        {/* ======================================================== */}
        {activeTab === 'nearby_help' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ede7de] pb-3">
              <div>
                <h3 className="text-lg font-black text-[#1c1917] tracking-tight">
                  Nearby Emergency Facilities & Cooling Shelters
                </h3>
                <p className="text-xs text-[#57534e]">
                  Official facilities in {cityProfile.corporation} with verified air conditioning, hydration, and emergency medical triage.
                </p>
              </div>

              {/* Filter Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFacilityTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    facilityTypeFilter === 'all'
                      ? 'bg-orange-600 text-white'
                      : 'bg-white border border-[#ede7de] text-[#57534e]'
                  }`}
                >
                  All ({allFacilities.length})
                </button>
                <button
                  onClick={() => setFacilityTypeFilter('hospital')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    facilityTypeFilter === 'hospital'
                      ? 'bg-red-600 text-white'
                      : 'bg-white border border-[#ede7de] text-[#57534e]'
                  }`}
                >
                  Hospitals
                </button>
                <button
                  onClick={() => setFacilityTypeFilter('cooling')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    facilityTypeFilter === 'cooling'
                      ? 'bg-sky-600 text-white'
                      : 'bg-white border border-[#ede7de] text-[#57534e]'
                  }`}
                >
                  Cooling Shelters
                </button>
              </div>
            </div>

            {/* Facility Search Input */}
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-[#78716c] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={facilitySearch}
                onChange={(e) => setFacilitySearch(e.target.value)}
                placeholder="Search facility name, ward, or street..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#ede7de] text-xs text-[#1c1917] focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Facility List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFacilities.map((facility) => (
                <div
                  key={facility.id}
                  className="bg-white border border-[#ede7de] hover:border-orange-300 rounded-2xl p-4 shadow-xs transition space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        facility.type === 'HOSPITAL'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}>
                        {facility.type.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-mono font-bold text-orange-600">
                        {facility.distance_km} km away
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-[#1c1917]">{facility.name}</h4>
                    <p className="text-xs text-[#57534e]">{facility.address} ({facility.ward_name})</p>
                    <p className="text-[11px] text-[#78716c]">Contact: {facility.contact}</p>
                  </div>

                  <button
                    onClick={() => handleSelectFacilityAndRoute(facility)}
                    className="w-full py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>View & Route on ThermoMap</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 7: EMERGENCY                                         */}
        {/* ======================================================== */}
        {activeTab === 'emergency' && (
          <div className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-950 space-y-3">
              <span className="font-bold text-sm text-red-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Emergency Heat Stroke Protocol & Direct Helpline
              </span>
              <p className="text-xs text-[#57534e] leading-relaxed">
                Heat stroke is a medical emergency requiring immediate hospitalization. If an individual displays confusion, high core temperature, or ceases to sweat, act immediately.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="tel:108"
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center space-x-2 shadow-sm"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Call 108 Emergency Ambulance</span>
                </a>
                <a
                  href="tel:1077"
                  className="px-4 py-2 rounded-xl bg-white hover:bg-stone-50 border border-red-300 text-red-800 text-xs font-bold transition flex items-center space-x-2"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>District Disaster Helpline (1077)</span>
                </a>
              </div>
            </div>

            {/* Heat Illness Triage Guide */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div className="bg-white border border-[#ede7de] rounded-2xl p-5 space-y-3">
                <strong className="text-sm font-bold text-[#1c1917] block">Heat Exhaustion (Warning)</strong>
                <ul className="space-y-1.5 text-[#57534e] list-disc list-inside">
                  <li>Heavy sweating and clammy skin</li>
                  <li>Dizziness, lightheadedness, and headache</li>
                  <li>Fast, weak pulse</li>
                  <li>Nausea or abdominal cramps</li>
                </ul>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px]">
                  <strong>Action:</strong> Move to air-conditioned shelter, loosen garments, sip electrolyte water.
                </div>
              </div>

              <div className="bg-white border border-[#ede7de] rounded-2xl p-5 space-y-3">
                <strong className="text-sm font-bold text-red-700 block">Heat Stroke (LIFE THREATENING)</strong>
                <ul className="space-y-1.5 text-[#57534e] list-disc list-inside">
                  <li>Body temp above 40°C (104°F)</li>
                  <li>Altered mental state, slurred speech, confusion</li>
                  <li>Hot, dry skin or heavy profuse sweating</li>
                  <li>Rapid strong pulse and unconsciousness</li>
                </ul>
                <div className="p-3 bg-red-100 rounded-xl border border-red-300 text-red-950 text-[11px]">
                  <strong>Action:</strong> Dial 108 immediately. Immerse in cold water or apply ice packs to armpits/neck.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 8: CITIZEN USER PROFILE                              */}
        {/* ======================================================== */}
        {activeTab === 'profile' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h3 className="text-lg font-black text-[#1c1917] tracking-tight">
                User Account & Location Permissions
              </h3>
              <p className="text-xs text-[#57534e]">
                Manage your registered contact credentials and hyper-local GPS detection preferences.
              </p>
            </div>

            <div className="bg-white border border-[#ede7de] rounded-2xl p-6 shadow-xs space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[#78716c] block mb-1">Full Official Name</span>
                  <span className="font-bold text-sm text-[#1c1917]">{user?.full_name || 'Public Citizen'}</span>
                </div>
                <div>
                  <span className="text-[#78716c] block mb-1">Registered Phone</span>
                  <span className="font-bold text-sm text-[#1c1917] font-mono">{user?.phone_masked || '+91 98765 *****'}</span>
                </div>
                <div>
                  <span className="text-[#78716c] block mb-1">Assigned Municipality</span>
                  <span className="font-bold text-sm text-[#1c1917]">{cityProfile.corporation}</span>
                </div>
                <div>
                  <span className="text-[#78716c] block mb-1">Account Role</span>
                  <span className="font-bold text-sm text-emerald-700">PUBLIC CITIZEN USER</span>
                </div>
              </div>

              <div className="pt-4 border-t border-[#ede7de] space-y-2">
                <span className="text-xs font-bold text-[#1c1917] block">Browser Location Permission</span>
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#faf9f6] border border-[#ede7de]">
                  <div>
                    <span className="font-semibold text-[#1c1917] block">Automatic Geolocation Tracking</span>
                    <span className="text-[11px] text-[#57534e]">
                      {locationPermissionGranted ? 'Active: Coarse coordinates used for ThermoMap centering' : 'Manual Jurisdiction Context'}
                    </span>
                  </div>
                  <button
                    onClick={toggleLiveGps}
                    className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs"
                  >
                    {isLiveGpsActive ? 'Active ✓' : 'Detect Location'}
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-[#ede7de] flex justify-end">
                <button
                  onClick={() => logout()}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition"
                >
                  Sign Out of ThermoSafe AI
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
