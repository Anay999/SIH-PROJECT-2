/**
 * Frontend Service Client for Spatiotemporal Heatwave AI Prediction & Intelligence Platform.
 */

const API_BASE = '/api';

export interface ModelInfo {
  id: string;
  name: string;
  type: string;
  status: string;
  threshold: number;
}

export interface MetricRecord {
  model: string;
  horizon: string;
  threshold: number;
  accuracy: number;
  balanced_accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number;
  pr_auc: number;
  specificity: number;
  sensitivity: number;
  mcc: number;
  brier_score: number;
  log_loss: number;
  true_positives: number;
  false_positives: number;
  true_negatives: number;
  false_negatives: number;
  false_negative_rate: number;
  imbalance_warning?: string;
  calibration_bins?: Array<{ predicted_prob: number; empirical_prob: number }>;
}

export interface PredictionResult {
  location: string;
  ward_name?: string;
  district: string;
  location_type?: string;
  latest_observation_date: string;
  forecast_date: string;
  forecast_horizon: string;
  predicted_probability: number;
  predicted_class: string;
  model: string;
  model_version: string;
  validation_threshold: number;
  decision_support_level: string;
  risk_description: string;
  latest_tmax_c: number;
  latest_heat_index_c?: number;
  attention_weights?: Record<string, number>;
  color_hex?: string;
}

export interface WardInfo {
  ward_id: string;
  name: string;
  zone_name: string;
  population: number;
  builtup_surface_fraction: number;
  latitude: number;
  longitude: number;
  predicted_probability: number;
  predicted_class: string;
  risk_level: string;
}

export const aiPredictionService = {
  async getModels(): Promise<ModelInfo[]> {
    const res = await fetch(`${API_BASE}/models`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.models;
  },

  async getMetrics(): Promise<MetricRecord[]> {
    const res = await fetch(`${API_BASE}/metrics`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.metrics;
  },

  async getFeatures(): Promise<{ feature_count: number; features: string[]; leakage_audit: any }> {
    const res = await fetch(`${API_BASE}/features`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  },

  async getLocations(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/locations`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.locations;
  },

  async getLatestPredictions(horizon = 'T+1', model = 'attention_gru'): Promise<PredictionResult[]> {
    const res = await fetch(`${API_BASE}/latest-predictions?horizon=${encodeURIComponent(horizon)}&model=${encodeURIComponent(model)}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.predictions;
  },

  async predict(location: string, forecast_horizon = 1, model = 'attention_gru'): Promise<PredictionResult> {
    const res = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location, forecast_horizon, model }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Prediction failed');
    }
    return await res.json();
  },

  async getForecast(location: string, model = 'attention_gru'): Promise<PredictionResult[]> {
    const res = await fetch(`${API_BASE}/forecast/${encodeURIComponent(location)}?model=${encodeURIComponent(model)}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.forecasts;
  },

  async getModelComparison(): Promise<MetricRecord[]> {
    const res = await fetch(`${API_BASE}/model-comparison`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.comparison;
  },

  async getLeadTimeResults(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/lead-time-results`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.lead_time_results;
  },

  async getAblationResults(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/ablation-results`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.ablation_results;
  },

  async getExplanation(predictionId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/explain/${encodeURIComponent(predictionId)}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  },

  async getWards(): Promise<WardInfo[]> {
    const res = await fetch(`${API_BASE}/wards`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.wards;
  },

  async getWardDetail(wardId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/wards/${encodeURIComponent(wardId)}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  },

  async getWardHistory(wardId: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/wards/${encodeURIComponent(wardId)}/history`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.history;
  },

  async getSpatialGeoJson(horizon = 'T+1', model = 'attention_gru'): Promise<any> {
    const res = await fetch(`${API_BASE}/spatial/predictions.geojson?horizon=${encodeURIComponent(horizon)}&model=${encodeURIComponent(model)}`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  },

  async getCdsSpellsEvaluation(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/cds-spells-evaluation`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    return data.results || [];
  },
};
