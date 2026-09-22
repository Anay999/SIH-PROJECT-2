import type {
  H3RiskFeatureCollection,
  OsmFacilityFeatureCollection,
  EmergencyRouteFeature
} from '../types/thermomap';

export async function fetchThermoMapRisk(
  latitude: number,
  longitude: number,
  radiusKm: number = 6.0,
  resolution: number = 8
): Promise<H3RiskFeatureCollection> {
  const url = `/api/v1/thermomap/risk?latitude=${latitude}&longitude=${longitude}&radius_km=${radiusKm}&resolution=${resolution}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`Failed to load ThermoMap risk grid: ${res.statusText}`);
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
