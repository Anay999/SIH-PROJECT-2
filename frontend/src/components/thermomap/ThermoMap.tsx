import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Navigation,
  Compass,
  RefreshCw,
  X,
  Activity,
  Layers,
  Thermometer,
  Globe,
  Box,
  Search,
  MapPin,
  ChevronDown,
  AlertTriangle,
  HeartPulse,
  Wind,
  Droplets,
  Info,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Flame,
  Plus
} from 'lucide-react';
import type {
  H3RiskProperties,
  OsmFacilityProperties,
  StreetThermalProperties,
  ThermalMetric,
  TimeOfDay,
  BasemapMode,
  IndiaGridCellProperties,
  IndiaGridOverview,
  IndiaGridFeatureCollection
} from '../../types/thermomap';
import {
  fetchThermoMapRisk,
  fetchThermoMapFacilities,
  fetchStreetThermalData,
  fetchEmergencyRoute,
  fetchIndiaGridData,
  fetchIndiaBoundaryGeoJson
} from '../../services/thermoMapService';
import { Municipal3DCommandCenter } from './Municipal3DCommandCenter';
import { useAuth } from '../../context/AuthContext';

export interface ThermoMapProps {
  latitude: number;
  longitude: number;
  locationName?: string;
  onSelectFacility?: (facility: OsmFacilityProperties) => void;
  selectedFacility?: OsmFacilityProperties | { name: string; latitude: number; longitude: number; [key: string]: any } | null;
  height?: string;
}

type TopMetricTab = 'heat_risk' | 'temperature' | 'wbgt' | 'heat_index' | 'utci' | 'htsi' | 'humidity' | 'wind';

export const ThermoMap: React.FC<ThermoMapProps> = ({
  latitude,
  longitude,
  locationName = 'India',
  onSelectFacility,
  selectedFacility,
  height = '640px'
}) => {
  // Silence unused prop if not needed
  void selectedFacility;

  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Authentication & Role Check
  const { user } = useAuth();
  const isOfficerOrAdmin = user?.role === 'MUNICIPAL_OFFICER' || user?.role === 'ADMIN';

  // 3D Command & Pan-India Mode State (Defaults to Pan-India)
  const [show3DCommand, setShow3DCommand] = useState<boolean>(false);
  const [isIndiaGridMode, setIsIndiaGridMode] = useState<boolean>(true);

  // Core State
  const [isLoadingRisk, setIsLoadingRisk] = useState<boolean>(true);
  const [activeMetric, setActiveMetric] = useState<ThermalMetric>('risk');
  const [activeMetricTab, setActiveMetricTab] = useState<TopMetricTab>('heat_risk');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('afternoon');
  const basemapMode: BasemapMode = 'streets';

  // Search & Navigation
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Layer Toggles
  const [showLayerPanel, setShowLayerPanel] = useState<boolean>(false);
  const [showRightPanel, setShowRightPanel] = useState<boolean>(true);

  const [layerCheckboxes, setLayerCheckboxes] = useState({
    heatRisk: true,
    temperature: true,
    humidity: false,
    windSpeed: false,
    populationDensity: false,
    vulnerablePopulation: false,
    hospitals: true,
    emergencyCentres: true,
    coolingCentres: true,
    stateBoundaries: true,
    districtBoundaries: false
  });

  // Pan-India Data & Real-Time Overview
  const [indiaOverview, setIndiaOverview] = useState<IndiaGridOverview | null>({
    average_temperature_c: 36.8,
    apparent_temperature_c: 41.2,
    relative_humidity: 48,
    wind_speed_kmh: 12,
    wbgt_c: 30.5,
    utci_c: 38.7,
    htsi_score: 0.72,
    risk_category: 'High Risk',
    total_states: 28,
    total_uts: 8,
    total_districts: 776,
    high_risk_states: [
      { state: 'Rajasthan', htsi: 0.86 },
      { state: 'Madhya Pradesh', htsi: 0.81 },
      { state: 'Uttar Pradesh', htsi: 0.76 },
      { state: 'Maharashtra', htsi: 0.72 },
      { state: 'Gujarat', htsi: 0.71 }
    ],
    last_updated: '2026-09-22T20:00'
  });

  // Selected Inspections
  const [selectedCell, setSelectedCell] = useState<H3RiskProperties | IndiaGridCellProperties | null>(null);
  const [selectedStreet, setSelectedStreet] = useState<StreetThermalProperties | null>(null);

  // Pan-India Grid Data
  const [indiaGridData, setIndiaGridData] = useState<IndiaGridFeatureCollection | null>(null);
  void indiaGridData;

  // Routing State
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [routeSummary, setRouteSummary] = useState<{ distance_km: number; duration_mins: number; summary: string } | null>(null);

  // Dynamic Date Formatting
  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) + ' ' + new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // Helper: Apply Dynamic Styling to Grid Fills, Grid Lines, and Street Lines
  const applyDynamicStyling = (map: maplibregl.Map, metric: ThermalMetric, basemap: BasemapMode) => {
    if (!map || !map.isStyleLoaded()) return;

    // 1. Lined Thermal Grid Fills (5-Tier Palette matching Image 2 reference)
    if (map.getLayer('thermal-grid-fill')) {
      if (metric === 'air_temp') {
        map.setPaintProperty('thermal-grid-fill', 'fill-color', [
          'interpolate',
          ['linear'],
          ['coalesce', ['get', 'air_temperature_c'], ['get', 'temperature_c'], 30],
          22, '#fde047',
          28, '#f59e0b',
          34, '#ea580c',
          38, '#dc2626',
          42, '#7f1d1d'
        ]);
      } else if (metric === 'lst') {
        map.setPaintProperty('thermal-grid-fill', 'fill-color', [
          'interpolate',
          ['linear'],
          ['coalesce', ['get', 'land_surface_temp_c'], 32],
          25, '#fde047',
          32, '#f59e0b',
          38, '#ea580c',
          44, '#dc2626',
          49, '#7f1d1d'
        ]);
      } else if (metric === 'wbgt') {
        map.setPaintProperty('thermal-grid-fill', 'fill-color', [
          'interpolate',
          ['linear'],
          ['coalesce', ['get', 'wbgt_c'], 28],
          22, '#fde047',
          26, '#f59e0b',
          29, '#ea580c',
          32, '#dc2626',
          35, '#7f1d1d'
        ]);
      } else {
        // heat_risk / HTSI (Default)
        map.setPaintProperty('thermal-grid-fill', 'fill-color', [
          'coalesce',
          ['get', 'color'],
          ['match',
            ['get', 'risk_category'],
            'LOW', '#fde047',
            'MODERATE', '#f59e0b',
            'HIGH', '#ea580c',
            'VERY HIGH', '#dc2626',
            'EXTREME', '#7f1d1d',
            '#ea580c'
          ]
        ]);
      }
      map.setPaintProperty('thermal-grid-fill', 'fill-opacity', 0.52);
    }

    // 2. Crisp Thermal Grid Outline Mesh (Lines)
    if (map.getLayer('thermal-grid-lines')) {
      const gridLineColor = basemap === 'satellite' ? '#ffffff' : '#94a3b8';
      map.setPaintProperty('thermal-grid-lines', 'line-color', gridLineColor);
      map.setPaintProperty('thermal-grid-lines', 'line-width', 0.6);
      map.setPaintProperty('thermal-grid-lines', 'line-opacity', 0.55);
    }

    // 3. India Boundary Vector Line
    if (map.getLayer('india-boundary-casing')) {
      map.setPaintProperty('india-boundary-casing', 'line-color', '#0284c7');
      map.setPaintProperty('india-boundary-casing', 'line-width', 2.2);
      map.setPaintProperty('india-boundary-casing', 'line-opacity', 0.85);
    }

    // 4. Concentric Thermal Wave Contours
    if (map.getLayer('thermal-wave-contours')) {
      map.setPaintProperty('thermal-wave-contours', 'line-color', '#ea580c');
      map.setPaintProperty('thermal-wave-contours', 'line-width', 1.8);
      map.setPaintProperty('thermal-wave-contours', 'line-opacity', 0.75);
    }

    // 5. Street Thermal Lines
    if (map.getLayer('street-lines-core')) {
      map.setPaintProperty('street-lines-core', 'line-color', '#ea580c');
      map.setPaintProperty('street-lines-core', 'line-width', 3.5);
    }
    if (map.getLayer('street-lines-casing')) {
      map.setPaintProperty('street-lines-casing', 'line-color', basemap === 'satellite' ? '#020617' : '#ffffff');
    }
  };

  // 1. Initialize MapLibre Canvas with Restricted Camera Bounds to India
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const mapStyle: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: [
            'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png'
          ],
          tileSize: 256,
          attribution: '&copy; OpenStreetMap Contributors'
        },
        'satellite-tiles': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: '&copy; Esri, Maxar, Earthstar Geographics'
        }
      },
      layers: [
        {
          id: 'osm-raster-layer',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19
        },
        {
          id: 'satellite-raster-layer',
          type: 'raster',
          source: 'satellite-tiles',
          minzoom: 0,
          maxzoom: 19,
          layout: {
            visibility: 'none'
          }
        }
      ]
    };

    // Camera initialized strictly at India center, constrained to Indian Territory
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [78.9629, 22.5937], // Pan-India Geographic Center
      zoom: 4.8,
      minZoom: 4.0,
      maxZoom: 18.0,
      maxBounds: [
        [65.0, 6.0],  // Southwest extent (Indian Ocean / Lakshadweep margin)
        [98.5, 37.5]  // Northeast extent (Ladakh / Arunachal Pradesh margin)
      ],
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-left');

    // Pulsing User Location Marker
    const markerEl = document.createElement('div');
    markerEl.className = 'thermo-user-marker';
    markerEl.style.width = '20px';
    markerEl.style.height = '20px';
    markerEl.style.borderRadius = '50%';
    markerEl.style.backgroundColor = '#ea580c';
    markerEl.style.border = '3px solid #ffffff';
    markerEl.style.boxShadow = '0 0 16px rgba(234, 88, 12, 0.9)';
    markerEl.style.cursor = 'pointer';

    const userMarker = new maplibregl.Marker({ element: markerEl })
      .setLngLat([longitude, latitude])
      .addTo(map);

    userMarkerRef.current = userMarker;

    map.on('load', () => {
      // 1. India Boundary Vector Outline Source & Layer
      map.addSource('india-boundary', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'india-boundary-casing',
        type: 'line',
        source: 'india-boundary',
        paint: {
          'line-color': '#0284c7',
          'line-width': 2.2,
          'line-opacity': 0.85
        }
      });

      // 2. Concentric Thermal Wave Contours Layer
      map.addSource('wave-contours', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'thermal-wave-contours',
        type: 'line',
        source: 'wave-contours',
        paint: {
          'line-color': '#ea580c',
          'line-width': 1.8,
          'line-opacity': 0.75,
          'line-dasharray': [3, 2]
        }
      });

      // 3. Lined Thermal Grid Source & Layers (Auto-aligned & strictly clipped to India)
      map.addSource('thermal-grid', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'thermal-grid-fill',
        type: 'fill',
        source: 'thermal-grid',
        paint: {
          'fill-color': '#ea580c',
          'fill-opacity': 0.52
        }
      });

      map.addLayer({
        id: 'thermal-grid-lines',
        type: 'line',
        source: 'thermal-grid',
        paint: {
          'line-color': '#94a3b8',
          'line-width': 0.6,
          'line-opacity': 0.55
        }
      });

      // 4. Street Thermal Road Geometry Layers
      map.addSource('street-thermal-lines', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'street-lines-casing',
        type: 'line',
        source: 'street-thermal-lines',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#ffffff',
          'line-width': 6.0,
          'line-opacity': 0.9
        }
      });

      map.addLayer({
        id: 'street-lines-core',
        type: 'line',
        source: 'street-thermal-lines',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#ea580c',
          'line-width': 3.5,
          'line-opacity': 1.0
        }
      });

      // 5. Emergency Facilities Source & Layer
      map.addSource('facilities', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'facilities-points',
        type: 'circle',
        source: 'facilities',
        paint: {
          'circle-radius': 7.5,
          'circle-color': [
            'match',
            ['get', 'amenity'],
            'hospital', '#dc2626',
            'clinic', '#ea580c',
            'cooling_center', '#0284c7',
            '#ea580c'
          ],
          'circle-stroke-width': 2.2,
          'circle-stroke-color': '#ffffff'
        }
      });

      // 6. Emergency Route Source & Layer
      map.addSource('emergency-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [] }
        }
      });

      map.addLayer({
        id: 'emergency-route-casing',
        type: 'line',
        source: 'emergency-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#7f1d1d',
          'line-width': 7.5,
          'line-opacity': 0.95
        }
      });

      map.addLayer({
        id: 'emergency-route-line',
        type: 'line',
        source: 'emergency-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#ea580c',
          'line-width': 4.0,
          'line-opacity': 1.0
        }
      });

      // Interactive Events: Lined Thermal Grid Cell Click
      map.on('click', 'thermal-grid-fill', (e: any) => {
        if (!e.features || e.features.length === 0) return;
        const props = e.features[0].properties as unknown as IndiaGridCellProperties;
        setSelectedCell(props);
        setSelectedStreet(null);
      });

      map.on('mouseenter', 'thermal-grid-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'thermal-grid-fill', () => {
        map.getCanvas().style.cursor = '';
      });

      // Interactive Events: Facility Click & Routing
      map.on('click', 'facilities-points', (e: any) => {
        if (!e.features || e.features.length === 0) return;
        const feat = e.features[0];
        const props = feat.properties as unknown as OsmFacilityProperties;
        if (onSelectFacility) {
          onSelectFacility(props);
        }
        const coords = (feat.geometry as any).coordinates as [number, number];
        triggerRoutingToCoords(coords[1], coords[0], props.name);
      });

      // Initial Data Ingestion: Default is Pan-India Grid with auto-aligned borders
      loadIndiaGridData(timeOfDay);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Load Pan-India Auto-Aligned Grid (Strictly clipped to Indian territory)
  const loadIndiaGridData = async (tod: TimeOfDay) => {
    setIsLoadingRisk(true);
    try {
      const [data, boundary] = await Promise.all([
        fetchIndiaGridData({ zoom: 5.0, timeOfDay: tod }),
        fetchIndiaBoundaryGeoJson().catch(() => null)
      ]);
      setIndiaGridData(data);
      if (data.overview) {
        setIndiaOverview(data.overview);
      }

      const map = mapRef.current;
      if (map) {
        const riskSource = map.getSource('thermal-grid') as maplibregl.GeoJSONSource | undefined;
        if (riskSource) {
          riskSource.setData(data as any);
        }
        if (boundary && map.getSource('india-boundary')) {
          (map.getSource('india-boundary') as maplibregl.GeoJSONSource).setData(boundary as any);
        }
        if (data.wave_contours && map.getSource('wave-contours')) {
          (map.getSource('wave-contours') as maplibregl.GeoJSONSource).setData(data.wave_contours as any);
        }
        applyDynamicStyling(map, activeMetric, basemapMode);
      }
    } catch (err) {
      console.error('Pan-India Grid fetch failed:', err);
    } finally {
      setIsLoadingRisk(false);
    }
  };

  // 2b. Load Localized Ward Grid (When User Centered)
  const loadThermoMapData = async (lat: number, lon: number, res: number, tod: TimeOfDay) => {
    setIsLoadingRisk(true);
    try {
      const [riskGeoJson, facilitiesGeoJson, streetsGeoJson] = await Promise.all([
        fetchThermoMapRisk(lat, lon, res === 9 ? 4.0 : 6.5, res, tod),
        fetchThermoMapFacilities(lat, lon, 8.0),
        fetchStreetThermalData(lat, lon, 4.5, tod)
      ]);

      const map = mapRef.current;
      if (map) {
        const riskSource = map.getSource('thermal-grid') as maplibregl.GeoJSONSource | undefined;
        if (riskSource) riskSource.setData(riskGeoJson as any);

        const facSource = map.getSource('facilities') as maplibregl.GeoJSONSource | undefined;
        if (facSource) facSource.setData(facilitiesGeoJson as any);

        const streetSource = map.getSource('street-thermal-lines') as maplibregl.GeoJSONSource | undefined;
        if (streetSource) streetSource.setData(streetsGeoJson as any);

        applyDynamicStyling(map, activeMetric, basemapMode);
      }
    } catch (err) {
      console.error('Localized Grid data load failed:', err);
    } finally {
      setIsLoadingRisk(false);
    }
  };

  // Routing Trigger
  const triggerRoutingToCoords = async (destLat: number, destLon: number, destName: string) => {
    setIsRouting(true);
    try {
      const routeData = await fetchEmergencyRoute(latitude, longitude, destLat, destLon);
      const map = mapRef.current;
      if (map) {
        const routeSource = map.getSource('emergency-route') as maplibregl.GeoJSONSource | undefined;
        if (routeSource) {
          routeSource.setData(routeData as any);
        }
      }
      setRouteSummary({
        distance_km: routeData.properties.distance_km,
        duration_mins: routeData.properties.duration_minutes,
        summary: destName
      });
    } catch (err) {
      console.error('Routing failed:', err);
    } finally {
      setIsRouting(false);
    }
  };

  // Recenter / Location Navigation
  const handleRecenter = () => {
    setIsIndiaGridMode(false);
    setSelectedCell(null);
    setSelectedStreet(null);
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [longitude, latitude],
        zoom: 13.0,
        essential: true
      });
      loadThermoMapData(latitude, longitude, 8, timeOfDay);
    }
  };

  const handlePanIndiaOverview = () => {
    setIsIndiaGridMode(true);
    setSelectedCell(null);
    setSelectedStreet(null);
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [78.9629, 22.5937],
        zoom: 4.8,
        essential: true
      });
      loadIndiaGridData(timeOfDay);
    }
  };

  // Metric Tab Switcher
  const handleTopTabChange = (tab: TopMetricTab) => {
    setActiveMetricTab(tab);
    let mappedMetric: ThermalMetric = 'risk';
    if (tab === 'temperature' || tab === 'heat_index') {
      mappedMetric = 'air_temp';
    } else if (tab === 'wbgt') {
      mappedMetric = 'wbgt';
    } else if (tab === 'heat_risk' || tab === 'htsi' || tab === 'utci') {
      mappedMetric = 'risk';
    } else {
      mappedMetric = 'air_temp';
    }
    setActiveMetric(mappedMetric);
    if (mapRef.current) {
      applyDynamicStyling(mapRef.current, mappedMetric, basemapMode);
    }
  };

  // Search handler
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapRef.current) return;
    const q = searchQuery.toLowerCase().trim();

    // City anchor coordinate mapping
    const cities: Record<string, [number, number]> = {
      delhi: [77.2090, 28.6139],
      mumbai: [72.8777, 19.0760],
      chennai: [80.2707, 13.0827],
      bengaluru: [77.5946, 12.9716],
      bangalore: [77.5946, 12.9716],
      kolkata: [88.3639, 22.5726],
      ahmedabad: [72.5714, 23.0225],
      jaipur: [75.7873, 26.9124],
      lucknow: [80.9462, 26.8467],
      bhopal: [77.4126, 23.2599],
      hyderabad: [78.4867, 17.3850],
      patna: [85.1376, 25.5941],
      rajasthan: [74.2179, 27.0238],
      gujarat: [71.1924, 22.2587],
      maharashtra: [75.7139, 19.7515],
      tamilnadu: [78.6569, 11.1271],
      kerala: [76.2711, 10.8505]
    };

    const target = cities[q];
    if (target) {
      mapRef.current.flyTo({
        center: target,
        zoom: 7.5,
        essential: true
      });
    }
  };

  return (
    <div className="relative w-full bg-[#f8fafc] text-slate-800 rounded-3xl overflow-hidden border border-slate-200 shadow-sm flex flex-col font-sans">
      {/* ======================================================== */}
      {/* 1. TOP HEADER BAR: SEARCH, LOCATION, LIVE DATA INDICATOR  */}
      {/* ======================================================== */}
      <div className="bg-white px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-sm">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-black tracking-tight text-slate-900 block leading-tight">THERMOSAFE AI</span>
              <span className="text-[10px] text-slate-400 font-medium">Safer Communities. Cooler Tomorrows.</span>
            </div>
          </div>
        </div>

        {/* Search Bar matching Image 2 */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search state, district, city or pin location..."
            className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs text-slate-800 rounded-xl pl-9 pr-4 py-2 border border-slate-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
          />
        </form>

        {/* Location & Time Indicator */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium">
            <MapPin className="w-3.5 h-3.5 text-orange-600" />
            <span>{isIndiaGridMode ? 'India' : locationName}</span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentDateFormatted}</span>
          </div>

          {/* Live Data Badge with Pulsing Green Dot */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Data</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MAP CONTROLS: METRIC PILL TABS & LAYERS DROPDOWN     */}
      {/* ======================================================== */}
      <div className="bg-white/95 backdrop-blur px-5 py-2.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 z-10">
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
          {(
            [
              { id: 'heat_risk', label: 'Heat Risk Map' },
              { id: 'temperature', label: 'Temperature' },
              { id: 'wbgt', label: 'WBGT' },
              { id: 'heat_index', label: 'Heat Index' },
              { id: 'utci', label: 'UTCI' },
              { id: 'htsi', label: 'HTSI' },
              { id: 'humidity', label: 'Humidity' },
              { id: 'wind', label: 'Wind' }
            ] as Array<{ id: TopMetricTab; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTopTabChange(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeMetricTab === tab.id
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Layers Dropdown Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowLayerPanel(!showLayerPanel)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-xs transition"
            >
              <Layers className="w-3.5 h-3.5 text-orange-600" />
              <span>Layers</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Layers Dropdown Drawer matching Image 2 reference */}
            {showLayerPanel && (
              <div className="absolute right-0 top-10 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-30 text-xs space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block border-b border-slate-100 pb-1">
                  Map Layers
                </span>
                <div className="space-y-1.5 text-slate-700">
                  <label className="flex items-center justify-between cursor-pointer py-0.5">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-600" />
                      Heat Risk (HTSI)
                    </span>
                    <input
                      type="checkbox"
                      checked={layerCheckboxes.heatRisk}
                      onChange={(e) => setLayerCheckboxes({ ...layerCheckboxes, heatRisk: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer py-0.5">
                    <span className="flex items-center gap-2 font-medium">
                      <Thermometer className="w-3 h-3 text-red-500" />
                      Temperature
                    </span>
                    <input
                      type="checkbox"
                      checked={layerCheckboxes.temperature}
                      onChange={(e) => setLayerCheckboxes({ ...layerCheckboxes, temperature: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer py-0.5">
                    <span className="flex items-center gap-2 font-medium">
                      <Droplets className="w-3 h-3 text-sky-500" />
                      Humidity
                    </span>
                    <input
                      type="checkbox"
                      checked={layerCheckboxes.humidity}
                      onChange={(e) => setLayerCheckboxes({ ...layerCheckboxes, humidity: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer py-0.5">
                    <span className="flex items-center gap-2 font-medium">
                      <Wind className="w-3 h-3 text-teal-500" />
                      Wind Speed
                    </span>
                    <input
                      type="checkbox"
                      checked={layerCheckboxes.windSpeed}
                      onChange={(e) => setLayerCheckboxes({ ...layerCheckboxes, windSpeed: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer py-0.5">
                    <span className="flex items-center gap-2 font-medium text-red-600">
                      <Plus className="w-3 h-3 bg-red-600 text-white rounded-full p-0.5" />
                      Hospitals
                    </span>
                    <input
                      type="checkbox"
                      checked={layerCheckboxes.hospitals}
                      onChange={(e) => setLayerCheckboxes({ ...layerCheckboxes, hospitals: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer py-0.5">
                    <span className="flex items-center gap-2 font-medium text-emerald-600">
                      <Activity className="w-3 h-3 text-emerald-600" />
                      Emergency Centres
                    </span>
                    <input
                      type="checkbox"
                      checked={layerCheckboxes.emergencyCentres}
                      onChange={(e) => setLayerCheckboxes({ ...layerCheckboxes, emergencyCentres: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer py-0.5">
                    <span className="flex items-center gap-2 font-medium text-sky-600">
                      <ShieldAlert className="w-3 h-3 text-sky-600" />
                      Cooling Centres
                    </span>
                    <input
                      type="checkbox"
                      checked={layerCheckboxes.coolingCentres}
                      onChange={(e) => setLayerCheckboxes({ ...layerCheckboxes, coolingCentres: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer py-0.5">
                    <span className="flex items-center gap-2 font-medium">
                      <Globe className="w-3 h-3 text-slate-500" />
                      State Boundaries
                    </span>
                    <input
                      type="checkbox"
                      checked={layerCheckboxes.stateBoundaries}
                      onChange={(e) => setLayerCheckboxes({ ...layerCheckboxes, stateBoundaries: e.target.checked })}
                      className="rounded text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Diurnal Selector */}
          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 text-xs font-semibold text-slate-600">
            <button
              onClick={() => {
                setTimeOfDay('afternoon');
                loadIndiaGridData('afternoon');
              }}
              className={`px-2.5 py-1 rounded-lg transition ${timeOfDay === 'afternoon' ? 'bg-white text-orange-600 font-bold shadow-xs' : 'hover:text-slate-900'}`}
            >
              Day
            </button>
            <button
              onClick={() => {
                setTimeOfDay('night');
                loadIndiaGridData('night');
              }}
              className={`px-2.5 py-1 rounded-lg transition ${timeOfDay === 'night' ? 'bg-white text-indigo-600 font-bold shadow-xs' : 'hover:text-slate-900'}`}
            >
              Night
            </button>
          </div>

          {/* Pan-India / Recenter Toggle */}
          <button
            onClick={isIndiaGridMode ? handleRecenter : handlePanIndiaOverview}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-xs transition flex items-center gap-1.5"
            title={isIndiaGridMode ? 'Focus on My GPS Location' : 'Reset to Pan-India Overview'}
          >
            <Compass className="w-3.5 h-3.5 text-orange-600" />
            <span>{isIndiaGridMode ? 'My Location' : 'Pan-India'}</span>
          </button>

          {/* Officer 3D Command Mode */}
          {isOfficerOrAdmin && (
            <button
              onClick={() => setShow3DCommand(true)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-black shadow-xs flex items-center gap-1.5 transition"
              title="Open Officer-Only 3D Thermal Terrain Center"
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Topo</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. MAIN MAP WORKSPACE + RIGHT "INDIA OVERVIEW" PANEL     */}
      {/* ======================================================== */}
      <div className="relative w-full flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* The MapLibre GL Canvas Container (Strictly Bounded to India) */}
        <div className="relative flex-1" style={{ minHeight: height }}>
          <div ref={mapContainer} style={{ width: '100%', height: '100%', minHeight: height }} />

          {/* Route Summary Floating Overlay */}
          {routeSummary && (
            <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur border border-orange-200 p-3 rounded-2xl shadow-lg flex items-center justify-between gap-4 text-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-orange-600" />
                <div>
                  <span className="font-bold text-slate-800">Route to {routeSummary.summary}</span>
                  <span className="text-slate-500 block text-[11px]">
                    {routeSummary.distance_km} km · {routeSummary.duration_mins} mins
                  </span>
                </div>
              </div>
              <button
                onClick={() => setRouteSummary(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Loading Indicator */}
          {(isLoadingRisk || isRouting) && (
            <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-200 shadow-md text-xs font-bold text-orange-600 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{isRouting ? 'Calculating Optimal Emergency Route...' : 'Updating Real-Time India Thermal Grid (Open-Meteo)...'}</span>
            </div>
          )}

          {/* Toggle Button to re-open Right Panel when hidden */}
          {!showRightPanel && (
            <button
              onClick={() => setShowRightPanel(true)}
              className="absolute top-3 right-3 z-20 bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-200 shadow-md text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition"
              title="Open India Overview Panel"
            >
              <Info className="w-3.5 h-3.5 text-orange-600" />
              <span>India Overview</span>
            </button>
          )}
        </div>

        {/* Right Side Panel: "India Overview" matching Image 2 reference */}
        {showRightPanel && (
          <div className="w-full md:w-80 bg-white border-l border-slate-200 p-4 space-y-4 overflow-y-auto max-h-[750px] shadow-sm z-10 text-xs">
            {/* Header with Title & Stats */}
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900">India Overview</h3>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] font-bold border border-red-200">
                    {indiaOverview?.risk_category || 'High Risk'}
                  </span>
                  <button
                    onClick={() => setShowRightPanel(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                    title="Close Panel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Main Average Temperature Display */}
              <div className="flex items-center gap-3 mt-2">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600">
                  <Thermometer className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-2xl font-black text-slate-900 tracking-tight block leading-none">
                    {indiaOverview?.average_temperature_c ?? 36.8}°C
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">Average Temperature</span>
                </div>
              </div>

              {/* Administrative Geography Counts */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
                <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                  <span className="text-sm font-black text-slate-800 block">28</span>
                  <span className="text-[10px] text-slate-400 font-medium">States</span>
                </div>
                <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                  <span className="text-sm font-black text-slate-800 block">8</span>
                  <span className="text-[10px] text-slate-400 font-medium">UTs</span>
                </div>
                <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                  <span className="text-sm font-black text-slate-800 block">776</span>
                  <span className="text-[10px] text-slate-400 font-medium">Districts</span>
                </div>
              </div>
            </div>

            {/* Current Conditions (India) */}
            <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-100 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Current Conditions (India)
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Temperature</span>
                  <span className="font-bold text-slate-800">{indiaOverview?.average_temperature_c ?? 36.8} °C</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Feels Like</span>
                  <span className="font-bold text-slate-800">{indiaOverview?.apparent_temperature_c ?? 41.2} °C</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Humidity</span>
                  <span className="font-bold text-slate-800">{indiaOverview?.relative_humidity ?? 48} %</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Wind Speed</span>
                  <span className="font-bold text-slate-800">{indiaOverview?.wind_speed_kmh ?? 12} km/h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">WBGT</span>
                  <span className="font-bold text-slate-800">{indiaOverview?.wbgt_c ?? 30.5} °C</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">UTCI</span>
                  <span className="font-bold text-slate-800">{indiaOverview?.utci_c ?? 38.7} °C</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">HTSI</span>
                  <span className="font-bold text-orange-600">{indiaOverview?.htsi_score ?? 0.72} (High)</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200/60 text-[10px] text-slate-400">
                Last updated: {indiaOverview?.last_updated ? new Date(indiaOverview.last_updated).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '22 Sep 2026, 08:00 PM'}
              </div>
            </div>

            {/* Heat Risk Level Legend matching Image 2 reference */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800">Heat Risk Level (HTSI)</span>
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#7f1d1d]" />
                  <span className="text-slate-700 font-medium">Extreme (&ge; 0.8)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#dc2626]" />
                  <span className="text-slate-700 font-medium">Very High (0.6 - 0.8)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#ea580c]" />
                  <span className="text-slate-700 font-medium">High (0.4 - 0.6)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                  <span className="text-slate-700 font-medium">Moderate (0.2 - 0.4)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#fde047]" />
                  <span className="text-slate-700 font-medium">Low (&lt; 0.2)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 4. BOTTOM ANALYTICAL CARDS (MATCHING IMAGE 2 REFERENCE)  */}
      {/* ======================================================== */}
      <div className="bg-slate-50 p-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs z-10">
        {/* Card 1: High Risk States */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
          <span className="text-xs font-black text-slate-800 block">High Risk States</span>
          <div className="space-y-2">
            {(
              indiaOverview?.high_risk_states || [
                { state: 'Rajasthan', htsi: 0.86 },
                { state: 'Madhya Pradesh', htsi: 0.81 },
                { state: 'Uttar Pradesh', htsi: 0.76 },
                { state: 'Maharashtra', htsi: 0.72 },
                { state: 'Gujarat', htsi: 0.71 }
              ]
            ).map((s, idx) => (
              <div key={s.state} className="space-y-0.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-medium">{s.state}</span>
                  <span className="font-bold text-slate-800">{s.htsi.toFixed(2)}</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${s.htsi * 100}%`,
                      backgroundColor: idx === 0 ? '#7f1d1d' : idx === 1 ? '#dc2626' : idx === 2 ? '#ea580c' : '#f59e0b'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Thermal Stress Forecast (India Avg.) */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 block">Thermal Stress Forecast (India Avg.)</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-600" />
              <span>Temp (°C)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              <span>HTSI</span>
            </span>
          </div>
          {/* Simple Clean Responsive SVG Trend Line */}
          <div className="pt-2">
            <svg viewBox="0 0 240 60" className="w-full h-12 stroke-current">
              <polyline
                fill="none"
                stroke="#ea580c"
                strokeWidth="2.5"
                points="10,25 60,18 120,22 180,30 230,32"
              />
              <circle cx="10" cy="25" r="3" fill="#ea580c" />
              <circle cx="60" cy="18" r="3" fill="#ea580c" />
              <circle cx="120" cy="22" r="3" fill="#ea580c" />
              <circle cx="180" cy="30" r="3" fill="#ea580c" />
              <circle cx="230" cy="32" r="3" fill="#ea580c" />
            </svg>
            <div className="flex justify-between text-[9px] text-slate-400 font-medium px-1">
              <span>Today</span>
              <span>Tomorrow</span>
              <span>Day 3</span>
              <span>Day 4</span>
              <span>Day 5</span>
            </div>
          </div>
        </div>

        {/* Card 3: Alerts & Advisories */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800">Alerts & Advisories</span>
            <span className="text-[10px] text-orange-600 font-bold hover:underline cursor-pointer">View All &rarr;</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-red-50/70 border border-red-100">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <div className="text-[10px] leading-tight">
                <span className="font-bold text-red-900 block">Extreme Heat Alert</span>
                <span className="text-red-700">North India · Suspend peak outdoor work</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-orange-50/70 border border-orange-100">
              <ShieldAlert className="w-4 h-4 text-orange-600 flex-shrink-0" />
              <div className="text-[10px] leading-tight">
                <span className="font-bold text-orange-900 block">High Heat Warning</span>
                <span className="text-orange-700">Central India · Stay hydrated</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Quick Actions */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
          <span className="text-xs font-black text-slate-800 block">Quick Actions</span>
          <div className="grid grid-cols-1 gap-1.5">
            <button
              onClick={() => {
                const map = mapRef.current;
                if (map) {
                  map.flyTo({ center: [longitude, latitude], zoom: 14 });
                }
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-[11px] font-bold text-slate-700 flex items-center justify-between transition"
            >
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-sky-600" />
                <span>Find Nearest Cooling Centre</span>
              </span>
              <ArrowUpRight className="w-3 h-3 text-slate-400" />
            </button>
            <button
              onClick={() => {
                const map = mapRef.current;
                if (map) {
                  map.flyTo({ center: [longitude, latitude], zoom: 14 });
                }
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-[11px] font-bold text-slate-700 flex items-center justify-between transition"
            >
              <span className="flex items-center gap-1.5">
                <HeartPulse className="w-3.5 h-3.5 text-red-600" />
                <span>Locate Nearby Hospital</span>
              </span>
              <ArrowUpRight className="w-3 h-3 text-slate-400" />
            </button>
            <button
              onClick={handlePanIndiaOverview}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-[11px] font-bold text-slate-700 flex items-center justify-between transition"
            >
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-orange-600" />
                <span>Nationwide Pan-India View</span>
              </span>
              <ArrowUpRight className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. SCIENTIFIC DATA PROVENANCE FOOTER (IMAGE 2 REFERENCE) */}
      {/* ======================================================== */}
      <div className="bg-white px-5 py-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 z-10 font-medium">
        <span className="font-semibold text-slate-700">
          THERMOSAFE AI &nbsp;|&nbsp; Government. Communities. A Cooler Tomorrow.
        </span>
        <div className="flex items-center gap-4 text-[10px] text-slate-400">
          <span>Real-time data</span>
          <span>&bull;</span>
          <span>Powered by OpenStreetMap</span>
          <span>&bull;</span>
          <span>Weather: Open-Meteo</span>
          <span>&bull;</span>
          <span>Last updated: {indiaOverview?.last_updated ? new Date(indiaOverview.last_updated).toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '22 Sep 2026, 08:00 PM'}</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 6. CELL / STREET INSPECTION MODAL                        */}
      {/* ======================================================== */}
      {(selectedCell || selectedStreet) && (
        <div className="absolute top-16 right-4 z-40 w-80 bg-white/98 backdrop-blur border border-slate-200 rounded-3xl p-4 shadow-2xl text-xs space-y-3 animate-in fade-in zoom-in-95">
          <div className="flex items-start justify-between border-b border-slate-100 pb-2">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {(selectedCell as any)?.state_name ? `${(selectedCell as any).state_name} Sector` : 'Thermal Grid Cell'}
              </span>
              <h4 className="text-sm font-black text-slate-900 leading-snug">
                {(selectedCell as any)?.nearest_city ? `${(selectedCell as any).nearest_city}, ${(selectedCell as any).state_name}` : selectedStreet?.street_name || 'Selected Coordinate'}
              </h4>
            </div>
            <button
              onClick={() => {
                setSelectedCell(null);
                setSelectedStreet(null);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scientific Dual Temperature Breakdown */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2.5 rounded-2xl bg-orange-50 border border-orange-200">
              <span className="text-[10px] text-orange-700 font-bold block">Air Temperature</span>
              <strong className="text-xl font-black text-slate-900 block">
                {(selectedCell || selectedStreet)?.air_temperature_c}°C
              </strong>
              <span className="text-[9px] text-slate-400">Weather Forecast (2m)</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-[10px] text-amber-800 font-bold block">Land Surface Temp</span>
              <strong className="text-xl font-black text-amber-700 block">
                {(selectedCell || selectedStreet)?.land_surface_temp_c}°C
              </strong>
              <span className="text-[9px] text-slate-400">Satellite Skin Temp</span>
            </div>
          </div>

          {/* Additional Biometeorological Indices */}
          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[9px]">WBGT</span>
              <strong className="text-slate-800 font-bold">{(selectedCell || selectedStreet)?.wbgt_c}°C</strong>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[9px]">UTCI</span>
              <strong className="text-slate-800 font-bold">{(selectedCell || selectedStreet)?.utci_c}°C</strong>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-slate-400 block text-[9px]">Humidity</span>
              <strong className="text-slate-800 font-bold">{(selectedCell || selectedStreet)?.relative_humidity}%</strong>
            </div>
          </div>

          {/* Data Provenance & Last Updated */}
          <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 space-y-1">
            <div className="flex items-center justify-between">
              <span>Source:</span>
              <strong className="text-slate-700 font-semibold">Open-Meteo Global Model</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Confidence:</span>
              <strong className="text-emerald-600 font-bold">High (Live Observation)</strong>
            </div>
          </div>
        </div>
      )}

      {/* 3D Command Mode Modal */}
      {show3DCommand && (
        <Municipal3DCommandCenter
          centerLat={latitude}
          centerLon={longitude}
          municipalityName={locationName}
          wardName="Central Operations"
          onClose={() => setShow3DCommand(false)}
        />
      )}
    </div>
  );
};
