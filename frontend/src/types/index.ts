export type UserRole = 'VIEWER' | 'OFFICER' | 'DEPARTMENT_LEAD' | 'ADMIN';

export interface SystemHealth {
  status: 'online' | 'degraded' | 'offline';
  service: string;
  tagline: string;
  version: string;
  environment: string;
  demo_mode: boolean;
  database: {
    status: string;
    dialect: string;
    url: string;
  };
  active_city: string;
  disclaimer: string;
  server_time_utc: string;
}

export interface SystemInfo {
  platform: string;
  version: string;
  capabilities: string[];
  default_geography: {
    city: string;
    state: string;
    country: string;
  };
  data_provenance_contract: {
    fields_required: string[];
    types_supported: string[];
  };
}

export interface WardSummary {
  id: string;
  ward_number: string;
  name: string;
  zone: string;
  population: number;
  elderly_population: number;
  outdoor_workers: number;
  temp_c: number;
  rh_pct: number;
  wbgt_c: number;
  utci_c: number;
  htsi_score: number;
  htsi_category: 'Low' | 'Moderate' | 'High' | 'Very High' | 'Extreme';
  vulnerability_score: number;
  hamri_score: number;
  hospital_surge_index: number;
  active_alerts_count: number;
}

export interface AlertItem {
  id: string;
  ward_id: string;
  ward_name: string;
  severity: 'Advisory' | 'Watch' | 'Warning' | 'Extreme Warning';
  trigger_metric: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'ESCALATED' | 'RESOLVED' | 'EXPIRED';
  escalation_level: number;
  headline: string;
  message: string;
  recommended_actions: string[];
  target_audience: string;
  acknowledged: boolean;
  acknowledged_at_utc: string | null;
  acknowledged_by: string | null;
  issued_at_utc: string | null;
  expires_at_utc: string | null;
  source_pedigree?: string;
}

export interface InterventionItem {
  id: string;
  ward_id: string;
  ward_name: string;
  department: string;
  action_name: string;
  priority: 'Routine' | 'High' | 'Urgent' | 'Critical';
  urgency: string;
  status: 'RECOMMENDED' | 'DISPATCHED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED';
  assigned_to: string | null;
  due_at_utc: string | null;
  deadline_utc: string | null;
  reason: string | null;
  completion_note: string | null;
  blocker_reason: string | null;
  updated_by: string | null;
  updated_at_utc: string | null;
  allowed_next_statuses: string[];
}

export interface HourlyForecastPoint {
  timestamp_utc: string;
  time_display_ist: string;
  date_display: string;
  hour_ist: number;
  is_night: boolean;
  is_night_heat_trap: boolean;
  air_temp_c: number;
  relative_humidity: number;
  wind_speed_ms: number;
  solar_radiation_wm2: number;
  heat_index_c: number;
  heat_index_category: string;
  wbgt_c: number;
  wbgt_category: string;
  wbgt_flag: string;
  utci_c: number;
  utci_category: string;
  htsi_score: number;
  htsi_category: string;
  work_rest_indicative: {
    light_work: string;
    moderate_work: string;
    heavy_work: string;
    hydration_liters_per_hour: number;
    disclaimer: string;
  };
}

export interface DailyForecastCard {
  date: string;
  day_label: string;
  max_temp_c: number;
  min_temp_c: number;
  night_min_temp_c: number;
  is_nocturnal_heat_trap: boolean;
  peak_wbgt_c: number;
  peak_htsi_score: number;
  htsi_category: string;
}

export interface ForecastResponseData {
  source: string;
  source_display: string;
  is_demo: boolean;
  confidence_level: string;
  confidence_score: number | null;
  deterministic_seed: number;
  engine_version: string;
  uncertainty_band: {
    temperature_c: number;
    humidity_percent: number;
    wind_speed_ms: number;
    wbgt_c: number;
    utci_c: number;
  };
  generated_at_utc: string;
  valid_from_utc: string;
  valid_until_utc: string;
  display_timezone: string;
  ward_id: string;
  ward_name: string;
  ward_number: string;
  days_horizon: number;
  hourly_series: HourlyForecastPoint[];
  daily_forecast: DailyForecastCard[];
  available_wards: { id: string; name: string }[];
  methodology_disclaimer: string;
}

export interface SimulationScenarioPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  temp_base_c: number;
  rh_base: number;
  wind_base_ms: number;
  solar_base_wm2: number;
  default_temp_delta: number;
  default_rh_delta: number;
  expected_htsi: string;
  narrative: string;
}

export interface SimulationResultData {
  simulation_id: string;
  scenario_id: string;
  scenario_name: string;
  seed: number;
  engine_version: string;
  reproducible: boolean;
  is_demo: boolean;
  simulation_mode: string;
  baseline_snapshot: {
    citywide_mean_htsi: number;
    citywide_mean_surge: number;
    high_risk_population: number;
    ward_samples: any[];
  };
  simulated_snapshot: {
    citywide_mean_htsi: number;
    citywide_mean_surge: number;
    high_risk_population: number;
    ward_samples: any[];
  };
  delta_metrics: {
    citywide_mean_htsi_delta: number;
    mean_hospital_surge_delta: number;
    population_at_high_risk_baseline: number;
    population_at_high_risk_simulated: number;
    high_risk_population_delta: number;
    high_risk_population_delta_pct: number;
    triggered_alerts_count: number;
  };
  triggered_alerts: any[];
  created_at_utc: string;
  created_by: string;
}
