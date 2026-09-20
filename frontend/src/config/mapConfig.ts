/**
 * Map Provider Configuration & Resolution for HEATSHIELD AI.
 * Handles configurable tile provider adapters (Esri Satellite, Esri Dark Canvas,
 * OpenStreetMap, MapTiler, Mapbox) with robust non-blocking fallbacks.
 *
 * Notice: Esri and OSM services are subject to provider terms and network availability.
 * Always displayed with required copyright attributions.
 */

export type MapProviderId =
  | 'esri_satellite'
  | 'esri_dark'
  | 'osm_demo'
  | 'carto_dark'
  | 'maptiler'
  | 'mapbox'
  | 'custom';

export type ProviderStatus = 'CONFIGURED' | 'FALLBACK ACTIVE' | 'MISSING CONFIGURATION' | 'PROVIDER ERROR';

export interface MapProviderConfig {
  id: MapProviderId;
  name: string;
  tileUrl: string;
  attribution: string;
  maxZoom: number;
  label: string;
  hasKey: boolean;
  status: ProviderStatus;
  isFallback: boolean;
}

// 1. Realistic Satellite View (Esri World Imagery) - Default
export const ESRI_SATELLITE_CONFIG: MapProviderConfig = {
  id: 'esri_satellite',
  name: 'Realistic Satellite (Esri)',
  tileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and GIS User Community',
  maxZoom: 18,
  label: 'BASEMAP: SATELLITE (ESRI)',
  hasKey: true,
  status: 'CONFIGURED',
  isFallback: false,
};

// 2. Clean Dark Municipal Canvas (Esri Dark Gray Base)
export const ESRI_DARK_CONFIG: MapProviderConfig = {
  id: 'esri_dark',
  name: 'Dark Canvas (Esri)',
  tileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
  maxZoom: 16,
  label: 'BASEMAP: DARK CANVAS (ESRI)',
  hasKey: true,
  status: 'CONFIGURED',
  isFallback: false,
};

// 3. Documented Public Street Fallback (OpenStreetMap)
export const FALLBACK_OSM_DEMO: MapProviderConfig = {
  id: 'osm_demo',
  name: 'OpenStreetMap (Streets)',
  tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 18,
  label: 'BASEMAP: OPENSTREETMAP',
  hasKey: true,
  status: 'CONFIGURED',
  isFallback: false,
};

// 4. Carto Dark (Requires API Key in current Carto tier)
export const CARTO_DARK_CONFIG: MapProviderConfig = {
  id: 'carto_dark',
  name: 'CARTO Dark Matter',
  tileUrl: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19,
  label: 'BASEMAP: CARTO DARK',
  hasKey: false,
  status: 'MISSING CONFIGURATION',
  isFallback: true,
};

export const BASEMAP_PROVIDERS = {
  esriSatellite: {
    url: ESRI_SATELLITE_CONFIG.tileUrl,
    attribution: ESRI_SATELLITE_CONFIG.attribution,
  },
  esriDark: {
    url: ESRI_DARK_CONFIG.tileUrl,
    attribution: ESRI_DARK_CONFIG.attribution,
  },
  osm: {
    url: FALLBACK_OSM_DEMO.tileUrl,
    attribution: FALLBACK_OSM_DEMO.attribution,
  },
};


export function resolveMapProvider(overrideProvider?: MapProviderId): MapProviderConfig {
  const env = import.meta.env;

  // Default provider is realistic satellite view (Esri World Imagery)
  const targetProvider: MapProviderId =
    overrideProvider || (env.VITE_MAP_PROVIDER as MapProviderId) || 'esri_satellite';

  const customTileUrl = env.VITE_MAP_TILE_URL;
  const customAttribution = env.VITE_MAP_ATTRIBUTION;

  const maptilerKey = env.VITE_MAPTILER_API_KEY;
  const mapboxToken = env.VITE_MAPBOX_ACCESS_TOKEN;

  // 1. Custom Provider
  if (targetProvider === 'custom' || customTileUrl) {
    if (customTileUrl) {
      return {
        id: 'custom',
        name: 'Custom Tile Server',
        tileUrl: customTileUrl,
        attribution: customAttribution || '&copy; Custom Map Data Provider',
        maxZoom: 19,
        label: 'BASEMAP: CUSTOM',
        hasKey: true,
        status: 'CONFIGURED',
        isFallback: false,
      };
    }
  }

  // 2. Realistic Satellite View (Default)
  if (targetProvider === 'esri_satellite') {
    const satelliteUrl = env.VITE_MAP_SATELLITE_TILE_URL || ESRI_SATELLITE_CONFIG.tileUrl;
    return {
      ...ESRI_SATELLITE_CONFIG,
      tileUrl: satelliteUrl,
    };
  }

  // 3. Dark Canvas
  if (targetProvider === 'esri_dark') {
    const darkUrl = env.VITE_MAP_DARK_TILE_URL || ESRI_DARK_CONFIG.tileUrl;
    return {
      ...ESRI_DARK_CONFIG,
      tileUrl: darkUrl,
    };
  }

  // 4. OpenStreetMap
  if (targetProvider === 'osm_demo') {
    return FALLBACK_OSM_DEMO;
  }

  // 5. MapTiler Provider
  if (targetProvider === 'maptiler') {
    if (maptilerKey && maptilerKey.trim().length > 0) {
      return {
        id: 'maptiler',
        name: 'MapTiler Dark',
        tileUrl: `https://api.maptiler.com/maps/darkmatter/{z}/{x}/{y}.png?key=${maptilerKey.trim()}`,
        attribution: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
        label: 'BASEMAP: MAPTILER',
        hasKey: true,
        status: 'CONFIGURED',
        isFallback: false,
      };
    }
    return {
      ...ESRI_SATELLITE_CONFIG,
      label: 'BASEMAP: SATELLITE (MapTiler Key Missing)',
      status: 'FALLBACK ACTIVE',
      isFallback: true,
    };
  }

  // 6. Mapbox Provider
  if (targetProvider === 'mapbox') {
    if (mapboxToken && mapboxToken.trim().length > 0) {
      return {
        id: 'mapbox',
        name: 'Mapbox Dark v11',
        tileUrl: `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=${mapboxToken.trim()}`,
        attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
        label: 'BASEMAP: MAPBOX',
        hasKey: true,
        status: 'CONFIGURED',
        isFallback: false,
      };
    }
    return {
      ...ESRI_SATELLITE_CONFIG,
      label: 'BASEMAP: SATELLITE (Mapbox Token Missing)',
      status: 'FALLBACK ACTIVE',
      isFallback: true,
    };
  }

  // 7. Carto Dark (only if explicit key or requested)
  if (targetProvider === 'carto_dark') {
    return CARTO_DARK_CONFIG;
  }

  // Default fallback is Esri Satellite
  return ESRI_SATELLITE_CONFIG;
}
