import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Layers,
  Thermometer,
  Radio,
  Maximize2,
  Minimize2,
  ChevronLeft,
  Sliders,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Cpu,
  Gauge,
  AlertTriangle
} from 'lucide-react';
import type {
  Thermal3DCommandData,
  Thermal3DTelemetryTarget,
  ThermalMetric,
  TimeOfDay,
  Command3DConfig
} from '../../types/thermomap';
import { fetch3DThermalCommandData } from '../../services/thermoMapService';

export interface Municipal3DCommandCenterProps {
  centerLat: number;
  centerLon: number;
  municipalityName?: string;
  wardName?: string;
  onClose: () => void;
}

export const Municipal3DCommandCenter: React.FC<Municipal3DCommandCenterProps> = ({
  centerLat,
  centerLon,
  municipalityName = 'Greater Chennai Corporation',
  wardName = 'Ward 114 - Central Division',
  onClose
}) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Telemetry & Data State
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [commandData, setCommandData] = useState<Thermal3DCommandData | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<Thermal3DTelemetryTarget | null>(null);
  const [selectedBand, setSelectedBand] = useState<any | null>(null);

  // Tactical HUD Controls State
  const [activeMetric, setActiveMetric] = useState<ThermalMetric>('air_temp');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('afternoon');
  const [config, setConfig] = useState<Command3DConfig>({
    gridSize: 1024,
    thermalOpacity: 0.75,
    colorScheme: 'turbo',
    showTopography: true,
    showBuildings: true,
    showSensors: true,
    pitch: 65,
    bearing: 28
  });
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(60);

  // Simple FPS Telemetry Counter
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const measureFps = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(measureFps);
    };

    animId = requestAnimationFrame(measureFps);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Fetch 3D Command Center Data
  const load3DData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetch3DThermalCommandData(centerLat, centerLon, 7.5, timeOfDay);
      setCommandData(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load 3D Thermal Command Center data');
    } finally {
      setLoading(false);
    }
  }, [centerLat, centerLon, timeOfDay]);

  useEffect(() => {
    load3DData();
  }, [load3DData]);

  // Color scheme mappings
  const getColorForBand = useCallback((bandIndex: number, scheme: Command3DConfig['colorScheme']) => {
    const palettes: Record<string, string[]> = {
      turbo: ['#b91c1c', '#ea580c', '#f59e0b', '#10b981', '#06b6d4'],
      inferno: ['#fcffa4', '#f98e09', '#bc3754', '#57106e', '#000004'],
      ironbow: ['#ffffff', '#ffeb3b', '#f44336', '#9c27b0', '#1a237e'],
      rainbow: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'],
      oceanic: ['#e11d48', '#ea580c', '#0284c7', '#0891b2', '#059669']
    };
    const palette = palettes[scheme] || palettes.turbo;
    return palette[Math.min(bandIndex - 1, palette.length - 1)] || '#ea580c';
  }, []);

  // Initialize MapLibre 3D Perspective Scene
  useEffect(() => {
    if (!mapContainer.current) return;

    // Dark tactical military basemap style
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-dark': {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors, © CARTO'
          }
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#06090e' }
          },
          {
            id: 'osm-dark-tiles',
            type: 'raster',
            source: 'osm-dark',
            minzoom: 0,
            maxzoom: 20,
            paint: {
              'raster-opacity': 0.85,
              'raster-contrast': 0.2
            }
          }
        ]
      },
      center: [centerLon, centerLat],
      zoom: 12.8,
      pitch: config.pitch,
      bearing: config.bearing,
      maxPitch: 80
    });

    mapRef.current = map;

    map.on('load', () => {
      // Add tactical 3D sky atmosphere
      if (typeof (map as any).setSky === 'function') {
        (map as any).setSky({
          'sky-color': '#030712',
          'sky-horizon-blend': 0.6,
          'horizon-color': '#111827',
          'horizon-fog-blend': 0.7
        });
      }
    });

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [centerLat, centerLon]);

  // Update 3D Plume and Elevation Layers when data or config changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !commandData) return;

    // Remove existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Source: 3D Thermal Plume Bands
    if (map.getSource('thermal-3d-plume')) {
      (map.getSource('thermal-3d-plume') as maplibregl.GeoJSONSource).setData(commandData);
    } else {
      map.addSource('thermal-3d-plume', {
        type: 'geojson',
        data: commandData
      });
    }

    // 1. 3D Fill-Extrusion Layer (Physically elevated thermal dome)
    if (!map.getLayer('thermal-3d-extrusion')) {
      map.addLayer({
        id: 'thermal-3d-extrusion',
        type: 'fill-extrusion',
        source: 'thermal-3d-plume',
        paint: {
          'fill-extrusion-height': [
            '*',
            ['get', 'elevation_offset_m'],
            config.showTopography ? 2.5 : 0.05
          ],
          'fill-extrusion-base': 0,
          'fill-extrusion-color': ['get', 'color'],
          'fill-extrusion-opacity': config.thermalOpacity
        }
      });

      // Interactive band selection on click
      map.on('click', 'thermal-3d-extrusion', (e) => {
        if (e.features && e.features[0]) {
          setSelectedBand(e.features[0].properties);
        }
      });
    } else {
      map.setPaintProperty(
        'thermal-3d-extrusion',
        'fill-extrusion-height',
        ['*', ['get', 'elevation_offset_m'], config.showTopography ? 2.5 : 0.05]
      );
      map.setPaintProperty('thermal-3d-extrusion', 'fill-extrusion-opacity', config.thermalOpacity);
    }

    // 2. High-Tech Contour Wireframe Mesh Lines
    if (!map.getLayer('thermal-3d-wireframe')) {
      map.addLayer({
        id: 'thermal-3d-wireframe',
        type: 'line',
        source: 'thermal-3d-plume',
        paint: {
          'line-color': '#ffffff',
          'line-width': 1.6,
          'line-opacity': 0.85,
          'line-dasharray': [2, 2]
        }
      });
    }

    // 3. Sensor Telemetry Markers (3D Target Nodes)
    if (config.showSensors && commandData.targets) {
      commandData.targets.forEach((target) => {
        const el = document.createElement('div');
        el.className = 'tactical-sensor-node';
        el.style.width = '34px';
        el.style.height = '34px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = 'rgba(15, 23, 42, 0.85)';
        el.style.border = '2px solid #ea580c';
        el.style.boxShadow = '0 0 16px rgba(234, 88, 12, 0.8), inset 0 0 8px #ea580c';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.cursor = 'pointer';
        el.style.color = '#fff';
        el.style.fontSize = '10px';
        el.style.fontWeight = 'bold';
        el.innerHTML = `<span>${Math.round(target.temp_c)}°</span>`;

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedTarget(target);
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([target.lon, target.lat])
          .addTo(map);

        markersRef.current.push(marker);
      });
    }
  }, [commandData, config, getColorForBand]);

  // Camera Pitch & Bearing Controls
  const setCameraPerspective = (pitchVal: number) => {
    if (!mapRef.current) return;
    mapRef.current.easeTo({
      pitch: pitchVal,
      duration: 800
    });
    setConfig(prev => ({ ...prev, pitch: pitchVal }));
  };

  const rotateBearing = (delta: number) => {
    if (!mapRef.current) return;
    const current = mapRef.current.getBearing();
    const next = (current + delta) % 360;
    mapRef.current.easeTo({
      bearing: next,
      duration: 600
    });
    setConfig(prev => ({ ...prev, bearing: next }));
  };

  const resetNorth = () => {
    if (!mapRef.current) return;
    mapRef.current.easeTo({
      bearing: 0,
      pitch: 65,
      duration: 700
    });
    setConfig(prev => ({ ...prev, bearing: 0, pitch: 65 }));
  };

  return (
    <div className={`relative w-full ${isFullscreen ? 'fixed inset-0 z-50 h-screen' : 'h-[750px]'} bg-[#06090e] text-slate-100 flex flex-col font-sans select-none overflow-hidden rounded-xl border border-orange-950/60 shadow-2xl`}>
      {/* Tactical Top Bar */}
      <div className="bg-[#0b0f17]/95 backdrop-blur border-b border-orange-500/20 px-4 py-2.5 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-orange-600/20 border border-orange-500/40 text-orange-400">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest text-orange-400 uppercase">
                ADVANCED THERMAL TERRAIN
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40 rounded">
                MUNICIPAL OFFICER ONLY
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
                SIMULATED DATA
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {municipalityName} • {wardName} • 3D Terrain & Dispersion Contours
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          {/* Diurnal Selector */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-0.5">
            {[
              { id: 'morning', label: 'Morning', icon: Sunrise },
              { id: 'afternoon', label: 'Afternoon', icon: Sun },
              { id: 'evening', label: 'Evening', icon: Sunset },
              { id: 'night', label: 'Night', icon: Moon }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTimeOfDay(id as TimeOfDay)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition ${
                  timeOfDay === id
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={`Simulate ${label}`}
              >
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Return to 2D Map */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-bold transition shadow-lg shadow-orange-900/30"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Return to 2D ThermoMap</span>
          </button>
        </div>
      </div>

      {/* Main Tactical Canvas Container */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* MapLibre 3D Canvas */}
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

        {/* Left Side Tactical Control Drawer (Modeled after AARTOS HUD) */}
        <div
          className={`absolute top-3 left-3 z-30 transition-all duration-300 ${
            isDrawerCollapsed ? 'w-10' : 'w-80'
          }`}
        >
          {isDrawerCollapsed ? (
            <button
              onClick={() => setIsDrawerCollapsed(false)}
              className="p-2.5 bg-slate-950/90 text-orange-400 border border-orange-500/30 rounded-lg shadow-xl hover:bg-slate-900"
              title="Expand Tactical HUD"
            >
              <Sliders className="w-5 h-5" />
            </button>
          ) : (
            <div className="bg-slate-950/95 backdrop-blur-md border border-orange-500/30 rounded-xl shadow-2xl p-4 flex flex-col gap-3.5 max-h-[calc(100vh-140px)] overflow-y-auto">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-black tracking-wider text-slate-200 uppercase">
                    3D Terrain Controls
                  </span>
                </div>
                <button
                  onClick={() => setIsDrawerCollapsed(true)}
                  className="text-slate-400 hover:text-slate-200 text-xs px-1.5 py-0.5 rounded bg-slate-900"
                >
                  Collapse
                </button>
              </div>

              {/* Thermal Metric Selection */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Thermal Metric
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'air_temp', label: 'Air Temp (°C)' },
                    { id: 'lst', label: 'Satellite LST' },
                    { id: 'wbgt', label: 'WBGT Indoor/Out' },
                    { id: 'utci', label: 'UTCI Stress' },
                    { id: 'htsi', label: 'HTSI Index' },
                    { id: 'risk', label: 'Risk Rating' }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setActiveMetric(m.id as ThermalMetric)}
                      className={`text-[11px] py-1 px-2 rounded font-medium text-left truncate transition ${
                        activeMetric === m.id
                          ? 'bg-orange-600 text-white font-bold'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Size (Resolution) */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Mesh Grid Size
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {([512, 1024, 2048] as const).map(size => (
                    <button
                      key={size}
                      onClick={() => setConfig(prev => ({ ...prev, gridSize: size }))}
                      className={`py-1 text-[11px] font-mono font-bold rounded transition ${
                        config.gridSize === size
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thermal Opacity Slider */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-semibold text-slate-400 uppercase tracking-wider">
                    Plume Opacity
                  </span>
                  <span className="font-mono text-orange-400">
                    {Math.round(config.thermalOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={config.thermalOpacity}
                  onChange={(e) => setConfig(prev => ({ ...prev, thermalOpacity: parseFloat(e.target.value) }))}
                  className="w-full accent-orange-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Color Scheme Picker */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Color Scale
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {(['turbo', 'inferno', 'ironbow', 'rainbow', 'oceanic'] as const).map(scheme => (
                    <button
                      key={scheme}
                      onClick={() => setConfig(prev => ({ ...prev, colorScheme: scheme }))}
                      className={`py-1 px-2 text-[10px] uppercase font-bold rounded transition ${
                        config.colorScheme === scheme
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {scheme}
                    </button>
                  ))}
                </div>
              </div>

              {/* Layer Checkboxes */}
              <div className="border-t border-slate-800/80 pt-2.5 flex flex-col gap-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  3D Surface Layers
                </span>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showTopography}
                    onChange={(e) => setConfig(prev => ({ ...prev, showTopography: e.target.checked }))}
                    className="accent-orange-500 rounded"
                  />
                  <span>3D Elevation Topography</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showSensors}
                    onChange={(e) => setConfig(prev => ({ ...prev, showSensors: e.target.checked }))}
                    className="accent-orange-500 rounded"
                  />
                  <span>Thermal Sensor Nodes</span>
                </label>
              </div>

              {/* Camera Perspective Quick Controls */}
              <div className="border-t border-slate-800/80 pt-2.5 flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Camera Perspective
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setCameraPerspective(65)}
                    className="py-1 px-2 text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded font-medium"
                  >
                    3D Perspective (65°)
                  </button>
                  <button
                    onClick={() => setCameraPerspective(0)}
                    className="py-1 px-2 text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded font-medium"
                  >
                    2D Top-Down (0°)
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => rotateBearing(45)}
                    className="py-1 px-2 text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded font-medium"
                  >
                    Orbit 45°
                  </button>
                  <button
                    onClick={resetNorth}
                    className="py-1 px-2 text-[11px] bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded font-medium"
                  >
                    Reset North
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Selected Sensor / Band Inspection Modal */}
        {selectedTarget && (
          <div className="absolute top-3 right-3 z-30 w-72 bg-slate-950/95 backdrop-blur border border-orange-500/40 rounded-xl p-3.5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <div className="flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold text-slate-200">
                  {selectedTarget.name}
                </span>
              </div>
              <button
                onClick={() => setSelectedTarget(null)}
                className="text-slate-400 hover:text-slate-100 text-xs"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Node ID:</span>
                <span className="font-mono text-slate-200">{selectedTarget.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recorded Temp:</span>
                <span className="font-mono font-bold text-orange-400">{selectedTarget.temp_c}°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Elevation:</span>
                <span className="font-mono text-slate-200">{selectedTarget.elevation_m}m AMSL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="text-emerald-400 font-bold">{selectedTarget.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Classification:</span>
                <span className="text-amber-400">{selectedTarget.classification}</span>
              </div>
            </div>
          </div>
        )}

        {selectedBand && (
          <div className="absolute top-3 right-3 z-30 w-72 bg-slate-950/95 backdrop-blur border border-orange-500/40 rounded-xl p-3.5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <div className="flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold text-slate-200">
                  Thermal Dispersion Band {selectedBand.band}
                </span>
              </div>
              <button
                onClick={() => setSelectedBand(null)}
                className="text-slate-400 hover:text-slate-100 text-xs"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Risk Level:</span>
                <span className="font-bold text-red-400">{selectedBand.risk_level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Est. Air Temp:</span>
                <span className="font-mono font-bold text-orange-400">{selectedBand.air_temperature_c}°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Surface Temp:</span>
                <span className="font-mono text-slate-200">{selectedBand.surface_temp_c}°C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Heat Dispersion:</span>
                <span className="font-mono text-slate-300">{selectedBand.dispersion_rate}</span>
              </div>
              <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                {selectedBand.description}
              </p>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-40 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold text-orange-400 tracking-wider">
                COMPUTING 3D TERRAIN & THERMAL DISPERSION...
              </span>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-red-950/90 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg text-xs flex items-center gap-2 shadow-xl backdrop-blur">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Bottom Tactical Telemetry Bar */}
        <div className="absolute bottom-3 left-3 right-3 z-30 bg-slate-950/90 backdrop-blur border border-slate-800 rounded-lg px-3 py-2 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-orange-400" />
              <span>DSP LOAD: <strong className="text-slate-200">18.4%</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              <span>FPS: <strong className="text-emerald-400">{fps}</strong></span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>TERRAIN ELEVATION: <strong className="text-slate-200">{config.showTopography ? '3D Active' : 'Flat'}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-orange-400 font-mono text-[10px]">
              DATA STATUS: SIMULATED / PROTOTYPE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
