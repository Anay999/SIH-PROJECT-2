import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getStoredSession, createEvaluatorDemoSession, logoutUser, type OtpVerifyResponse } from '../services/authApi';
import { getCityProfile } from '../data/cities';
import { findNearestMunicipality } from '../utils/geoMunicipality';

export type TimeScrubberStep = 'PAST' | 'NOW' | 'FORECAST';
export type MapBasemap = 'satellite' | 'dark' | 'street';
export type MetricLayer =
  | 'htsi'
  | 'wbgt'
  | 'utci'
  | 'night_temp'
  | 'vulnerability'
  | 'cooling'
  | 'health_access';

export interface MunicipalAction {
  id: string;
  title: string;
  reason: string;
  wardId: string;
  wardName: string;
  department: 'Public Health' | 'Labor & Outdoor Work' | 'Municipal Cooling' | 'Power & Water';
  priority: 'High' | 'Urgent' | 'Critical';
  status: 'Suggested' | 'Under Review' | 'Approved' | 'In Progress' | 'Completed' | 'Dismissed';
  timestamp: string;
  reviewedBy?: string;
}

export interface ActivityEvent {
  id: string;
  time: string;
  category: 'FORECAST' | 'WARD_PRIORITY' | 'RESOURCE' | 'ACTION' | 'SCENARIO';
  message: string;
  wardId?: string;
}

export interface WardDetails {
  ward_id: string;
  ward_number: string;
  name: string;
  zone_name?: string;
  total_population: number;
  elderly_population: number;
  outdoor_workers: number;
  air_temp_c: number;
  relative_humidity: number;
  heat_index_c: number;
  wbgt_c: number;
  utci_c: number;
  htsi_score: number;
  vulnerability_score: number;
  hamri_score: number;
  nighttime_min_c?: number;
  cooling_access_level?: string;
  nearby_cooling_centers_count?: number;
  nearby_hospitals_count?: number;
}

interface WorkspaceContextType {
  // Ward Selection & Inspector
  selectedWardId: string | null;
  selectedWardData: WardDetails | null;
  isWardInspectorOpen: boolean;
  selectWard: (wardId: string | null, data?: WardDetails | null) => void;
  closeWardInspector: () => void;

  // Time Scrubber
  timeScrubberStep: TimeScrubberStep;
  setTimeScrubberStep: (step: TimeScrubberStep) => void;
  temporalDelta: {
    temp: number;
    tempDelta: number;
    humidity: number;
    humidityDelta: number;
    nighttimeMin: number;
    nighttimeMinDelta: number;
    htsiScore: number;
    priorityWardsCount: number;
    situationNarrative: string;
    description: string;
  };

  // Demo Clock & Freshness
  demoClockTime: string;
  dataFreshnessText: string;
  nudgeDelta: number;

  // Map Controls
  mapBasemap: MapBasemap;
  setMapBasemap: (b: MapBasemap) => void;
  activeMetricLayer: MetricLayer;
  setActiveMetricLayer: (m: MetricLayer) => void;

  // Action Plan Workflow
  actionPlans: MunicipalAction[];
  updateActionStatus: (actionId: string, status: MunicipalAction['status'], note?: string) => void;

  // Activity Feed
  activityFeed: ActivityEvent[];
  addActivityEvent: (category: ActivityEvent['category'], message: string, wardId?: string) => void;

  // City Jurisdiction & Roaming GPS
  activeCity: string;
  setActiveCity: (city: string) => void;
  isLiveGpsActive: boolean;
  liveGpsCoords: { lat: number; lon: number } | null;
  setLiveGpsCoords: (coords: { lat: number; lon: number } | null) => void;
  toggleLiveGps: () => void;
  assignMunicipalityFromGps: (lat: number, lon: number) => import('../data/cities').CityJurisdiction;
  isGpsAutoAssigned: boolean;
  setIsGpsAutoAssigned: (v: boolean) => void;
  cityProfile: import('../data/cities').CityJurisdiction;

  // Auth & Session
  authSession: OtpVerifyResponse | null;
  setAuthSession: React.Dispatch<React.SetStateAction<OtpVerifyResponse | null>>;
  loginAsDemoOfficer: () => void;
  logoutSession: () => Promise<void>;
}

const INITIAL_ACTIONS: MunicipalAction[] = [
  {
    id: 'act_01',
    title: 'Review cooling-center operating hours and water stock',
    reason: 'Nighttime heat remains elevated (>29.5°C) in Tondiarpet and two nearby resources are approaching 80% capacity.',
    wardId: 'ward_04_tondiarpet',
    wardName: 'Tondiarpet (Ward 04)',
    department: 'Municipal Cooling',
    priority: 'Urgent',
    status: 'Under Review',
    timestamp: '13:28 IST',
    reviewedBy: 'DEMO MUNICIPAL OFFICER',
  },
  {
    id: 'act_02',
    title: 'Enforce midday outdoor labor work suspension (12:00-15:30)',
    reason: 'WBGT exceeds 32.8°C threshold with 34,000 outdoor port laborers facing unshaded solar exposure.',
    wardId: 'ward_05_royapuram',
    wardName: 'Royapuram (Ward 05)',
    department: 'Labor & Outdoor Work',
    priority: 'Critical',
    status: 'Suggested',
    timestamp: '13:15 IST',
  },
  {
    id: 'act_03',
    title: 'Pre-stock oral rehydration salts & standby cold immersion tubs',
    reason: 'Elevated daytime thermal strain projected across high-density informal settlements near Stanley Hospital.',
    wardId: 'ward_06_thiruvika_nagar',
    wardName: 'Thiru-Vi-Ka Nagar (Ward 06)',
    department: 'Public Health',
    priority: 'High',
    status: 'Approved',
    timestamp: '12:50 IST',
    reviewedBy: 'DEMO MUNICIPAL OFFICER',
  },
];

const INITIAL_FEED: ActivityEvent[] = [
  { id: 'ev_01', time: '13:41', category: 'FORECAST', message: 'Forecast trajectory updated for Greater Chennai demonstration wards' },
  { id: 'ev_02', time: '13:39', category: 'WARD_PRIORITY', message: 'Ward 05 Royapuram priority escalated to High (WBGT 32.8°C)', wardId: 'ward_05_royapuram' },
  { id: 'ev_03', time: '13:35', category: 'RESOURCE', message: 'Tondiarpet Community Pavilion capacity updated: 142/300 occupied (47%)' },
  { id: 'ev_04', time: '13:32', category: 'ACTION', message: 'Officer marked Action #act_01 under operational review' },
  { id: 'ev_05', time: '13:28', category: 'SCENARIO', message: 'Extended cooling-center hours scenario ready for review' },
];

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedWardId, setSelectedWardId] = useState<string | null>('ward_05_royapuram');
  const [selectedWardData, setSelectedWardData] = useState<WardDetails | null>(null);
  const [isWardInspectorOpen, setIsWardInspectorOpen] = useState<boolean>(false);

  const [timeScrubberStep, setTimeScrubberStep] = useState<TimeScrubberStep>('NOW');
  const [mapBasemap, setMapBasemap] = useState<MapBasemap>('satellite');
  const [activeMetricLayer, setActiveMetricLayer] = useState<MetricLayer>('htsi');

  const [actionPlans, setActionPlans] = useState<MunicipalAction[]>(INITIAL_ACTIONS);
  const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>(INITIAL_FEED);

  // City Jurisdiction and Live GPS State
  const [activeCity, setActiveCityState] = useState<string>(() => localStorage.getItem('heatshield_active_city') || 'Chennai');
  const [isLiveGpsActive, setIsLiveGpsActive] = useState<boolean>(false);
  const [liveGpsCoords, setLiveGpsCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [isGpsAutoAssigned, setIsGpsAutoAssigned] = useState<boolean>(false);

  const cityProfile = getCityProfile(activeCity);

  const setActiveCity = useCallback((c: string) => {
    setActiveCityState(c);
    setIsGpsAutoAssigned(false);
    localStorage.setItem('heatshield_active_city', c);
  }, []);

  const assignMunicipalityFromGps = useCallback((lat: number, lon: number) => {
    const match = findNearestMunicipality(lat, lon);
    setActiveCityState(match.city.name);
    setIsGpsAutoAssigned(true);
    localStorage.setItem('heatshield_active_city', match.city.name);
    return match.city;
  }, []);

  const toggleLiveGps = useCallback(() => {
    if (isLiveGpsActive) {
      setIsLiveGpsActive(false);
      setLiveGpsCoords(null);
      setIsGpsAutoAssigned(false);
    } else {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setIsLiveGpsActive(true);
            setLiveGpsCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
            const match = findNearestMunicipality(pos.coords.latitude, pos.coords.longitude);
            setActiveCityState(match.city.name);
            setIsGpsAutoAssigned(true);
          },
          (err) => {
            console.warn('Live GPS fallback:', err);
            setIsLiveGpsActive(true);
            setLiveGpsCoords({ lat: 13.0827, lon: 80.2707 });
            const match = findNearestMunicipality(13.0827, 80.2707);
            setActiveCityState(match.city.name);
            setIsGpsAutoAssigned(true);
          }
        );
      } else {
        setIsLiveGpsActive(true);
        setLiveGpsCoords({ lat: 13.0827, lon: 80.2707 });
        const match = findNearestMunicipality(13.0827, 80.2707);
        setActiveCityState(match.city.name);
        setIsGpsAutoAssigned(true);
      }
    }
  }, [isLiveGpsActive]);

  // Deterministic Demo Simulation Clock
  const [elapsedMinutes, setElapsedMinutes] = useState<number>(4);
  const [nudgeDelta, setNudgeDelta] = useState<number>(0.1);
  const [authSession, setAuthSession] = useState<OtpVerifyResponse | null>(getStoredSession());

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedMinutes(prev => (prev >= 60 ? 1 : prev + 1));
      // Subtle realistic micro-drift
      setNudgeDelta(prev => (prev === 0.1 ? 0.2 : prev === 0.2 ? 0.0 : 0.1));
    }, 30000); // every 30s
    return () => clearInterval(timer);
  }, []);

  const addActivityEvent = useCallback((category: ActivityEvent['category'], message: string, wardId?: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
    const newEvent: ActivityEvent = {
      id: `ev_${Date.now()}`,
      time: timeStr,
      category,
      message,
      wardId
    };
    setActivityFeed(prev => [newEvent, ...prev.slice(0, 19)]);
  }, []);

  const selectWard = useCallback((wardId: string | null, data?: WardDetails | null) => {
    setSelectedWardId(wardId);
    if (data !== undefined) {
      setSelectedWardData(data);
    }
    if (wardId) {
      setIsWardInspectorOpen(true);
    }
  }, []);

  const closeWardInspector = useCallback(() => {
    setIsWardInspectorOpen(false);
  }, []);

  const updateActionStatus = useCallback((actionId: string, status: MunicipalAction['status'], note?: string) => {
    setActionPlans(prev =>
      prev.map(action => {
        if (action.id === actionId) {
          const updated = {
            ...action,
            status,
            reviewedBy: 'DEMO MUNICIPAL OFFICER'
          };
          addActivityEvent('ACTION', `Action "${action.title.slice(0, 32)}..." status changed to ${status}${note ? ` (${note})` : ''}`, action.wardId);
          return updated;
        }
        return action;
      })
    );
  }, [addActivityEvent]);

  const loginAsDemoOfficer = useCallback(() => {
    const session = createEvaluatorDemoSession('DEMO MUNICIPAL OFFICER');
    setAuthSession(session);
    addActivityEvent('ACTION', 'Officer signed in to municipal operational workspace via Evaluator Demo Access');
  }, [addActivityEvent]);

  const logoutSession = useCallback(async () => {
    await logoutUser();
    setAuthSession(null);
  }, []);

  // Temporal Deltas for Time Scrubber
  const temporalDelta = (() => {
    switch (timeScrubberStep) {
      case 'PAST':
        return {
          temp: 35.9,
          tempDelta: -2.6,
          humidity: 61,
          humidityDelta: -7,
          nighttimeMin: 27.7,
          nighttimeMinDelta: -1.8,
          htsiScore: 64,
          priorityWardsCount: 1,
          situationNarrative: 'Morning baseline conditions showed moderate thermal buildup with developing onshore maritime moisture.',
          description: '6 hours ago · Morning baseline (07:30 IST)',
        };
      case 'FORECAST':
        return {
          temp: 41.0,
          tempDelta: +2.5,
          humidity: 72,
          humidityDelta: +4,
          nighttimeMin: 31.6,
          nighttimeMinDelta: +2.1,
          htsiScore: 86,
          priorityWardsCount: 5,
          situationNarrative: 'Forecast models predict extreme humid heat accumulation peaking tomorrow afternoon across northern industrial corridors.',
          description: 'Next 24 hours outlook · Tomorrow peak afternoon (14:00 IST)',
        };
      case 'NOW':
      default:
        return {
          temp: 38.5,
          tempDelta: 0,
          humidity: 68,
          humidityDelta: 0,
          nighttimeMin: 29.5,
          nighttimeMinDelta: 0,
          htsiScore: 78,
          priorityWardsCount: 3,
          situationNarrative: 'Hot and humid conditions are increasing heat exposure across several demonstration areas.',
          description: 'Current operational observation (13:42 IST)',
        };
    }
  })();

  const dataFreshnessText = `Demo simulation · Updated ${elapsedMinutes} min ago`;

  return (
    <WorkspaceContext.Provider
      value={{
        selectedWardId,
        selectedWardData,
        isWardInspectorOpen,
        selectWard,
        closeWardInspector,
        timeScrubberStep,
        setTimeScrubberStep,
        temporalDelta,
        demoClockTime: '13:42 IST',
        dataFreshnessText,
        nudgeDelta,
        mapBasemap,
        setMapBasemap,
        activeMetricLayer,
        setActiveMetricLayer,
        actionPlans,
        updateActionStatus,
        activityFeed,
        addActivityEvent,
        activeCity,
        setActiveCity,
        isLiveGpsActive,
        liveGpsCoords,
        setLiveGpsCoords,
        toggleLiveGps,
        assignMunicipalityFromGps,
        isGpsAutoAssigned,
        setIsGpsAutoAssigned,
        cityProfile,
        authSession,
        setAuthSession,
        loginAsDemoOfficer,
        logoutSession,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
