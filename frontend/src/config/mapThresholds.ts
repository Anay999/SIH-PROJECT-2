/**
 * Centralized Map Thresholds & Semantic Color Scale for HEATSHIELD AI.
 * Restrained emergency-operations palette:
 * Low (Teal/Green) -> Moderate (Blue) -> High (Amber) -> Very High (Orange) -> Extreme (Red)
 */

export type MetricLayer = 'htsi' | 'wbgt' | 'utci' | 'air_temp' | 'heat_index' | 'vulnerability' | 'hamri' | 'surge_index';

export interface SeverityBand {
  min: number;
  max: number;
  label: 'Low' | 'Moderate' | 'High' | 'Very High' | 'Extreme';
  color: string;
  description: string;
}

export interface MetricThresholdConfig {
  id: MetricLayer;
  name: string;
  unit: string;
  standard: string;
  disclaimer?: string;
  bands: SeverityBand[];
}

export const MAP_PALETTE = {
  low: '#10b981',       // Emerald/Teal
  moderate: '#2563eb',  // Cobalt Blue
  high: '#d97706',      // Deep Amber
  veryHigh: '#ea580c',  // Pure Orange
  extreme: '#dc2626',   // Crimson Red
  selectedBorder: '#38bdf8', // Cyan 400
  normalBorder: '#334155',   // Slate 700
  hoverBorder: '#67e8f9',    // Cyan 300
};

export const METRIC_THRESHOLDS: Record<MetricLayer, MetricThresholdConfig> = {
  htsi: {
    id: 'htsi',
    name: 'Human Thermal Stress Index (HTSI)',
    unit: '/100',
    standard: 'Composite (HI, WBGT, UTCI)',
    disclaimer: 'Operational composite score for urban triage. Non-clinical.',
    bands: [
      { min: 0, max: 35, label: 'Low', color: MAP_PALETTE.low, description: 'Comfortable to mild thermal load.' },
      { min: 35, max: 50, label: 'Moderate', color: MAP_PALETTE.moderate, description: 'Caution for sensitive groups.' },
      { min: 50, max: 65, label: 'High', color: MAP_PALETTE.high, description: 'Elevated physiological strain.' },
      { min: 65, max: 80, label: 'Very High', color: MAP_PALETTE.veryHigh, description: 'Significant heat stress risk.' },
      { min: 80, max: 100, label: 'Extreme', color: MAP_PALETTE.extreme, description: 'Severe heatwave emergency state.' },
    ],
  },
  wbgt: {
    id: 'wbgt',
    name: 'Wet-Bulb Globe Temperature (WBGT)',
    unit: '°C',
    standard: 'ISO 7243 / Liljegren Radiative Model',
    disclaimer: 'Indicative work-rest guidance. Consult on-site wet-bulb sensors.',
    bands: [
      { min: 0, max: 27.0, label: 'Low', color: MAP_PALETTE.low, description: 'No flag (Normal activities permitted).' },
      { min: 27.0, max: 29.0, label: 'Moderate', color: MAP_PALETTE.moderate, description: 'Green flag (Discretion required).' },
      { min: 29.0, max: 31.0, label: 'High', color: MAP_PALETTE.high, description: 'Yellow flag (Strenuous exercise limits).' },
      { min: 31.0, max: 33.0, label: 'Very High', color: MAP_PALETTE.veryHigh, description: 'Red flag (Strict hydration & shade).' },
      { min: 33.0, max: 50.0, label: 'Extreme', color: MAP_PALETTE.extreme, description: 'Black flag (Suspension of unacclimatized labor).' },
    ],
  },
  utci: {
    id: 'utci',
    name: 'Universal Thermal Climate Index (UTCI)',
    unit: '°C',
    standard: 'COST Action 730 / Multi-node Thermoregulation',
    disclaimer: 'Biometeorological equivalent temperature.',
    bands: [
      { min: -10, max: 28.0, label: 'Low', color: MAP_PALETTE.low, description: 'No thermal stress (9 to 26°C).' },
      { min: 28.0, max: 34.0, label: 'Moderate', color: MAP_PALETTE.moderate, description: 'Moderate heat stress.' },
      { min: 34.0, max: 40.0, label: 'High', color: MAP_PALETTE.high, description: 'Strong heat stress.' },
      { min: 40.0, max: 46.0, label: 'Very High', color: MAP_PALETTE.veryHigh, description: 'Very strong heat stress.' },
      { min: 46.0, max: 70.0, label: 'Extreme', color: MAP_PALETTE.extreme, description: 'Extreme thermal stress.' },
    ],
  },
  air_temp: {
    id: 'air_temp',
    name: 'Ambient Air Temperature (Dry-Bulb)',
    unit: '°C',
    standard: 'IMD Meteorological Standard',
    disclaimer: 'Ambient air temperature at 2m height.',
    bands: [
      { min: 0, max: 37.0, label: 'Low', color: MAP_PALETTE.low, description: 'Seasonal normal range.' },
      { min: 37.0, max: 39.0, label: 'Moderate', color: MAP_PALETTE.moderate, description: 'Elevated daytime warmth.' },
      { min: 39.0, max: 41.0, label: 'High', color: MAP_PALETTE.high, description: 'Heatwave watch threshold.' },
      { min: 41.0, max: 43.0, label: 'Very High', color: MAP_PALETTE.veryHigh, description: 'Severe heatwave threshold.' },
      { min: 43.0, max: 60.0, label: 'Extreme', color: MAP_PALETTE.extreme, description: 'Emergency heat threshold.' },
    ],
  },
  heat_index: {
    id: 'heat_index',
    name: 'NOAA Heat Index',
    unit: '°C',
    standard: 'Rothfusz NWS Regression',
    disclaimer: 'Combined temperature & relative humidity effect.',
    bands: [
      { min: 0, max: 40.0, label: 'Low', color: MAP_PALETTE.low, description: 'Caution zone.' },
      { min: 40.0, max: 44.0, label: 'Moderate', color: MAP_PALETTE.moderate, description: 'Extreme caution zone.' },
      { min: 44.0, max: 48.0, label: 'High', color: MAP_PALETTE.high, description: 'Danger zone: heat cramps likely.' },
      { min: 48.0, max: 52.0, label: 'Very High', color: MAP_PALETTE.veryHigh, description: 'Danger zone: heat stroke possible.' },
      { min: 52.0, max: 80.0, label: 'Extreme', color: MAP_PALETTE.extreme, description: 'Extreme danger: imminent heat stroke.' },
    ],
  },
  vulnerability: {
    id: 'vulnerability',
    name: 'Ward Vulnerability Composite',
    unit: '/100',
    standard: 'Demographic + Socioeconomic + Urban Cooling Deficit',
    disclaimer: 'Census proxy indicators. Synthetic demonstration data.',
    bands: [
      { min: 0, max: 35, label: 'Low', color: MAP_PALETTE.low, description: 'High adaptive capacity and tree canopy.' },
      { min: 35, max: 50, label: 'Moderate', color: MAP_PALETTE.moderate, description: 'Moderate demographic vulnerability.' },
      { min: 50, max: 65, label: 'High', color: MAP_PALETTE.high, description: 'High elderly & outdoor laborer concentration.' },
      { min: 65, max: 80, label: 'Very High', color: MAP_PALETTE.veryHigh, description: 'High poverty & dense builtup fraction.' },
      { min: 80, max: 100, label: 'Extreme', color: MAP_PALETTE.extreme, description: 'Acute vulnerability & low coping capacity.' },
    ],
  },
  hamri: {
    id: 'hamri',
    name: 'HAMRI Demonstration Risk Indicator',
    unit: '/100',
    standard: 'Epidemiological distributed lag non-linear proxy',
    disclaimer: 'Prototype non-clinical risk indicator. Not a clinical diagnosis.',
    bands: [
      { min: 0, max: 35, label: 'Low', color: MAP_PALETTE.low, description: 'Low excess heat-attributable burden.' },
      { min: 35, max: 50, label: 'Moderate', color: MAP_PALETTE.moderate, description: 'Moderate vulnerability-weighted risk.' },
      { min: 50, max: 65, label: 'High', color: MAP_PALETTE.high, description: 'Elevated morbidity and dehydration load.' },
      { min: 65, max: 80, label: 'Very High', color: MAP_PALETTE.veryHigh, description: 'Significant excess emergency visits.' },
      { min: 80, max: 100, label: 'Extreme', color: MAP_PALETTE.extreme, description: 'Severe excess mortality burden.' },
    ],
  },
  surge_index: {
    id: 'surge_index',
    name: 'Hospital Surge Index',
    unit: '/100',
    standard: 'Emergency Intake & Bed Occupancy Pressure',
    disclaimer: 'Hospital triage simulation. Not real-time bed telemetry.',
    bands: [
      { min: 0, max: 35, label: 'Low', color: MAP_PALETTE.low, description: 'Normal emergency department capacity.' },
      { min: 35, max: 50, label: 'Moderate', color: MAP_PALETTE.moderate, description: 'Watch level intake.' },
      { min: 50, max: 65, label: 'High', color: MAP_PALETTE.high, description: 'Substantial surge in heat exhaustion cases.' },
      { min: 65, max: 80, label: 'Very High', color: MAP_PALETTE.veryHigh, description: 'Critical ICU and IV fluid demand.' },
      { min: 80, max: 100, label: 'Extreme', color: MAP_PALETTE.extreme, description: 'Full emergency diversion protocol.' },
    ],
  },
};

export function getColorForMetric(val: number, metric: MetricLayer): string {
  const cfg = METRIC_THRESHOLDS[metric] || METRIC_THRESHOLDS.htsi;
  for (let i = cfg.bands.length - 1; i >= 0; i--) {
    if (val >= cfg.bands[i].min) {
      return cfg.bands[i].color;
    }
  }
  return cfg.bands[0].color;
}

export function getSeverityLabel(val: number, metric: MetricLayer): string {
  const cfg = METRIC_THRESHOLDS[metric] || METRIC_THRESHOLDS.htsi;
  for (let i = cfg.bands.length - 1; i >= 0; i--) {
    if (val >= cfg.bands[i].min) {
      return cfg.bands[i].label;
    }
  }
  return cfg.bands[0].label;
}
