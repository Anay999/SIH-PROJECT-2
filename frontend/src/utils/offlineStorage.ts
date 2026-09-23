/**
 * Offline & Low-Connectivity Cache Manager for ThermoSafe AI.
 * Caches emergency protocols, last-known heat risk telemetry, and emergency contacts.
 */

export interface CachedOfflineData {
  lastRiskLevel: string;
  lastRiskBadge: string;
  lastAirTemp: number;
  lastFeelsLike: number;
  lastWbgt: number;
  lastUpdatedText: string;
  emergencyNumbers: { label: string; number: string; description: string }[];
  cachedRecommendations: { id: string; title: string; shortDesc: string; priority: string }[];
  lastSyncedTimestamp: string;
}

const STORAGE_KEY = 'thermosafe_offline_cache';

export const DEFAULT_EMERGENCY_NUMBERS = [
  { label: '108', number: '108', description: 'National Emergency Medical & Ambulance Service' },
  { label: '1077', number: '1077', description: 'Disaster Management & Heat Relief Control Room' },
  { label: '1913', number: '1913', description: 'Municipal Corporation Emergency Grievance Helpline' },
  { label: '104', number: '104', description: 'Public Health & Medical Advice Tele-Consultation' }
];

export function saveOfflineCache(data: Partial<CachedOfflineData>): void {
  try {
    const existing = loadOfflineCache();
    const merged: CachedOfflineData = {
      lastRiskLevel: data.lastRiskLevel || existing?.lastRiskLevel || 'MODERATE',
      lastRiskBadge: data.lastRiskBadge || existing?.lastRiskBadge || 'MODERATE HEAT CAUTION',
      lastAirTemp: data.lastAirTemp ?? existing?.lastAirTemp ?? 34.0,
      lastFeelsLike: data.lastFeelsLike ?? existing?.lastFeelsLike ?? 38.5,
      lastWbgt: data.lastWbgt ?? existing?.lastWbgt ?? 29.5,
      lastUpdatedText: data.lastUpdatedText || existing?.lastUpdatedText || new Date().toLocaleString(),
      emergencyNumbers: data.emergencyNumbers || existing?.emergencyNumbers || DEFAULT_EMERGENCY_NUMBERS,
      cachedRecommendations: data.cachedRecommendations || existing?.cachedRecommendations || [],
      lastSyncedTimestamp: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (err) {
    console.warn('Failed to persist offline cache:', err);
  }
}

export function loadOfflineCache(): CachedOfflineData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function formatLastSyncedTime(isoString?: string): string {
  if (!isoString) return 'Not available';
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' IST';
  } catch {
    return isoString;
  }
}
