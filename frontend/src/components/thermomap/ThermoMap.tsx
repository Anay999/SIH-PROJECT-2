import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Navigation,
  Compass,
  RefreshCw,
  X,
  Activity
} from 'lucide-react';
import type {
  H3RiskProperties,
  OsmFacilityProperties
} from '../../types/thermomap';
import {
  fetchThermoMapRisk,
  fetchThermoMapFacilities,
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
  height = '560px'
}) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);

  const [isLoadingRisk, setIsLoadingRisk] = useState<boolean>(true);
  const [resolution, setResolution] = useState<number>(8);
  const [selectedCell, setSelectedCell] = useState<H3RiskProperties | null>(null);
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [routeSummary, setRouteSummary] = useState<{ distance_km: number; duration_mins: number; summary: string } | null>(null);

  // 1. Initialize MapLibre Canvas with OSM Light Raster/Vector style
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    // Standalone, self-hosted style descriptor without external API keys
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
        }
      },
      layers: [
        {
          id: 'osm-raster-layer',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    };

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [longitude, latitude],
      zoom: 12.8,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    // Create customized pulsing user location marker
    const markerEl = document.createElement('div');
    markerEl.className = 'thermo-user-marker';
    markerEl.style.width = '20px';
    markerEl.style.height = '20px';
    markerEl.style.borderRadius = '50%';
    markerEl.style.backgroundColor = '#ea580c';
    markerEl.style.border = '3px solid #ffffff';
    markerEl.style.boxShadow = '0 0 14px rgba(234, 88, 12, 0.7)';
    markerEl.style.cursor = 'pointer';

    const userMarker = new maplibregl.Marker({ element: markerEl })
      .setLngLat([longitude, latitude])
      .addTo(map);

    userMarkerRef.current = userMarker;

    map.on('load', () => {
      // 1. Add H3 Thermal Risk Source & Layers
      map.addSource('thermal-risk', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      // Data-Driven Fill Color by Semantic Risk Category
      map.addLayer({
        id: 'thermal-risk-fill',
        type: 'fill',
        source: 'thermal-risk',
        paint: {
          'fill-color': ['coalesce', ['get', 'color'], '#ea580c'],
          'fill-opacity': 0.48
        }
      });

      // Hexagonal Grid Boundary Outlines
      map.addLayer({
        id: 'thermal-risk-outline',
        type: 'line',
        source: 'thermal-risk',
        paint: {
          'line-color': '#ffffff',
          'line-width': 1.6,
          'line-opacity': 0.85
        }
      });

      // 2. Add Emergency Facilities Source & Layers
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
            'hospital', '#ea580c',
            'clinic', '#f97316',
            'cooling_center', '#10b981',
            '#f97316'
          ],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#ffffff'
        }
      });

      // 3. Add Emergency Route Source & Layers (Casing + Core Line)
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
          'line-color': '#c2410c',
          'line-width': 8,
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
          'line-color': '#f97316',
          'line-width': 4,
          'line-opacity': 1.0
        }
      });

      // Interactive Click on H3 Hexagon Cell
      map.on('click', 'thermal-risk-fill', (e: any) => {
        if (!e.features || e.features.length === 0) return;
        const props = e.features[0].properties as unknown as H3RiskProperties;
        setSelectedCell(props);
      });

      map.on('mouseenter', 'thermal-risk-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'thermal-risk-fill', () => {
        map.getCanvas().style.cursor = '';
      });

      // Interactive Click on Facility Point
      map.on('click', 'facilities-points', (e: any) => {
        if (!e.features || e.features.length === 0) return;
        const feat = e.features[0];
        const props = feat.properties as unknown as OsmFacilityProperties;
        if (onSelectFacility) {
          onSelectFacility(props);
        }

        // Calculate and render in-map route to facility
        const coords = (feat.geometry as any).coordinates as [number, number];
        triggerRoutingToCoords(coords[1], coords[0], props.name);
      });

      map.on('mouseenter', 'facilities-points', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'facilities-points', () => {
        map.getCanvas().style.cursor = '';
      });

      // Load initial H3 grid and facilities
      loadThermoMapData(latitude, longitude, resolution);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Load / Refresh H3 Risk Grid & Facilities
  const loadThermoMapData = async (lat: number, lon: number, res: number) => {
    setIsLoadingRisk(true);
    try {
      const [riskGeoJson, facilitiesGeoJson] = await Promise.all([
        fetchThermoMapRisk(lat, lon, 6.0, res),
        fetchThermoMapFacilities(lat, lon, 8.0)
      ]);

      const applyData = () => {
        const map = mapRef.current;
        if (!map) return;
        const riskSource = map.getSource('thermal-risk') as maplibregl.GeoJSONSource | undefined;
        if (riskSource) {
          riskSource.setData(riskGeoJson as any);
        }

        const facSource = map.getSource('facilities') as maplibregl.GeoJSONSource | undefined;
        if (facSource) {
          facSource.setData(facilitiesGeoJson as any);
        }
      };

      if (mapRef.current && mapRef.current.isStyleLoaded()) {
        applyData();
      } else if (mapRef.current) {
        mapRef.current.once('load', applyData);
      }
    } catch (err) {
      console.error('ThermoMap data load failed:', err);
    } finally {
      setIsLoadingRisk(false);
    }
  };


  // 3. Move camera & update marker when coordinates change
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: [longitude, latitude],
      zoom: 12.8,
      essential: true
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([longitude, latitude]);
    }

    loadThermoMapData(latitude, longitude, resolution);
  }, [latitude, longitude, resolution]);

  // 3b. Auto-route when selectedFacility prop changes from parent
  useEffect(() => {
    if (selectedFacility) {
      const destLat = (selectedFacility as any).latitude ?? (selectedFacility as any).coordinates?.[1];
      const destLon = (selectedFacility as any).longitude ?? (selectedFacility as any).coordinates?.[0];
      if (typeof destLat === 'number' && typeof destLon === 'number') {
        triggerRoutingToCoords(destLat, destLon, selectedFacility.name);
      }
    }
  }, [selectedFacility]);

  // 4. In-Map OSRM Routing Trigger
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

        // Fit map bounds to encompass start and destination
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
        zoom: 12.8,
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
        <div className="absolute top-3 left-3 right-14 z-20 bg-white/95 backdrop-blur border border-orange-200 p-3 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs">
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

      {/* Loading Overlay */}
      {isLoadingRisk && (
        <div className="absolute top-4 left-4 z-20 bg-white/90 backdrop-blur px-3.5 py-1.5 rounded-xl border border-[#ede7de] text-xs font-bold text-orange-700 shadow-md flex items-center space-x-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Generating H3 Hexagonal Grid (Res {resolution})...</span>
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
      {/* 2. THE MAPLIBRE GL JS CANVAS CONTAINER                   */}
      {/* ======================================================== */}
      <div ref={mapContainer} style={{ width: '100%', height }} />

      {/* ======================================================== */}
      {/* 3. FLOATING RISK LEGEND (BOTTOM-LEFT)                    */}
      {/* ======================================================== */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur border border-[#ede7de] p-3 rounded-2xl shadow-md text-[10px] space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <strong className="block text-[#1c1917] font-bold uppercase tracking-wider text-[9px]">
            H3 Hexagonal Thermal Risk
          </strong>
          <span className="text-[9px] text-[#78716c] font-medium truncate max-w-[140px]">{locationName}</span>
        </div>
        <div className="flex items-center gap-1.5 font-bold">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
            <span className="text-[#57534e]">Low</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500"></span>
            <span className="text-[#57534e]">Moderate</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-orange-500"></span>
            <span className="text-[#57534e]">High</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#ea580c]"></span>
            <span className="text-[#57534e]">Very High</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-700"></span>
            <span className="text-[#57534e]">Extreme</span>
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. RE-CENTER & RESOLUTION SWITCHER (BOTTOM-RIGHT)        */}
      {/* ======================================================== */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center space-x-2">
        <div className="bg-white/95 backdrop-blur border border-[#ede7de] px-2 py-1 rounded-xl shadow-md flex items-center space-x-1.5 text-[11px] font-bold text-[#1c1917]">
          <span className="text-[10px] text-[#78716c] uppercase">Grid:</span>
          <button
            onClick={() => setResolution(7)}
            className={`px-1.5 py-0.5 rounded text-[10px] ${
              resolution === 7 ? 'bg-orange-600 text-white' : 'text-[#57534e] hover:bg-[#faf9f6]'
            }`}
          >
            Res 7 (~1.2km)
          </button>
          <button
            onClick={() => setResolution(8)}
            className={`px-1.5 py-0.5 rounded text-[10px] ${
              resolution === 8 ? 'bg-orange-600 text-white' : 'text-[#57534e] hover:bg-[#faf9f6]'
            }`}
          >
            Res 8 (~460m)
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
      {/* 5. INTERACTIVE H3 CELL MICROCLIMATE INSPECTION MODAL     */}
      {/* ======================================================== */}
      {selectedCell && (
        <div className="absolute top-3 right-3 z-30 w-72 bg-white/98 backdrop-blur border border-orange-200 rounded-3xl p-4 shadow-xl text-xs space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-start justify-between border-b border-[#ede7de] pb-2.5">
            <div>
              <span className="text-[9px] font-mono text-[#78716c] uppercase font-bold block">
                H3 Cell: {selectedCell.h3_index.slice(0, 10)}...
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-black text-white"
                  style={{ backgroundColor: selectedCell.color }}
                >
                  {selectedCell.risk_category}
                </span>
                <span className="text-xs font-black text-[#1c1917]">
                  HTSI: {selectedCell.htsi_score}/100
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedCell(null)}
              className="p-1 rounded-lg text-[#78716c] hover:text-[#1c1917] hover:bg-[#faf9f6]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-[#faf9f6] p-2 rounded-xl border border-[#ede7de]">
              <span className="text-[10px] text-[#78716c] block">Ambient Temp</span>
              <strong className="text-sm font-black text-[#1c1917]">{selectedCell.temperature_c}°C</strong>
            </div>
            <div className="bg-[#faf9f6] p-2 rounded-xl border border-[#ede7de]">
              <span className="text-[10px] text-[#78716c] block">Feels Like</span>
              <strong className="text-sm font-black text-orange-600">{selectedCell.feels_like_c}°C</strong>
            </div>
            <div className="bg-[#faf9f6] p-2 rounded-xl border border-[#ede7de]">
              <span className="text-[10px] text-[#78716c] block">WBGT (ISO 7243)</span>
              <strong className="text-xs font-black text-[#1c1917]">{selectedCell.wbgt_c}°C</strong>
            </div>
            <div className="bg-[#faf9f6] p-2 rounded-xl border border-[#ede7de]">
              <span className="text-[10px] text-[#78716c] block">UTCI Stress</span>
              <strong className="text-xs font-black text-[#1c1917]">{selectedCell.utci_c}°C</strong>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-[10px] text-orange-950 space-y-1">
            <div className="flex items-center space-x-1.5 font-bold">
              <Activity className="w-3.5 h-3.5 text-orange-700" />
              <span>Ergonomic Work-Rest Guidance:</span>
            </div>
            <p className="font-semibold text-orange-900">{selectedCell.work_rest_guidance}</p>
            <div className="flex items-center justify-between pt-1 border-t border-orange-200 text-[9px] text-orange-800">
              <span>Safe Exposure: <strong>{selectedCell.safe_exposure_minutes} mins</strong></span>
              <span>Hydration: <strong>{selectedCell.water_intake_lph} L/h</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
