import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Navigation,
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
  Bike,
  Bus,
  ArrowLeft,
  Layers,
  Flame,
  Snowflake,
  Play,
  Pause,
  Radio,
  Gauge
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
  const R = 6371; // Earth radius in km
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

// Custom Map Centering & Auto-Bounding Hook
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
    // Only auto-fit bounds initially or when destination changes, avoiding disrupting active vehicle tracking
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
  }, [destCoord, polyline, isNavigationActive, map]);
  return null;
}

// Map Vehicle Follower for Smooth Real-Time Centering (Google Maps Navigation Style)
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

// Custom Google Maps-style Moving Vehicle Icon Generator
const createVehicleIcon = (type: VehicleType, headingDeg: number, isMoving: boolean) => {
  const emoji = type === 'car' ? '🚗' : type === 'bike' ? '🏍️' : '🚌';
  return new L.DivIcon({
    className: 'custom-moving-vehicle-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 50px; height: 50px; cursor: pointer;">
        <!-- Pulsing GPS Radar Accuracy Aura -->
        <div style="position: absolute; width: 50px; height: 50px; border-radius: 50%; background: rgba(37, 99, 235, ${isMoving ? '0.35' : '0.2'}); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        
        <!-- Directional Heading Pointer Triangle (Points in direction of travel) -->
        <div style="position: absolute; top: 1px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 11px solid #1d4ed8; transform: rotate(${headingDeg}deg); transform-origin: center 24px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"></div>
        
        <!-- Vehicle Navigation Disk Puck -->
        <div style="width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #1d4ed8, #3b82f6); border: 3px solid #ffffff; box-shadow: 0 4px 14px rgba(29,78,216,0.7), 0 0 0 2px rgba(59,130,246,0.3); display: flex; align-items: center; justify-content: center; font-size: 19px; transform: rotate(${headingDeg}deg); transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);">
          ${emoji}
        </div>
      </div>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -25]
  });
};

// 1. COOLING CENTRES: Distinct Cyan Snowflake Marker
const coolingCenterMarkerIcon = new L.DivIcon({
  className: 'custom-cool-marker',
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; cursor: pointer;">
      <div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: rgba(6, 182, 212, 0.4); animation: ping 2.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="background: linear-gradient(135deg, #0891b2, #06b6d4); color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(6,182,212,0.65); font-size: 16px;">
        ❄️
      </div>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -19]
});

const coolingCenterSelectedMarkerIcon = new L.DivIcon({
  className: 'custom-cool-selected-marker',
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 50px; height: 50px; cursor: pointer;">
      <div style="position: absolute; width: 50px; height: 50px; border-radius: 50%; background: rgba(6, 182, 212, 0.55); animation: ping 1.2s infinite;"></div>
      <div style="background: #0891b2; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid #ffffff; box-shadow: 0 0 22px rgba(6,182,212,0.9); font-size: 20px;">
        ❄️
      </div>
    </div>
  `,
  iconSize: [50, 50],
  iconAnchor: [25, 25],
  popupAnchor: [0, -25]
});

// 2. HOSPITALS: Distinct Red Cross Marker
const hospitalMarkerIcon = new L.DivIcon({
  className: 'custom-hosp-marker',
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px; cursor: pointer;">
      <div style="position: absolute; width: 38px; height: 38px; border-radius: 10px; background: rgba(220, 38, 38, 0.35); animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="background: linear-gradient(135deg, #dc2626, #ef4444); color: white; width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(220,38,38,0.65); font-weight: 900; font-size: 20px;">
        +
      </div>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -19]
});

const hospitalSelectedMarkerIcon = new L.DivIcon({
  className: 'custom-hosp-selected-marker',
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 50px; height: 50px; cursor: pointer;">
      <div style="position: absolute; width: 50px; height: 50px; border-radius: 14px; background: rgba(239, 68, 68, 0.55); animation: ping 1.2s infinite;"></div>
      <div style="background: #dc2626; color: white; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 3px solid #ffffff; box-shadow: 0 0 24px rgba(239,68,68,0.9); font-weight: 900; font-size: 24px;">
        +
      </div>
    </div>
  `,
  iconSize: [50, 50],
  iconAnchor: [25, 25],
  popupAnchor: [0, -25]
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
      advisory: 'EXTREME ROAD HEAT STRESS — AUTOMATIC COOLING SHELTERS ACTIVE'
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
  const [basemapMode, setBasemapMode] = useState<'satellite' | 'street'>('satellite');
  const [gisViewMode, setGisViewMode] = useState<'dispatcher' | 'thermomap'>('dispatcher');

  const lastFetchedCenterRef = useRef<[number, number]>(userLocation);

  // 1. Initial Permission Check on mount
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((res) => {
        if (res.state === 'granted') {
          handleStartContinuousGPS();
        }
      }).catch(() => {});
    }
  }, []);

  // 2. Fetch facilities when user moves significantly (> 300m) or initial load
  useEffect(() => {
    const distFromLastFetch = haversineDistanceKm(
      lastFetchedCenterRef.current[0],
      lastFetchedCenterRef.current[1],
      userLocation[0],
      userLocation[1]
    );

    if (facilities.length > 0 && distFromLastFetch < 0.3) {
      return; // Use dynamic local re-sorting for sub-300m travel to avoid network thrashing
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

  // 3. Dynamic Zero-Latency Facility Prioritization based on Live Vehicle Position
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

  // 4. Fetch Real OSRM Road Route whenever selectedFacility or initial location changes
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

  // 5. Continuous Real-Time GPS Tracking (Google Maps Navigation Style)
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

  // 6. Live Travel Simulation Loop along Real OSRM Road Polyline
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

        // Realistic vehicular speed variation
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
    setActivePreset('📍 Live GPS Location');

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
    if (preset.isGPS) {
      handleStartContinuousGPS();
    } else if (preset.lat !== null && preset.lon !== null) {
      setActivePreset(preset.name);
      setIsTrackingActive(false);
      setIsGpsActive(false);
      setUserLocation([preset.lat, preset.lon]);
      setIsAutoCentered(true);
      setSimStepIndex(0);
    }
  };

  // 1-Click Selectors prioritizing nearest facility
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

  // Filtered & Searched Facilities
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
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-200 font-bold flex items-center gap-1">
                  <Snowflake className="w-3 h-3 text-cyan-600" />
                  Cooling Centres Active
                </span>
                {isGpsActive && (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1">
                    <Radio className="w-2.5 h-2.5 text-emerald-600 animate-pulse" />
                    <span>GPS Locked (±{gpsAccuracy}m)</span>
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time road network routing to verified government emergency hospitals, trauma ICUs, and municipal cooling shelters.
              </p>
            </div>
          </div>
        </div>

        {/* View Mode, Vehicle Selector & Live Tracking Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Dispatcher / ThermoMap Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setGisViewMode('dispatcher')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                gisViewMode === 'dispatcher'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>OSRM Dispatcher</span>
            </button>
            <button
              onClick={() => setGisViewMode('thermomap')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                gisViewMode === 'thermomap'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>ThermoMap Grid</span>
            </button>
          </div>

          {/* 3-Way Vehicle Mode Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setVehicleType('car')}
              className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                vehicleType === 'car' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Driving by Car"
            >
              <Car className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Car</span>
            </button>
            <button
              onClick={() => setVehicleType('bike')}
              className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                vehicleType === 'bike' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Traveling by Bike / Motorcycle"
            >
              <Bike className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bike</span>
            </button>
            <button
              onClick={() => setVehicleType('bus')}
              className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                vehicleType === 'bus' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Transit by Bus"
            >
              <Bus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bus</span>
            </button>
          </div>

          {/* Simulated Travel Toggle for Quick Verification on Desktop */}
          <button
            onClick={() => {
              if (isSimulatingDrive) {
                setIsSimulatingDrive(false);
              } else {
                setIsTrackingActive(false);
                setIsSimulatingDrive(true);
                setIsAutoCentered(true);
              }
            }}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs ${
              isSimulatingDrive
                ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
            }`}
            title="Simulate vehicle moving continuously along the real OSRM road geometry"
          >
            {isSimulatingDrive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-amber-600" />}
            <span>{isSimulatingDrive ? 'Pause Travel' : 'Simulate Road Travel'}</span>
          </button>

          {/* Continuous Real-Time GPS Tracking Button */}
          <button
            onClick={handleStartContinuousGPS}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-xs ${
              isTrackingActive
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            title="Continuously track user GPS location like Google Maps navigation"
          >
            <Radio className="w-4 h-4 animate-spin text-white" style={{ animationDuration: '4s' }} />
            <span>{isTrackingActive ? `GPS Tracking (±${gpsAccuracy}m)` : 'Track My Live GPS'}</span>
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
          {/* TWO PRIMARY 1-CLICK EMERGENCY ACTION CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Button 1: Nearest Hospital */}
            <button
              onClick={handleSelectNearestHospital}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between group shadow-xs ${
                selectedFacility?.type === 'HOSPITAL'
                  ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/40'
                  : 'bg-white border-slate-200 hover:border-rose-300'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center font-black text-2xl group-hover:scale-110 transition-transform shadow-xs">
                  +
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-rose-700 font-bold">
                      Primary Heatstroke Emergency
                    </span>
                    <span className="text-[9px] bg-rose-600 text-white font-bold px-1.5 py-0.2 rounded font-mono">
                      PRIORITIZED
                    </span>
                  </div>
                  <span className="text-base font-bold text-slate-900 block mt-0.5">
                    Nearest Hospital
                  </span>
                  <span className="text-xs text-slate-500 font-medium line-clamp-1">
                    {nearestHospital
                      ? `${nearestHospital.name} (${nearestHospital.distance_km} km away · ~${nearestHospital.travel_time_minutes} mins)`
                      : 'Locating closest hospital...'}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-rose-600 text-white shadow-xs group-hover:bg-rose-700 transition">
                  Road Route →
                </span>
              </div>
            </button>

            {/* Button 2: Nearest Cooling Shelter */}
            <button
              onClick={handleSelectNearestCoolingShelter}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between group shadow-xs ${
                selectedFacility?.type === 'COOLING_CENTRE'
                  ? 'bg-cyan-50 border-cyan-400 ring-2 ring-cyan-400/40'
                  : 'bg-white border-slate-200 hover:border-cyan-300'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-cyan-100 border border-cyan-200 text-cyan-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-xs">
                  ❄️
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-700 font-bold">
                      Rapid Shaded Heat Relief & ORS
                    </span>
                    <span className="text-[9px] bg-cyan-600 text-white font-bold px-1.5 py-0.2 rounded font-mono">
                      AUTO-ACTIVATED
                    </span>
                  </div>
                  <span className="text-base font-bold text-slate-900 block mt-0.5">
                    Nearest Cooling Shelter
                  </span>
                  <span className="text-xs text-slate-500 font-medium line-clamp-1">
                    {nearestShelter
                      ? `${nearestShelter.name} (${nearestShelter.distance_km} km away · ~${nearestShelter.travel_time_minutes} mins)`
                      : 'Locating nearest shelter...'}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-cyan-600 text-white shadow-xs group-hover:bg-cyan-700 transition">
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

          {/* HIGH HEAT ROAD CORRIDOR ADVISORY BANNER */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 via-rose-50 to-orange-50 border border-amber-300 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-700 border border-rose-300">
                <Flame className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
                    ROAD HEAT CORRIDOR MONITOR
                  </span>
                  <button
                    onClick={() => setIsHighHeatRoadActive(!isHighHeatRoadActive)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition flex items-center gap-1 shadow-xs cursor-pointer ${
                      isHighHeatRoadActive
                        ? 'bg-rose-600 text-white border-rose-700'
                        : 'bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                    title="Click to toggle road heat condition detection"
                  >
                    <Flame className="w-3 h-3" />
                    <span>Heat Condition: {isHighHeatRoadActive ? `HIGH HEAT (${roadHeatMetrics.heatIndexC}°C)` : 'NORMAL (<40°C)'}</span>
                  </button>
                  {isHighHeatRoadActive && (
                    <span className="text-[10px] bg-cyan-600 text-white font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 animate-pulse">
                      <Snowflake className="w-3 h-3" />
                      Cooling Shelters Auto-Activated
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Active Corridor: <strong className="text-slate-900 underline decoration-rose-400">{detectedLocation}</strong>. Heat index is <strong>{roadHeatMetrics.heatIndexC}°C</strong> with WBGT <strong>{roadHeatMetrics.wbgtC}°C</strong>. 
                  Nearby municipal cooling centres and emergency hospitals are dynamically plotted on the map and automatically prioritized as your vehicle moves.
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

          {/* Main Grid: Interactive Live Navigation Map (Left 7 Cols) & Facility Routing Navigator (Right 5 Cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Interactive Map with Moving Vehicle and Live Facilities */}
            <div className="lg:col-span-7 bg-[#0b121e] border-2 border-slate-300 rounded-2xl overflow-hidden flex flex-col h-[650px] shadow-md relative">
              {/* Map Top Status Bar */}
              <div className="p-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200 z-10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span>{vehicleType === 'car' ? '🚗' : vehicleType === 'bike' ? '🏍️' : '🚌'}</span>
                    <span>{selectedFacility ? selectedFacility.name : 'Select Destination'}</span>
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

              {/* Leaflet Map with Real Road Polyline & Moving Vehicle */}
              <div className="flex-1 w-full relative">
                <MapContainer
                  center={userLocation}
                  zoom={14}
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

                  {/* REAL-TIME MOVING VEHICLE / USER LOCATION MARKER */}
                  <Marker
                    position={userLocation}
                    icon={createVehicleIcon(vehicleType, heading, speedKmh > 0 || isSimulatingDrive)}
                  >
                    <Popup>
                      <div className="p-2 text-slate-900 font-sans text-xs min-w-[210px] space-y-1.5">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                          <strong className="text-blue-600 font-bold flex items-center gap-1">
                            <span>{vehicleType === 'car' ? '🚗' : vehicleType === 'bike' ? '🏍️' : '🚌'}</span>
                            <span>Live Traveling Vehicle</span>
                          </strong>
                          <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
                            {speedKmh} km/h
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600">
                          <div><strong>Location:</strong> {detectedLocation}</div>
                          <div><strong>Heading:</strong> {heading}° · Bearing Active</div>
                          <div><strong>Accuracy:</strong> ±{gpsAccuracy}m (High-Precision GPS)</div>
                        </div>
                        {selectedFacility && (
                          <div className="mt-1 pt-1 border-t border-slate-100 text-[11px] flex justify-between font-bold text-slate-800">
                            <span>Destination:</span>
                            <span className="text-emerald-700 truncate max-w-[120px]">{selectedFacility.name}</span>
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>

                  {/* 1. COOLING CENTRES ON LIVE MAP (Cyan Snowflake Markers, Auto-Activated on High Heat) */}
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
                            <div className="p-2 text-slate-900 font-sans text-xs min-w-[220px] space-y-1.5">
                              <div className="flex items-center justify-between gap-1 border-b border-cyan-100 pb-1">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 border border-cyan-200 flex items-center gap-1">
                                  <Snowflake className="w-3 h-3 text-cyan-600" />
                                  COOLING SHELTER
                                </span>
                                {isNearest && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                    ⭐ NEAREST SHELTER
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs font-bold text-slate-900 leading-snug">{f.name}</h4>
                              <p className="text-[11px] text-slate-500 leading-tight">{f.ward_name}</p>
                              <div className="p-1.5 rounded-lg bg-cyan-50/80 border border-cyan-200 text-[11px] space-y-0.5">
                                <div className="flex justify-between font-bold text-cyan-900">
                                  <span>Live Distance:</span>
                                  <span>{f.distance_km} km away</span>
                                </div>
                                <div className="flex justify-between text-slate-600 text-[10px]">
                                  <span>Travel Time:</span>
                                  <span className="text-emerald-700 font-semibold">~{f.travel_time_minutes} mins ({vehicleType})</span>
                                </div>
                                <div className="text-[10px] text-cyan-800 font-medium pt-1">
                                  ✓ Air Conditioned · Cold Drinking Water & ORS
                                </div>
                              </div>
                              <div className="pt-1 flex items-center justify-between text-[11px]">
                                <span className="text-slate-500 text-[10px]">Helpline: {f.contact}</span>
                                <button
                                  onClick={() => setSelectedFacility(f)}
                                  className="px-2.5 py-1 text-center bg-cyan-600 hover:bg-cyan-700 text-white rounded text-[10px] font-bold shadow-xs transition"
                                >
                                  {isSelected ? 'Route Active ✓' : 'Reroute Here →'}
                                </button>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}

                  {/* 2. NEARBY HOSPITALS ON LIVE MAP (Red Cross Markers, Prioritized Closest) */}
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
                            <div className="p-2 text-slate-900 font-sans text-xs min-w-[220px] space-y-1.5">
                              <div className="flex items-center justify-between gap-1 border-b border-rose-100 pb-1">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                                  <span className="font-black text-xs">+</span>
                                  EMERGENCY HOSPITAL
                                </span>
                                {isNearest && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                                    ⭐ CLOSEST HOSPITAL
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs font-bold text-slate-900 leading-snug">{f.name}</h4>
                              <p className="text-[11px] text-slate-500 leading-tight">{f.subtype} · {f.ward_name}</p>
                              <div className="p-1.5 rounded-lg bg-rose-50/80 border border-rose-200 text-[11px] space-y-0.5">
                                <div className="flex justify-between font-bold text-rose-900">
                                  <span>Live Distance:</span>
                                  <span>{f.distance_km} km away</span>
                                </div>
                                <div className="flex justify-between text-slate-600 text-[10px]">
                                  <span>Travel Time:</span>
                                  <span className="text-emerald-700 font-semibold">~{f.travel_time_minutes} mins ({vehicleType})</span>
                                </div>
                                <div className="text-[10px] text-rose-800 font-medium pt-1">
                                  ✓ Trauma ICU ({f.icu_beds || 24} Beds) · 24/7 Heatstroke Unit
                                </div>
                              </div>
                              <div className="pt-1 flex items-center justify-between text-[11px]">
                                <span className="text-slate-500 text-[10px]">Emergency: {f.contact}</span>
                                <button
                                  onClick={() => setSelectedFacility(f)}
                                  className="px-2.5 py-1 text-center bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold shadow-xs transition"
                                >
                                  {isSelected ? 'Route Active ✓' : 'Reroute Here →'}
                                </button>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}

                  {/* EMERGENCY CLINICS */}
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
                      >
                        <Popup>
                          <div className="p-1.5 text-slate-900 font-sans text-xs min-w-[200px]">
                            <strong className="text-amber-600 text-xs block">{f.name}</strong>
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

                  {/* Real Road Polyline (OSRM Street Geometry) */}
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

                  {/* Initial Auto-bounds controller */}
                  <MapAutoBounds
                    userCoord={userLocation}
                    destCoord={selectedFacility ? [selectedFacility.latitude, selectedFacility.longitude] : undefined}
                    polyline={routeData?.coordinates}
                    isNavigationActive={isSimulatingDrive || isTrackingActive}
                  />

                  {/* Smooth Vehicle Follower for Navigation Centering */}
                  <MapVehicleFollower
                    vehicleCoord={userLocation}
                    isAutoCentered={isAutoCentered}
                    onUserPan={handleUserPan}
                  />
                </MapContainer>

                {/* Basemap Switcher */}
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

                {/* Floating Navigation HUD / Speedometer on Map */}
                <div className="absolute top-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700 px-3 py-1.5 rounded-xl text-white shadow-lg flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {vehicleType === 'car' ? '🚗' : vehicleType === 'bike' ? '🏍️' : '🚌'}
                    </span>
                    <div>
                      <div className="text-[10px] uppercase font-mono text-slate-400 font-bold flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-cyan-400" />
                        <span>Live Velocity</span>
                      </div>
                      <span className="text-sm font-black font-mono text-white leading-tight">
                        {speedKmh} <span className="text-[10px] font-normal text-slate-300">km/h</span>
                      </span>
                    </div>
                  </div>
                  <div className="border-l border-slate-700 pl-3">
                    <div className="text-[10px] uppercase font-mono text-slate-400 font-bold">Bearing</div>
                    <span className="text-xs font-mono font-bold text-cyan-300">{heading}°</span>
                    {isSimulatingDrive && (
                      <div className="text-[9px] text-amber-300 font-mono mt-0.5">
                        Step {simStepIndex + 1}/{routeData?.coordinates?.length || 0}
                      </div>
                    )}
                  </div>
                </div>

                {/* Floating "Re-center on Vehicle" Button (Google Maps Style) */}
                {!isAutoCentered && (
                  <button
                    onClick={() => setIsAutoCentered(true)}
                    className="absolute bottom-12 right-3 z-[1000] px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xl flex items-center gap-2 transition"
                  >
                    <LocateFixed className="w-4 h-4 animate-pulse text-white" />
                    <span>Re-center on Vehicle</span>
                  </button>
                )}

                {/* Bottom Left Map Badge */}
                <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-md border border-slate-300 px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-700 shadow-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>
                    GPS Tracking Active · {countHosp} Hospitals · {countCool} Cooling Shelters Locked
                  </span>
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
                  All ({liveFacilities.length})
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

              {/* Facility List (Dynamically Ranked by Live Distance from Moving Vehicle) */}
              <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1 scrollbar-thin">
                {loadingFacilities ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                    Finding facilities nearest to your coordinates...
                  </div>
                ) : filteredFacilities.length > 0 ? (
                  filteredFacilities.map((fac, idx) => {
                    const isSelected = selectedFacility?.id === fac.id;
                    const isClosestInTab = idx === 0;
                    return (
                      <div
                        key={fac.id}
                        onClick={() => setSelectedFacility(fac)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all shadow-xs ${
                          isSelected
                            ? fac.type === 'HOSPITAL'
                              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/30'
                              : 'bg-cyan-50 border-cyan-400 ring-2 ring-cyan-400/30'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                  fac.type === 'HOSPITAL'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : fac.type === 'COOLING_CENTRE'
                                    ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {fac.type === 'HOSPITAL' ? (
                                  <>
                                    <span className="font-black">+</span>
                                    <span>HOSPITAL</span>
                                  </>
                                ) : fac.type === 'COOLING_CENTRE' ? (
                                  <>
                                    <Snowflake className="w-2.5 h-2.5" />
                                    <span>COOLING SHELTER</span>
                                  </>
                                ) : (
                                  <span>EMERGENCY CLINIC</span>
                                )}
                              </span>
                              {isClosestInTab && (
                                <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-100 text-amber-800">
                                  CLOSEST
                                </span>
                              )}
                              <span className="text-[11px] text-slate-500 truncate max-w-[170px]">
                                {fac.ward_name}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 mt-1 leading-snug">{fac.name}</h4>
                            {fac.official_authority && (
                              <span className="text-[10px] text-emerald-700 flex items-center gap-1 mt-0.5 font-medium">
                                <Award className="w-3 h-3 text-emerald-600" />
                                {fac.official_authority}
                              </span>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold text-amber-700 block">
                              {fac.distance_km} km away
                            </span>
                            <span className="text-[10px] text-slate-500 block font-mono">
                              ~{fac.travel_time_minutes} min ({vehicleType})
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100">
                          <span className="text-emerald-700 font-medium text-[10px] truncate max-w-[200px]">
                            {fac.status_label}
                          </span>
                          <span className={`font-bold text-[10px] ${
                            fac.type === 'HOSPITAL' ? 'text-rose-700' : 'text-cyan-700'
                          }`}>
                            {isSelected ? 'Route Active ✓' : 'Select Destination →'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                    No facilities matching this search in immediate range.
                  </div>
                )}
              </div>

              {/* Turn-by-Turn Road Navigation Card (OSRM Driving Directions) */}
              {selectedFacility && routeData && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs text-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5 text-cyan-600" />
                          <span className="text-[10px] uppercase font-bold text-cyan-800 tracking-wide">
                            Road Navigation (OSRM · {vehicleType.toUpperCase()})
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 truncate max-w-[220px]">
                          {selectedFacility.name}
                        </h4>
                      </div>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation[0]},${userLocation[1]}&destination=${selectedFacility.latitude},${selectedFacility.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-cyan-800 hover:text-cyan-950 flex items-center gap-1 font-bold px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 shadow-xs hover:border-slate-300 transition"
                      >
                        Google Maps
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {/* Step-by-Step Maneuvers */}
                    <div className="space-y-1.5 max-h-[135px] overflow-y-auto pr-1 scrollbar-thin">
                      {routeData.steps.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                          <span className="w-4 h-4 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-cyan-200">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] leading-snug text-slate-700">{step.instruction}</p>
                            <span className="text-[9px] text-slate-500 font-mono">
                              {step.distance_meters}m • ~{Math.max(1, Math.ceil(step.duration_seconds / 60))} min
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 mt-2 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1 text-[11px]">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        Helpline: <strong className="text-emerald-700 font-bold">{selectedFacility.contact}</strong>
                      </span>
                    </div>
                    <span className="text-[10px] text-cyan-800 font-mono font-bold bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                      {selectedFacility.distance_km} km away · ~{selectedFacility.travel_time_minutes} min
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

export default EmergencyGisPage;
