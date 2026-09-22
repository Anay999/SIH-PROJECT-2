import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Layers,
  Sliders,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Radio,
  Play,
  Square,
  Plus,
  Compass,
  Move,
  Building,
  RefreshCw,
  Sun,
  Moon,
  Sunrise,
  Sunset
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
  centerLat?: number;
  centerLon?: number;
  municipalityName?: string;
  wardName?: string;
  onClose?: () => void;
}

export const Municipal3DCommandCenter: React.FC<Municipal3DCommandCenterProps> = ({
  centerLat = 13.0827,
  centerLon = 80.2707,
  municipalityName = 'Greater Chennai Corporation',
  wardName = 'Ward 114 - Central Operations',
  onClose
}) => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  // Active Tab at top
  const [activeTab, setActiveTab] = useState<string>('3d_command');

  // Telemetry & Data State
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [commandData, setCommandData] = useState<Thermal3DCommandData | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<Thermal3DTelemetryTarget | null>(null);
  const [selectedBand, setSelectedBand] = useState<any | null>(null);

  // Tactical HUD Controls State (Modeled after AARTOS 3D Command Center)
  const [activeMetric, setActiveMetric] = useState<ThermalMetric>('air_temp');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('afternoon');
  const [config, setConfig] = useState<Command3DConfig>({
    gridSize: 1024,
    thermalOpacity: 0.65,
    colorScheme: 'rainbow',
    showTopography: true,
    showBuildings: true,
    showSensors: true,
    pitch: 66,
    bearing: 32
  });

  // Tree disclosure states (Left HUD panel)
  const [sectionOpen, setSectionOpen] = useState<{ [key: string]: boolean }>({
    main: true,
    view: true,
    heatmap: true,
    colorCoding: true,
    monitoredArea: false
  });

  const toggleSection = (key: string) => {
    setSectionOpen(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(61);
  const [systemRunning, setSystemRunning] = useState<boolean>(true);

  // FPS Telemetry Counter
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
      const data = await fetch3DThermalCommandData(centerLat, centerLon, 8.5, timeOfDay);
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

  // Initialize MapLibre 3D Scene with Satellite Topography & Atmospheric Blue Sky
  useEffect(() => {
    if (!mapContainer.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'satellite': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            attribution: '© Esri, Maxar, Earthstar Geographics'
          }
        },
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: { 'background-color': '#08111e' }
          },
          {
            id: 'satellite-tiles',
            type: 'raster',
            source: 'satellite',
            minzoom: 0,
            maxzoom: 19,
            paint: {
              'raster-opacity': 1.0,
              'raster-contrast': 0.15,
              'raster-saturation': 0.1
            }
          }
        ]
      },
      center: [centerLon, centerLat],
      zoom: 13.2,
      pitch: config.pitch,
      bearing: config.bearing,
      maxPitch: 85
    });

    mapRef.current = map;

    map.on('load', () => {
      // Add realistic bright atmospheric sky matching reference screenshot
      if (typeof (map as any).setSky === 'function') {
        (map as any).setSky({
          'sky-color': '#1d4ed8',
          'sky-horizon-blend': 0.75,
          'horizon-color': '#60a5fa',
          'horizon-fog-blend': 0.8
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

  // Update 3D Plume and Building Elevation Layers when data or config changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !commandData) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // 1. Source: 3D Thermal Plume Bands
    if (map.getSource('thermal-3d-plume')) {
      (map.getSource('thermal-3d-plume') as maplibregl.GeoJSONSource).setData(commandData);
    } else {
      map.addSource('thermal-3d-plume', {
        type: 'geojson',
        data: commandData
      });
    }

    // Color palettes
    const rainbowColors: any = [
      'match',
      ['get', 'band'],
      1, '#dc2626', // Red (Core Heat)
      2, '#ea580c', // Orange
      3, '#facc15', // Yellow
      4, '#16a34a', // Green
      5, '#0284c7', // Cyan/Blue (Outer dispersion)
      '#ea580c'
    ];

    const infernoColors: any = [
      'match',
      ['get', 'band'],
      1, '#fcffa4',
      2, '#f98e09',
      3, '#bc3754',
      4, '#57106e',
      5, '#000004',
      '#f98e09'
    ];

    const activeColorExpression = config.colorScheme === 'inferno' ? infernoColors : rainbowColors;

    // 2. 3D Fill-Extrusion Layer (Raised 3D Thermal Dispersion Dome)
    if (!map.getLayer('thermal-3d-extrusion')) {
      map.addLayer({
        id: 'thermal-3d-extrusion',
        type: 'fill-extrusion',
        source: 'thermal-3d-plume',
        paint: {
          'fill-extrusion-height': [
            '*',
            ['get', 'elevation_offset_m'],
            config.showTopography ? 3.2 : 0.05
          ],
          'fill-extrusion-base': 0,
          'fill-extrusion-color': activeColorExpression,
          'fill-extrusion-opacity': config.thermalOpacity
        }
      });

      map.on('click', 'thermal-3d-extrusion', (e) => {
        if (e.features && e.features[0]) {
          setSelectedBand(e.features[0].properties);
        }
      });
    } else {
      map.setPaintProperty(
        'thermal-3d-extrusion',
        'fill-extrusion-height',
        ['*', ['get', 'elevation_offset_m'], config.showTopography ? 3.2 : 0.05]
      );
      map.setPaintProperty('thermal-3d-extrusion', 'fill-extrusion-color', activeColorExpression);
      map.setPaintProperty('thermal-3d-extrusion', 'fill-extrusion-opacity', config.thermalOpacity);
    }

    // 3. High-Tech Contour Lines
    if (!map.getLayer('thermal-3d-wireframe')) {
      map.addLayer({
        id: 'thermal-3d-wireframe',
        type: 'line',
        source: 'thermal-3d-plume',
        paint: {
          'line-color': '#ffffff',
          'line-width': 1.8,
          'line-opacity': 0.9,
          'line-dasharray': [3, 2]
        }
      });
    }

    // 4. 3D Cylindrical Obstacle Tower (matching grey building in screenshot)
    if (config.showBuildings) {
      const towerFeature = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [centerLon + 0.004, centerLat + 0.003],
                  [centerLon + 0.006, centerLat + 0.003],
                  [centerLon + 0.006, centerLat + 0.005],
                  [centerLon + 0.004, centerLat + 0.005],
                  [centerLon + 0.004, centerLat + 0.003]
                ]
              ]
            },
            properties: {
              height: 280,
              base: 0
            }
          }
        ]
      };

      if (!map.getSource('obstacle-tower')) {
        map.addSource('obstacle-tower', {
          type: 'geojson',
          data: towerFeature as any
        });
        map.addLayer({
          id: 'obstacle-tower-layer',
          type: 'fill-extrusion',
          source: 'obstacle-tower',
          paint: {
            'fill-extrusion-height': 280,
            'fill-extrusion-base': 0,
            'fill-extrusion-color': '#94a3b8',
            'fill-extrusion-opacity': 0.92
          }
        });
      }
    } else if (map.getLayer('obstacle-tower-layer')) {
      map.removeLayer('obstacle-tower-layer');
      map.removeSource('obstacle-tower');
    }

    // 5. Sensor Telemetry Nodes with Radar Rings (IsoLOG 2 marker)
    if (config.showSensors && commandData.targets) {
      commandData.targets.forEach((target) => {
        const el = document.createElement('div');
        el.className = 'tactical-radar-node';
        el.style.width = '36px';
        el.style.height = '36px';
        el.style.borderRadius = '50%';
        el.style.border = '2px solid #38bdf8';
        el.style.backgroundColor = 'rgba(2, 6, 23, 0.85)';
        el.style.boxShadow = '0 0 14px rgba(56, 189, 248, 0.9)';
        el.style.display = 'flex';
        el.style.flexDirection = 'column';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.cursor = 'pointer';
        el.style.color = '#fff';
        el.style.fontSize = '9px';
        el.style.fontWeight = 'bold';
        el.innerHTML = `<span>${target.name.split(' ')[0]}</span><span style="color:#f59e0b">${Math.round(target.temp_c)}°</span>`;

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
  }, [commandData, config, centerLat, centerLon]);

  // Camera Pitch & Bearing Controls
  const setCameraPerspective = (pitchVal: number) => {
    if (!mapRef.current) return;
    mapRef.current.easeTo({
      pitch: pitchVal,
      duration: 700
    });
    setConfig(prev => ({ ...prev, pitch: pitchVal }));
  };

  const rotateBearing = (delta: number) => {
    if (!mapRef.current) return;
    const current = mapRef.current.getBearing();
    const next = (current + delta) % 360;
    mapRef.current.easeTo({
      bearing: next,
      duration: 500
    });
    setConfig(prev => ({ ...prev, bearing: next }));
  };

  const resetNorth = () => {
    if (!mapRef.current) return;
    mapRef.current.easeTo({
      bearing: 0,
      pitch: 66,
      duration: 600
    });
    setConfig(prev => ({ ...prev, bearing: 0, pitch: 66 }));
  };

  return (
    <div
      className={`relative w-full ${
        isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen' : 'h-[780px]'
      } bg-[#070c18] text-slate-200 flex flex-col font-sans select-none overflow-hidden rounded-xl border border-slate-800 shadow-2xl`}
    >
      {/* ======================================================== */}
      {/* 1. TOP MENU & TABS BAR (Modeled after AARTOS RTSA-Suite) */}
      {/* ======================================================== */}
      <div className="bg-[#0b1326] border-b border-slate-800/90 px-3 py-1 flex items-center justify-between z-30 text-xs">
        {/* Left: Brand Logo & Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-900/60 border border-blue-500/40 rounded text-blue-300 font-black tracking-wider text-[11px]">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>THERMOSAFE 3D</span>
          </div>

          <div className="flex items-center gap-0.5 ml-2">
            {[
              { id: '3d_command', label: '3D Command Center' },
              { id: 'isolog_1', label: 'IsoLOG 1' },
              { id: 'isolog_2', label: 'IsoLOG 2' },
              { id: 'isolog_3', label: 'IsoLOG 3' },
              { id: 'spectran', label: 'Spectran V5' },
              { id: 'drone_detect', label: 'Thermal Sensor 3D' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 text-[11px] font-bold rounded-t transition ${
                  activeTab === tab.id
                    ? 'bg-[#1e293b] text-cyan-400 border-b-2 border-cyan-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#0f172a]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Diurnal selector, Fullscreen, and Return button */}
        <div className="flex items-center gap-2">
          {/* Diurnal Selector */}
          <div className="hidden sm:flex items-center bg-[#070e1e] border border-slate-700/60 rounded p-0.5">
            {[
              { id: 'morning', label: 'Morning', icon: Sunrise },
              { id: 'afternoon', label: 'Afternoon', icon: Sun },
              { id: 'evening', label: 'Evening', icon: Sunset },
              { id: 'night', label: 'Night', icon: Moon }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTimeOfDay(id as TimeOfDay)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  timeOfDay === id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-orange-600 to-amber-600 hover:brightness-110 text-white rounded text-[11px] font-black transition shadow-md"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Return to 2D ThermoMap</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MAIN 3D WORKSPACE (Left Tree Panel + 3D Map Viewport)  */}
      {/* ======================================================== */}
      <div className="relative flex-1 w-full h-full flex overflow-hidden">
        {/* LEFT COLLAPSIBLE TREE CONTROL PANEL (AARTOS 3D Spec) */}
        <div className="w-80 bg-[#070e1c]/95 backdrop-blur border-r border-slate-800/80 flex flex-col z-20 overflow-y-auto scrollbar-thin text-xs text-slate-300 p-2.5 space-y-2">
          {/* Main Action Control Buttons */}
          <div className="space-y-1 pb-2 border-b border-slate-800">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>AARTOS 3D Command</span>
              <span className="text-emerald-400 font-mono">ONLINE</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                onClick={() => setSystemRunning(true)}
                className={`py-1 px-2 rounded text-[10px] font-bold flex items-center justify-center gap-1 border transition ${
                  systemRunning
                    ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Play className="w-3 h-3 text-emerald-400" />
                <span>Start System</span>
              </button>
              <button
                onClick={() => setSystemRunning(false)}
                className={`py-1 px-2 rounded text-[10px] font-bold flex items-center justify-center gap-1 border transition ${
                  !systemRunning
                    ? 'bg-red-900/60 text-white border-red-500 shadow-sm'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Square className="w-3 h-3 text-red-400" />
                <span>Stop System</span>
              </button>
            </div>
            <button
              onClick={() => alert(`Municipal Sector: ${municipalityName} (${wardName}) monitored active.`)}
              className="w-full py-1 px-2 bg-[#0b1a3a] hover:bg-[#122654] text-blue-300 border border-blue-600/40 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition"
            >
              <Plus className="w-3 h-3 text-blue-400" />
              <span>Add Monitored Area ({wardName})</span>
            </button>
          </div>

          {/* Collapsible Section: Antenna Coverage Heatmap / Thermal Dispersion Plume */}
          <div className="border border-slate-800/80 rounded bg-[#0b1326]/60 p-2 space-y-2">
            <button
              onClick={() => toggleSection('heatmap')}
              className="w-full flex items-center justify-between text-[11px] font-bold text-slate-200"
            >
              <span className="flex items-center gap-1.5">
                {sectionOpen.heatmap ? <ChevronDown className="w-3 h-3 text-blue-400" /> : <ChevronRight className="w-3 h-3 text-blue-400" />}
                <span>Thermal Dispersion Plume</span>
              </span>
              <span className="text-[9px] px-1 bg-blue-900/60 text-blue-300 rounded font-mono">1024 MESH</span>
            </button>

            {sectionOpen.heatmap && (
              <div className="space-y-2.5 pt-1 pl-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Display Status</span>
                  <span className="text-emerald-400 font-bold font-mono">ACTIVE</span>
                </div>

                {/* Grid Size */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Grid Size</span>
                  <div className="flex items-center gap-1">
                    {([512, 1024, 2048] as const).map(size => (
                      <button
                        key={size}
                        onClick={() => setConfig(prev => ({ ...prev, gridSize: size }))}
                        className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded border ${
                          config.gridSize === size
                            ? 'bg-blue-600 text-white border-blue-400'
                            : 'bg-slate-900 border-slate-700 text-slate-400'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Thermal Metric Selector */}
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Thermal Metric</span>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    {[
                      { id: 'air_temp', label: 'Air Temp (°C)' },
                      { id: 'lst', label: 'Satellite LST' },
                      { id: 'wbgt', label: 'WBGT Index' },
                      { id: 'risk', label: 'Risk Rating' }
                    ].map(m => (
                      <button
                        key={m.id}
                        onClick={() => setActiveMetric(m.id as ThermalMetric)}
                        className={`py-1 rounded font-bold border transition ${
                          activeMetric === m.id
                            ? 'bg-blue-600 text-white border-blue-400 shadow-xs'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Coding Sub-tree */}
                <div className="space-y-2 border-t border-slate-800 pt-2">
                  <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-blue-400" />
                    <span>Color Coding</span>
                  </div>

                  {/* Opacity Slider */}
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>Opacity</span>
                      <span className="font-mono text-cyan-400">{Math.round(config.thermalOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={config.thermalOpacity}
                      onChange={(e) => setConfig(prev => ({ ...prev, thermalOpacity: parseFloat(e.target.value) }))}
                      className="w-full accent-blue-500 h-1 bg-slate-800 rounded appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Color Scheme Picker */}
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Color Scheme</span>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      {(['rainbow', 'inferno'] as const).map(sch => (
                        <button
                          key={sch}
                          onClick={() => setConfig(prev => ({ ...prev, colorScheme: sch }))}
                          className={`py-1 rounded font-bold capitalize border transition ${
                            config.colorScheme === sch
                              ? 'bg-blue-600 text-white border-blue-400 shadow-xs'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          {sch}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Distance Bounds */}
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">Near Distance:</span>
                    <span className="font-mono text-slate-200">100 m</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">Far Distance:</span>
                    <span className="font-mono text-slate-200">8.5 km</span>
                  </div>

                  {/* Toggles: Check Topography & Check Buildings */}
                  <div className="pt-1.5 space-y-1.5 border-t border-slate-800">
                    <label className="flex items-center gap-2 text-[10px] text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.showTopography}
                        onChange={(e) => setConfig(prev => ({ ...prev, showTopography: e.target.checked }))}
                        className="accent-blue-500 rounded"
                      />
                      <span>Check Topography (3D Elevation)</span>
                    </label>

                    <label className="flex items-center gap-2 text-[10px] text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.showBuildings}
                        onChange={(e) => setConfig(prev => ({ ...prev, showBuildings: e.target.checked }))}
                        className="accent-blue-500 rounded"
                      />
                      <span>Check Buildings (3D Extrusions)</span>
                    </label>

                    <label className="flex items-center gap-2 text-[10px] text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.showSensors}
                        onChange={(e) => setConfig(prev => ({ ...prev, showSensors: e.target.checked }))}
                        className="accent-blue-500 rounded"
                      />
                      <span>Sensors & Radar Nodes</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Camera Perspective Controls */}
          <div className="border border-slate-800/80 rounded bg-[#0b1326]/60 p-2 space-y-2">
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
              Camera Viewport
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <button
                onClick={() => setCameraPerspective(66)}
                className="py-1 px-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 rounded font-bold"
              >
                3D Perspective (66°)
              </button>
              <button
                onClick={() => setCameraPerspective(0)}
                className="py-1 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded font-bold"
              >
                2D Top-Down (0°)
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <button
                onClick={() => rotateBearing(45)}
                className="py-1 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded font-bold"
              >
                Orbit 45°
              </button>
              <button
                onClick={resetNorth}
                className="py-1 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded font-bold"
              >
                Reset North
              </button>
            </div>
          </div>
        </div>

        {/* 3D MAP VIEWPORT CONTAINER */}
        <div className="relative flex-1 h-full w-full">
          <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

          {/* Selected Target / Sensor Modal */}
          {selectedTarget && (
            <div className="absolute top-3 right-3 z-30 w-72 bg-[#070e1c]/95 backdrop-blur border border-cyan-500/50 rounded-xl p-3 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  {selectedTarget.name}
                </span>
                <button onClick={() => setSelectedTarget(null)} className="text-slate-400 hover:text-white text-xs">
                  ✕
                </button>
              </div>
              <div className="space-y-1 text-xs">
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
              </div>
            </div>
          )}

          {/* Selected Dispersion Band Modal */}
          {selectedBand && (
            <div className="absolute top-3 right-3 z-30 w-72 bg-[#070e1c]/95 backdrop-blur border border-amber-500/50 rounded-xl p-3 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                <span className="text-xs font-bold text-amber-300">
                  Thermal Dispersion Band {selectedBand.band}
                </span>
                <button onClick={() => setSelectedBand(null)} className="text-slate-400 hover:text-white text-xs">
                  ✕
                </button>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Risk Level:</span>
                  <span className="font-bold text-red-400">{selectedBand.risk_level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Estimated Air Temp:</span>
                  <span className="font-mono font-bold text-orange-400">{selectedBand.air_temperature_c}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Heat Dispersion:</span>
                  <span className="font-mono text-slate-300">{selectedBand.dispersion_rate}</span>
                </div>
              </div>
            </div>
          )}

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-[#070e1c]/75 backdrop-blur-xs z-40 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin" />
                <span className="text-xs font-bold text-cyan-300 tracking-wider">
                  GENERATING 3D TOPOGRAPHICAL TERRAIN & PLUME...
                </span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-red-950/90 border border-red-500/50 text-red-200 px-4 py-2 rounded text-xs flex items-center gap-2 shadow-xl backdrop-blur">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Floating Bottom Control Dock (Move, Drag, Measure, Camera, Zones, Buildings) */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 bg-[#070e1c]/90 backdrop-blur border border-slate-700/80 rounded-lg px-3 py-1.5 flex items-center gap-3 text-[11px] text-slate-300 shadow-xl">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pr-1 border-r border-slate-700">
              Map Control
            </span>
            <button
              onClick={() => setCameraPerspective(66)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800 hover:text-cyan-300"
            >
              <Move className="w-3.5 h-3.5" />
              <span>Move</span>
            </button>
            <button
              onClick={() => rotateBearing(30)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800 hover:text-cyan-300"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Orbit</span>
            </button>
            <button
              onClick={() => setConfig(prev => ({ ...prev, showBuildings: !prev.showBuildings }))}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition ${
                config.showBuildings ? 'text-cyan-300 bg-blue-950/60' : 'hover:bg-slate-800'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Buildings</span>
            </button>
            <button
              onClick={() => setConfig(prev => ({ ...prev, showTopography: !prev.showTopography }))}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition ${
                config.showTopography ? 'text-cyan-300 bg-blue-950/60' : 'hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Terrain</span>
            </button>
          </div>

          {/* Bottom Telemetry Bar (Matching exact footer of screenshot) */}
          <div className="absolute bottom-0 left-0 right-0 z-30 bg-[#070e1c]/95 border-t border-slate-800 px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">ThermoSafe 3D Tactical Suite v2.0</span>
              <span className="text-slate-600">|</span>
              <span className="text-amber-400 text-[10px]">MUNICIPAL OFFICER ACCESS</span>
            </div>
            <div className="flex items-center gap-4 text-[10px]">
              <span>FPS: <strong className="text-emerald-400">{fps}</strong></span>
              <span>DSP Load: <strong className="text-slate-200">18.4%</strong></span>
              <span>CPU Sat: <strong className="text-slate-200">0%</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
