export type RiskCategory = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY HIGH' | 'EXTREME';

export interface H3RiskProperties {
  h3_index: string;
  center_lat: number;
  center_lon: number;
  risk_score: number;
  risk_category: RiskCategory;
  color: string;
  temperature_c: number;
  feels_like_c: number;
  relative_humidity: number;
  wbgt_c: number;
  utci_c: number;
  heat_index_c: number;
  htsi_score: number;
  safe_exposure_minutes: number;
  water_intake_lph: number;
  work_rest_guidance: string;
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
    center_h3: string;
    resolution: number;
    radius_km: number;
    cell_count: number;
    generated_at: string;
    data_quality: {
      source: string;
      spatial_resolution: string;
      is_interpolated: boolean;
      disclaimer: string;
    };
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
