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
  Sunset,
  CheckCircle2,
  MapPin,
  Crosshair,
  Wifi,
  BatteryCharging,
  Gauge
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

// Preset Indian Municipal Sectors for "Add Monitored Area"
const PRESET_MUNICIPAL_AREAS = [
  {
    name: 'Greater Chennai Corporation',
    ward: 'Ward 114 - Central Operations',
    lat: 13.0827,
    lon: 80.2707,
    region: 'Peninsular Coastal'
  },
  {
    name: 'Municipal Corporation of Delhi',
    ward: 'Zone 5 - Central Vista & Connaught Place',
    lat: 28.6139,
    lon: 77.2090,
    region: 'Indo-Gangetic Plain'
  },
  {
    name: 'Brihanmumbai Municipal Corporation',
    ward: 'Ward A - Colaba & Fort Commercial Sector',
    lat: 18.9220,
    lon: 72.8347,
    region: 'Konkan Coast'
  },
  {
    name: 'Kolkata Municipal Corporation',
    ward: 'Ward 77 - Salt Lake Tech & Wetlands',
    lat: 22.5867,
    lon: 88.4178,
    region: 'Eastern Delta'
  },
  {
    name: 'Bruhat Bengaluru Mahanagara Palike',
    ward: 'Ward 150 - Bellandur Outer Ring Road',
    lat: 12.9260,
    lon: 77.6762,
    region: 'Deccan Plateau'
  },
  {
    name: 'Jaipur Municipal Corporation',
    ward: 'Ward 28 - Civil Lines & Walled City',
    lat: 26.9124,
    lon: 75.7873,
    region: 'Thar Semi-Arid'
  },
  {
    name: 'Ahmedabad Municipal Corporation',
    ward: 'Ward 12 - Navrangpura West Zone',
    lat: 23.0338,
    lon: 72.5850,
    region: 'Western Plains'
  }
];

export const Municipal3DCommandCenter: React.FC<Municipal3DCommandCenterProps> = ({
  centerLat = 13.0827,
  centerLon = 80.2707,
  municipalityName = 'Greater Chennai Corporation',
  wardName = 'Ward 114 - Central Operations',
  onClose
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const orbitAnimRef = useRef<number | null>(null);

  // Active Location State
  const [currentLat, setCurrentLat] = useState<number>(centerLat);
  const [currentLon, setCurrentLon] = useState<number>(centerLon);
  const [currentMunicipality, setCurrentMunicipality] = useState<string>(municipalityName);
  const [currentWard, setCurrentWard] = useState<string>(wardName);

  // Active Tab at top
  const [activeTab, setActiveTab] = useState<string>('3d_command');

  // Telemetry & Data State
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [commandData, setCommandData] = useState<Thermal3DCommandData | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<Thermal3DTelemetryTarget | null>(null);
  const [selectedBand, setSelectedBand] = useState<any | null>(null);

  // Tactical HUD Controls State
  const [systemRunning, setSystemRunning] = useState<boolean>(true);
  const [isPlumeVisible, setIsPlumeVisible] = useState<boolean>(true);
  const [isOrbiting, setIsOrbiting] = useState<boolean>(false);
  const [showAddAreaModal, setShowAddAreaModal] = useState<boolean>(false);
  const [customLatInput, setCustomLatInput] = useState<string>('13.0827');
  const [customLonInput, setCustomLonInput] = useState<string>('80.2707');
  const [customWardInput, setCustomWardInput] = useState<string>('Sector 4 - Tactical Hub');

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
    heatmap: true,
    colorCoding: true
  });

  const toggleSection = (key: string) => {
    setSectionOpen(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(60);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(prev => (prev === msg ? null : prev));
    }, 3200);
  };

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
  const load3DData = useCallback(async (lat: number, lon: number, period: TimeOfDay) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await fetch3DThermalCommandData(lat, lon, 8.5, period);
      setCommandData(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load 3D Thermal Command Center data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load3DData(currentLat, currentLon, timeOfDay);
  }, [load3DData, currentLat, currentLon, timeOfDay]);

  // Color expressions generator based on activeMetric and colorScheme
  const getColorExpression = useCallback((scheme: string, metric: ThermalMetric) => {
    if (scheme === 'inferno') {
      if (metric === 'air_temp') {
        return [
          'interpolate', ['linear'], ['coalesce', ['get', 'air_temperature_c'], 35],
          28, '#000004',
          33, '#57106e',
          37, '#bc3754',
          40, '#f98e09',
          44, '#fcffa4'
        ];
      } else if (metric === 'lst') {
        return [
          'interpolate', ['linear'], ['coalesce', ['get', 'surface_temp_c'], ['get', 'land_surface_temp_c'], 40],
          32, '#000004',
          38, '#57106e',
          44, '#bc3754',
          48, '#f98e09',
          54, '#fcffa4'
        ];
      } else if (metric === 'wbgt') {
        return [
          'interpolate', ['linear'], ['coalesce', ['get', 'wbgt_c'], 30],
          25, '#57106e',
          28, '#bc3754',
          32, '#f98e09',
          36, '#fcffa4'
        ];
      } else {
        // risk
        return [
          'match',
          ['get', 'risk_level'],
          'CRITICAL', '#fcffa4',
          'EXTREME', '#f98e09',
          'HIGH', '#bc3754',
          'MODERATE', '#57106e',
          'LOW', '#000004',
          '#f98e09'
        ];
      }
    } else {
      // Rainbow palette
      if (metric === 'air_temp') {
        return [
          'interpolate', ['linear'], ['coalesce', ['get', 'air_temperature_c'], 35],
          28, '#0284c7',
          32, '#10b981',
          36, '#facc15',
          39, '#ea580c',
          43, '#dc2626'
        ];
      } else if (metric === 'lst') {
        return [
          'interpolate', ['linear'], ['coalesce', ['get', 'surface_temp_c'], ['get', 'land_surface_temp_c'], 40],
          30, '#0284c7',
          36, '#10b981',
          42, '#facc15',
          48, '#ea580c',
          54, '#dc2626'
        ];
      } else if (metric === 'wbgt') {
        return [
          'interpolate', ['linear'], ['coalesce', ['get', 'wbgt_c'], 30],
          24, '#10b981',
          28, '#facc15',
          32, '#ea580c',
          36, '#dc2626'
        ];
      } else {
        // risk
        return [
          'match',
          ['get', 'risk_level'],
          'CRITICAL', '#dc2626',
          'EXTREME', '#ea580c',
          'HIGH', '#f97316',
          'MODERATE', '#facc15',
          'LOW', '#10b981',
          '#ea580c'
        ];
      }
    }
  }, []);

  // Initialize MapLibre
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
      center: [currentLon, currentLat],
      zoom: 13.2,
      pitch: config.pitch,
      bearing: config.bearing,
      maxPitch: 85
    });

    mapRef.current = map;

    const applyDiurnalSky = () => {
      if (typeof (map as any).setSky === 'function') {
        if (timeOfDay === 'morning') {
          (map as any).setSky({
            'sky-color': '#2563eb',
            'sky-horizon-blend': 0.8,
            'horizon-color': '#f59e0b',
            'horizon-fog-blend': 0.85
          });
        } else if (timeOfDay === 'evening') {
          (map as any).setSky({
            'sky-color': '#1e1b4b',
            'sky-horizon-blend': 0.7,
            'horizon-color': '#ea580c',
            'horizon-fog-blend': 0.8
          });
        } else if (timeOfDay === 'night') {
          (map as any).setSky({
            'sky-color': '#020617',
            'sky-horizon-blend': 0.9,
            'horizon-color': '#0f172a',
            'horizon-fog-blend': 0.95
          });
        } else {
          // afternoon
          (map as any).setSky({
            'sky-color': '#1d4ed8',
            'sky-horizon-blend': 0.75,
            'horizon-color': '#60a5fa',
            'horizon-fog-blend': 0.8
          });
        }
      }
    };

    map.on('load', applyDiurnalSky);
    map.on('styledata', applyDiurnalSky);

    return () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      if (orbitAnimRef.current) {
        cancelAnimationFrame(orbitAnimRef.current);
        orbitAnimRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, [currentLat, currentLon]);

  // Sync Layers & Markers whenever data, config, activeMetric, or systemRunning changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !commandData) return;

    const syncLayers = () => {
      if (!map.isStyleLoaded()) return;

      const activeColorExpr: any = getColorExpression(config.colorScheme, activeMetric);
      const isVisible = systemRunning && isPlumeVisible;
      const visibilityVal = isVisible ? 'visible' : 'none';

      // 1. Plume GeoJSON Source
      if (map.getSource('thermal-3d-plume')) {
        (map.getSource('thermal-3d-plume') as maplibregl.GeoJSONSource).setData(commandData);
      } else {
        map.addSource('thermal-3d-plume', {
          type: 'geojson',
          data: commandData
        });
      }

      // 2. Base 2D Ground Fill Layer (Guarantees thermal colors are visible even at 0m or oblique angles)
      if (!map.getLayer('thermal-2d-fill')) {
        map.addLayer({
          id: 'thermal-2d-fill',
          type: 'fill',
          source: 'thermal-3d-plume',
          layout: {
            visibility: visibilityVal
          },
          paint: {
            'fill-color': activeColorExpr,
            'fill-opacity': config.thermalOpacity * 0.75
          }
        });
      } else {
        map.setLayoutProperty('thermal-2d-fill', 'visibility', visibilityVal);
        map.setPaintProperty('thermal-2d-fill', 'fill-color', activeColorExpr);
        map.setPaintProperty('thermal-2d-fill', 'fill-opacity', config.thermalOpacity * 0.75);
      }

      // 3. 3D Fill-Extrusion Layer (Elevated thermal dispersion plume dome)
      const extrusionHeightExpr: any = [
        '*',
        ['coalesce', ['get', 'elevation_offset_m'], 40],
        config.showTopography ? 2.8 : 0.05
      ];

      if (!map.getLayer('thermal-3d-extrusion')) {
        map.addLayer({
          id: 'thermal-3d-extrusion',
          type: 'fill-extrusion',
          source: 'thermal-3d-plume',
          layout: {
            visibility: visibilityVal
          },
          paint: {
            'fill-extrusion-height': extrusionHeightExpr,
            'fill-extrusion-base': 0,
            'fill-extrusion-color': activeColorExpr,
            'fill-extrusion-opacity': config.thermalOpacity
          }
        });

        map.on('click', 'thermal-3d-extrusion', (e) => {
          if (e.features && e.features[0]) {
            setSelectedBand(e.features[0].properties);
          }
        });
      } else {
        map.setLayoutProperty('thermal-3d-extrusion', 'visibility', visibilityVal);
        map.setPaintProperty('thermal-3d-extrusion', 'fill-extrusion-height', extrusionHeightExpr);
        map.setPaintProperty('thermal-3d-extrusion', 'fill-extrusion-color', activeColorExpr);
        map.setPaintProperty('thermal-3d-extrusion', 'fill-extrusion-opacity', config.thermalOpacity);
      }

      // 4. High-Tech Contour Lines / Wireframe Mesh
      const meshDash = config.gridSize === 2048 ? [1.5, 1] : config.gridSize === 1024 ? [3, 2] : [6, 4];
      const meshWidth = config.gridSize === 2048 ? 2.4 : config.gridSize === 1024 ? 1.8 : 1.2;

      if (!map.getLayer('thermal-3d-wireframe')) {
        map.addLayer({
          id: 'thermal-3d-wireframe',
          type: 'line',
          source: 'thermal-3d-plume',
          layout: {
            visibility: visibilityVal
          },
          paint: {
            'line-color': '#ffffff',
            'line-width': meshWidth,
            'line-opacity': 0.95,
            'line-dasharray': meshDash
          }
        });
      } else {
        map.setLayoutProperty('thermal-3d-wireframe', 'visibility', visibilityVal);
        map.setPaintProperty('thermal-3d-wireframe', 'line-width', meshWidth);
        map.setPaintProperty('thermal-3d-wireframe', 'line-dasharray', meshDash);
      }

      // 5. 3D Cylindrical Obstacle Tower (matching grey building in screenshot)
      if (config.showBuildings && systemRunning) {
        const towerFeature = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [currentLon + 0.0035, currentLat + 0.0025],
                    [currentLon + 0.0055, currentLat + 0.0025],
                    [currentLon + 0.0055, currentLat + 0.0045],
                    [currentLon + 0.0035, currentLat + 0.0045],
                    [currentLon + 0.0035, currentLat + 0.0025]
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
        if (map.getSource('obstacle-tower')) {
          map.removeSource('obstacle-tower');
        }
      }

      // 6. Sensor Telemetry Nodes with Radar Rings (IsoLOG 1-3, Spectran, Drone)
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      if (config.showSensors && systemRunning && commandData.targets) {
        commandData.targets.forEach((target) => {
          const el = document.createElement('div');
          el.className = 'tactical-radar-node group';
          el.style.width = '38px';
          el.style.height = '38px';
          el.style.borderRadius = '50%';
          el.style.border = selectedTarget?.id === target.id ? '3px solid #22d3ee' : '2px solid #38bdf8';
          el.style.backgroundColor = 'rgba(2, 6, 23, 0.9)';
          el.style.boxShadow = selectedTarget?.id === target.id
            ? '0 0 20px rgba(34, 211, 238, 1)'
            : '0 0 12px rgba(56, 189, 248, 0.8)';
          el.style.display = 'flex';
          el.style.flexDirection = 'column';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.cursor = 'pointer';
          el.style.color = '#fff';
          el.style.fontSize = '9px';
          el.style.fontWeight = 'bold';
          el.style.transition = 'all 0.2s ease-out';
          el.innerHTML = `
            <span style="font-size: 8px; color: #7dd3fc; line-height: 1;">${target.id.split('_')[0].toUpperCase()}</span>
            <span style="color:#f59e0b; font-size: 10px; font-weight: 800;">${Math.round(target.temp_c)}°</span>
          `;

          el.addEventListener('click', (e) => {
            e.stopPropagation();
            setSelectedTarget(target);
            setActiveTab(target.id);
            map.flyTo({
              center: [target.lon, target.lat],
              zoom: 16,
              pitch: 70,
              duration: 800
            });
            showToast(`Selected Node: ${target.name}`);
          });

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([target.lon, target.lat])
            .addTo(map);

          markersRef.current.push(marker);
        });
      }
    };

    if (map.isStyleLoaded()) {
      syncLayers();
    } else {
      map.once('style.load', syncLayers);
    }
  }, [commandData, config, activeMetric, systemRunning, isPlumeVisible, currentLat, currentLon, getColorExpression, selectedTarget]);

  // Continuous Orbit Animation
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (isOrbiting) {
      let isRunning = true;
      const stepOrbit = () => {
        if (!isRunning || !mapRef.current) return;
        const b = (mapRef.current.getBearing() + 0.18) % 360;
        mapRef.current.setBearing(b);
        orbitAnimRef.current = requestAnimationFrame(stepOrbit);
      };
      orbitAnimRef.current = requestAnimationFrame(stepOrbit);

      return () => {
        isRunning = false;
        if (orbitAnimRef.current) {
          cancelAnimationFrame(orbitAnimRef.current);
          orbitAnimRef.current = null;
        }
      };
    } else if (orbitAnimRef.current) {
      cancelAnimationFrame(orbitAnimRef.current);
      orbitAnimRef.current = null;
    }
  }, [isOrbiting]);

  // Handle Sensor Top Tab Click
  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (!mapRef.current) return;

    if (tabId === '3d_command') {
      setSelectedTarget(null);
      mapRef.current.flyTo({
        center: [currentLon, currentLat],
        zoom: 13.2,
        pitch: 66,
        bearing: 32,
        duration: 1000
      });
      showToast('Centered on Municipal Overview');
    } else {
      // Sensor node tabs
      const target = commandData?.targets?.find(t => t.id === tabId);
      if (target) {
        setSelectedTarget(target);
        mapRef.current.flyTo({
          center: [target.lon, target.lat],
          zoom: 16.5,
          pitch: 70,
          duration: 900
        });
        showToast(`Targeted Telemetry: ${target.name}`);
      } else {
        showToast(`Telemetry Node: ${tabId} Active`);
      }
    }
  };

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {
        setIsFullscreen(true);
      });
      setIsFullscreen(true);
      showToast('Entered Fullscreen Tactical Mode');
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
      showToast('Exited Fullscreen Mode');
    }
  };

  // Switch Monitored Area Handler
  const handleSelectArea = (area: typeof PRESET_MUNICIPAL_AREAS[0]) => {
    setCurrentLat(area.lat);
    setCurrentLon(area.lon);
    setCurrentMunicipality(area.name);
    setCurrentWard(area.ward);
    setShowAddAreaModal(false);
    setSelectedTarget(null);
    setSelectedBand(null);
    setActiveTab('3d_command');

    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [area.lon, area.lat],
        zoom: 13.2,
        pitch: 66,
        bearing: 32,
        duration: 1400
      });
    }

    showToast(`Monitored Area Deployed: ${area.ward}`);
  };

  // Custom Area Deployment
  const handleDeployCustomArea = () => {
    const lat = parseFloat(customLatInput);
    const lon = parseFloat(customLonInput);
    if (isNaN(lat) || isNaN(lon)) {
      alert('Please enter valid numeric latitude and longitude coordinates.');
      return;
    }

    setCurrentLat(lat);
    setCurrentLon(lon);
    setCurrentMunicipality('Custom Tactical Municipal Sector');
    setCurrentWard(customWardInput || `Custom Sector (${lat.toFixed(3)}, ${lon.toFixed(3)})`);
    setShowAddAreaModal(false);
    setSelectedTarget(null);
    setSelectedBand(null);
    setActiveTab('3d_command');

    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [lon, lat],
        zoom: 13.5,
        pitch: 66,
        bearing: 32,
        duration: 1400
      });
    }

    showToast(`Custom Coordinates Deployed: ${customWardInput}`);
  };

  // Camera Pitch & Bearing Controls
  const setCameraPerspective = (pitchVal: number) => {
    if (!mapRef.current) return;
    setIsOrbiting(false);
    mapRef.current.easeTo({
      pitch: pitchVal,
      duration: 650
    });
    setConfig(prev => ({ ...prev, pitch: pitchVal }));
    showToast(pitchVal > 20 ? '3D Oblique Perspective (66°)' : '2D Top-Down Nadir (0°)');
  };

  const rotateBearing = (delta: number) => {
    if (!mapRef.current) return;
    setIsOrbiting(false);
    const current = mapRef.current.getBearing();
    const next = (current + delta) % 360;
    mapRef.current.easeTo({
      bearing: next,
      duration: 500
    });
    setConfig(prev => ({ ...prev, bearing: next }));
    showToast(`Bearing Rotated to ${Math.round(next)}°`);
  };

  const resetNorth = () => {
    if (!mapRef.current) return;
    setIsOrbiting(false);
    mapRef.current.easeTo({
      bearing: 0,
      pitch: 66,
      duration: 600
    });
    setConfig(prev => ({ ...prev, bearing: 0, pitch: 66 }));
    showToast('Reset to True North (0°)');
  };

  return (
    <div
      ref={containerRef}
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
          <button
            onClick={() => handleTabClick('3d_command')}
            className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-900/60 hover:bg-blue-800/80 border border-blue-500/40 rounded text-blue-300 font-black tracking-wider text-[11px] transition"
            title="Reset to Tactical Overview"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>THERMOSAFE 3D</span>
          </button>

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
                onClick={() => handleTabClick(tab.id)}
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
                onClick={() => {
                  setTimeOfDay(id as TimeOfDay);
                  showToast(`Switched diurnal profile: ${label}`);
                }}
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
            onClick={toggleFullscreen}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Tactical View'}
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
              <span
                className={`font-mono font-bold flex items-center gap-1 ${
                  systemRunning ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${systemRunning ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                {systemRunning ? 'ONLINE' : 'STANDBY'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                onClick={() => {
                  setSystemRunning(true);
                  showToast('3D System Activated: Plume & Telemetry Online');
                }}
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
                onClick={() => {
                  setSystemRunning(false);
                  showToast('3D System Standby: Plume Muted');
                }}
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
              onClick={() => setShowAddAreaModal(true)}
              className="w-full py-1 px-2 bg-[#0b1a3a] hover:bg-[#122654] text-blue-300 border border-blue-600/40 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition"
              title="Switch or deploy new Indian municipal monitored jurisdiction"
            >
              <Plus className="w-3 h-3 text-blue-400" />
              <span className="truncate">Add Monitored Area ({currentWard.split(' - ')[0]})</span>
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
              <span className="text-[9px] px-1 bg-blue-900/60 text-blue-300 rounded font-mono">
                {config.gridSize} MESH
              </span>
            </button>

            {sectionOpen.heatmap && (
              <div className="space-y-2.5 pt-1 pl-1 text-[11px]">
                {/* Display Status Toggle Button */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Display Status</span>
                  <button
                    onClick={() => {
                      setIsPlumeVisible(prev => !prev);
                      showToast(isPlumeVisible ? 'Plume Layer Muted' : 'Plume Layer Visible');
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition ${
                      isPlumeVisible && systemRunning
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/50'
                        : 'bg-slate-900 text-slate-500 border-slate-700'
                    }`}
                  >
                    {isPlumeVisible && systemRunning ? 'ACTIVE' : 'MUTED'}
                  </button>
                </div>

                {/* Grid Size */}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Grid Size</span>
                  <div className="flex items-center gap-1">
                    {([512, 1024, 2048] as const).map(size => (
                      <button
                        key={size}
                        onClick={() => {
                          setConfig(prev => ({ ...prev, gridSize: size }));
                          showToast(`Wireframe resolution set to ${size} mesh`);
                        }}
                        className={`px-1.5 py-0.5 text-[9px] font-mono font-bold rounded border transition ${
                          config.gridSize === size
                            ? 'bg-blue-600 text-white border-blue-400 shadow-xs'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
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
                        onClick={() => {
                          setActiveMetric(m.id as ThermalMetric);
                          showToast(`Active Thermal Metric: ${m.label}`);
                        }}
                        className={`py-1 rounded font-bold border transition ${
                          activeMetric === m.id
                            ? 'bg-blue-600 text-white border-blue-400 shadow-xs'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
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
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setConfig(prev => ({ ...prev, thermalOpacity: val }));
                        if (mapRef.current) {
                          if (mapRef.current.getLayer('thermal-3d-extrusion')) {
                            mapRef.current.setPaintProperty('thermal-3d-extrusion', 'fill-extrusion-opacity', val);
                          }
                          if (mapRef.current.getLayer('thermal-2d-fill')) {
                            mapRef.current.setPaintProperty('thermal-2d-fill', 'fill-opacity', val * 0.75);
                          }
                        }
                      }}
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
                          onClick={() => {
                            setConfig(prev => ({ ...prev, colorScheme: sch }));
                            showToast(`Color Palette: ${sch.toUpperCase()}`);
                          }}
                          className={`py-1 rounded font-bold capitalize border transition ${
                            config.colorScheme === sch
                              ? 'bg-blue-600 text-white border-blue-400 shadow-xs'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
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
                    <label className="flex items-center gap-2 text-[10px] text-slate-200 cursor-pointer hover:text-cyan-300 transition">
                      <input
                        type="checkbox"
                        checked={config.showTopography}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setConfig(prev => ({ ...prev, showTopography: val }));
                          showToast(val ? '3D Topography Elevation Enabled' : 'Plume Flattened to 2D Surface');
                        }}
                        className="accent-blue-500 rounded cursor-pointer"
                      />
                      <span>Check Topography (3D Elevation)</span>
                    </label>

                    <label className="flex items-center gap-2 text-[10px] text-slate-200 cursor-pointer hover:text-cyan-300 transition">
                      <input
                        type="checkbox"
                        checked={config.showBuildings}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setConfig(prev => ({ ...prev, showBuildings: val }));
                          showToast(val ? '3D Building Extrusions Enabled' : '3D Buildings Hidden');
                        }}
                        className="accent-blue-500 rounded cursor-pointer"
                      />
                      <span>Check Buildings (3D Extrusions)</span>
                    </label>

                    <label className="flex items-center gap-2 text-[10px] text-slate-200 cursor-pointer hover:text-cyan-300 transition">
                      <input
                        type="checkbox"
                        checked={config.showSensors}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setConfig(prev => ({ ...prev, showSensors: val }));
                          showToast(val ? 'Radar Telemetry Nodes Visible' : 'Sensors Hidden');
                        }}
                        className="accent-blue-500 rounded cursor-pointer"
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
                className="py-1 px-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 rounded font-bold transition"
              >
                3D Perspective (66°)
              </button>
              <button
                onClick={() => setCameraPerspective(0)}
                className="py-1 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded font-bold transition"
              >
                2D Top-Down (0°)
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <button
                onClick={() => rotateBearing(45)}
                className="py-1 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded font-bold transition"
              >
                Orbit 45°
              </button>
              <button
                onClick={resetNorth}
                className="py-1 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded font-bold transition"
              >
                Reset North
              </button>
            </div>
          </div>
        </div>

        {/* 3D MAP VIEWPORT CONTAINER */}
        <div className="relative flex-1 h-full w-full">
          <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

          {/* Interactive Floating Toast Feedback */}
          {toastMsg && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-[#070e1c]/95 border border-cyan-500/60 text-cyan-200 px-3 py-1.5 rounded-full text-xs font-mono shadow-2xl flex items-center gap-2 backdrop-blur animate-in fade-in slide-in-from-top duration-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{toastMsg}</span>
            </div>
          )}

          {/* Selected Target / Sensor Modal */}
          {selectedTarget && (
            <div className="absolute top-3 right-3 z-30 w-80 bg-[#070e1c]/95 backdrop-blur border border-cyan-500/60 rounded-xl p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                <span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  {selectedTarget.name}
                </span>
                <button
                  onClick={() => setSelectedTarget(null)}
                  className="text-slate-400 hover:text-white text-sm px-1 py-0.5 rounded transition"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Crosshair className="w-3 h-3 text-slate-500" /> Node ID:
                  </span>
                  <span className="font-mono text-slate-200">{selectedTarget.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-orange-400" /> Recorded Temp:
                  </span>
                  <span className="font-mono font-bold text-orange-400">{selectedTarget.temp_c}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-cyan-400" /> Signal / Freq:
                  </span>
                  <span className="font-mono text-slate-200">{selectedTarget.signal_dbm ?? -42} dBm ({selectedTarget.freq ?? '2.4 GHz'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 flex items-center gap-1">
                    <BatteryCharging className="w-3 h-3 text-emerald-400" /> Battery:
                  </span>
                  <span className="font-mono text-emerald-400">{selectedTarget.battery_pct ?? 98}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Elevation:</span>
                  <span className="font-mono text-slate-200">{selectedTarget.elevation_m}m AMSL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-emerald-400 font-bold font-mono">{selectedTarget.status}</span>
                </div>
                <div className="pt-2 flex gap-1.5">
                  <button
                    onClick={() => {
                      if (mapRef.current) {
                        mapRef.current.flyTo({
                          center: [selectedTarget.lon, selectedTarget.lat],
                          zoom: 17,
                          pitch: 75,
                          duration: 800
                        });
                        showToast(`Focused on ${selectedTarget.name}`);
                      }
                    }}
                    className="flex-1 py-1 bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 border border-cyan-500/40 rounded text-[10px] font-bold transition"
                  >
                    Focus Node
                  </button>
                  <button
                    onClick={() => {
                      showToast(`Node ${selectedTarget.id} calibrated. Transmission verified.`);
                    }}
                    className="py-1 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded text-[10px] font-bold transition"
                  >
                    Calibrate
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Selected Dispersion Band Modal */}
          {selectedBand && (
            <div className="absolute top-3 right-3 z-30 w-80 bg-[#070e1c]/95 backdrop-blur border border-amber-500/60 rounded-xl p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
                <span className="text-xs font-bold text-amber-300">
                  Thermal Dispersion Band {selectedBand.band}
                </span>
                <button
                  onClick={() => setSelectedBand(null)}
                  className="text-slate-400 hover:text-white text-sm px-1 py-0.5 rounded transition"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Band Classification:</span>
                  <span className="font-bold text-red-400">{selectedBand.risk_level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Estimated Air Temp:</span>
                  <span className="font-mono font-bold text-orange-400">{selectedBand.air_temperature_c}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Land Surface Temp (LST):</span>
                  <span className="font-mono text-amber-400">{selectedBand.surface_temp_c ?? selectedBand.land_surface_temp_c}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">WBGT Heat Stress:</span>
                  <span className="font-mono text-slate-200">{selectedBand.wbgt_c ?? 34.5}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Heat Dispersion:</span>
                  <span className="font-mono text-slate-300">{selectedBand.dispersion_rate ?? '75%'}</span>
                </div>
                <p className="text-[10px] text-slate-400 border-t border-slate-800 pt-1">
                  {selectedBand.description || 'Active 3D thermal dispersion plume ring.'}
                </p>
                <div className="pt-1 flex gap-1.5">
                  <button
                    onClick={() => {
                      showToast(`Advisory dispatched for ${selectedBand.risk_level} thermal zone.`);
                    }}
                    className="flex-1 py-1 bg-amber-900/60 hover:bg-amber-800 text-amber-200 border border-amber-500/40 rounded text-[10px] font-bold transition"
                  >
                    Issue Zone Advisory
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Monitored Area Tactical Modal */}
          {showAddAreaModal && (
            <div className="absolute inset-0 bg-[#070c18]/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-lg bg-[#0a1122] border border-blue-500/50 rounded-xl p-4 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                    <MapPin className="w-4 h-4 text-cyan-400" />
                    <span>Deploy 3D Monitored Municipal Area</span>
                  </div>
                  <button
                    onClick={() => setShowAddAreaModal(false)}
                    className="text-slate-400 hover:text-white text-sm"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Select Indian Metropolitan Jurisdiction:
                  </span>
                  <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto scrollbar-thin pr-1">
                    {PRESET_MUNICIPAL_AREAS.map(area => (
                      <button
                        key={area.ward}
                        onClick={() => handleSelectArea(area)}
                        className={`text-left p-2 rounded border text-xs transition flex items-center justify-between ${
                          currentWard === area.ward
                            ? 'bg-blue-900/60 border-cyan-400 text-cyan-200 shadow-xs'
                            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-100">{area.name}</div>
                          <div className="text-[10px] text-slate-400">{area.ward}</div>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-800 rounded text-cyan-400">
                          {area.region}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom GPS Coordinates Deployment */}
                <div className="border-t border-slate-800 pt-2 space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Or Deploy Custom GPS Coordinates:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Latitude (°N)</label>
                      <input
                        type="text"
                        value={customLatInput}
                        onChange={(e) => setCustomLatInput(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 font-mono text-xs focus:border-cyan-400 outline-none"
                        placeholder="e.g. 13.0827"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Longitude (°E)</label>
                      <input
                        type="text"
                        value={customLonInput}
                        onChange={(e) => setCustomLonInput(e.target.value)}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 font-mono text-xs focus:border-cyan-400 outline-none"
                        placeholder="e.g. 80.2707"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Custom Sector / Ward Name</label>
                    <input
                      type="text"
                      value={customWardInput}
                      onChange={(e) => setCustomWardInput(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 text-xs focus:border-cyan-400 outline-none"
                      placeholder="e.g. Sector 4 - Heavy Industry Hub"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setShowAddAreaModal(false)}
                      className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeployCustomArea}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-xs shadow-md transition"
                    >
                      Deploy 3D Monitor
                    </button>
                  </div>
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

          {/* Floating Bottom Control Dock (Move, Orbit, Buildings, Terrain) */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 bg-[#070e1c]/90 backdrop-blur border border-slate-700/80 rounded-lg px-3 py-1.5 flex items-center gap-3 text-[11px] text-slate-300 shadow-xl">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider pr-1 border-r border-slate-700">
              Map Control
            </span>
            <button
              onClick={() => {
                setIsOrbiting(false);
                if (mapRef.current) {
                  mapRef.current.flyTo({
                    center: [currentLon, currentLat],
                    zoom: 13.2,
                    pitch: 66,
                    duration: 600
                  });
                }
                showToast('Camera centered to Overview');
              }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800 hover:text-cyan-300 transition"
              title="Pan / Centering Mode"
            >
              <Move className="w-3.5 h-3.5" />
              <span>Move</span>
            </button>
            <button
              onClick={() => {
                setIsOrbiting(prev => !prev);
                showToast(!isOrbiting ? 'Continuous 360° Orbit Active' : 'Orbit Stopped');
              }}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition ${
                isOrbiting
                  ? 'bg-blue-600 text-white border-blue-400 shadow-xs'
                  : 'hover:bg-slate-800 border-transparent hover:text-cyan-300'
              }`}
              title="Toggle continuous cinematic 360° orbit"
            >
              <Compass className={`w-3.5 h-3.5 ${isOrbiting ? 'animate-spin' : ''}`} />
              <span>{isOrbiting ? 'Orbiting' : 'Orbit'}</span>
            </button>
            <button
              onClick={() => {
                const next = !config.showBuildings;
                setConfig(prev => ({ ...prev, showBuildings: next }));
                showToast(next ? '3D Buildings Extruded' : 'Buildings Hidden');
              }}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition ${
                config.showBuildings ? 'text-cyan-300 bg-blue-950/60' : 'hover:bg-slate-800'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>Buildings</span>
            </button>
            <button
              onClick={() => {
                const next = !config.showTopography;
                setConfig(prev => ({ ...prev, showTopography: next }));
                showToast(next ? '3D Terrain Dome Elevated' : 'Terrain Flattened');
              }}
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
              <span className="text-slate-600">|</span>
              <span className="text-cyan-400 text-[10px]">{currentMunicipality} ({currentWard})</span>
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
