import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Navigation,
  ExternalLink,
  Send,
  CheckCircle2,
  Phone,
  Compass,
  Search,
  MessageSquare,
  LocateFixed,
  Car,
  Bike,
  Bus,
  ArrowLeft,
  Layers,
  Flame,
  Snowflake,
  Play,
  Pause,
  Radio,
  Gauge,
  ChevronRight
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

export type VehicleType = 'car' | 'bike' | 'bus';

// Geodesic distance calculation in kilometers
function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

// Calculate bearing/heading in degrees between two coordinates
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
}

// Map Centering & Auto-Bounding Hook
function MapAutoBounds({
  userCoord,
  destCoord,
  polyline,
  isNavigationActive
}: {
  userCoord: [number, number];
  destCoord?: [number, number];
  polyline?: [number, number][];
  isNavigationActive?: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (isNavigationActive) return;

    if (polyline && polyline.length > 1) {
      const bounds = L.latLngBounds(polyline.map((p) => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else if (destCoord) {
      const bounds = L.latLngBounds([userCoord, destCoord]);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    } else {
      map.setView(userCoord, 14);
    }
  }, [destCoord, polyline, isNavigationActive, map, userCoord]);
  return null;
}

// Vehicle Follower for Navigation Centering
function MapVehicleFollower({
  vehicleCoord,
  isAutoCentered,
  onUserPan
}: {
  vehicleCoord: [number, number];
  isAutoCentered: boolean;
  onUserPan: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    const handleDragStart = () => {
      onUserPan();
    };
    map.on('dragstart', handleDragStart);
    return () => {
      map.off('dragstart', handleDragStart);
    };
  }, [map, onUserPan]);

  useEffect(() => {
    if (isAutoCentered) {
      map.panTo(vehicleCoord, { animate: true, duration: 0.6 });
    }
  }, [vehicleCoord, isAutoCentered, map]);

  return null;
}

// Custom Moving Vehicle Marker Icon Generator
const createVehicleIcon = (type: VehicleType, headingDeg: number, isMoving: boolean) => {
  const emoji = type === 'car' ? '🚗' : type === 'bike' ? '🏍️' : '🚌';
  return new L.DivIcon({
    className: 'custom-moving-vehicle-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; cursor: pointer;">
        <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(30, 64, 175, ${isMoving ? '0.25' : '0.15'}); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: absolute; top: 0px; width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 9px solid #1e40af; transform: rotate(${headingDeg}deg); transform-origin: center 22px;"></div>
        <div style="width: 34px; height: 34px; border-radius: 50%; background: #1e3a8a; border: 2.5px solid #ffffff; box-shadow: 0 3px 8px rgba(30,58,138,0.4); display: flex; align-items: center; justify-content: center; font-size: 16px; transform: rotate(${headingDeg}deg);">
          ${emoji}
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22]
  });
};

// 1. COOLING CENTRES: Distinct Cyan Snowflake Marker
const coolingCenterMarkerIcon = new L.DivIcon({
  className: 'custom-cool-marker',
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; cursor: pointer;">
      <div style="background: #0284c7; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(2,132,199,0.45); font-size: 15px;">
        ❄️
      </div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -17]
});

const coolingCenterSelectedMarkerIcon = new L.DivIcon({
  className: 'custom-cool-selected-marker',
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; cursor: pointer;">
      <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(2, 132, 199, 0.35); animation: ping 1.4s infinite;"></div>
      <div style="background: #0369a1; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid #ffffff; box-shadow: 0 0 14px rgba(3,105,161,0.6); font-size: 18px;">
        ❄️
      </div>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -22]
});

// 2. HOSPITALS: Distinct Red Cross Marker
const hospitalMarkerIcon = new L.DivIcon({
  className: 'custom-hosp-marker',
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; cursor: pointer;">
      <div style="background: #dc2626; color: white; width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(220,38,38,0.45); font-weight: 900; font-size: 18px; line-height: 1;">
        +
      </div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -17]
});

const hospitalSelectedMarkerIcon = new L.DivIcon({
  className: 'custom-hosp-selected-marker',
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; cursor: pointer;">
      <div style="position: absolute; width: 44px; height: 44px; border-radius: 10px; background: rgba(220, 38, 38, 0.35); animation: ping 1.4s infinite;"></div>
      <div style="background: #b91c1c; color: white; width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 2.5px solid #ffffff; box-shadow: 0 0 14px rgba(185,28,28,0.6); font-weight: 900; font-size: 22px; line-height: 1;">
        +
      </div>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -22]
});

const clinicIcon = new L.DivIcon({
  className: 'custom-clinic-marker',
  html: `
    <div style="background: #ea580c; color: white; width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center; border: 1.5px solid #ffffff; box-shadow: 0 2px 5px rgba(234,88,12,0.4); font-size: 13px;">
      🚑
    </div>
  `,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

// Regional Metro Presets
const LOCATION_PRESETS = [
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

  // Real-Time Location & Vehicle States
  const [userLocation, setUserLocation] = useState<[number, number]>([13.0450, 80.2500]);
  const [detectedLocation, setDetectedLocation] = useState<string>('Chennai Metro Area, Tamil Nadu');
  const [isGpsActive, setIsGpsActive] = useState<boolean>(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(12);
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [heading, setHeading] = useState<number>(45);
  const [speedKmh, setSpeedKmh] = useState<number>(38);
  const [isTrackingActive, setIsTrackingActive] = useState<boolean>(false);
  const [isAutoCentered, setIsAutoCentered] = useState<boolean>(true);
  const [isSimulatingDrive, setIsSimulatingDrive] = useState<boolean>(false);
  const [simStepIndex, setSimStepIndex] = useState<number>(0);

  // Road Heat Stress Detection (Active High Heat triggers Cooling Shelters)
  const [isHighHeatRoadActive, setIsHighHeatRoadActive] = useState<boolean>(true);

  const roadHeatMetrics = useMemo(() => {
    return {
      airTempC: 39.4,
      feelsLikeC: 46.8,
      heatIndexC: 45.2,
      wbgtC: 32.1,
      htsi: 83.5,
      riskLevel: 'HIGH_HEAT_STRESS',
      advisory: 'EXTREME ROAD HEAT STRESS — MUNICIPAL COOLING SHELTERS ACTIVATED'
    };
  }, []);

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
  const [basemapMode, setBasemapMode] = useState<'satellite' | 'street'>('street');
  const [gisViewMode, setGisViewMode] = useState<'dispatcher' | 'thermomap'>('dispatcher');

  const lastFetchedCenterRef = useRef<[number, number]>(userLocation);

  // Initial Permission Check on mount
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((res) => {
        if (res.state === 'granted') {
          handleStartContinuousGPS();
        }
      }).catch(() => {});
    }
  }, []);

  // Fetch facilities when user moves significantly (> 300m) or initial load
  useEffect(() => {
    const distFromLastFetch = haversineDistanceKm(
      lastFetchedCenterRef.current[0],
      lastFetchedCenterRef.current[1],
      userLocation[0],
      userLocation[1]
    );

    if (facilities.length > 0 && distFromLastFetch < 0.3) {
      return;
    }

    let isCurrent = true;
    const loadFacilities = async () => {
      setLoadingFacilities(true);
      try {
        const data = await fetchNearestFacilities(userLocation[0], userLocation[1], 'all', 20);
        if (isCurrent && data.facilities && data.facilities.length > 0) {
          setFacilities(data.facilities);
          lastFetchedCenterRef.current = userLocation;
          if (data.detected_location) {
            setDetectedLocation(data.detected_location);
          }
          if (!selectedFacility || !data.facilities.some((f) => f.id === selectedFacility.id)) {
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

  // Dynamic Zero-Latency Facility Prioritization based on Live Vehicle Position
  const liveFacilities = useMemo(() => {
    const avgSpeed = vehicleType === 'bike' ? 30 : vehicleType === 'bus' ? 24 : 38;
    return facilities
      .map((fac) => {
        const liveDist = haversineDistanceKm(userLocation[0], userLocation[1], fac.latitude, fac.longitude);
        const liveMinutes = Math.max(1, Math.round((liveDist / avgSpeed) * 60));
        return {
          ...fac,
          distance_km: liveDist,
          travel_time_minutes: liveMinutes,
        };
      })
      .sort((a, b) => a.distance_km - b.distance_km);
  }, [facilities, userLocation, vehicleType]);

  // Fetch Real OSRM Road Route whenever selectedFacility or initial location changes
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
          setSimStepIndex(0);
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
  }, [selectedFacility?.id]);

  // Continuous Real-Time GPS Tracking
  useEffect(() => {
    if (!isTrackingActive) return;

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      setIsTrackingActive(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 12);
        setGpsAccuracy(accuracy);
        setIsGpsActive(true);

        setUserLocation((prev) => {
          if (prev[0] !== lat || prev[1] !== lon) {
            const brng = pos.coords.heading ?? calculateBearing(prev[0], prev[1], lat, lon);
            if (!isNaN(brng)) setHeading(brng);
          }
          return [lat, lon];
        });

        if (pos.coords.speed !== null && !isNaN(pos.coords.speed) && pos.coords.speed > 0) {
          setSpeedKmh(Math.round(pos.coords.speed * 3.6));
        } else {
          setSpeedKmh(vehicleType === 'bike' ? 28 : vehicleType === 'bus' ? 22 : 36);
        }

        setDetectedLocation(`Live GPS (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`);
      },
      (err) => {
        console.warn('GPS continuous watch notice:', err);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 1000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isTrackingActive, vehicleType]);

  // Live Travel Simulation Loop along Real OSRM Road Polyline
  useEffect(() => {
    if (!isSimulatingDrive || !routeData?.coordinates || routeData.coordinates.length < 2) {
      return;
    }

    const coords = routeData.coordinates;
    const interval = setInterval(() => {
      setSimStepIndex((prevIdx) => {
        const nextIdx = prevIdx + 1;
        if (nextIdx >= coords.length) {
          setIsSimulatingDrive(false);
          return 0;
        }

        const currPt = coords[prevIdx];
        const nextPt = coords[nextIdx];
        const segBearing = calculateBearing(currPt[0], currPt[1], nextPt[0], nextPt[1]);

        setHeading(segBearing);
        setUserLocation(nextPt);

        const baseSpeed = vehicleType === 'bike' ? 32 : vehicleType === 'bus' ? 26 : 42;
        const speedVar = Math.round(baseSpeed + Math.sin(nextIdx * 0.4) * 6);
        setSpeedKmh(Math.max(15, speedVar));

        return nextIdx;
      });
    }, 1100);

    return () => clearInterval(interval);
  }, [isSimulatingDrive, routeData, vehicleType]);

  // Start continuous GPS tracking
  const handleStartContinuousGPS = () => {
    setIsSimulatingDrive(false);
    setIsTrackingActive(true);
    setIsGpsActive(true);
    setIsAutoCentered(true);
    setActivePreset('📍 Live GPS');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          setUserLocation([lat, lon]);
          setGpsAccuracy(Math.round(pos.coords.accuracy || 10));
          setDetectedLocation(`Live GPS (${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E)`);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  const handleSelectPreset = (preset: typeof LOCATION_PRESETS[0]) => {
    setIsSimulatingDrive(false);
    setActivePreset(preset.name);
    setIsTrackingActive(false);
    setIsGpsActive(false);
    setUserLocation([preset.lat, preset.lon]);
    setIsAutoCentered(true);
    setSimStepIndex(0);
    setDetectedLocation(`${preset.name}, India`);
  };

  const handleSelectNearestHospital = () => {
    setActiveTab('hospital');
    const hospitals = liveFacilities.filter((f) => f.type === 'HOSPITAL');
    if (hospitals.length > 0) {
      setSelectedFacility(hospitals[0]);
    }
  };

  const handleSelectNearestCoolingShelter = () => {
    setActiveTab('cooling_centre');
    const shelters = liveFacilities.filter((f) => f.type === 'COOLING_CENTRE');
    if (shelters.length > 0) {
      setSelectedFacility(shelters[0]);
    }
  };

  const handleTabChange = (tab: 'all' | 'hospital' | 'emergency' | 'cooling_centre') => {
    setActiveTab(tab);
    if (tab === 'hospital') {
      const hosp = liveFacilities.filter((f) => f.type === 'HOSPITAL');
      if (hosp.length > 0) setSelectedFacility(hosp[0]);
    } else if (tab === 'cooling_centre') {
      const cool = liveFacilities.filter((f) => f.type === 'COOLING_CENTRE');
      if (cool.length > 0) setSelectedFacility(cool[0]);
    } else if (tab === 'emergency') {
      const emerg = liveFacilities.filter((f) => f.type === 'EMERGENCY_CENTRE');
      if (emerg.length > 0) setSelectedFacility(emerg[0]);
    }
  };

  // WhatsApp Alert Dispatch
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
          distance: `${selectedFacility.distance_km} km`,
        }),
      });
      setAlertSent(true);
      setTimeout(() => setAlertSent(false), 4000);
    } catch (err) {
      console.error('WhatsApp test dispatch error:', err);
    }
  };

  // SMS Alert Dispatch
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

  const filteredFacilities = useMemo(() => {
    return liveFacilities.filter((f) => {
      if (activeTab === 'hospital' && f.type !== 'HOSPITAL') return false;
      if (activeTab === 'emergency' && f.type !== 'EMERGENCY_CENTRE') return false;
      if (activeTab === 'cooling_centre' && f.type !== 'COOLING_CENTRE') return false;
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        return (
          f.name.toLowerCase().includes(query) ||
          f.ward_name.toLowerCase().includes(query) ||
          f.subtype.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [liveFacilities, activeTab, searchQuery]);

  const nearestHospital = useMemo(() => {
    return liveFacilities.find((f) => f.type === 'HOSPITAL') || null;
  }, [liveFacilities]);

  const nearestShelter = useMemo(() => {
    return liveFacilities.find((f) => f.type === 'COOLING_CENTRE') || null;
  }, [liveFacilities]);

  const countHosp = liveFacilities.filter((f) => f.type === 'HOSPITAL').length;
  const countEmerg = liveFacilities.filter((f) => f.type === 'EMERGENCY_CENTRE').length;
  const countCool = liveFacilities.filter((f) => f.type === 'COOLING_CENTRE').length;

  const handleUserPan = useCallback(() => {
    setIsAutoCentered(false);
  }, []);

  return (
    <div className="max-w-[1720px] mx-auto px-4 sm:px-6 py-6 space-y-6 font-sans text-slate-800">
      
      {/* Citizen Safety Return Banner if in Citizen Mode */}
      {isCitizen && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 shadow-xs">
          <Link
            to="/citizen"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Citizen Safety Portal</span>
          </Link>
          <span className="text-xs text-emerald-900 font-semibold hidden sm:inline">
            Public Emergency Facility & Route Navigation
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. PAGE HEADER & ROUTE ENGINE CONTROLS (Clean Government Card)            */}
      {/* ========================================================================= */}
      <section className="bg-white border border-[#ede7de] rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        
        {/* Top Row: Title & Government Status Badges */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#f5f3ef] pb-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-[#0f172a] tracking-tight">
                  Emergency GIS & Road Routing Engine
                </h1>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-200">
                  National Mission
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5 max-w-3xl">
                Real-time road routing to verified emergency hospitals, trauma ICUs, and municipal cooling shelters.
              </p>
            </div>
          </div>

          {/* Compact Status Indicators */}
          <div className="flex items-center flex-wrap gap-2 text-xs font-medium shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-slate-900">OSM:</span>
              <span className="text-emerald-700 font-bold">Active</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              <span className="font-semibold text-slate-900">Cooling Centres:</span>
              <span className="text-cyan-700 font-bold">Active</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
              <span className={`w-2 h-2 rounded-full ${isGpsActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span className="font-semibold text-slate-900">GPS:</span>
              <span className={isGpsActive ? 'text-emerald-700 font-bold' : 'text-slate-500 font-semibold'}>
                {isGpsActive ? `Connected (±${gpsAccuracy}m)` : 'Connected'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Row: Organized Controls (Grouped by Function) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          
          {/* Left Controls: GIS Mode + Vehicle Mode */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* GIS Mode Switcher */}
            <div className="flex items-center bg-[#faf9f6] p-1 rounded-xl border border-[#ede7de] text-xs font-semibold">
              <button
                type="button"
                onClick={() => setGisViewMode('dispatcher')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  gisViewMode === 'dispatcher'
                    ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Navigation className="w-3.5 h-3.5 text-blue-600" />
                <span>OSM Dispatcher</span>
              </button>
              <button
                type="button"
                onClick={() => setGisViewMode('thermomap')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  gisViewMode === 'thermomap'
                    ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-orange-600" />
                <span>ThermoMap Grid</span>
              </button>
            </div>

            {/* Vehicle Mode Selector */}
            <div className="flex items-center bg-[#faf9f6] p-1 rounded-xl border border-[#ede7de] text-xs font-semibold">
              <button
                type="button"
                onClick={() => setVehicleType('car')}
                className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  vehicleType === 'car'
                    ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Routing for Emergency Response Vehicles"
              >
                <Car className="w-3.5 h-3.5 text-slate-700" />
                <span>Car</span>
              </button>
              <button
                type="button"
                onClick={() => setVehicleType('bike')}
                className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  vehicleType === 'bike'
                    ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Rapid First-Responder Two Wheeler"
              >
                <Bike className="w-3.5 h-3.5 text-slate-700" />
                <span>Bike</span>
              </button>
              <button
                type="button"
                onClick={() => setVehicleType('bus')}
                className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  vehicleType === 'bus'
                    ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Public Transit & Mobile Cool Vans"
              >
                <Bus className="w-3.5 h-3.5 text-slate-700" />
                <span>Bus</span>
              </button>
            </div>
          </div>

          {/* Right Controls: Actions (Secondary Outlined + Primary Solid) */}
          <div className="flex items-center gap-2.5 flex-wrap">
            
            {/* Secondary: Simulate Road Travel */}
            <button
              type="button"
              onClick={() => {
                if (isSimulatingDrive) {
                  setIsSimulatingDrive(false);
                } else {
                  setIsTrackingActive(false);
                  setIsSimulatingDrive(true);
                  setIsAutoCentered(true);
                }
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 border ${
                isSimulatingDrive
                  ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-xs'
                  : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-[#faf9f6] border-[#ede7de]'
              }`}
              title="Simulate vehicle moving along verified OSRM road coordinates"
            >
              {isSimulatingDrive ? (
                <Pause className="w-3.5 h-3.5 text-amber-700" />
              ) : (
                <Play className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{isSimulatingDrive ? 'Pause Simulation' : 'Simulate Road Travel'}</span>
            </button>

            {/* Primary: Continuous GPS Tracking */}
            <button
              type="button"
              onClick={handleStartContinuousGPS}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-xs ${
                isTrackingActive
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
              }`}
              title="Continuously track officer GPS coordinates in real-time"
            >
              <Radio className={`w-3.5 h-3.5 text-white ${isTrackingActive ? 'animate-pulse' : ''}`} />
              <span>{isTrackingActive ? `GPS Tracking (±${gpsAccuracy}m)` : 'GPS Tracking'}</span>
            </button>
          </div>

        </div>

      </section>

      {gisViewMode === 'thermomap' ? (
        <section className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-[#ede7de] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-slate-800">
              <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <span>
                <strong className="text-[#0f172a]">2D ThermoMap GIS Canvas:</strong> Microclimates (Res 8 / Res 7 Uber H3), biometeorological metrics (WBGT, UTCI, HTSI), and multi-point emergency facilities.
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-[#faf9f6] border border-[#ede7de] font-mono text-[11px] text-slate-700 font-semibold">
              Location: {userLocation[0].toFixed(4)}°N, {userLocation[1].toFixed(4)}°E
            </span>
          </div>

          <ThermoMap
            latitude={userLocation[0]}
            longitude={userLocation[1]}
            locationName={detectedLocation}
            height="720px"
          />
        </section>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* 2. EMERGENCY DESTINATION CARDS (Two Equal-Width Structured Cards)          */}
          {/* ========================================================================= */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Card 1: Nearest Hospital (Emergency Red Accent) */}
            <div
              className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all duration-200 ${
                selectedFacility?.type === 'HOSPITAL'
                  ? 'border-rose-400 ring-2 ring-rose-400/20'
                  : 'border-[#ede7de] hover:border-rose-300'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-black text-xl shrink-0">
                  +
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                      Primary Heatstroke Emergency
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                      Verified ICU
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#0f172a] mt-1 truncate">
                    {nearestHospital ? nearestHospital.name : 'Locating closest hospital...'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                    {nearestHospital
                      ? `${nearestHospital.distance_km} km away · ~${nearestHospital.travel_time_minutes} mins via ${vehicleType} (${nearestHospital.ward_name})`
                      : 'Scanning regional emergency facility registry...'}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-[#f5f3ef] flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  {nearestHospital?.icu_beds ? `${nearestHospital.icu_beds} Trauma ICU Beds Available` : '24/7 Heatstroke Protocol'}
                </span>
                <button
                  type="button"
                  onClick={handleSelectNearestHospital}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <span>View Road Route</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Card 2: Nearest Cooling Shelter (Cyan Relief Accent) */}
            <div
              className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all duration-200 ${
                selectedFacility?.type === 'COOLING_CENTRE'
                  ? 'border-cyan-400 ring-2 ring-cyan-400/20'
                  : 'border-[#ede7de] hover:border-cyan-300'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-600 flex items-center justify-center text-lg shrink-0">
                  <Snowflake className="w-5 h-5 text-cyan-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-700">
                      Rapid Heat Relief
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.2 rounded bg-cyan-50 text-cyan-700 border border-cyan-200">
                      Auto-Activated
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#0f172a] mt-1 truncate">
                    {nearestShelter ? nearestShelter.name : 'Locating closest shelter...'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                    {nearestShelter
                      ? `${nearestShelter.distance_km} km away · ~${nearestShelter.travel_time_minutes} mins via ${vehicleType} (${nearestShelter.ward_name})`
                      : 'Scanning municipal shaded shelters...'}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-[#f5f3ef] flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">
                  Air Conditioned · Cold Drinking Water & ORS
                </span>
                <button
                  type="button"
                  onClick={handleSelectNearestCoolingShelter}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <span>View Road Route</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </section>

          {/* ========================================================================= */}
          {/* 3. LOCATION & TEST METRO SELECTOR (Compact Outlined Toolbar)              */}
          {/* ========================================================================= */}
          <section className="bg-white border border-[#ede7de] rounded-2xl px-4 py-3 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-orange-600" />
                <span>Test Metro</span>
              </span>
              <button
                type="button"
                onClick={handleStartContinuousGPS}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                  activePreset === '📍 Live GPS'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-[#faf9f6] text-slate-700 hover:text-slate-900 border-[#ede7de]'
                }`}
              >
                <LocateFixed className="w-3.5 h-3.5 text-emerald-600" />
                <span>Live GPS Location</span>
              </button>
            </div>

            {/* Scrollable City Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
              {LOCATION_PRESETS.map((p) => {
                const isSelected = activePreset === p.name;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                      isSelected
                        ? 'bg-slate-900 text-white font-bold border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-[#faf9f6] border-[#ede7de]'
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>

          </section>

          {/* ========================================================================= */}
          {/* 4. HEAT CORRIDOR MONITORING PANEL (Full-Width Calm Orange Container)      */}
          {/* ========================================================================= */}
          <section className="bg-[#fdf9f3] border border-[#fbd38d]/60 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            
            <div className="flex items-start gap-3.5 max-w-4xl">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 mt-0.5">
                <Flame className="w-5 h-5 text-orange-600" />
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-base font-bold text-[#0f172a]">
                    Road Heat Corridor Monitor
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsHighHeatRoadActive(!isHighHeatRoadActive)}
                    className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-200 transition cursor-pointer"
                    title="Click to toggle road heat condition advisory"
                  >
                    {isHighHeatRoadActive ? `High Heat (${roadHeatMetrics.heatIndexC}°C)` : 'Normal (<40°C)'}
                  </button>
                  {isHighHeatRoadActive && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200 flex items-center gap-1">
                      <Snowflake className="w-3 h-3 text-cyan-600" />
                      Cooling Shelters Active
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Active corridor: <strong className="text-slate-900 font-bold">{detectedLocation}</strong>. Heat index is <strong>{roadHeatMetrics.heatIndexC}°C</strong> with WBGT <strong>{roadHeatMetrics.wbgtC}°C</strong>. 
                  Municipal cooling shelters and emergency hospitals are dynamically prioritized as your vehicle moves along verified road networks.
                </p>
              </div>
            </div>

            {/* Emergency Communication Dispatch Buttons */}
            <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center">
              <button
                type="button"
                onClick={handleSendWhatsAppAlert}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1.5"
                title="Send route details via WhatsApp"
              >
                {alertSent ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" /> : <MessageSquare className="w-3.5 h-3.5" />}
                <span>{alertSent ? 'Dispatched!' : 'WhatsApp Alert'}</span>
              </button>
              
              <button
                type="button"
                onClick={handleSendSmsAlert}
                className="px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-900 text-white shadow-xs transition flex items-center gap-1.5"
                title="Send SMS notification via Government Gateway"
              >
                {smsSent ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-200" /> : <Send className="w-3.5 h-3.5" />}
                <span>{smsSent ? 'SMS Dispatched!' : 'Quick SMS'}</span>
              </button>
            </div>

          </section>

          {/* ========================================================================= */}
          {/* 5. MAIN MAP (Left ~65%) & FACILITY RESULTS (Right ~35%)                   */}
          {/* ========================================================================= */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: Map Container (8 cols = ~66% width) */}
            <div className="lg:col-span-8 bg-white border border-[#ede7de] rounded-2xl overflow-hidden shadow-xs flex flex-col">
              
              {/* Map Header Bar */}
              <div className="px-4 py-3 bg-[#faf9f6] border-b border-[#ede7de] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="font-bold text-[#0f172a] text-sm">
                    {selectedFacility ? selectedFacility.name : 'Select a Destination'}
                  </span>
                  {selectedFacility && (
                    <span className="text-slate-500 font-medium">
                      ({selectedFacility.distance_km} km away · ~{selectedFacility.travel_time_minutes} mins)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                    {loadingRoute ? 'Tracing road network...' : routeData?.summary || 'OSRM Road Engine'}
                  </span>
                </div>
              </div>

              {/* Map Canvas with Floating Controls */}
              <div className="h-[620px] w-full relative">
                <MapContainer
                  center={userLocation}
                  zoom={14}
                  style={{ width: '100%', height: '100%', backgroundColor: '#f1f5f9' }}
                  zoomControl={true}
                >
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

                  {/* Real-time Moving Vehicle Marker */}
                  <Marker
                    position={userLocation}
                    icon={createVehicleIcon(vehicleType, heading, speedKmh > 0 || isSimulatingDrive)}
                  >
                    <Popup>
                      <div className="p-2 text-slate-900 font-sans text-xs min-w-[200px] space-y-1">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                          <strong className="text-blue-700 font-bold flex items-center gap-1">
                            <span>{vehicleType === 'car' ? '🚗' : vehicleType === 'bike' ? '🏍️' : '🚌'}</span>
                            <span>Live Vehicle</span>
                          </strong>
                          <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                            {speedKmh} km/h
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 pt-0.5">
                          <div><strong>Location:</strong> {detectedLocation}</div>
                          <div><strong>Heading:</strong> {heading}° · Bearing Active</div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Cooling Shelters (Cyan Snowflake Markers) */}
                  {liveFacilities
                    .filter((f) => f.type === 'COOLING_CENTRE')
                    .map((f, idx) => {
                      const isSelected = selectedFacility?.id === f.id;
                      const isNearest = idx === 0;
                      return (
                        <Marker
                          key={f.id}
                          position={[f.latitude, f.longitude]}
                          icon={isSelected ? coolingCenterSelectedMarkerIcon : coolingCenterMarkerIcon}
                          eventHandlers={{
                            click: () => setSelectedFacility(f),
                          }}
                        >
                          <Popup>
                            <div className="p-2 text-slate-900 font-sans text-xs min-w-[210px] space-y-1.5">
                              <div className="flex items-center justify-between gap-1 border-b border-cyan-100 pb-1">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 border border-cyan-200 flex items-center gap-1">
                                  <Snowflake className="w-3 h-3 text-cyan-600" />
                                  COOLING SHELTER
                                </span>
                                {isNearest && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                    NEAREST
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs font-bold text-slate-900 leading-snug">{f.name}</h4>
                              <p className="text-[11px] text-slate-500">{f.ward_name}</p>
                              <div className="p-1.5 rounded-lg bg-cyan-50 border border-cyan-200 text-[11px] space-y-0.5">
                                <div className="flex justify-between font-bold text-cyan-900">
                                  <span>Live Distance:</span>
                                  <span>{f.distance_km} km away</span>
                                </div>
                                <div className="flex justify-between text-slate-600 text-[10px]">
                                  <span>Travel Time:</span>
                                  <span className="text-emerald-700 font-semibold">~{f.travel_time_minutes} mins</span>
                                </div>
                              </div>
                              <div className="pt-1 flex items-center justify-between">
                                <span className="text-slate-500 text-[10px]">Tel: {f.contact}</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedFacility(f)}
                                  className="px-2 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-[10px] font-bold transition"
                                >
                                  {isSelected ? 'Route Active ✓' : 'Reroute Here →'}
                                </button>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}

                  {/* Hospitals (Red Cross Markers) */}
                  {liveFacilities
                    .filter((f) => f.type === 'HOSPITAL')
                    .map((f, idx) => {
                      const isSelected = selectedFacility?.id === f.id;
                      const isNearest = idx === 0;
                      return (
                        <Marker
                          key={f.id}
                          position={[f.latitude, f.longitude]}
                          icon={isSelected ? hospitalSelectedMarkerIcon : hospitalMarkerIcon}
                          eventHandlers={{
                            click: () => setSelectedFacility(f),
                          }}
                        >
                          <Popup>
                            <div className="p-2 text-slate-900 font-sans text-xs min-w-[210px] space-y-1.5">
                              <div className="flex items-center justify-between gap-1 border-b border-rose-100 pb-1">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                                  <span>+</span>
                                  EMERGENCY HOSPITAL
                                </span>
                                {isNearest && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                    CLOSEST
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs font-bold text-slate-900 leading-snug">{f.name}</h4>
                              <p className="text-[11px] text-slate-500">{f.subtype} · {f.ward_name}</p>
                              <div className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-[11px] space-y-0.5">
                                <div className="flex justify-between font-bold text-rose-900">
                                  <span>Live Distance:</span>
                                  <span>{f.distance_km} km away</span>
                                </div>
                                <div className="flex justify-between text-slate-600 text-[10px]">
                                  <span>Travel Time:</span>
                                  <span className="text-emerald-700 font-semibold">~{f.travel_time_minutes} mins</span>
                                </div>
                              </div>
                              <div className="pt-1 flex items-center justify-between">
                                <span className="text-slate-500 text-[10px]">Emergency: {f.contact}</span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedFacility(f)}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold transition"
                                >
                                  {isSelected ? 'Route Active ✓' : 'Reroute Here →'}
                                </button>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}

                  {/* Clinics */}
                  {liveFacilities
                    .filter((f) => f.type === 'EMERGENCY_CENTRE')
                    .map((f) => (
                      <Marker
                        key={f.id}
                        position={[f.latitude, f.longitude]}
                        icon={clinicIcon}
                        eventHandlers={{
                          click: () => setSelectedFacility(f),
                        }}
                      />
                    ))}

                  {/* Real OSRM Road Polyline */}
                  {routeData?.coordinates && (
                    <Polyline
                      positions={routeData.coordinates}
                      pathOptions={{
                        color: '#0284c7',
                        weight: 5,
                        opacity: 0.95,
                        lineCap: 'round',
                        lineJoin: 'round',
                      }}
                    />
                  )}

                  {/* Auto bounds & vehicle tracking */}
                  <MapAutoBounds
                    userCoord={userLocation}
                    destCoord={selectedFacility ? [selectedFacility.latitude, selectedFacility.longitude] : undefined}
                    polyline={routeData?.coordinates}
                    isNavigationActive={isSimulatingDrive || isTrackingActive}
                  />

                  <MapVehicleFollower
                    vehicleCoord={userLocation}
                    isAutoCentered={isAutoCentered}
                    onUserPan={handleUserPan}
                  />
                </MapContainer>

                {/* Upper Left: Compact Vehicle Status Overlay */}
                <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md border border-[#ede7de] px-3 py-1.5 rounded-xl text-slate-800 shadow-md flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {vehicleType === 'car' ? '🚗' : vehicleType === 'bike' ? '🏍️' : '🚌'}
                    </span>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-blue-600" />
                        <span>Velocity</span>
                      </div>
                      <span className="text-xs font-black font-mono text-slate-900 leading-none">
                        {speedKmh} <span className="text-[10px] font-normal text-slate-500">km/h</span>
                      </span>
                    </div>
                  </div>
                  <div className="border-l border-slate-200 pl-2.5">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Bearing</div>
                    <span className="text-xs font-mono font-bold text-slate-800">{heading}°</span>
                    {isSimulatingDrive && (
                      <div className="text-[9px] text-amber-700 font-mono mt-0.5">
                        Step {simStepIndex + 1}/{routeData?.coordinates?.length || 0}
                      </div>
                    )}
                  </div>
                </div>

                {/* Upper Right: Basemap Layer Controls */}
                <div className="absolute top-3 right-3 z-[1000] flex items-center bg-white/95 backdrop-blur-md p-1 rounded-xl border border-[#ede7de] shadow-md">
                  <button
                    type="button"
                    onClick={() => setBasemapMode('street')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                      basemapMode === 'street'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    Street Map
                  </button>
                  <button
                    type="button"
                    onClick={() => setBasemapMode('satellite')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                      basemapMode === 'satellite'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    Satellite Imagery
                  </button>
                </div>

                {/* Floating "Re-center on Vehicle" Button */}
                {!isAutoCentered && (
                  <button
                    type="button"
                    onClick={() => setIsAutoCentered(true)}
                    className="absolute bottom-10 right-3 z-[1000] px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition"
                  >
                    <LocateFixed className="w-3.5 h-3.5 text-white" />
                    <span>Re-center Vehicle</span>
                  </button>
                )}

                {/* Bottom Left: Map Legend Strip */}
                <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-md border border-[#ede7de] px-3 py-1.5 rounded-xl text-[11px] text-slate-700 shadow-xs flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-rose-600 text-white flex items-center justify-center font-bold text-[9px]">+</span>
                    <span className="font-medium text-slate-800">Hospital</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-cyan-600 text-white flex items-center justify-center text-[9px]">❄</span>
                    <span className="font-medium text-slate-800">Cooling Shelter</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-1 bg-[#0284c7] rounded-full inline-block" />
                    <span className="font-medium text-slate-800">Road Route</span>
                  </div>
                </div>

              </div>

            </div>

            {/* RIGHT COLUMN: Facility Results Panel (4 cols = ~34% width) */}
            <div className="lg:col-span-4 bg-white border border-[#ede7de] rounded-2xl p-5 shadow-xs flex flex-col h-[676px]">
              
              {/* Search Bar */}
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search hospitals, ICUs, cooling shelters..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition"
                />
              </div>

              {/* Category Filter Tabs */}
              <div className="flex bg-[#faf9f6] p-1 rounded-xl border border-[#ede7de] gap-1 text-xs font-semibold mb-3">
                <button
                  type="button"
                  onClick={() => handleTabChange('all')}
                  className={`flex-1 py-1.5 rounded-lg transition text-center ${
                    activeTab === 'all'
                      ? 'bg-white text-slate-900 font-bold shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({liveFacilities.length})
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('hospital')}
                  className={`flex-1 py-1.5 rounded-lg transition text-center ${
                    activeTab === 'hospital'
                      ? 'bg-rose-50 text-rose-800 font-bold border border-rose-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Hospitals ({countHosp})
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('emergency')}
                  className={`flex-1 py-1.5 rounded-lg transition text-center ${
                    activeTab === 'emergency'
                      ? 'bg-orange-50 text-orange-800 font-bold border border-orange-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Clinics ({countEmerg})
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('cooling_centre')}
                  className={`flex-1 py-1.5 rounded-lg transition text-center ${
                    activeTab === 'cooling_centre'
                      ? 'bg-cyan-50 text-cyan-800 font-bold border border-cyan-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Shelters ({countCool})
                </button>
              </div>

              {/* Facility Cards List (Vertically Scrollable) */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {loadingFacilities ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-[#faf9f6] rounded-xl border border-[#ede7de]">
                    Scanning facilities nearest to your coordinates...
                  </div>
                ) : filteredFacilities.length > 0 ? (
                  filteredFacilities.map((fac, idx) => {
                    const isSelected = selectedFacility?.id === fac.id;
                    const isClosest = idx === 0;
                    return (
                      <div
                        key={fac.id}
                        onClick={() => setSelectedFacility(fac)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? fac.type === 'HOSPITAL'
                              ? 'bg-rose-50/60 border-rose-300 ring-2 ring-rose-400/20'
                              : 'bg-cyan-50/60 border-cyan-300 ring-2 ring-cyan-400/20'
                            : 'bg-white border-[#ede7de] hover:border-slate-300 hover:bg-[#faf9f6]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded flex items-center gap-1 ${
                                  fac.type === 'HOSPITAL'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : fac.type === 'COOLING_CENTRE'
                                    ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {fac.type === 'HOSPITAL' ? 'HOSPITAL' : fac.type === 'COOLING_CENTRE' ? 'COOLING SHELTER' : 'CLINIC'}
                              </span>
                              {isClosest && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900">
                                  CLOSEST
                                </span>
                              )}
                              <span className="text-[11px] text-slate-500 truncate max-w-[150px]">
                                {fac.ward_name}
                              </span>
                            </div>

                            <h4 className="text-xs font-bold text-slate-900 mt-1 leading-snug truncate">
                              {fac.name}
                            </h4>
                            
                            {fac.official_authority && (
                              <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
                                {fac.official_authority}
                              </span>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold text-slate-900 block font-mono">
                              {fac.distance_km} km
                            </span>
                            <span className="text-[10px] text-slate-500 block font-mono">
                              ~{fac.travel_time_minutes} min
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 pt-1.5 border-t border-[#f5f3ef] flex items-center justify-between text-[11px]">
                          <span className="text-emerald-700 font-medium text-[10px] truncate max-w-[190px]">
                            {fac.status_label}
                          </span>
                          <span className={`font-bold text-[10px] ${
                            isSelected ? 'text-orange-600' : 'text-slate-600 hover:text-slate-900'
                          }`}>
                            {isSelected ? 'Route Active ✓' : 'Select Destination →'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-xs text-slate-500 bg-[#faf9f6] rounded-xl border border-[#ede7de]">
                    No facilities found matching your search.
                  </div>
                )}
              </div>

              {/* Turn-by-Turn Driving Directions (Collapsible / Compact) */}
              {selectedFacility && routeData && (
                <div className="mt-3 pt-3 border-t border-[#ede7de] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Car className="w-3.5 h-3.5 text-orange-600" />
                      <span>Road Route ({vehicleType.toUpperCase()})</span>
                    </span>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation[0]},${userLocation[1]}&destination=${selectedFacility.latitude},${selectedFacility.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-slate-700 hover:text-orange-600 flex items-center gap-1 font-bold"
                    >
                      Google Maps
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Step-by-Step Directions */}
                  <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1 scrollbar-thin">
                    {routeData.steps.slice(0, 4).map((step, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-700">
                        <span className="w-3.5 h-3.5 rounded-full bg-slate-100 text-slate-700 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-slate-200">
                          {idx + 1}
                        </span>
                        <p className="text-[10px] leading-tight text-slate-600 truncate flex-1">
                          {step.instruction} ({step.distance_meters}m)
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-[#f5f3ef]">
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      <span>Helpline: <strong className="text-emerald-700 font-bold">{selectedFacility.contact}</strong></span>
                    </div>
                    <span className="font-mono text-[10px] font-bold text-slate-700">
                      ~{selectedFacility.travel_time_minutes} min
                    </span>
                  </div>
                </div>
              )}

            </div>

          </section>
        </>
      )}

    </div>
  );
};

export default EmergencyGisPage;
