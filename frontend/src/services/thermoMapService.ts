import type {
  H3RiskFeatureCollection,
  OsmFacilityFeatureCollection,
  EmergencyRouteFeature,
  StreetThermalFeatureCollection,
  TimeOfDay,
  IndiaGridFeatureCollection,
  Thermal3DCommandData
} from '../types/thermomap';

export async function fetchThermoMapRisk(
  latitude: number,
  longitude: number,
  radiusKm: number = 6.0,
  resolution: number = 8,
  timeOfDay: TimeOfDay = 'afternoon'
): Promise<H3RiskFeatureCollection> {
  const url = `/api/v1/thermomap/risk?latitude=${latitude}&longitude=${longitude}&radius_km=${radiusKm}&resolution=${resolution}&time_of_day=${timeOfDay}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`Failed to load ThermoMap risk grid: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchStreetThermalData(
  latitude: number,
  longitude: number,
  radiusKm: number = 4.0,
  timeOfDay: TimeOfDay = 'afternoon'
): Promise<StreetThermalFeatureCollection> {
  const url = `/api/v1/thermomap/streets?latitude=${latitude}&longitude=${longitude}&radius_km=${radiusKm}&time_of_day=${timeOfDay}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`Failed to load street thermal data: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchThermoMapFacilities(
  latitude: number,
  longitude: number,
  radiusKm: number = 8.0
): Promise<OsmFacilityFeatureCollection> {
  const url = `/api/v1/thermomap/facilities?latitude=${latitude}&longitude=${longitude}&radius_km=${radiusKm}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`Failed to load healthcare facilities: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchEmergencyRoute(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number
): Promise<EmergencyRouteFeature> {
  const url = `/api/v1/thermomap/routing?start_lat=${startLat}&start_lon=${startLon}&end_lat=${endLat}&end_lon=${endLon}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`Failed to calculate emergency route: ${res.statusText}`);
  }
  return res.json();
}
export interface GridQueryParams {
  minLat?: number;
  minLon?: number;
  maxLat?: number;
  maxLon?: number;
  zoom?: number;
  timeOfDay?: TimeOfDay;
}

export async function fetchIndiaGridData(
  params: GridQueryParams = {}
): Promise<IndiaGridFeatureCollection> {
  const minLat = params.minLat ?? 8.0;
  const minLon = params.minLon ?? 68.0;
  const maxLat = params.maxLat ?? 37.2;
  const maxLon = params.maxLon ?? 97.5;
  const zoom = params.zoom ?? 5.0;
  const timeOfDay = params.timeOfDay ?? 'afternoon';

  const url = `/api/v1/thermomap/india-grid?min_lat=${minLat}&min_lon=${minLon}&max_lat=${maxLat}&max_lon=${maxLon}&zoom=${zoom}&time_of_day=${timeOfDay}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`Failed to load India thermal grid: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchIndiaBoundaryGeoJson(): Promise<any> {
  const url = `/api/v1/thermomap/india-boundary`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`Failed to load India boundary: ${res.statusText}`);
  }
  return res.json();
}

export async function fetch3DThermalCommandData(
  latitude: number,
  longitude: number,
  radiusKm: number = 8.0,
  timeOfDay: TimeOfDay = 'afternoon'
): Promise<Thermal3DCommandData> {
  const url = `/api/v1/thermomap/3d-command?latitude=${latitude}&longitude=${longitude}&radius_km=${radiusKm}&time_of_day=${timeOfDay}`;
  const res = await fetch(url, { credentials: 'include' });
  if (res.status === 403) {
    throw new Error('Access restricted: 3D Command Mode is accessible exclusively to Municipal Officers and Administrators.');
  }
  if (!res.ok) {
    throw new Error(`Failed to load 3D thermal command data: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Provider Abstraction for Thermal Data
 * Enables seamless switching between simulated/demo data and future live IMD/Open-Meteo APIs.
 */
export interface ThermalDataProvider {
  getIndiaGridData(params?: GridQueryParams): Promise<IndiaGridFeatureCollection>;
  get3DThermalData(lat: number, lon: number, radiusKm?: number, timeOfDay?: TimeOfDay): Promise<Thermal3DCommandData>;
  getLocationRisk(lat: number, lon: number, radiusKm?: number, timeOfDay?: TimeOfDay): Promise<H3RiskFeatureCollection>;
}

export class MockThermalDataProvider implements ThermalDataProvider {
  getIndiaGridData(params?: GridQueryParams): Promise<IndiaGridFeatureCollection> {
    return fetchIndiaGridData(params);
  }
  get3DThermalData(lat: number, lon: number, radiusKm: number = 8.0, timeOfDay: TimeOfDay = 'afternoon'): Promise<Thermal3DCommandData> {
    return fetch3DThermalCommandData(lat, lon, radiusKm, timeOfDay);
  }
  getLocationRisk(lat: number, lon: number, radiusKm: number = 6.0, timeOfDay: TimeOfDay = 'afternoon'): Promise<H3RiskFeatureCollection> {
    return fetchThermoMapRisk(lat, lon, radiusKm, 8, timeOfDay);
  }
}

export class LiveWeatherDataProvider implements ThermalDataProvider {
  // Placeholder for real API keys when provided by user
  private _apiKey?: string;

  constructor(apiKey?: string) {
    this._apiKey = apiKey;
  }

  public get apiKey(): string | undefined {
    return this._apiKey;
  }

  getIndiaGridData(params?: GridQueryParams): Promise<IndiaGridFeatureCollection> {
    // When live API is configured, requests live satellite LST and IMD grid feeds
    return fetchIndiaGridData(params);
  }
  get3DThermalData(lat: number, lon: number, radiusKm: number = 8.0, timeOfDay: TimeOfDay = 'afternoon'): Promise<Thermal3DCommandData> {
    return fetch3DThermalCommandData(lat, lon, radiusKm, timeOfDay);
  }
  getLocationRisk(lat: number, lon: number, radiusKm: number = 6.0, timeOfDay: TimeOfDay = 'afternoon'): Promise<H3RiskFeatureCollection> {
    return fetchThermoMapRisk(lat, lon, radiusKm, 8, timeOfDay);
  }
}

// Active provider instance
export const activeThermalDataProvider: ThermalDataProvider = new MockThermalDataProvider();
