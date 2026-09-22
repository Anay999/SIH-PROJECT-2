import React, { useState, useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import type { GeoJsonObject } from 'geojson';
import {
  Layers,
  Hospital as HospitalIcon,
  Snowflake,
  Users,
  Briefcase,
  TreeDeciduous,
  AlertTriangle,
  Info,
  RefreshCw,
  Box,
  Map as MapIcon
} from 'lucide-react';
import { ThermoMap } from '../components/thermomap/ThermoMap';
import { Municipal3DCommandCenter } from '../components/thermomap/Municipal3DCommandCenter';

import {
  resolveMapProvider,
  type MapProviderConfig,
  type MapProviderId,
} from '../config/mapConfig';
import {
  METRIC_THRESHOLDS,
  getColorForMetric,
  getSeverityLabel,
  MAP_PALETTE,
  type MetricLayer,
} from '../config/mapThresholds';
import { MapSettingsPopover } from '../components/map/MapSettingsPopover';
import { validateWardGeoJson } from '../utils/geoJsonValidator';
import { useWorkspace } from '../context/WorkspaceContext';

// Custom modern DivIcons for Leaflet
const coolingCenterIcon = L.divIcon({
  className: 'custom-cooling-marker',
  html: `<div style="background-color: #06b6d4; color: #080c14; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(6,182,212,0.7); border: 2px solid white; font-weight: 900; font-size: 12px; cursor: pointer;">❄</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -13],
});

const hospitalMarkerIcon = L.divIcon({
  className: 'custom-hospital-marker',
  html: `<div style="background-color: #ef4444; color: white; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(239,68,68,0.7); border: 2px solid white; font-weight: 900; font-size: 14px; cursor: pointer;">+</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -13],
});

interface FacilityItem {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  ward_id: string;
  type?: string;
  address?: string;
  capacity?: number;
  occupancy?: number;
  occupancy_rate?: number;
  total_beds?: number;
  icu_beds?: number;
  heat_stroke_cases_today?: number;
  readiness_status?: string;
  status?: string;
}

// Controller to smoothly fit bounds or re-center
function MapViewController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export const LiveHeatMapPage: React.FC = () => {
  const { selectWard } = useWorkspace();
  const [geoJsonData, setGeoJsonData] = useState<GeoJsonObject | null>(null);
  const [facilities, setFacilities] = useState<{
    cooling_centers: FacilityItem[];
    hospitals: FacilityItem[];
  }>({ cooling_centers: [], hospitals: [] });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Map Provider state (Default: Realistic Esri Satellite Imagery)
  const [providerOverride, setProviderOverride] = useState<MapProviderId>('esri_satellite');
  const [providerConfig, setProviderConfig] = useState<MapProviderConfig>(resolveMapProvider('esri_satellite'));

  // Selected visual layer
  const [activeLayer, setActiveLayer] = useState<MetricLayer>('htsi');
  const [facilityFilter, setFacilityFilter] = useState<'all' | 'cooling' | 'hospitals' | 'none'>('all');
  const [selectedWardProps, setSelectedWardProps] = useState<any | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'thermomap_2d' | 'thermal_terrain_3d' | 'legacy_choropleth'>('thermal_terrain_3d');

  // Map center: Greater Chennai
  const defaultCenter: [number, number] = [13.045, 80.225];
  const defaultZoom = 11;

  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    setProviderConfig(resolveMapProvider(providerOverride));
  }, [providerOverride]);

  useEffect(() => {
    fetchGisData();
  }, []);

  const fetchGisData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const [wardsRes, facRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/v1/gis/wards'),
        fetch('http://127.0.0.1:8000/api/v1/gis/facilities'),
      ]);

      if (wardsRes.ok) {
        const wardsData = await wardsRes.json();
        // Validate with frontend validator
        const validation = validateWardGeoJson(wardsData);
        if (!validation.isValid) {
          console.warn('GeoJSON validation warnings:', validation.errors);
        }
        setGeoJsonData(wardsData);
        if (wardsData.features && wardsData.features.length > 0) {
          setSelectedWardProps(wardsData.features[0].properties);
        }
      } else {
        setErrorMessage('Failed to load spatial ward boundaries from backend API.');
      }

      if (facRes.ok) {
        const facData = await facRes.json();
        setFacilities(facData);
      }
    } catch (err) {
      console.warn('GIS data load failure:', err);
      setErrorMessage('Backend GIS service unavailable. Check network or server status.');
    } finally {
      setLoading(false);
    }
  };

  const getMetricValueFromProps = (props: any, metric: MetricLayer): number => {
    if (!props) return 0;
    switch (metric) {
      case 'htsi': return props.htsi_score ?? 70.0;
      case 'wbgt': return props.wbgt_c ?? 32.0;
      case 'utci': return props.utci_c ?? 42.0;
      case 'air_temp': return props.air_temp_c ?? 38.5;
      case 'heat_index': return props.heat_index_c ?? 45.0;
      case 'vulnerability': return props.vulnerability_score ?? 55.0;
      case 'hamri': return props.hamri_score ?? 65.0;
      case 'surge_index': return props.surge_index ?? 60.0;
      default: return 50.0;
    }
  };

  // Professional Choropleth style function
  const styleFeature = (feature: any) => {
    const val = getMetricValueFromProps(feature.properties, activeLayer);
    const fillColor = getColorForMetric(val, activeLayer);
    const isSelected = selectedWardProps?.ward_id === feature.properties?.ward_id;

    return {
      fillColor,
      weight: isSelected ? 3.0 : 1.0,
      opacity: 1,
      color: isSelected ? MAP_PALETTE.selectedBorder : MAP_PALETTE.normalBorder,
      fillOpacity: isSelected ? 0.70 : 0.42,
      dashArray: isSelected ? '' : '1',
    };
  };

  // Event handlers for each GeoJSON ward polygon
  const onEachFeature = (feature: any, layer: L.Layer) => {
    const props = feature.properties;
    const val = getMetricValueFromProps(props, activeLayer);
    const sev = getSeverityLabel(val, activeLayer);
    const unit = METRIC_THRESHOLDS[activeLayer]?.unit || '';

    layer.bindTooltip(
      `<div style="font-family: monospace; font-size: 11px; padding: 4px 6px; background-color: #0f172a; color: #f8fafc; border: 1px solid #334155; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
        <strong style="color: #38bdf8">Ward ${props.ward_number} — ${props.name}</strong><br/>
        <span style="color: #94a3b8">${METRIC_THRESHOLDS[activeLayer]?.name}:</span> 
        <strong style="color: #f1f5f9">${val} ${unit}</strong> 
        <span style="color: #facc15; font-size: 10px;">(${sev})</span>
       </div>`,
      { sticky: true, className: 'leaflet-custom-tooltip' }
    );

    layer.on({
      click: () => {
        setSelectedWardProps(props);
        selectWard(props.ward_id, {
          ward_id: props.ward_id,
          ward_number: props.ward_number,
          name: props.name,
          zone_name: props.zone_name,
          total_population: props.total_population,
          elderly_population: props.elderly_population,
          outdoor_workers: props.outdoor_workers,
          air_temp_c: props.air_temp_c,
          relative_humidity: props.relative_humidity,
          heat_index_c: props.heat_index_c,
          wbgt_c: props.wbgt_c,
          utci_c: props.utci_c,
          htsi_score: props.htsi_score,
          vulnerability_score: props.vulnerability_score,
          hamri_score: props.hamri_score,
          nighttime_min_c: 29.5,
        });
      },
      mouseover: (e) => {
        const target = e.target;
        target.setStyle({
          weight: 2.5,
          color: MAP_PALETTE.hoverBorder,
          fillOpacity: 0.65,
        });
      },
      mouseout: (e) => {
        if (geoJsonLayerRef.current) {
          geoJsonLayerRef.current.resetStyle(e.target);
        }
      },
    });
  };

  const handleTileError = () => {
    console.warn('Map tile failed to load. Falling back to OpenStreetMap.');
    setProviderConfig(resolveMapProvider('osm_demo'));
  };

  const currentMetricConfig = METRIC_THRESHOLDS[activeLayer];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Primary Map View Mode Selector */}
      <div className="bg-[#0b1326] p-2 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveViewMode('thermal_terrain_3d')}
            className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition ${
              activeViewMode === 'thermal_terrain_3d'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg'
                : 'text-cyan-400 hover:bg-blue-950/60 border border-cyan-500/40 bg-[#070e1c]'
            }`}
          >
            <Box className="w-4 h-4 text-cyan-300 animate-pulse" />
            <span>3D Thermal Terrain Command Center</span>
            <span className="px-1.5 py-0.2 bg-blue-950 text-cyan-300 rounded text-[9px] border border-cyan-400/40">OFFICER 3D</span>
          </button>

          <button
            onClick={() => setActiveViewMode('thermomap_2d')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition ${
              activeViewMode === 'thermomap_2d'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'text-slate-300 hover:text-white hover:bg-slate-800 bg-[#070e1c] border border-slate-800'
            }`}
          >
            <MapIcon className="w-4 h-4 text-orange-400" />
            <span>2D ThermoMap & Pan-India Grid</span>
          </button>

          <button
            onClick={() => setActiveViewMode('legacy_choropleth')}
            className={`px-3 py-2 rounded-xl font-medium text-xs transition ${
              activeViewMode === 'legacy_choropleth'
                ? 'bg-slate-800 text-white border border-slate-600'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <span>Ward Choropleth (Legacy)</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-slate-400 pr-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>GIS Operational Command</span>
        </div>
      </div>

      {activeViewMode === 'thermal_terrain_3d' ? (
        <Municipal3DCommandCenter
          centerLat={13.0827}
          centerLon={80.2707}
          municipalityName="Greater Chennai Corporation"
          wardName="Ward 114 - Central Operations"
          onClose={() => setActiveViewMode('thermomap_2d')}
        />
      ) : activeViewMode === 'thermomap_2d' ? (
        <ThermoMap
          latitude={13.0827}
          longitude={80.2707}
          locationName="Greater Chennai Corporation"
          height="750px"
        />
      ) : (
        <>
          {/* Top Header & Disclaimers */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-command-border pb-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  Priority Areas & Satellite Heat Stress Analysis
                </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold">
              SYNTHETIC DEMONSTRATION WARD BOUNDARIES
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              NOT OFFICIAL GCC GEOGRAPHY
            </span>
          </div>
          <p className="text-xs text-command-muted mt-1 max-w-3xl leading-relaxed">
            Spatial thermal stress assessment across demonstration areas. Polygons represent illustrative planning zones mapped over high-resolution satellite imagery (Esri World Imagery adapter).
          </p>
        </div>

        {/* Action & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Layer Selector */}
          <div className="flex items-center gap-1.5 bg-command-card px-2.5 py-1.5 rounded-lg border border-command-border">
            <span className="text-xs text-command-subtle font-mono">Metric:</span>
            <select
              value={activeLayer}
              onChange={(e) => setActiveLayer(e.target.value as MetricLayer)}
              className="bg-command-panel text-xs text-white border border-command-border rounded px-2.5 py-1 focus:outline-none focus:border-cyan-500 font-mono cursor-pointer"
            >
              <option value="htsi">Human Thermal Stress (HTSI)</option>
              <option value="wbgt">Wet-Bulb Globe Temp (WBGT)</option>
              <option value="utci">Universal Thermal Climate (UTCI)</option>
              <option value="air_temp">Ambient Air Temp (°C)</option>
              <option value="heat_index">NOAA Heat Index (°C)</option>
              <option value="vulnerability">Ward Vulnerability Composite</option>
              <option value="hamri">HAMRI Demonstration Risk</option>
              <option value="surge_index">Hospital Surge Index</option>
            </select>
          </div>

          {/* Facility Filter Pills */}
          <div className="flex items-center bg-command-card rounded-lg border border-command-border p-1 text-xs font-mono">
            <button
              onClick={() => setFacilityFilter('all')}
              className={`px-2 py-1 rounded transition ${
                facilityFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Pins
            </button>
            <button
              onClick={() => setFacilityFilter('cooling')}
              className={`px-2 py-1 rounded transition flex items-center gap-1 ${
                facilityFilter === 'cooling' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Snowflake className="w-3 h-3 text-cyan-400" />
              <span>Cooling</span>
            </button>
            <button
              onClick={() => setFacilityFilter('hospitals')}
              className={`px-2 py-1 rounded transition flex items-center gap-1 ${
                facilityFilter === 'hospitals' ? 'bg-red-500/20 text-red-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <HospitalIcon className="w-3 h-3 text-red-400" />
              <span>Hospitals</span>
            </button>
            <button
              onClick={() => setFacilityFilter('none')}
              className={`px-2 py-1 rounded transition ${
                facilityFilter === 'none' ? 'bg-slate-700 text-slate-200' : 'text-slate-400 hover:text-white'
              }`}
              title="Hide all facility markers"
            >
              Hide
            </button>
          </div>

          {/* Map Provider Settings Popover */}
          <MapSettingsPopover
            currentConfig={providerConfig}
            activeProviderId={providerOverride}
            onSelectProvider={(id) => setProviderOverride(id)}
            onRetryProvider={() => setProviderConfig(resolveMapProvider(providerOverride))}
          />
        </div>
      </div>

      {/* Active Layer One-Sentence Meaning — Instruction 6 Requirement */}
      <div className="p-3 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-between text-xs text-slate-300 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
          <span>
            {activeLayer === 'htsi' && 'Heat exposure (HTSI): Shows composite human thermal strain factoring in solar load and nighttime warmth.'}
            {activeLayer === 'wbgt' && 'WBGT: Shows areas where direct solar radiation and humidity create occupational work stoppage conditions.'}
            {activeLayer === 'utci' && 'UTCI: Evaluates human physiological thermal comfort and cardiovascular heat stress.'}
            {activeLayer === 'air_temp' && 'Ambient Air Temperature: Shows standard dry-bulb temperature distribution.'}
            {activeLayer === 'heat_index' && 'Heat Index: Apparent perceived temperature based on relative humidity.'}
            {activeLayer === 'vulnerability' && 'Vulnerability: Identifies wards with high outdoor worker exposure and low tree canopy cover.'}
            {activeLayer === 'hamri' && 'Health-service access: Emergency medical infrastructure pressure under high thermal load.'}
            {activeLayer === 'surge_index' && 'Hospital Surge Index: Anticipated emergency department volume expansion pressure.'}
          </span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">Single dominant layer</span>
      </div>

      {/* Non-blocking Error / Alert Banner */}
      {errorMessage && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-xs text-red-200 flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={fetchGisData}
            className="flex items-center gap-1 px-2 py-1 rounded bg-red-800/40 hover:bg-red-700/60 text-white transition"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Main Spatial Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map View Container (3 cols) */}
        <div className="lg:col-span-3 bg-command-card border border-command-border rounded-xl overflow-hidden relative min-h-[600px] h-[600px]">
          {loading && (
            <div className="absolute inset-0 z-20 bg-command-bg/80 flex items-center justify-center text-xs text-command-muted font-mono">
              Loading GeoJSON synthetic polygons & facilities...
            </div>
          )}

          <MapContainer
            center={defaultCenter}
            zoom={defaultZoom}
            style={{ width: '100%', height: '100%', backgroundColor: '#080c14' }}
            zoomControl={true}
          >
            <MapViewController center={defaultCenter} zoom={defaultZoom} />

            {/* Dynamic Tile Layer */}
            <TileLayer
              key={providerConfig.tileUrl}
              attribution={providerConfig.attribution}
              url={providerConfig.tileUrl}
              maxZoom={providerConfig.maxZoom}
              eventHandlers={{
                tileerror: handleTileError,
              }}
            />

            {/* GeoJSON Ward Choropleth Layer */}
            {geoJsonData && (
              <GeoJSON
                key={`${activeLayer}-${providerConfig.id}`}
                data={geoJsonData}
                style={styleFeature}
                onEachFeature={onEachFeature}
                ref={geoJsonLayerRef}
              />
            )}

            {/* Cooling Centers Pins */}
            {(facilityFilter === 'all' || facilityFilter === 'cooling') &&
              facilities.cooling_centers.map((cc) => (
                <Marker
                  key={cc.id}
                  position={[cc.latitude, cc.longitude]}
                  icon={coolingCenterIcon}
                >
                  <Popup className="custom-leaflet-popup">
                    <div className="p-2 space-y-1 font-sans text-xs bg-slate-900 text-white rounded">
                      <div className="font-bold flex items-center gap-1 text-cyan-400">
                        <Snowflake className="w-3.5 h-3.5" />
                        <span>{cc.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-300">{cc.address}</div>
                      <div className="text-[10px] text-cyan-300 font-mono pt-1">
                        Planning Capacity: {cc.capacity} persons
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Water & Power Backup: Available
                      </div>
                      <span className="inline-block px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 text-[9px] font-mono border border-slate-700">
                        Synthetic demonstration facility
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {/* Hospital Pins (Non-clinical planning representations) */}
            {(facilityFilter === 'all' || facilityFilter === 'hospitals') &&
              facilities.hospitals.map((h) => (
                <Marker
                  key={h.id}
                  position={[h.latitude, h.longitude]}
                  icon={hospitalMarkerIcon}
                >
                  <Popup className="custom-leaflet-popup">
                    <div className="p-2 space-y-1 font-sans text-xs bg-slate-900 text-white rounded">
                      <div className="font-bold flex items-center gap-1 text-red-400">
                        <HospitalIcon className="w-3.5 h-3.5" />
                        <span>{h.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-300">{h.type}</div>
                      <div className="text-[10px] text-cyan-300 font-mono pt-1">
                        Readiness Category: {h.readiness_status || 'Demonstration assessment'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Contact: Not connected in demo mode
                      </div>
                      <span className="inline-block px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 text-[9px] font-mono border border-slate-700">
                        Synthetic demonstration facility
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>

          {/* Floating Metric Legend */}
          <div className="absolute bottom-4 left-4 z-[400] bg-command-card/95 backdrop-blur-md p-3.5 rounded-xl border border-command-border text-xs space-y-2 shadow-2xl max-w-sm">
            <div className="font-mono font-bold text-[11px] text-white flex items-center justify-between gap-4">
              <span>{currentMetricConfig.name}</span>
              <span className="text-[10px] text-cyan-400">{currentMetricConfig.unit}</span>
            </div>

            {/* Severity Swatches */}
            <div className="grid grid-cols-5 gap-1 pt-1">
              {currentMetricConfig.bands.map((b) => (
                <div key={b.label} className="text-center space-y-1">
                  <div
                    className="h-2 rounded-sm"
                    style={{ backgroundColor: b.color }}
                  />
                  <span className="text-[9px] font-mono text-slate-400 block truncate">
                    {b.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="text-[9px] text-slate-400 pt-1 border-t border-slate-800 leading-tight">
              <span>Standard: {currentMetricConfig.standard}.</span>{' '}
              <span className="text-amber-400">{currentMetricConfig.disclaimer}</span>
            </div>

            <div className="text-[9px] font-mono text-slate-500 flex justify-between pt-0.5">
              <span>{providerConfig.label}</span>
              <span>CHENNAI METRO (IST)</span>
            </div>
          </div>
        </div>

        {/* Right Col: Ward Inspector Drawer */}
        <div className="bg-command-card border border-command-border rounded-xl p-5 space-y-4 overflow-y-auto max-h-[600px]">
          {selectedWardProps ? (
            <>
              <div className="border-b border-command-border pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-cyan-400 font-semibold uppercase">Ward Inspector</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                    Ward {selectedWardProps.ward_number}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  {selectedWardProps.name}
                </h3>
                <span className="text-xs text-command-muted font-mono">{selectedWardProps.zone_name}</span>
              </div>

              {/* Active Metric Highlight Card */}
              <div className="bg-command-panel p-3.5 rounded-lg border border-command-border flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-command-muted font-mono uppercase block">
                    {currentMetricConfig.name}
                  </span>
                  <span className="text-2xl font-black font-mono text-white">
                    {getMetricValueFromProps(selectedWardProps, activeLayer)}
                    <span className="text-xs text-command-muted font-normal"> {currentMetricConfig.unit}</span>
                  </span>
                  <span className="text-xs font-mono font-bold block text-amber-400 mt-0.5">
                    {getSeverityLabel(getMetricValueFromProps(selectedWardProps, activeLayer), activeLayer)} Severity
                  </span>
                </div>
                <div
                  className="w-5 h-5 rounded-full ring-4 ring-slate-800 shadow-md"
                  style={{
                    backgroundColor: getColorForMetric(
                      getMetricValueFromProps(selectedWardProps, activeLayer),
                      activeLayer
                    ),
                  }}
                />
              </div>

              {/* Biometeorological Snapshot */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-semibold text-command-muted uppercase">Thermal Environment</span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-command-panel/70 p-2 rounded border border-command-border">
                    <span className="text-[10px] text-command-subtle block">Air Temp</span>
                    <span className="text-white font-bold">{selectedWardProps.air_temp_c}°C</span>
                  </div>
                  <div className="bg-command-panel/70 p-2 rounded border border-command-border">
                    <span className="text-[10px] text-command-subtle block">Rel. Humidity</span>
                    <span className="text-cyan-400 font-bold">{selectedWardProps.relative_humidity}%</span>
                  </div>
                  <div className="bg-command-panel/70 p-2 rounded border border-command-border">
                    <span className="text-[10px] text-command-subtle block">Heat Index</span>
                    <span className="text-amber-400 font-bold">{selectedWardProps.heat_index_c}°C</span>
                  </div>
                  <div className="bg-command-panel/70 p-2 rounded border border-command-border">
                    <span className="text-[10px] text-command-subtle block">WBGT</span>
                    <span className="text-orange-400 font-bold">{selectedWardProps.wbgt_c}°C</span>
                  </div>
                  <div className="bg-command-panel/70 p-2 rounded border border-command-border">
                    <span className="text-[10px] text-command-subtle block">UTCI Stress</span>
                    <span className="text-rose-400 font-bold">{selectedWardProps.utci_c}°C</span>
                  </div>
                  <div className="bg-command-panel/70 p-2 rounded border border-command-border">
                    <span className="text-[10px] text-command-subtle block">HTSI Score</span>
                    <span className="text-purple-400 font-bold">{selectedWardProps.htsi_score}</span>
                  </div>
                </div>
              </div>

              {/* Demographics & Vulnerability */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-semibold text-command-muted uppercase">Vulnerability Factors</span>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-command-muted flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      Elderly Citizens:
                    </span>
                    <span className="font-mono text-white font-bold">
                      {selectedWardProps.elderly_population?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-command-muted flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                      Outdoor Labor Force:
                    </span>
                    <span className="font-mono text-white font-bold">
                      {selectedWardProps.outdoor_workers?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-command-muted flex items-center gap-1">
                      <TreeDeciduous className="w-3.5 h-3.5 text-emerald-400" />
                      NDVI Green Cover:
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {selectedWardProps.vegetation_ndvi}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-command-muted">Built-Up Surface:</span>
                    <span className="font-mono text-cyan-400 font-bold">
                      {Math.round((selectedWardProps.builtup_fraction || 0.7) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Health-Service Pressure Indicator */}
              <div className="p-3 rounded-lg bg-command-panel border border-command-border space-y-1 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 uppercase">Health Pressure:</span>
                  <span className="font-bold text-amber-400 text-sm">
                    {selectedWardProps.htsi_score >= 75 ? 'Elevated' : 'Moderate'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Illustrative planning indicator. Not an individual medical prediction or official mortality forecast.
                </p>
              </div>

              {/* Provenance & Disclaimer Footer */}
              <div className="text-[10px] text-slate-400 pt-2 border-t border-command-border space-y-1">
                <div className="flex items-center gap-1 text-slate-500 font-mono">
                  <Info className="w-3 h-3 text-cyan-400" />
                  <span>Data Provenance: Synthetic Prototype Model</span>
                </div>
                <p className="text-slate-500 leading-tight">
                  Boundaries are synthetic demonstration polygons. Calculations provided for municipal planning triage.
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-command-muted text-xs">
              Click any ward on the satellite map to inspect thermal environment and vulnerability factors.
            </div>
          )}
        </div>
      </div>

      {/* Priority Areas Assessment Table */}
      <div className="p-5 rounded-2xl bg-command-card border border-command-border space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-command-border/60 pb-3">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Demonstration Ward Priority Assessment
            </h2>
            <p className="text-xs text-command-muted">
              Ranked demonstration priority based on thermal strain, outdoor worker density, and built-up heat retention
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-command-muted">Order:</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-semibold border border-slate-700">
              Demonstration Priority Order
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-command-border text-command-muted font-mono text-[11px] uppercase">
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Demonstration Ward</th>
                <th className="py-2.5 px-3">Heat Stress</th>
                <th className="py-2.5 px-3">Air Temp / Humidity</th>
                <th className="py-2.5 px-3">Main Vulnerability Reason</th>
                <th className="py-2.5 px-3">Recommended Municipal Action</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-command-border/60">
              {geoJsonData && (geoJsonData as any).features ? (
                (geoJsonData as any).features
                  .slice()
                  .sort((a: any, b: any) => (b.properties.htsi_score || 0) - (a.properties.htsi_score || 0))
                  .map((feat: any, idx: number) => {
                    const p = feat.properties;
                    const isHigh = (p.htsi_score || 0) >= 72;
                    return (
                      <tr
                        key={p.ward_id}
                        className={`hover:bg-command-panel/60 transition ${
                          selectedWardProps?.ward_id === p.ward_id ? 'bg-cyan-950/20' : ''
                        }`}
                      >
                        <td className="py-3 px-3 font-mono font-bold text-slate-400">
                          #{idx + 1}
                        </td>
                        <td className="py-3 px-3 font-semibold text-white">
                          <div>Ward {p.ward_number} — {p.name}</div>
                          <span className="text-[10px] text-command-muted font-mono">{p.zone_name}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                              isHigh
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {p.htsi_category || 'High'} ({p.htsi_score})
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300">
                          {p.air_temp_c}°C / {p.relative_humidity}%
                        </td>
                        <td className="py-3 px-3 text-slate-300 max-w-xs">
                          {p.builtup_fraction > 0.8
                            ? 'High built-up surface with minimal vegetative shade.'
                            : 'Elevated outdoor labor activity and high humidity.'}
                        </td>
                        <td className="py-3 px-3 text-cyan-300 text-xs">
                          {isHigh
                            ? 'Activate shaded hydration tankers & extend cooling hours'
                            : 'Issue hydration guidance to labor sites'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedWardProps(p)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-200 text-xs font-mono font-semibold transition"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-command-muted font-mono text-xs">
                    Loading demonstration ward priority data...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
