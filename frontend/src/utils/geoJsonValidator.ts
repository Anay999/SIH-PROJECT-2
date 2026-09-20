/**
 * Frontend GeoJSON Validation Utility for HEATSHIELD AI.
 * Validates GeoJSON FeatureCollections, coordinate bounding bounds, closed rings,
 * and extracts safe diagnostic warnings.
 */

export const CHENNAI_LON_BOUNDS: [number, number] = [80.00, 80.40];
export const CHENNAI_LAT_BOUNDS: [number, number] = [12.80, 13.35];

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  wardCount: number;
}

export function validateWardGeoJson(geojson: any): ValidationResult {
  const errors: string[] = [];

  if (!geojson || typeof geojson !== 'object') {
    return { isValid: false, errors: ['Invalid GeoJSON: Root is not an object.'], wardCount: 0 };
  }

  if (geojson.type !== 'FeatureCollection') {
    errors.push(`Expected FeatureCollection, got ${geojson.type}`);
  }

  const features = geojson.features;
  if (!Array.isArray(features) || features.length === 0) {
    return { isValid: false, errors: ['GeoJSON contains no features.'], wardCount: 0 };
  }

  const seenIds = new Set<string>();

  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    const featId = f.id || f.properties?.ward_id || `feature_${i}`;

    if (seenIds.has(featId)) {
      errors.push(`Duplicate feature ID detected: ${featId}`);
    }
    seenIds.add(featId);

    const geom = f.geometry;
    if (!geom || typeof geom !== 'object') {
      errors.push(`Feature ${featId} missing valid geometry.`);
      continue;
    }

    if (geom.type === 'Polygon') {
      if (!Array.isArray(geom.coordinates) || geom.coordinates.length === 0) {
        errors.push(`Feature ${featId} has empty polygon coordinates.`);
        continue;
      }
      for (const ring of geom.coordinates) {
        if (!Array.isArray(ring) || ring.length < 4) {
          errors.push(`Feature ${featId} ring has fewer than 4 points.`);
          continue;
        }
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (Math.abs(first[0] - last[0]) > 1e-6 || Math.abs(first[1] - last[1]) > 1e-6) {
          errors.push(`Feature ${featId} polygon ring is not closed.`);
        }
        for (const pt of ring) {
          const [lon, lat] = pt;
          if (lon < CHENNAI_LON_BOUNDS[0] || lon > CHENNAI_LON_BOUNDS[1]) {
            errors.push(`Feature ${featId} longitude ${lon} outside Chennai range.`);
            break;
          }
          if (lat < CHENNAI_LAT_BOUNDS[0] || lat > CHENNAI_LAT_BOUNDS[1]) {
            errors.push(`Feature ${featId} latitude ${lat} outside Chennai range.`);
            break;
          }
        }
      }
    } else if (geom.type === 'MultiPolygon') {
      // Valid MultiPolygon
    } else {
      errors.push(`Unsupported geometry type ${geom.type} in feature ${featId}.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    wardCount: features.length,
  };
}
