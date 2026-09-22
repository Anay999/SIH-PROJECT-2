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
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Thermometer,
  Satellite,
  Grid
} from 'lucide-react';
import type {
  H3RiskProperties,
  OsmFacilityProperties,
  StreetThermalProperties,
  ThermalMetric,
  TimeOfDay,
  BasemapMode
} from '../../types/thermomap';
import {
  fetchThermoMapRisk,
  fetchThermoMapFacilities,
  fetchStreetThermalData,
  fetchEmergencyRoute
} from '../../services/thermoMapService';

export interface ThermoMapProps {
  latitude: number;
  longitude: number;
  locationName?: string;
  onSelectFacility?: (facility: OsmFacilityProperties) => void;
  selectedFacility?: OsmFacilityProperties | { name: string; latitude: number; longitude: number; [key: string]: any } | null;
  height?: string;
}

export const ThermoMap: React.FC<ThermoMapProps> = ({
  latitude,
  longitude,
  locationName = 'Detected Location',
  onSelectFacility,
  selectedFacility,
  height = '620px'
}) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Core State
  const [isLoadingRisk, setIsLoadingRisk] = useState<boolean>(true);
  const [resolution, setResolution] = useState<number>(8);
  const [activeMetric, setActiveMetric] = useState<ThermalMetric>('air_temp');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('afternoon');
  const [basemapMode, setBasemapMode] = useState<BasemapMode>('streets');
  const [isAutoResolution, setIsAutoResolution] = useState<boolean>(true);
  const [diurnalNotice, setDiurnalNotice] = useState<string | null>(null);

  // Layer Toggles
  const [showLinedGrid, setShowLinedGrid] = useState<boolean>(true);
  const [showStreets, setShowStreets] = useState<boolean>(true);
  const [showFacilities, setShowFacilities] = useState<boolean>(true);
  const [showLayerPanel, setShowLayerPanel] = useState<boolean>(false);

  // Selected Inspections
  const [selectedCell, setSelectedCell] = useState<H3RiskProperties | null>(null);
  const [selectedStreet, setSelectedStreet] = useState<StreetThermalProperties | null>(null);

  // Routing State
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [routeSummary, setRouteSummary] = useState<{ distance_km: number; duration_mins: number; summary: string } | null>(null);

  // Helper: Apply Dynamic Styling to Grid Fills, Grid Lines, and Street Lines
  const applyDynamicStyling = (map: maplibregl.Map, metric: ThermalMetric, basemap: BasemapMode) => {
    if (!map || !map.isStyleLoaded()) return;

    // 1. Lined Thermal Grid Fills
    if (map.getLayer('thermal-grid-fill')) {
      if (metric === 'lst') {
        map.setPaintProperty('thermal-grid-fill', 'fill-color', [
          'interpolate',
          ['linear'],
          ['get', 'land_surface_temp_c'],
          25, '#06b6d4',
          30, '#10b981',
          35, '#f59e0b',
          40, '#f97316',
          44, '#ea580c',
          48, '#b91c1c'
        ]);
      } else if (metric === 'wbgt') {
        map.setPaintProperty('thermal-grid-fill', 'fill-color', [
          'interpolate',
          ['linear'],
          ['get', 'wbgt_c'],
          23, '#06b6d4',
          26, '#10b981',
          28, '#f59e0b',
          30, '#f97316',
          32, '#ea580c',
          34, '#b91c1c'
        ]);
      } else if (metric === 'risk') {
        map.setPaintProperty('thermal-grid-fill', 'fill-color', [
          'match',
          ['get', 'risk_category'],
          'LOW', '#10b981',
          'MODERATE', '#f59e0b',
          'HIGH', '#f97316',
          'VERY HIGH', '#ea580c',
          'EXTREME', '#b91c1c',
          ['coalesce', ['get', 'color'], '#ea580c']
        ]);
      } else {
        // air_temp
        map.setPaintProperty('thermal-grid-fill', 'fill-color', [
          'interpolate',
          ['linear'],
          ['get', 'air_temperature_c'],
          25, '#06b6d4',
          29, '#10b981',
          33, '#f59e0b',
          37, '#f97316',
          40, '#ea580c',
          43, '#b91c1c'
        ]);
      }
    }

    // 2. Crisp Thermal Grid Outline Mesh (Lines)
    if (map.getLayer('thermal-grid-lines')) {
      const gridLineColor = basemap === 'satellite' ? '#ffffff' : '#334155';
      map.setPaintProperty('thermal-grid-lines', 'line-color', gridLineColor);
      map.setPaintProperty('thermal-grid-lines', 'line-width', 1.4);
      map.setPaintProperty('thermal-grid-lines', 'line-opacity', basemap === 'satellite' ? 0.75 : 0.6);
    }

    // 3. Street Thermal Core Lines (Synchronized with Active Metric)
    if (map.getLayer('street-lines-core')) {
      if (metric === 'lst') {
        map.setPaintProperty('street-lines-core', 'line-color', [
          'interpolate',
          ['linear'],
          ['get', 'land_surface_temp_c'],
          25, '#06b6d4',
          30, '#10b981',
          35, '#f59e0b',
          40, '#f97316',
          44, '#ea580c',
          48, '#b91c1c'
        ]);
      } else if (metric === 'wbgt') {
        map.setPaintProperty('street-lines-core', 'line-color', [
          'interpolate',
          ['linear'],
          ['get', 'wbgt_c'],
          23, '#06b6d4',
          26, '#10b981',
          28, '#f59e0b',
          30, '#f97316',
          32, '#ea580c',
          34, '#b91c1c'
        ]);
      } else if (metric === 'risk') {
        map.setPaintProperty('street-lines-core', 'line-color', [
          'match',
          ['get', 'risk_category'],
          'LOW', '#10b981',
          'MODERATE', '#f59e0b',
          'HIGH', '#f97316',
          'VERY HIGH', '#ea580c',
          'EXTREME', '#b91c1c',
          ['coalesce', ['get', 'color'], '#ea580c']
        ]);
      } else {
        // air_temp
        map.setPaintProperty('street-lines-core', 'line-color', [
          'interpolate',
          ['linear'],
          ['get', 'air_temperature_c'],
          25, '#06b6d4',
          29, '#10b981',
          33, '#f59e0b',
          37, '#f97316',
          40, '#ea580c',
          43, '#b91c1c'
        ]);
      }
    }

    // 4. Street Casing Line Contrast
    if (map.getLayer('street-lines-casing')) {
      map.setPaintProperty('street-lines-casing', 'line-color', basemap === 'satellite' ? '#020617' : '#ffffff');
    }
  };

  // 1. Initialize MapLibre Canvas with Dual Basemap Sources (OSM Light + Satellite)
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

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [longitude, latitude],
      zoom: 13.0,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    // Pulsing User Location Marker
    const markerEl = document.createElement('div');
    markerEl.className = 'thermo-user-marker';
    markerEl.style.width = '22px';
    markerEl.style.height = '22px';
    markerEl.style.borderRadius = '50%';
    markerEl.style.backgroundColor = '#ea580c';
    markerEl.style.border = '3px solid #ffffff';
    markerEl.style.boxShadow = '0 0 16px rgba(234, 88, 12, 0.85)';
    markerEl.style.cursor = 'pointer';

    const userMarker = new maplibregl.Marker({ element: markerEl })
      .setLngLat([longitude, latitude])
      .addTo(map);

    userMarkerRef.current = userMarker;

    map.on('load', () => {
      // 1. Lined Thermal Grid Source & Layers
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
          'fill-opacity': 0.45
        }
      });

      map.addLayer({
        id: 'thermal-grid-lines',
        type: 'line',
        source: 'thermal-grid',
        paint: {
          'line-color': '#334155',
          'line-width': 1.4,
          'line-opacity': 0.65
        }
      });

      // 2. Street Thermal Road Geometry Layers
      map.addSource('street-thermal-lines', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'street-lines-casing',
        type: 'line',
        source: 'street-thermal-lines',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#ffffff',
          'line-width': 7.5,
          'line-opacity': 0.95
        }
      });

      map.addLayer({
        id: 'street-lines-core',
        type: 'line',
        source: 'street-thermal-lines',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#ea580c',
          'line-width': 4.5,
          'line-opacity': 1.0
        }
      });

      // 3. Emergency Facilities Source & Layer
      map.addSource('facilities', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.addLayer({
        id: 'facilities-points',
        type: 'circle',
        source: 'facilities',
        paint: {
          'circle-radius': 8,
          'circle-color': [
            'match',
            ['get', 'amenity'],
            'hospital', '#dc2626',
            'clinic', '#ea580c',
            'cooling_center', '#0284c7',
            '#ea580c'
          ],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff'
        }
      });

      // 4. Emergency Route Source & Dual Casing Layer
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
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#9a3412',
          'line-width': 8.5,
          'line-opacity': 0.95
        }
      });

      map.addLayer({
        id: 'emergency-route-line',
        type: 'line',
        source: 'emergency-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#ea580c',
          'line-width': 4.5,
          'line-opacity': 1.0
        }
      });

      // Interactive Events: Lined Thermal Grid Cell Click
      map.on('click', 'thermal-grid-fill', (e: any) => {
        if (!e.features || e.features.length === 0) return;
        const props = e.features[0].properties as unknown as H3RiskProperties;
        setSelectedCell(props);
        setSelectedStreet(null);
      });

      map.on('mouseenter', 'thermal-grid-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'thermal-grid-fill', () => {
        map.getCanvas().style.cursor = '';
      });

      // Interactive Events: Street Line Click
      map.on('click', 'street-lines-core', (e: any) => {
        if (!e.features || e.features.length === 0) return;
        const props = e.features[0].properties as unknown as StreetThermalProperties;
        setSelectedStreet(props);
        setSelectedCell(null);
      });

      map.on('mouseenter', 'street-lines-core', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'street-lines-core', () => {
        map.getCanvas().style.cursor = '';
      });

      // Interactive Events: Facility Point Click & Direct Routing
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

      map.on('mouseenter', 'facilities-points', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'facilities-points', () => {
        map.getCanvas().style.cursor = '';
      });

      // Zoom-Adaptive Resolution Listener
      map.on('zoomend', () => {
        const currentZoom = map.getZoom();
        if (isAutoResolution) {
          let targetRes = 8;
          if (currentZoom >= 13.8) {
            targetRes = 9; // High zoom -> dense street-level grid
          } else if (currentZoom <= 11.5) {
            targetRes = 7; // Low zoom -> regional district grid
          } else {
            targetRes = 8; // Medium zoom -> ward grid
          }
          setResolution(prev => {
            if (prev !== targetRes) {
              loadThermoMapData(latitude, longitude, targetRes, timeOfDay);
              return targetRes;
            }
            return prev;
          });
        }
      });

      // Apply initial styling and ingest initial data
      applyDynamicStyling(map, activeMetric, basemapMode);
      loadThermoMapData(latitude, longitude, resolution, timeOfDay);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Load / Refresh Lined Thermal Grid, Streets, and Facilities
  const loadThermoMapData = async (lat: number, lon: number, res: number, tod: TimeOfDay) => {
    setIsLoadingRisk(true);
    try {
      const [riskGeoJson, facilitiesGeoJson, streetsGeoJson] = await Promise.all([
        fetchThermoMapRisk(lat, lon, res === 9 ? 4.0 : 6.5, res, tod),
        fetchThermoMapFacilities(lat, lon, 8.0),
        fetchStreetThermalData(lat, lon, 4.5, tod)
      ]);

      const applyData = () => {
        const map = mapRef.current;
        if (!map) return;

        const riskSource = map.getSource('thermal-grid') as maplibregl.GeoJSONSource | undefined;
        if (riskSource) {
          riskSource.setData(riskGeoJson as any);
        }

        const facSource = map.getSource('facilities') as maplibregl.GeoJSONSource | undefined;
        if (facSource) {
          facSource.setData(facilitiesGeoJson as any);
        }

        const streetSource = map.getSource('street-thermal-lines') as maplibregl.GeoJSONSource | undefined;
        if (streetSource) {
          streetSource.setData(streetsGeoJson as any);
        }

        applyDynamicStyling(map, activeMetric, basemapMode);

        // Update selected items if currently inspecting
        if (selectedStreet) {
          const matchingStreet = streetsGeoJson.features.find(
            f => f.properties.street_name === selectedStreet.street_name
          );
          if (matchingStreet) {
            setSelectedStreet(matchingStreet.properties);
          }
        } else if (selectedCell) {
          const matchingCell = riskGeoJson.features.find(
            f => f.properties.grid_id === (selectedCell as any).grid_id || f.properties.h3_index === selectedCell.h3_index
          );
          if (matchingCell) {
            setSelectedCell(matchingCell.properties);
          }
        }
      };

      if (mapRef.current && mapRef.current.isStyleLoaded()) {
        applyData();
      } else if (mapRef.current) {
        mapRef.current.once('load', applyData);
      }
    } catch (err) {
      console.error('Lined Thermal Grid data load failed:', err);
    } finally {
      setIsLoadingRisk(false);
    }
  };

  // 3. Camera pan and marker sync on coordinate change
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: [longitude, latitude],
      zoom: 13.0,
      essential: true
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([longitude, latitude]);
    }

    loadThermoMapData(latitude, longitude, resolution, timeOfDay);
  }, [latitude, longitude]);

  // 4. Handle Time-of-Day Diurnal Change
  const handleTimeOfDayChange = (tod: TimeOfDay) => {
    setTimeOfDay(tod);
    const notices: Record<TimeOfDay, string> = {
      morning: '🌅 Morning Model (08:00 AM) • Base Air: 29.5°C • Base LST: 31.2°C',
      afternoon: '☀️ Peak Afternoon Model (02:00 PM) • Base Air: 39.5°C • Base LST: 47.8°C',
      evening: '🌇 Evening Model (06:30 PM) • Base Air: 34.0°C • Base LST: 36.8°C',
      night: '🌙 Night Model (10:00 PM) • Base Air: 27.5°C • Base LST: 25.8°C'
    };
    setDiurnalNotice(notices[tod]);
    loadThermoMapData(latitude, longitude, resolution, tod);

    // Auto-clear notice after 4.5 seconds
    setTimeout(() => {
      setDiurnalNotice(null);
    }, 4500);
  };

  // 5. Handle Metric Mode Change
  const handleMetricChange = (metric: ThermalMetric) => {
    setActiveMetric(metric);
    if (mapRef.current) {
      applyDynamicStyling(mapRef.current, metric, basemapMode);
    }
  };

  const handleManualResolutionChange = (res: number) => {
    setIsAutoResolution(false);
    setResolution(res);
    loadThermoMapData(latitude, longitude, res, timeOfDay);
  };

  // 6. Update Map Layer Visibility & Basemap Mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Basemap switching
    if (basemapMode === 'satellite') {
      map.setLayoutProperty('osm-raster-layer', 'visibility', 'none');
      map.setLayoutProperty('satellite-raster-layer', 'visibility', 'visible');
    } else {
      map.setLayoutProperty('satellite-raster-layer', 'visibility', 'none');
      map.setLayoutProperty('osm-raster-layer', 'visibility', 'visible');
    }

    // Lined Grid layers
    const gridVis = showLinedGrid ? 'visible' : 'none';
    if (map.getLayer('thermal-grid-fill')) map.setLayoutProperty('thermal-grid-fill', 'visibility', gridVis);
    if (map.getLayer('thermal-grid-lines')) map.setLayoutProperty('thermal-grid-lines', 'visibility', gridVis);

    // Streets layer
    const streetVis = showStreets ? 'visible' : 'none';
    if (map.getLayer('street-lines-casing')) map.setLayoutProperty('street-lines-casing', 'visibility', streetVis);
    if (map.getLayer('street-lines-core')) map.setLayoutProperty('street-lines-core', 'visibility', streetVis);

    // Facilities layer
    const facVis = showFacilities ? 'visible' : 'none';
    if (map.getLayer('facilities-points')) map.setLayoutProperty('facilities-points', 'visibility', facVis);

    // Reapply dynamic styles with contrast
    applyDynamicStyling(map, activeMetric, basemapMode);
  }, [basemapMode, showLinedGrid, showStreets, showFacilities, activeMetric]);

  // 7. Auto-route when selectedFacility prop changes from parent
  useEffect(() => {
    if (selectedFacility) {
      const destLat = (selectedFacility as any).latitude ?? (selectedFacility as any).coordinates?.[1];
      const destLon = (selectedFacility as any).longitude ?? (selectedFacility as any).coordinates?.[0];
      if (typeof destLat === 'number' && typeof destLon === 'number') {
        triggerRoutingToCoords(destLat, destLon, selectedFacility.name);
      }
    }
  }, [selectedFacility]);

  // 8. In-Map OSRM Routing Trigger
  const triggerRoutingToCoords = async (destLat: number, destLon: number, facName: string) => {
    setIsRouting(true);
    try {
      const route = await fetchEmergencyRoute(latitude, longitude, destLat, destLon);
      setRouteSummary({
        distance_km: route.properties.distance_km,
        duration_mins: route.properties.duration_minutes,
        summary: `${route.properties.summary} → ${facName}`
      });

      if (mapRef.current) {
        const routeSource = mapRef.current.getSource('emergency-route') as maplibregl.GeoJSONSource | undefined;
        if (routeSource) {
          routeSource.setData(route as any);
        }

        const bounds = new maplibregl.LngLatBounds();
        bounds.extend([longitude, latitude]);
        bounds.extend([destLon, destLat]);
        for (const coord of route.geometry.coordinates) {
          bounds.extend(coord);
        }
        mapRef.current.fitBounds(bounds, { padding: 80, duration: 1200 });
      }
    } catch (err) {
      console.error('Route calculation failed:', err);
    } finally {
      setIsRouting(false);
    }
  };

  const handleClearRoute = () => {
    setRouteSummary(null);
    if (mapRef.current) {
      const routeSource = mapRef.current.getSource('emergency-route') as maplibregl.GeoJSONSource | undefined;
      if (routeSource) {
        routeSource.setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: [] }
        });
      }
      mapRef.current.flyTo({
        center: [longitude, latitude],
        zoom: 13.0,
        essential: true
      });
    }
  };

  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [longitude, latitude],
        zoom: 13.2,
        essential: true
      });
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[#ede7de] shadow-md bg-stone-100 font-sans">
      {/* ======================================================== */}
      {/* 1. TOP OVERLAY: ACTIVE ROUTE & NOTIFICATION BAR          */}
      {/* ======================================================== */}
      {routeSummary && (
        <div className="absolute top-3 left-3 right-16 z-20 bg-white/95 backdrop-blur border border-orange-200 p-3 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-orange-100 text-orange-700">
              <Navigation className="w-4 h-4" />
            </span>
            <div>
              <strong className="text-[#1c1917] block">
                Direct In-Map Emergency Road Route
              </strong>
              <span className="text-[#57534e] text-[11px]">
                Distance: <strong className="text-orange-700 font-bold">{routeSummary.distance_km} km</strong> · Travel Time: <strong className="text-orange-700 font-bold">{routeSummary.duration_mins} mins</strong> ({routeSummary.summary})
              </span>
            </div>
          </div>
          <button
            onClick={handleClearRoute}
            className="px-3 py-1.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] hover:bg-[#f5f3ef] text-[#57534e] hover:text-[#1c1917] font-semibold text-xs transition"
          >
            Clear Route
          </button>
        </div>
      )}

      {/* Diurnal Model Feedback Toast */}
      {diurnalNotice && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 bg-[#1c1917]/90 text-white backdrop-blur px-3.5 py-1 rounded-full border border-white/20 text-[11px] font-bold shadow-xl flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <span>{diurnalNotice}</span>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoadingRisk && (
        <div className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur px-3.5 py-1.5 rounded-xl border border-[#ede7de] text-xs font-bold text-orange-700 shadow-md flex items-center space-x-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Refreshing Thermal Grid & Streets ({timeOfDay.toUpperCase()})...</span>
        </div>
      )}

      {/* Routing In-Progress Overlay */}
      {isRouting && (
        <div className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur px-3.5 py-1.5 rounded-xl border border-orange-200 text-xs font-bold text-orange-600 shadow-md flex items-center space-x-2">
          <Navigation className="w-3.5 h-3.5 animate-spin" />
          <span>Calculating OSRM Road Route...</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. TOP-LEFT FLOATING CONTROL DOCK: METRICS & LAYERS      */}
      {/* ======================================================== */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 max-w-sm">
        {/* Metric Selector Bar */}
        <div className="bg-white/95 backdrop-blur border border-[#ede7de] p-1.5 rounded-2xl shadow-md flex items-center gap-1 text-[11px] font-bold">
          <span className="text-[10px] text-[#78716c] uppercase px-1 flex items-center gap-1">
            <Thermometer className="w-3 h-3 text-orange-600" />
            <span>MODE:</span>
          </span>
          <button
            onClick={() => handleMetricChange('air_temp')}
            className={`px-2.5 py-1 rounded-lg transition ${
              activeMetric === 'air_temp'
                ? 'bg-orange-600 text-white shadow-xs font-black'
                : 'text-[#57534e] hover:bg-[#faf9f6]'
            }`}
            title="AI-Estimated Near-Surface Air Temperature (2m Ground)"
          >
            Air Temp
          </button>
          <button
            onClick={() => handleMetricChange('lst')}
            className={`px-2.5 py-1 rounded-lg transition ${
              activeMetric === 'lst'
                ? 'bg-orange-600 text-white shadow-xs font-black'
                : 'text-[#57534e] hover:bg-[#faf9f6]'
            }`}
            title="Satellite Land Surface Temperature (LST Skin Temp)"
          >
            Satellite LST
          </button>
          <button
            onClick={() => handleMetricChange('wbgt')}
            className={`px-2.5 py-1 rounded-lg transition ${
              activeMetric === 'wbgt'
                ? 'bg-orange-600 text-white shadow-xs font-black'
                : 'text-[#57534e] hover:bg-[#faf9f6]'
            }`}
            title="Wet Bulb Globe Temperature (ISO 7243 Occupational)"
          >
            WBGT
          </button>
          <button
            onClick={() => handleMetricChange('risk')}
            className={`px-2.5 py-1 rounded-lg transition ${
              activeMetric === 'risk'
                ? 'bg-orange-600 text-white shadow-xs font-black'
                : 'text-[#57534e] hover:bg-[#faf9f6]'
            }`}
            title="Composite Heat Health Risk"
          >
            Risk
          </button>

          {/* Layer Options Drawer Toggle */}
          <button
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            className={`p-1.5 rounded-lg border transition ml-1 ${
              showLayerPanel
                ? 'bg-orange-100 border-orange-300 text-orange-800'
                : 'bg-[#faf9f6] border-[#ede7de] text-[#57534e]'
            }`}
            title="Toggle Map Layers & Basemap"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Active Mode Pill */}
        <div className="bg-white/90 backdrop-blur border border-[#ede7de] px-2.5 py-0.5 rounded-xl shadow-xs self-start flex items-center gap-1.5 text-[10px] font-semibold text-[#57534e]">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor:
                activeMetric === 'lst'
                  ? '#ea580c'
                  : activeMetric === 'wbgt'
                  ? '#0284c7'
                  : activeMetric === 'risk'
                  ? '#b91c1c'
                  : '#10b981'
            }}
          />
          <span>
            {activeMetric === 'lst'
              ? 'Viewing: Satellite LST (Surface Skin Temp)'
              : activeMetric === 'wbgt'
              ? 'Viewing: WBGT Occupational Heat Stress'
              : activeMetric === 'risk'
              ? 'Viewing: Composite Heat Health Risk'
              : 'Viewing: AI-Estimated Air Temp (2m Ground)'}
          </span>
        </div>

        {/* Collapsible Layer Customizer Panel */}
        {showLayerPanel && (
          <div className="bg-white/98 backdrop-blur border border-[#ede7de] p-3 rounded-2xl shadow-xl text-xs space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between border-b border-[#ede7de] pb-1.5 font-bold text-[#1c1917]">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-orange-600" />
                <span>Active Map Layers</span>
              </span>
              <button
                onClick={() => setShowLayerPanel(false)}
                className="text-[#78716c] hover:text-[#1c1917]"
              >
                ✕
              </button>
            </div>

            {/* Basemap Switcher (OSM Light vs Satellite) */}
            <div>
              <span className="text-[10px] text-[#78716c] uppercase font-bold block mb-1">Basemap Style</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setBasemapMode('streets')}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition ${
                    basemapMode === 'streets'
                      ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                      : 'bg-[#faf9f6] border-[#ede7de] text-[#57534e] hover:bg-[#f5f3ef]'
                  }`}
                >
                  OSM Light
                </button>
                <button
                  onClick={() => setBasemapMode('satellite')}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition flex items-center justify-center gap-1 ${
                    basemapMode === 'satellite'
                      ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                      : 'bg-[#faf9f6] border-[#ede7de] text-[#57534e] hover:bg-[#f5f3ef]'
                  }`}
                >
                  <Satellite className="w-3 h-3" />
                  <span>Satellite</span>
                </button>
              </div>
            </div>

            {/* Layer Toggles (Thermal Lined Grid, Streets, Facilities) */}
            <div className="space-y-1.5 pt-1 border-t border-[#ede7de]">
              <span className="text-[10px] text-[#78716c] uppercase font-bold block">Overlays</span>
              <label className="flex items-center justify-between cursor-pointer py-0.5">
                <span className="text-[11px] text-[#1c1917] font-medium flex items-center gap-1.5">
                  <Grid className="w-3 h-3 text-orange-600" />
                  <span>Thermal Lined Grid</span>
                </span>
                <input
                  type="checkbox"
                  checked={showLinedGrid}
                  onChange={(e) => setShowLinedGrid(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer py-0.5">
                <span className="text-[11px] text-[#1c1917] font-medium">Street Thermal Lines</span>
                <input
                  type="checkbox"
                  checked={showStreets}
                  onChange={(e) => setShowStreets(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                />
              </label>
              <label className="flex items-center justify-between cursor-pointer py-0.5">
                <span className="text-[11px] text-[#1c1917] font-medium">Emergency Facilities</span>
                <input
                  type="checkbox"
                  checked={showFacilities}
                  onChange={(e) => setShowFacilities(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3. THE MAPLIBRE GL JS CANVAS CONTAINER                   */}
      {/* ======================================================== */}
      <div ref={mapContainer} style={{ width: '100%', height }} />

      {/* ======================================================== */}
      {/* 4. DIURNAL TIME SLIDER BAR (TOP-CENTER)                  */}
      {/* ======================================================== */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-white/95 backdrop-blur border border-[#ede7de] px-2 py-1 rounded-2xl shadow-md flex items-center gap-1 text-[11px] font-bold">
        <button
          onClick={() => handleTimeOfDayChange('morning')}
          className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
            timeOfDay === 'morning' ? 'bg-amber-500 text-white font-black' : 'text-[#57534e] hover:bg-[#faf9f6]'
          }`}
          title="08:00 AM Morning Solar Escalation"
        >
          <Sunrise className="w-3.5 h-3.5" />
          <span>Morning</span>
        </button>
        <button
          onClick={() => handleTimeOfDayChange('afternoon')}
          className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
            timeOfDay === 'afternoon' ? 'bg-orange-600 text-white font-black' : 'text-[#57534e] hover:bg-[#faf9f6]'
          }`}
          title="02:00 PM Peak Insolation & Max Surface Absorption"
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Peak Afternoon</span>
        </button>
        <button
          onClick={() => handleTimeOfDayChange('evening')}
          className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
            timeOfDay === 'evening' ? 'bg-amber-600 text-white font-black' : 'text-[#57534e] hover:bg-[#faf9f6]'
          }`}
          title="06:30 PM Evening Thermal Dissipation"
        >
          <Sunset className="w-3.5 h-3.5" />
          <span>Evening</span>
        </button>
        <button
          onClick={() => handleTimeOfDayChange('night')}
          className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 ${
            timeOfDay === 'night' ? 'bg-indigo-700 text-white font-black' : 'text-[#57534e] hover:bg-[#faf9f6]'
          }`}
          title="10:00 PM Nocturnal Urban Heat Retention"
        >
          <Moon className="w-3.5 h-3.5" />
          <span>Night</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 5. FLOATING RISK LEGEND & LOCATION (BOTTOM-LEFT)         */}
      {/* ======================================================== */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur border border-[#ede7de] p-3 rounded-2xl shadow-md text-[10px] space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <strong className="block text-[#1c1917] font-bold uppercase tracking-wider text-[9px]">
            {activeMetric === 'lst'
              ? 'Satellite Land Surface Temp (LST)'
              : activeMetric === 'wbgt'
              ? 'WBGT Occupational Index (ISO 7243)'
              : activeMetric === 'risk'
              ? 'Composite Heat-Health Risk'
              : 'Air Temperature (2m Ground Level)'}
          </strong>
          <span className="text-[9px] text-[#78716c] font-medium truncate max-w-[140px]">{locationName}</span>
        </div>

        {/* Dynamic Metric Scale Thresholds */}
        <div className="flex items-center gap-1.5 font-bold">
          {activeMetric === 'air_temp' && (
            <>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#06b6d4]"></span>
                <span className="text-[#57534e]">&lt;28°C</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]"></span>
                <span className="text-[#57534e]">28-32°C</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]"></span>
                <span className="text-[#57534e]">32-35°C</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#f97316]"></span>
                <span className="text-[#57534e]">35-38°C</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#ea580c]"></span>
                <span className="text-[#57534e]">38-41°C</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#b91c1c]"></span>
                <span className="text-[#57534e]">&gt;41°C</span>
              </span>
            </>
          )}

          {activeMetric === 'lst' && (
            <>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#06b6d4]"></span>
                <span className="text-[#57534e]">&lt;30°C</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]"></span>
                <span className="text-[#57534e]">30-35°C</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]"></span>
                <span className="text-[#57534e]">35-40°C</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#f97316]"></span>
                <span className="text-[#57534e]">40-44°C</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#ea580c]"></span>
                <span className="text-[#57534e]">44-48°C</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#b91c1c]"></span>
                <span className="text-[#57534e]">&gt;48°C</span>
              </span>
            </>
          )}

          {activeMetric === 'wbgt' && (
            <>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#06b6d4]"></span>
                <span className="text-[#57534e]">&lt;24°C</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]"></span>
                <span className="text-[#57534e]">24-26°C</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]"></span>
                <span className="text-[#57534e]">26-28°C</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#f97316]"></span>
                <span className="text-[#57534e]">28-30°C</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#ea580c]"></span>
                <span className="text-[#57534e]">30-32°C</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#b91c1c]"></span>
                <span className="text-[#57534e]">&gt;32°C</span>
              </span>
            </>
          )}

          {activeMetric === 'risk' && (
            <>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]"></span>
                <span className="text-[#57534e]">Low</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]"></span>
                <span className="text-[#57534e]">Moderate</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#f97316]"></span>
                <span className="text-[#57534e]">High</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#ea580c]"></span>
                <span className="text-[#57534e]">Very High</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#b91c1c]"></span>
                <span className="text-[#57534e]">Extreme</span>
              </span>
            </>
          )}
        </div>

        <div className="pt-1 border-t border-[#ede7de] text-[9px] text-[#78716c] flex items-center justify-between">
          <span>Diurnal: <strong className="text-orange-700 font-bold">{timeOfDay.toUpperCase()}</strong></span>
          <span className="font-mono text-emerald-700 font-bold">Lined Grid Mesh</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 6. RE-CENTER & DYNAMIC RESOLUTION (BOTTOM-RIGHT)         */}
      {/* ======================================================== */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center space-x-2">
        <div className="bg-white/95 backdrop-blur border border-[#ede7de] px-2 py-1 rounded-xl shadow-md flex items-center space-x-1.5 text-[11px] font-bold text-[#1c1917]">
          <span className="text-[10px] text-[#78716c] uppercase">Mesh:</span>
          <button
            onClick={() => handleManualResolutionChange(7)}
            className={`px-1.5 py-0.5 rounded text-[10px] ${
              resolution === 7 ? 'bg-orange-600 text-white' : 'text-[#57534e] hover:bg-[#faf9f6]'
            }`}
            title="District Mesh (10x10)"
          >
            10x10
          </button>
          <button
            onClick={() => handleManualResolutionChange(8)}
            className={`px-1.5 py-0.5 rounded text-[10px] ${
              resolution === 8 ? 'bg-orange-600 text-white' : 'text-[#57534e] hover:bg-[#faf9f6]'
            }`}
            title="Neighborhood Mesh (14x14)"
          >
            14x14
          </button>
          <button
            onClick={() => handleManualResolutionChange(9)}
            className={`px-1.5 py-0.5 rounded text-[10px] ${
              resolution === 9 ? 'bg-orange-600 text-white' : 'text-[#57534e] hover:bg-[#faf9f6]'
            }`}
            title="Street-Level Mesh (20x20)"
          >
            20x20
          </button>
        </div>

        <button
          onClick={handleRecenter}
          className="p-2 rounded-xl bg-white/95 backdrop-blur border border-[#ede7de] hover:bg-[#f5f3ef] text-[#1c1917] shadow-md transition"
          title="Re-center on Your Location"
        >
          <Compass className="w-4 h-4 text-orange-600" />
        </button>
      </div>

      {/* ======================================================== */}
      {/* 7. INTERACTIVE STREET & GRID CELL INSPECTION CARD        */}
      {/* ======================================================== */}
      {(selectedCell || selectedStreet) && (
        <div className="absolute top-3 right-3 z-30 w-80 bg-white/98 backdrop-blur border border-orange-200 rounded-3xl p-4 shadow-xl text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-[#ede7de] pb-2.5">
            <div>
              <span className="text-[9px] font-mono text-[#78716c] uppercase font-bold block">
                {selectedStreet ? 'Street Road Segment' : `Lined Grid Sector: ${(selectedCell as any)?.grid_id || selectedCell?.h3_index.slice(0, 10)}`}
              </span>
              <h4 className="text-sm font-black text-[#1c1917] leading-snug mt-0.5">
                {selectedStreet ? selectedStreet.street_name : selectedCell?.street_name || 'Localized Thermal Grid Cell'}
              </h4>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className="px-2 py-0.5 rounded text-[9px] font-black text-white"
                  style={{ backgroundColor: (selectedStreet || selectedCell)?.color }}
                >
                  {(selectedStreet || selectedCell)?.risk_category}
                </span>
                <span className="text-[10px] text-[#78716c] font-medium">
                  {selectedCell?.land_cover || selectedStreet?.road_type || 'Urban Corridor'}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedCell(null);
                setSelectedStreet(null);
              }}
              className="p-1 rounded-lg text-[#78716c] hover:text-[#1c1917] hover:bg-[#faf9f6]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scientific Dual Temperature Breakdown (Air Temp vs Satellite LST) */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div
              className={`p-2.5 rounded-xl border space-y-0.5 transition ${
                activeMetric === 'air_temp'
                  ? 'bg-orange-50/70 border-orange-400 ring-1 ring-orange-400'
                  : 'bg-[#faf9f6] border-orange-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[#78716c]">Air Temperature</span>
                <span className="text-[8px] font-bold px-1 rounded bg-orange-100 text-orange-800">AI-ESTIMATED</span>
              </div>
              <strong className="text-lg font-black text-[#1c1917] block">
                {(selectedStreet || selectedCell)?.air_temperature_c}°C
              </strong>
              <span className="text-[9px] text-[#78716c]">Ground 2m Level</span>
            </div>

            <div
              className={`p-2.5 rounded-xl border space-y-0.5 transition ${
                activeMetric === 'lst'
                  ? 'bg-amber-50/70 border-amber-400 ring-1 ring-amber-400'
                  : 'bg-[#faf9f6] border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[#78716c]">Land Surface Temp</span>
                <span className="text-[8px] font-bold px-1 rounded bg-amber-100 text-amber-800">SATELLITE LST</span>
              </div>
              <strong className="text-lg font-black text-amber-700 block">
                {(selectedStreet || selectedCell)?.land_surface_temp_c}°C
              </strong>
              <span className="text-[9px] text-amber-800 font-semibold">
                {(((selectedStreet || selectedCell)?.land_surface_temp_c || 0) >= ((selectedStreet || selectedCell)?.air_temperature_c || 0))
                  ? `+${(((selectedStreet || selectedCell)?.land_surface_temp_c || 0) - ((selectedStreet || selectedCell)?.air_temperature_c || 0)).toFixed(1)}°C surface retention`
                  : `${(((selectedStreet || selectedCell)?.land_surface_temp_c || 0) - ((selectedStreet || selectedCell)?.air_temperature_c || 0)).toFixed(1)}°C surface dissipation`}
              </span>
            </div>
          </div>

          {/* Secondary Physical Indices */}
          <div className="grid grid-cols-3 gap-1.5 text-[10px] text-center">
            <div
              className={`p-1.5 rounded-xl border ${
                activeMetric === 'wbgt' ? 'bg-sky-50 border-sky-400 ring-1 ring-sky-300' : 'bg-[#faf9f6] border-[#ede7de]'
              }`}
            >
              <span className="text-[#78716c] block text-[9px]">WBGT (ISO)</span>
              <strong className="text-xs font-bold text-[#1c1917]">{(selectedStreet || selectedCell)?.wbgt_c}°C</strong>
            </div>
            <div className="bg-[#faf9f6] p-1.5 rounded-xl border border-[#ede7de]">
              <span className="text-[#78716c] block text-[9px]">UTCI Stress</span>
              <strong className="text-xs font-bold text-[#1c1917]">{(selectedStreet || selectedCell)?.utci_c}°C</strong>
            </div>
            <div className="bg-[#faf9f6] p-1.5 rounded-xl border border-[#ede7de]">
              <span className="text-[#78716c] block text-[9px]">Humidity</span>
              <strong className="text-xs font-bold text-[#1c1917]">{(selectedStreet || selectedCell)?.relative_humidity}%</strong>
            </div>
          </div>

          {/* Ergonomic Guidance */}
          {selectedCell && (
            <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-[10px] text-orange-950 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold">
                <Activity className="w-3.5 h-3.5 text-orange-700" />
                <span>Work-Rest Recommendation:</span>
              </div>
              <p className="font-semibold text-orange-900">{selectedCell.work_rest_guidance}</p>
              <div className="flex items-center justify-between pt-1 border-t border-orange-200 text-[9px] text-orange-800">
                <span>Safe Exposure: <strong>{selectedCell.safe_exposure_minutes} mins</strong></span>
                <span>Hydration: <strong>{selectedCell.water_intake_lph} L/h</strong></span>
              </div>
            </div>
          )}

          {/* Scientific Metadata & Calibration Confidence */}
          <div className="pt-2 border-t border-[#ede7de] text-[9px] text-[#78716c] space-y-1">
            <div className="flex items-center justify-between">
              <span>Calibration Confidence:</span>
              <strong className="text-emerald-700 font-bold">{(selectedStreet || selectedCell)?.confidence_pct}%</strong>
            </div>
            <div className="flex items-center justify-between text-[8px]">
              <span>Active Diurnal Step:</span>
              <strong className="text-orange-700 uppercase font-mono">{timeOfDay}</strong>
            </div>
            <p className="text-[8px] text-[#a8a29e] leading-tight">
              Satellite LST skin temperature from radiometric downscaling fused with live ground-level weather observations.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
