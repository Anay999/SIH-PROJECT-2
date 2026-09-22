export type RiskCategory = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY HIGH' | 'EXTREME';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export type ThermalMetric = 'air_temp' | 'lst' | 'wbgt' | 'utci' | 'htsi' | 'risk';

export type BasemapMode = 'streets' | 'satellite';

export interface H3RiskProperties {
  h3_index: string;
  grid_id?: string;
  center_lat: number;
  center_lon: number;
  street_name?: string;
  road_type?: string;
  land_cover?: string;
  air_temperature_c: number;
  land_surface_temp_c: number;
  temperature_c: number; // Backward-compatible alias to air_temperature_c
  feels_like_c: number;
  relative_humidity: number;
  wbgt_c: number;
  utci_c: number;
  heat_index_c: number;
  htsi_score: number;
  risk_score: number;
  risk_category: RiskCategory;
  color: string;
  temp_color?: string;
  safe_exposure_minutes: number;
  water_intake_lph: number;
  work_rest_guidance: string;
  confidence_pct: number;
  satellite_freshness: string;
  weather_freshness: string;
  data_source: string;
  time_of_day: TimeOfDay | string;
  timestamp_utc: string;
}

export interface H3RiskFeature {
  type: 'Feature';
  id: string;
  properties: H3RiskProperties;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface H3RiskFeatureCollection {
  type: 'FeatureCollection';
  features: H3RiskFeature[];
  metadata: {
    center: [number, number];
    center_h3?: string;
    resolution: number;
    radius_km: number;
    grid_dimensions?: string;
    cell_count: number;
    time_of_day?: string;
    time_label?: string;
    generated_at: string;
    data_quality: {
      source: string;
      spatial_resolution: string;
      is_interpolated: boolean;
      disclaimer: string;
    };
  };
}

export interface StreetThermalProperties {
  street_name: string;
  road_type: string;
  air_temperature_c: number;
  land_surface_temp_c: number;
  relative_humidity: number;
  wbgt_c: number;
  utci_c: number;
  heat_index_c: number;
  risk_category: RiskCategory;
  color: string;
  confidence_pct: number;
  data_source: string;
}

export interface StreetThermalFeature {
  type: 'Feature';
  id: string;
  properties: StreetThermalProperties;
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}

export interface StreetThermalFeatureCollection {
  type: 'FeatureCollection';
  features: StreetThermalFeature[];
  metadata: {
    center: [number, number];
    street_count: number;
    time_of_day: string;
  };
}

export interface OsmFacilityProperties {
  osm_id: string | number;
  name: string;
  amenity: string;
  emergency: string;
  phone?: string;
  address?: string;
  ward_name?: string;
  beds_available?: number;
  is_cooling_center?: boolean;
  source: string;
}

export interface OsmFacilityFeature {
  type: 'Feature';
  id: string;
  properties: OsmFacilityProperties;
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export interface OsmFacilityFeatureCollection {
  type: 'FeatureCollection';
  features: OsmFacilityFeature[];
  metadata?: {
    count: number;
    bounding_box: number[];
    cached: boolean;
  };
}

export interface EmergencyRouteFeature {
  type: 'Feature';
  properties: {
    distance_km: number;
    duration_minutes: number;
    summary: string;
    mode: string;
  };
  geometry: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}

export interface IndiaGridCellProperties {
  cell_id: string;
  center_lat: number;
  center_lon: number;
  air_temperature_c: number;
  land_surface_temp_c: number;
  temperature_c: number;
  feels_like_c: number;
  relative_humidity: number;
  wind_speed_kmh: number;
  wbgt_c: number;
  utci_c: number;
  heat_index_c: number;
  htsi_score: number;
  risk_score: number;
  risk_category: RiskCategory;
  color: string;
  temp_color: string;
  state_name: string;
  district_name: string;
  climate_region: string;
  data_status: string;
  updated_at: string;
}

export interface IndiaGridOverview {
  average_temperature_c: number;
  apparent_temperature_c: number;
  relative_humidity: number;
  wind_speed_kmh: number;
  wbgt_c: number;
  utci_c: number;
  htsi_score: number;
  risk_category: string;
  total_states: number;
  total_uts: number;
  total_districts: number;
  high_risk_states: Array<{ state: string; htsi: number }>;
  last_updated: string;
}

export interface IndiaGridFeature {
  type: 'Feature';
  id: string;
  properties: IndiaGridCellProperties;
  geometry: {
    type: string;
    coordinates: any;
  };
}

export interface IndiaGridFeatureCollection {
  type: 'FeatureCollection';
  features: IndiaGridFeature[];
  wave_contours?: {
    type: 'FeatureCollection';
    features: any[];
  };
  overview?: IndiaGridOverview;
  metadata: {
    country: string;
    bbox: number[];
    zoom: number;
    step_deg?: number;
    step_degrees?: number;
    cell_count: number;
    time_of_day: string;
    data_status: string;
    generated_at: string;
    provider?: string;
    last_updated?: string;
    data_source?: string;
    data_quality?: string;
    confidence?: string;
  };
}

export interface Thermal3DPlumeProperties {
  band: number;
  air_temperature_c: number;
  surface_temp_c: number;
  color: string;
  elevation_offset_m: number;
  risk_level: string;
  dispersion_rate: string;
  description: string;
}

export interface Thermal3DTelemetryTarget {
  id: string;
  name: string;
  lat: number;
  lon: number;
  elevation_m: number;
  temp_c: number;
  status: string;
  classification: string;
  signal_dbm?: number;
  battery_pct?: number;
  freq?: string;
}

export interface Thermal3DCommandData {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: Thermal3DPlumeProperties;
    geometry: {
      type: 'Polygon';
      coordinates: number[][][];
    };
  }>;
  targets: Thermal3DTelemetryTarget[];
  metadata: {
    center: [number, number];
    radius_km: number;
    time_of_day: string;
    command_center: string;
    terrain_mode: string;
    base_air_temp: number;
    base_lst_temp: number;
    data_status: string;
  };
}

export interface Command3DConfig {
  gridSize: 512 | 1024 | 2048;
  thermalOpacity: number;
  colorScheme: 'rainbow' | 'inferno' | 'ironbow' | 'turbo' | 'oceanic';
  showTopography: boolean;
  showBuildings: boolean;
  showSensors: boolean;
  pitch: number;
  bearing: number;
}

