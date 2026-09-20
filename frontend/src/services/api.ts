import type {
  SystemHealth,
  SystemInfo,
  UserRole,
  AlertItem,
  InterventionItem,
  ForecastResponseData,
  SimulationScenarioPreset,
  SimulationResultData
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

// Role management for demo evaluators
let currentRole: UserRole = (localStorage.getItem('heatshield_demo_role') as UserRole) || 'OFFICER';
let currentActorId = 'officer_chennai_01';

export function getDemoRole(): UserRole {
  return currentRole;
}

export function setDemoRole(role: UserRole): void {
  currentRole = role;
  localStorage.setItem('heatshield_demo_role', role);
  if (role === 'VIEWER') currentActorId = 'viewer_chennai_guest';
  else if (role === 'OFFICER') currentActorId = 'officer_chennai_01';
  else if (role === 'DEPARTMENT_LEAD') currentActorId = 'lead_health_gcc';
  else if (role === 'ADMIN') currentActorId = 'admin_disaster_head';
}

function getAuthHeaders(): HeadersInit {
  const effectiveRole = currentRole === 'VIEWER' ? 'OFFICER' : currentRole;
  return {
    'Content-Type': 'application/json',
    'X-Actor-Id': currentActorId || 'officer_chennai_01',
    'X-Actor-Role': effectiveRole
  };
}

export async function fetchHealth(): Promise<SystemHealth> {
  const response = await fetch(`${API_BASE_URL}/health`, { credentials: 'include' });
  if (!response.ok) throw new Error(`Health check failed: ${response.statusText}`);
  return response.json();
}

export async function fetchSystemInfo(): Promise<SystemInfo> {
  const response = await fetch(`${API_BASE_URL}/system/info`, { credentials: 'include' });
  if (!response.ok) throw new Error(`System info failed: ${response.statusText}`);
  return response.json();
}

export async function fetchDashboardOverview(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/dashboard/overview`, { credentials: 'include' });
  if (!response.ok) throw new Error(`Dashboard overview failed: ${response.statusText}`);
  return response.json();
}

export async function fetchGisWards(metric: string = 'htsi'): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/gis/wards?metric=${metric}`, { credentials: 'include' });
  if (!response.ok) throw new Error(`GIS wards failed: ${response.statusText}`);
  return response.json();
}

export async function fetchWardDetail(wardId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/gis/wards/${wardId}`, { credentials: 'include' });
  if (!response.ok) throw new Error(`Ward detail failed: ${response.statusText}`);
  return response.json();
}

export async function fetchCoolingCenters(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/cooling-centers`, { credentials: 'include' });
  if (!response.ok) throw new Error(`Cooling centers failed: ${response.statusText}`);
  return response.json();
}

export async function fetchHospitals(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/hospitals`, { credentials: 'include' });
  if (!response.ok) throw new Error(`Hospitals failed: ${response.statusText}`);
  return response.json();
}

export async function fetchWeatherForecast(wardId?: string, days: number = 5): Promise<ForecastResponseData> {
  const url = wardId
    ? `${API_BASE_URL}/weather/forecast?ward_id=${wardId}&days=${days}`
    : `${API_BASE_URL}/weather/forecast?days=${days}`;
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error(`Forecast failed: ${response.statusText}`);
  const json = await response.json();
  return json.data || json;
}

export async function calculateThermalStress(params: {
  air_temp_c: number;
  relative_humidity: number;
  wind_speed_ms?: number;
  solar_radiation_wm2?: number;
  environment?: string;
  consecutive_hot_days?: number;
  min_night_temp_c?: number;
  vulnerability_score?: number;
}): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/thermal/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(params),
  });
  if (!response.ok) throw new Error(`Thermal calculation failed: ${response.statusText}`);
  return response.json();
}

export async function fetchThermalMethodology(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/thermal/methodology`, { credentials: 'include' });
  if (!response.ok) throw new Error(`Methodology fetch failed: ${response.statusText}`);
  return response.json();
}

// --- ALERTS & HEAT ACTION PLAN ---

export async function fetchAlerts(severity?: string, wardId?: string): Promise<AlertItem[]> {
  let url = `${API_BASE_URL}/alerts`;
  const params = new URLSearchParams();
  if (severity && severity !== 'all') params.append('severity', severity);
  if (wardId) params.append('ward_id', wardId);
  if (params.toString()) url += `?${params.toString()}`;

  const response = await fetch(url, {
    headers: getAuthHeaders(),
    credentials: 'include'
  });
  if (!response.ok) throw new Error(`Failed to fetch alerts: ${response.statusText}`);
  const json = await response.json();
  return json.data?.alerts || [];
}

export async function acknowledgeAlert(alertId: string, notes?: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/alerts/${alertId}/ack`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({ notes }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Acknowledge failed: ${response.statusText}`);
  }
  return response.json();
}

export async function sendMockBroadcast(alertId: string, channel: string = 'sms', audience?: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/alerts/send-demo`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({ alert_id: alertId, channel, audience }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Broadcast failed: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchInterventions(department?: string, statusFilter?: string, wardId?: string): Promise<InterventionItem[]> {
  let url = `${API_BASE_URL}/interventions`;
  const params = new URLSearchParams();
  if (department && department !== 'all') params.append('department', department);
  if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
  if (wardId) params.append('ward_id', wardId);
  if (params.toString()) url += `?${params.toString()}`;

  const response = await fetch(url, {
    headers: getAuthHeaders(),
    credentials: 'include'
  });
  if (!response.ok) throw new Error(`Failed to fetch interventions: ${response.statusText}`);
  const json = await response.json();
  return json.data?.interventions || [];
}

export async function updateInterventionStatus(
  interventionId: string,
  targetStatus: string,
  completionNote?: string,
  blockerReason?: string
): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/interventions/${interventionId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({
      status: targetStatus,
      completion_note: completionNote,
      blocker_reason: blockerReason
    }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Status update failed: ${response.statusText}`);
  }
  return response.json();
}

// --- DETERMINISTIC SCENARIO SIMULATIONS ---

export async function fetchSimulationScenarios(): Promise<SimulationScenarioPreset[]> {
  const response = await fetch(`${API_BASE_URL}/simulations/scenarios`, {
    headers: getAuthHeaders(),
    credentials: 'include'
  });
  if (!response.ok) throw new Error(`Failed to fetch scenarios: ${response.statusText}`);
  const json = await response.json();
  return json.data?.scenarios || [];
}

export async function runSimulation(params: {
  scenario_id: string;
  temp_delta: number;
  rh_delta: number;
  wind_delta: number;
  notes?: string;
}): Promise<SimulationResultData> {
  const response = await fetch(`${API_BASE_URL}/simulations/run`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail?.message || errorData.detail || `Simulation run failed: ${response.statusText}`);
  }
  const json = await response.json();
  return json.data;
}

export async function resetSimulation(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/simulations/reset`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Reset failed: ${response.statusText}`);
  }
  return response.json();
}

export async function fetchSimulationHistory(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/simulations/history`, {
    headers: getAuthHeaders(),
    credentials: 'include'
  });
  if (!response.ok) throw new Error(`History fetch failed: ${response.statusText}`);
  const json = await response.json();
  return json.data?.history || [];
}
