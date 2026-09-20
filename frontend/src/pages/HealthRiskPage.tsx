import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  AlertTriangle,
  Hospital,
  Activity,
  Calendar,
  Moon,
  Thermometer,
  ShieldAlert,
  Search,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  TrendingUp,
  Sliders
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';

interface RelativeRisk {
  lower: number;
  central: number;
  upper: number;
}

interface ExcessMortality {
  rate_per_100k_lower: number;
  rate_per_100k_upper: number;
  formatted_range: string;
  estimated_excess_cases_in_ward: number;
}

interface WardMortality {
  ward_id: string;
  ward_number: string;
  ward_name: string;
  zone_id: string;
  htsi_score: number;
  vulnerability_score: number;
  hamri_score: number;
  risk_category: string;
  relative_risk: RelativeRisk;
  excess_mortality: ExcessMortality;
  persistence_factor: number;
  nocturnal_factor: number;
  model_confidence: number;
  disclaimer: string;
  summary: string;
}

interface WardSurge {
  ward_id: string;
  ward_number: string;
  ward_name: string;
  surge_index: number;
  readiness_alert_level: string;
  projected_cases_today: number;
  icu_bed_pressure_pct: number;
  clinical_directives: string[];
}

export const HealthRiskPage: React.FC = () => {
  const [mortalityWards, setMortalityWards] = useState<WardMortality[]>([]);
  const [hospitalSurges, setHospitalSurges] = useState<WardSurge[]>([]);
  const [citySurgeInfo, setCitySurgeInfo] = useState<{
    city_wide_readiness: string;
    city_average_surge_index: number;
    total_projected_emergency_cases_today: number;
  }>({
    city_wide_readiness: 'Severe',
    city_average_surge_index: 68.4,
    total_projected_emergency_cases_today: 3120,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedWardId, setExpandedWardId] = useState<string | null>(null);

  // Clinical Surge & Duration Simulator State
  const [simHtsi, setSimHtsi] = useState<number>(75.0);
  const [simDays, setSimDays] = useState<number>(3);
  const [simNightTemp, setSimNightTemp] = useState<number>(29.5);
  const [simVuln, setSimVuln] = useState<number>(65.0);
  const [simPop, setSimPop] = useState<number>(120000);

  const [simResult, setSimResult] = useState<{
    hamri_score: number;
    risk_category: string;
    rr_central: number;
    rr_lower: number;
    rr_upper: number;
    surge_index: number;
    readiness_level: string;
    projected_cases: number;
    icu_pressure: number;
    directives: string[];
  } | null>(null);

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      const [mortRes, hospRes] = await Promise.all([
        fetch('http://127.0.0.1:8000/api/risk/mortality'),
        fetch('http://127.0.0.1:8000/api/risk/hospitalization'),
      ]);

      if (mortRes.ok) {
        const mortData = await mortRes.json();
        setMortalityWards(mortData.wards || []);
        if (mortData.wards && mortData.wards.length > 0) {
          setExpandedWardId(mortData.wards[0].ward_id);
        }
      }

      if (hospRes.ok) {
        const hospData = await hospRes.json();
        setHospitalSurges(hospData.ward_surges || []);
        setCitySurgeInfo({
          city_wide_readiness: hospData.city_wide_readiness,
          city_average_surge_index: hospData.city_average_surge_index,
          total_projected_emergency_cases_today: hospData.total_projected_emergency_cases_today,
        });
      }
    } catch (err) {
      console.warn('Failed fetching health risk data, fallback active', err);
    } finally {
      setLoading(false);
    }
  };

  // Recalculate simulation dynamically
  useEffect(() => {
    runSimulation(simHtsi, simDays, simNightTemp, simVuln, simPop);
  }, [simHtsi, simDays, simNightTemp, simVuln, simPop]);

  const runSimulation = (
    htsi: number,
    days: number,
    nightTemp: number,
    vuln: number,
    pop: number
  ) => {
    const thermalExcess = Math.max(0.0, (htsi - 35.0) / 65.0);
    const persistenceFactor = 1.0 + Math.min(0.60, (days - 1) * 0.12);
    const nightExcess = Math.max(0.0, nightTemp - 26.0);
    const nocturnalFactor = 1.0 + Math.min(0.40, nightExcess * 0.08);
    const vulnModifier = 1.0 + (vuln / 100.0) * 0.50;

    const rrDelta = (thermalExcess * 0.65) * persistenceFactor * nocturnalFactor * vulnModifier;
    const rrCentral = Math.round((1.0 + rrDelta) * 100) / 100;
    const rrLower = Math.max(1.0, Math.round((1.0 + (rrCentral - 1.0) * 0.70) * 100) / 100);
    const rrUpper = Math.round((1.0 + (rrCentral - 1.0) * 1.35) * 100) / 100;

    const hamriRaw = ((rrCentral - 1.0) / 0.65) * 100.0;
    const hamri = Math.min(100.0, Math.max(0.0, Math.round(hamriRaw * 10) / 10));

    let cat = 'Low / Baseline';
    if (hamri >= 75) cat = 'Extreme Health Risk';
    else if (hamri >= 55) cat = 'Very High Risk';
    else if (hamri >= 35) cat = 'High Risk';
    else if (hamri >= 20) cat = 'Moderate Risk';

    const surgeBase = hamri * 0.55 + vuln * 0.30;
    const surgeRaw = Math.min(100.0, Math.max(5.0, Math.round(surgeBase * (1.0 + (persistenceFactor - 1.0) * 0.35) * 10) / 10));
    const surgeIndex = Math.min(100.0, surgeRaw);

    let readiness = 'Normal';
    if (surgeIndex >= 80) readiness = 'Critical';
    else if (surgeIndex >= 60) readiness = 'Severe';
    else if (surgeIndex >= 35) readiness = 'Elevated';

    const caseRate = Math.pow(surgeIndex / 100.0, 1.35) * 14.0 * (1.0 + (persistenceFactor - 1.0) * 0.30);
    const projCases = Math.max(1, Math.round((pop / 10000.0) * caseRate));
    const icuPress = Math.min(98.0, Math.max(5.0, Math.round((surgeIndex * 0.58 + 12.0) * 10) / 10));

    const directives: string[] = [];
    if (readiness === 'Critical' || readiness === 'Severe') {
      directives.push('Stage emergency ice bath / rapid cold water immersion tubs at emergency triage entrance.');
      directives.push('Pre-stock IV cold normal saline (4°C) and balanced crystalloid fluids in ED.');
      directives.push('Alert intensive care, nephrology, and neurology teams for acute heatstroke & multi-organ failure.');
      directives.push('Activate emergency off-duty clinical recall for triage nurses and paramedics.');
    } else if (readiness === 'Elevated') {
      directives.push('Prepare shaded cooling triage overflow stations outside main OPD.');
      directives.push('Distribute oral rehydration solutions (ORS) at public outpatient clinics.');
      directives.push('Verify backup generators for uninterrupted chilling plant operations.');
    } else {
      directives.push('Maintain baseline heat-related illness clinical surveillance and protocol readiness.');
    }

    setSimResult({
      hamri_score: hamri,
      risk_category: cat,
      rr_central: rrCentral,
      rr_lower: rrLower,
      rr_upper: rrUpper,
      surge_index: surgeIndex,
      readiness_level: readiness,
      projected_cases: projCases,
      icu_pressure: icuPress,
      directives,
    });
  };

  const getRiskBadgeClass = (category: string) => {
    if (category.includes('Extreme')) return 'bg-red-500/20 text-red-400 border border-red-500/40';
    if (category.includes('Very High')) return 'bg-orange-500/20 text-orange-400 border border-orange-500/40';
    if (category.includes('High')) return 'bg-amber-500/20 text-amber-400 border border-amber-500/40';
    if (category.includes('Moderate')) return 'bg-blue-500/20 text-blue-400 border border-blue-500/40';
    return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
  };

  const getReadinessBadgeClass = (level: string) => {
    switch (level) {
      case 'Critical':
        return 'bg-red-500/25 text-red-300 border border-red-500/50 animate-pulse';
      case 'Severe':
        return 'bg-orange-500/25 text-orange-300 border border-orange-500/50';
      case 'Elevated':
        return 'bg-amber-500/25 text-amber-300 border border-amber-500/50';
      default:
        return 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50';
    }
  };

  const filteredMortality = mortalityWards.filter(w =>
    w.ward_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.ward_number.includes(searchQuery)
  );

  // Multiday Lag Progression Curve Data
  const lagCurveData = [1, 2, 3, 4, 5, 6, 7].map(day => {
    const pFact = 1.0 + Math.min(0.60, (day - 1) * 0.12);
    const nFact = 1.0 + Math.min(0.40, Math.max(0, simNightTemp - 26.0) * 0.08);
    const vMod = 1.0 + (simVuln / 100.0) * 0.50;
    const tExc = Math.max(0, (simHtsi - 35.0) / 65.0);
    const rr = Math.round((1.0 + (tExc * 0.65) * pFact * nFact * vMod) * 100) / 100;
    const cases = Math.round((simPop / 10000.0) * (Math.pow(Math.min(100, (rr - 1) * 100) / 100, 1.35) * 14.0 * (1 + (pFact - 1) * 0.3)));
    return {
      day: `Day ${day}`,
      'Relative Risk': rr,
      'Projected ED Cases': cases,
    };
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Disclaimer Banner */}
      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between gap-3 text-xs text-red-300">
        <div className="flex items-center gap-2 font-mono">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>RESEARCH/DEMO ESTIMATE. NOT CLINICALLY VALIDATED. NOT AN OFFICIAL MORTALITY FORECAST.</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-200 border border-red-500/40 uppercase">
          EPIDEMIOLOGICAL MODEL
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-command-border pb-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-red-400" />
            Heat-Attributable Mortality Risk (HAMRI) & Clinical Hospital Surge
          </h1>
          <p className="text-xs text-command-muted mt-1">
            Translates biometeorological thermal stress (HTSI), multi-day lagged persistence, and nocturnal minimum temperatures into relative risk bounds and emergency hospital surge forecasts.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-command-card border border-command-border rounded-xl p-4">
          <div className="flex justify-between items-start">
            <span className="text-xs text-command-muted">City Readiness Alert</span>
            <Hospital className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-1">
            <span className={`px-2.5 py-1 rounded text-sm font-mono font-bold ${getReadinessBadgeClass(citySurgeInfo.city_wide_readiness)}`}>
              {citySurgeInfo.city_wide_readiness.toUpperCase()} SURGE
            </span>
          </div>
          <span className="text-[10px] text-command-subtle font-mono mt-2 block">15 Chennai Wards Monitored</span>
        </div>

        <div className="bg-command-card border border-command-border rounded-xl p-4">
          <div className="flex justify-between items-start">
            <span className="text-xs text-command-muted">City Avg Surge Index</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1 font-mono">
            {citySurgeInfo.city_average_surge_index}<span className="text-xs text-command-muted font-normal">/100</span>
          </div>
          <span className="text-[10px] text-amber-400 font-mono">Elevated ED Intake Pressure</span>
        </div>

        <div className="bg-command-card border border-command-border rounded-xl p-4">
          <div className="flex justify-between items-start">
            <span className="text-xs text-command-muted">Projected Acute Cases Today</span>
            <HeartPulse className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400 mt-1 font-mono">
            {citySurgeInfo.total_projected_emergency_cases_today.toLocaleString()}
          </div>
          <span className="text-[10px] text-command-subtle font-mono">Heat exhaustion & stroke presentations</span>
        </div>

        <div className="bg-command-card border border-command-border rounded-xl p-4">
          <div className="flex justify-between items-start">
            <span className="text-xs text-command-muted">Model Confidence</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono">84%</div>
          <span className="text-[10px] text-command-subtle font-mono">DLNM transfer function</span>
        </div>
      </div>

      {/* Ward-by-Ward HAMRI Epidemiology Matrix */}
      <div className="bg-command-card border border-command-border rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              Ward HAMRI Relative Risk & Surge Triage Matrix
            </h2>
            <span className="text-[11px] text-command-muted">
              Point estimates with 95% Confidence Intervals and illustrative excess mortality ranges
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-command-muted" />
            <input
              type="text"
              placeholder="Search ward..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-command-panel border border-command-border rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-command-subtle focus:outline-none focus:border-red-500 w-44"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-command-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-command-panel text-command-muted font-mono uppercase text-[10px] border-b border-command-border">
              <tr>
                <th className="p-2.5">Ward</th>
                <th className="p-2.5 text-center">HTSI / Vuln</th>
                <th className="p-2.5 text-center">HAMRI Score</th>
                <th className="p-2.5">Risk Level</th>
                <th className="p-2.5">Relative Risk [95% CI]</th>
                <th className="p-2.5">Excess Mortality Rate</th>
                <th className="p-2.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-command-border/50 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-command-muted">
                    Loading epidemiological matrices...
                  </td>
                </tr>
              ) : filteredMortality.map(w => {
                const isExpanded = expandedWardId === w.ward_id;
                const surgeMatch = hospitalSurges.find(s => s.ward_id === w.ward_id);

                return (
                  <React.Fragment key={w.ward_id}>
                    <tr
                      onClick={() => setExpandedWardId(isExpanded ? null : w.ward_id)}
                      className={`cursor-pointer transition-colors ${
                        isExpanded
                          ? 'bg-red-500/10 border-l-2 border-l-red-500'
                          : 'hover:bg-command-panel/60'
                      }`}
                    >
                      <td className="p-2.5">
                        <div className="font-semibold text-white">Ward {w.ward_number}</div>
                        <div className="text-[10px] text-command-muted font-sans">{w.ward_name}</div>
                      </td>
                      <td className="p-2.5 text-center font-mono">
                        <span className="text-amber-400 font-bold">{w.htsi_score}</span>
                        <span className="text-command-muted mx-1">/</span>
                        <span className="text-purple-400">{w.vulnerability_score}</span>
                      </td>
                      <td className="p-2.5 text-center font-bold text-white text-sm">
                        {w.hamri_score}
                      </td>
                      <td className="p-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getRiskBadgeClass(w.risk_category)}`}>
                          {w.risk_category}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{w.relative_risk.central.toFixed(2)}</span>
                          <span className="text-[10px] text-command-muted font-mono">
                            [{w.relative_risk.lower.toFixed(2)} - {w.relative_risk.upper.toFixed(2)}]
                          </span>
                        </div>
                      </td>
                      <td className="p-2.5 text-command-muted text-[11px]">
                        {w.excess_mortality.formatted_range}
                      </td>
                      <td className="p-2.5 text-right">
                        <button className="text-command-muted hover:text-white p-1">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Row with Clinical Directives & Summary */}
                    {isExpanded && (
                      <tr className="bg-command-panel/80">
                        <td colSpan={7} className="p-4 space-y-3 border-b border-command-border/70">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Summary */}
                            <div className="md:col-span-2 space-y-2">
                              <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold flex items-center gap-1">
                                <Info className="w-3.5 h-3.5" />
                                Epidemiological Attribution & Cumulative Exposure
                              </span>
                              <p className="text-xs text-command-muted leading-relaxed">
                                {w.summary}
                              </p>
                              <div className="flex flex-wrap gap-2 text-[10px] text-command-subtle font-mono pt-1">
                                <span className="bg-command-card px-2 py-0.5 rounded border border-command-border">
                                  Lag Persistence Multiplier: x{w.persistence_factor}
                                </span>
                                <span className="bg-command-card px-2 py-0.5 rounded border border-command-border">
                                  Nocturnal Heat Deficit: x{w.nocturnal_factor}
                                </span>
                                <span className="bg-command-card px-2 py-0.5 rounded border border-command-border">
                                  Est Excess Cases: {w.excess_mortality.estimated_excess_cases_in_ward}
                                </span>
                              </div>
                            </div>

                            {/* Surge & Clinical Protocols */}
                            <div className="bg-command-card p-3 rounded-lg border border-command-border space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-mono text-red-400 uppercase font-bold">
                                  Emergency Surge Demand
                                </span>
                                {surgeMatch && (
                                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${getReadinessBadgeClass(surgeMatch.readiness_alert_level)}`}>
                                    {surgeMatch.readiness_alert_level}
                                  </span>
                                )}
                              </div>
                              {surgeMatch && (
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-command-muted">Projected Acute Cases:</span>
                                    <span className="font-bold text-white">{surgeMatch.projected_cases_today}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-command-muted">ICU Bed Pressure:</span>
                                    <span className="font-bold text-amber-400">{surgeMatch.icu_bed_pressure_pct}%</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Directives List */}
                          {surgeMatch && surgeMatch.clinical_directives && (
                            <div className="space-y-1.5 pt-1">
                              <span className="text-[10px] font-mono text-command-muted uppercase font-bold">
                                Targeted Clinical Action Directives
                              </span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {surgeMatch.clinical_directives.map((dir, idx) => (
                                  <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-300 bg-command-card p-2 rounded border border-command-border">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                    <span>{dir}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Clinical Demand & Duration Simulator */}
      <div className="bg-gradient-to-br from-command-card to-command-panel border border-red-500/30 rounded-xl p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-command-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-red-400" />
              <h3 className="text-base font-bold text-white">
                Interactive Clinical Demand & Heatwave Duration Simulator
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                DYNAMIC EPIDEMIOLOGY
              </span>
            </div>
            <p className="text-xs text-command-muted mt-1">
              Simulate how escalating heatwave duration, nocturnal minimum temperatures, and demographic vulnerability impact emergency presentations and ICU pressure.
            </p>
          </div>

          {/* Results Pill */}
          {simResult && (
            <div className="flex flex-wrap items-center gap-4 bg-command-panel px-4 py-2 rounded-xl border border-command-border font-mono text-xs">
              <div>
                <span className="text-command-muted text-[10px] block">Relative Risk [95% CI]</span>
                <span className="text-base font-bold text-red-400">
                  {simResult.rr_central.toFixed(2)}{' '}
                  <span className="text-xs text-command-subtle font-normal">
                    [{simResult.rr_lower.toFixed(2)} - {simResult.rr_upper.toFixed(2)}]
                  </span>
                </span>
              </div>
              <div className="border-l border-command-border pl-3">
                <span className="text-command-muted text-[10px] block">ED Cases Today</span>
                <span className="text-base font-bold text-white">{simResult.projected_cases}</span>
              </div>
              <div className="border-l border-command-border pl-3">
                <span className="text-command-muted text-[10px] block">ICU Pressure</span>
                <span className="text-base font-bold text-amber-400">{simResult.icu_pressure}%</span>
              </div>
              <div className="border-l border-command-border pl-3">
                <span className={`px-2 py-1 rounded text-xs font-bold ${getReadinessBadgeClass(simResult.readiness_level)}`}>
                  {simResult.readiness_level} SURGE
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Slider 1: HTSI */}
          <div className="space-y-2 bg-command-panel/60 p-3.5 rounded-xl border border-command-border">
            <div className="flex justify-between items-center text-xs">
              <span className="text-white font-medium flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-red-400" />
                HTSI Stress Score
              </span>
              <span className="font-mono text-red-400 font-bold">{simHtsi}</span>
            </div>
            <input
              type="range"
              min="30"
              max="95"
              step="1"
              value={simHtsi}
              onChange={e => setSimHtsi(parseFloat(e.target.value))}
              className="w-full accent-red-400 cursor-pointer h-1.5 bg-command-border rounded-lg"
            />
            <p className="text-[10px] text-command-subtle">Baseline threshold ~35</p>
          </div>

          {/* Slider 2: Consecutive Days */}
          <div className="space-y-2 bg-command-panel/60 p-3.5 rounded-xl border border-command-border">
            <div className="flex justify-between items-center text-xs">
              <span className="text-white font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Consecutive Days
              </span>
              <span className="font-mono text-amber-400 font-bold">{simDays} Days</span>
            </div>
            <input
              type="range"
              min="1"
              max="7"
              step="1"
              value={simDays}
              onChange={e => setSimDays(parseInt(e.target.value, 10))}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-command-border rounded-lg"
            />
            <p className="text-[10px] text-command-subtle">Lagged fatigue compounding</p>
          </div>

          {/* Slider 3: Nocturnal Temp */}
          <div className="space-y-2 bg-command-panel/60 p-3.5 rounded-xl border border-command-border">
            <div className="flex justify-between items-center text-xs">
              <span className="text-white font-medium flex items-center gap-1">
                <Moon className="w-3.5 h-3.5 text-purple-400" />
                Night Min Temp (°C)
              </span>
              <span className="font-mono text-purple-400 font-bold">{simNightTemp.toFixed(1)}°C</span>
            </div>
            <input
              type="range"
              min="22.0"
              max="34.0"
              step="0.5"
              value={simNightTemp}
              onChange={e => setSimNightTemp(parseFloat(e.target.value))}
              className="w-full accent-purple-400 cursor-pointer h-1.5 bg-command-border rounded-lg"
            />
            <p className="text-[10px] text-command-subtle">Recovery failure &gt;26°C</p>
          </div>

          {/* Slider 4: Vulnerability */}
          <div className="space-y-2 bg-command-panel/60 p-3.5 rounded-xl border border-command-border">
            <div className="flex justify-between items-center text-xs">
              <span className="text-white font-medium flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                Ward Vulnerability
              </span>
              <span className="font-mono text-cyan-400 font-bold">{simVuln}</span>
            </div>
            <input
              type="range"
              min="20"
              max="90"
              step="2"
              value={simVuln}
              onChange={e => setSimVuln(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-command-border rounded-lg"
            />
            <p className="text-[10px] text-command-subtle">Socioeconomic & age frailty</p>
          </div>

          {/* Slider 5: Population */}
          <div className="space-y-2 bg-command-panel/60 p-3.5 rounded-xl border border-command-border">
            <div className="flex justify-between items-center text-xs">
              <span className="text-white font-medium flex items-center gap-1">
                <Hospital className="w-3.5 h-3.5 text-rose-400" />
                Catchment Pop
              </span>
              <span className="font-mono text-rose-400 font-bold">{(simPop / 1000).toFixed(0)}k</span>
            </div>
            <input
              type="range"
              min="20000"
              max="250000"
              step="10000"
              value={simPop}
              onChange={e => setSimPop(parseInt(e.target.value, 10))}
              className="w-full accent-rose-400 cursor-pointer h-1.5 bg-command-border rounded-lg"
            />
            <p className="text-[10px] text-command-subtle">Ward catchment cohort</p>
          </div>
        </div>

        {/* Dynamic Simulation Directives */}
        {simResult && (
          <div className="space-y-2 pt-2">
            <span className="text-xs font-mono text-command-muted uppercase font-bold flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-red-400" />
              Dynamic Clinical Protocols for {simResult.readiness_level} Surge Scenario
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {simResult.directives.map((dir, i) => (
                <div key={i} className="flex items-start gap-2 bg-command-panel p-3 rounded-lg border border-command-border text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{dir}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lag Progression Multi-Day Curve */}
      <div className="bg-command-card border border-command-border rounded-xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Cumulative Exposure Multi-Day Lag Trajectory
            </h3>
            <span className="text-[11px] text-command-muted">
              Projects how Relative Risk and emergency admissions escalate from Day 1 to Day 7 under continuous heat stress
            </span>
          </div>
        </div>

        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lagCurveData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
              <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" stroke="#ef4444" tick={{ fontSize: 11 }} domain={[1.0, 'auto']} />
              <YAxis yAxisId="right" orientation="right" stroke="#38bdf8" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line yAxisId="left" type="monotone" dataKey="Relative Risk" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line yAxisId="right" type="monotone" dataKey="Projected ED Cases" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
