import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Play,
  RotateCcw,
  Flame,
  Droplets,
  Wind,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  History,
  Building2,
  Sparkles
} from 'lucide-react';
import {
  fetchSimulationScenarios,
  runSimulation,
  resetSimulation,
  fetchSimulationHistory
} from '../services/api';
import type {
  SimulationScenarioPreset,
  SimulationResultData
} from '../types';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';

const CHENNAI_15_WARDS = [
  { id: 'ward_01', name: 'Ward 01: Thiruvottiyur' },
  { id: 'ward_02', name: 'Ward 02: Manali' },
  { id: 'ward_03', name: 'Ward 03: Madhavaram' },
  { id: 'ward_04', name: 'Ward 04: Tondiarpet' },
  { id: 'ward_05', name: 'Ward 05: Royapuram' },
  { id: 'ward_06', name: 'Ward 06: Thiru-Vi-Ka Nagar' },
  { id: 'ward_07', name: 'Ward 07: Ambattur' },
  { id: 'ward_08', name: 'Ward 08: Anna Nagar' },
  { id: 'ward_09', name: 'Ward 09: Teynampet' },
  { id: 'ward_10', name: 'Ward 10: Kodambakkam' },
  { id: 'ward_11', name: 'Ward 11: Valasaravakkam' },
  { id: 'ward_12', name: 'Ward 12: Alandur' },
  { id: 'ward_13', name: 'Ward 13: Adyar' },
  { id: 'ward_14', name: 'Ward 14: Perungudi' },
  { id: 'ward_15', name: 'Ward 15: Sholinganallur' },
];

export const SimulationPage: React.FC = () => {
  const { addActivityEvent } = useWorkspace();
  const { user } = useAuth();
  const [scenarios, setScenarios] = useState<SimulationScenarioPreset[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('extreme_humid_heat');

  // Sliders
  const [tempDelta, setTempDelta] = useState<number>(4.0);
  const [rhDelta, setRhDelta] = useState<number>(12.0);
  const [windDelta, setWindDelta] = useState<number>(-1.5);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simWardIndex, setSimWardIndex] = useState<number>(0);
  const [simProgressPercent, setSimProgressPercent] = useState<number>(0);
  const [simPhaseText, setSimPhaseText] = useState<string>('');

  const [simulationResult, setSimulationResult] = useState<SimulationResultData | null>(null);
  const [simulationHistory, setSimulationHistory] = useState<any[]>([]);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [scList, histList] = await Promise.all([
        fetchSimulationScenarios(),
        fetchSimulationHistory()
      ]);
      setScenarios(scList);
      setSimulationHistory(histList);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Failed to load simulation environment.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectScenario = (sc: SimulationScenarioPreset) => {
    setSelectedScenarioId(sc.id);
    setTempDelta(sc.default_temp_delta);
    setRhDelta(sc.default_rh_delta);
    setWindDelta(sc.id === 'dry_heatwave' ? 1.5 : sc.id === 'heatwave_recovery' ? 2.0 : -1.0);
  };

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    setNotification(null);
    setSimWardIndex(0);
    setSimProgressPercent(5);
    setSimPhaseText('Initializing atmospheric physics & microclimate baseline across GCC...');

    let currentIdx = 0;
    const interval = setInterval(() => {
      currentIdx++;
      if (currentIdx < CHENNAI_15_WARDS.length) {
        setSimWardIndex(currentIdx);
        setSimProgressPercent(Math.round(((currentIdx + 1) / 15) * 95));
        setSimPhaseText(`Computing HTSI, WBGT & HAMRI hospital surge for ${CHENNAI_15_WARDS[currentIdx].name}...`);
      }
    }, 110);

    try {
      const activeRole = user?.role === 'ADMIN' ? 'ADMIN' : 'OFFICER';
      const result = await runSimulation({
        scenario_id: selectedScenarioId,
        temp_delta: tempDelta,
        rh_delta: rhDelta,
        wind_delta: windDelta,
        notes: `Simulated by ${user?.full_name || activeRole}`
      });

      clearInterval(interval);
      setSimWardIndex(14);
      setSimProgressPercent(100);
      setSimPhaseText('Deterministic simulation complete across all 15 wards.');

      setSimulationResult(result);
      setNotification({
        type: 'success',
        text: `Simulation '${result.scenario_name}' executed. ${result.delta_metrics.triggered_alerts_count} new thermal alerts triggered across all 15 wards.`
      });
      addActivityEvent('SCENARIO', `Simulation '${result.scenario_name}' completed across 15 wards (+${result.delta_metrics.triggered_alerts_count} alerts)`);
      // Refresh history
      const hist = await fetchSimulationHistory();
      setSimulationHistory(hist);
    } catch (err: any) {
      clearInterval(interval);
      setNotification({ type: 'error', text: err.message || 'Simulation execution failed.' });
    } finally {
      setTimeout(() => setIsSimulating(false), 450);
    }
  };

  const handleResetBaseline = async () => {
    if (user?.role !== 'ADMIN') {
      setNotification({
        type: 'error',
        text: 'Simulation reset requires superuser administrator clearance.'
      });
      setShowResetConfirm(false);
      return;
    }

    try {
      await resetSimulation();
      setSimulationResult(null);
      setShowResetConfirm(false);
      setNotification({
        type: 'success',
        text: 'Active simulation state cleared. Canonical baseline restored across all 15 wards.'
      });
      addActivityEvent('SCENARIO', 'Simulation environment reset to canonical baseline across 15 wards');
      const hist = await fetchSimulationHistory();
      setSimulationHistory(hist);
    } catch (err: any) {
      setNotification({ type: 'error', text: err.message || 'Failed to reset baseline.' });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Badges */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-command-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="w-6 h-6 text-cyan-400" />
            <h1 className="text-xl font-bold text-white">
              Scenario Planning & Intervention Testing
            </h1>
          </div>
          <p className="text-xs text-command-muted mt-1 max-w-3xl leading-relaxed">
            Test how different heat conditions and municipal interventions change planning priorities. Explore before-and-after model outcomes to prepare emergency resource allocation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
            ILLUSTRATIVE PLANNING SIMULATION
          </span>
          <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
            MODELLED OUTCOME · NOT A FORECAST
          </span>
        </div>
      </div>

      {/* Simulation Policy Notice */}
      <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 font-sans flex items-center gap-2.5">
        <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
        <span>
          <strong>Municipal Planning Notice:</strong> This is an illustrative planning simulation and does not represent a real-world forecast.
        </span>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            )}
            <span>{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-command-muted hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* SECTION 1: 6 SCENARIO PRESETS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Select Climate Heatwave Scenario
          </h2>
          <span className="text-[11px] font-mono text-command-muted">6 Calibrated Presets</span>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="p-8 text-center bg-command-card border border-command-border rounded-xl text-xs font-mono text-command-muted">
            Loading climate scenario models...
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {scenarios.map((sc: SimulationScenarioPreset) => {
            const isSelected = selectedScenarioId === sc.id;
            return (
              <div
                key={sc.id}
                onClick={() => handleSelectScenario(sc)}
                className={`p-4 rounded-xl border cursor-pointer transition relative space-y-2.5 ${
                  isSelected
                    ? 'bg-gradient-to-br from-cyan-500/15 via-command-card to-command-card border-cyan-500/60 ring-1 ring-cyan-500/40'
                    : 'bg-command-card border-command-border hover:border-command-border/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-command-panel text-command-muted border border-command-border">
                      {sc.category}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1.5">{sc.name}</h3>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      sc.expected_htsi.includes('Extreme')
                        ? 'bg-red-500/20 text-red-400'
                        : sc.expected_htsi.includes('Very High')
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    HTSI: {sc.expected_htsi}
                  </span>
                </div>

                <p className="text-[11px] text-command-muted leading-relaxed">{sc.description}</p>

                <div className="flex items-center justify-between pt-2 border-t border-command-border/50 text-[11px] font-mono text-command-subtle">
                  <span>Base: {sc.temp_base_c}°C / {sc.rh_base}% RH</span>
                  <span className="text-cyan-400">Δ {sc.default_temp_delta >= 0 ? `+${sc.default_temp_delta}` : sc.default_temp_delta}°C</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: PERTURBATION SLIDERS & RUN CONTROLS */}
      <div className="bg-command-card border border-command-border rounded-xl p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-command-border pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Meteorological Perturbation Sliders (Fine-Tuning)
            </h3>
            <p className="text-[11px] text-command-muted mt-0.5">
              Adjust parameters relative to Chennai baseline observations. All biometeorological indices recomputed deterministically.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTempDelta(0);
                setRhDelta(0);
                setWindDelta(0);
              }}
              className="px-3 py-1.5 rounded-lg bg-command-panel text-command-muted hover:text-white border border-command-border text-xs font-mono transition"
            >
              Reset Sliders
            </button>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-mono transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Baseline
            </button>
            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-cyan-950/40 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isSimulating ? 'Executing 15-Ward Simulation...' : 'Run Isolated Simulation'}
            </button>
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Temperature Delta */}
          <div className="p-4 rounded-lg bg-command-panel border border-command-border space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-command-muted flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                Temperature Anomaly (ΔT):
              </span>
              <span className="text-orange-400 font-bold text-sm">
                {tempDelta >= 0 ? `+${tempDelta}` : tempDelta}°C
              </span>
            </div>
            <input
              type="range"
              min={-5}
              max={8}
              step={0.5}
              value={tempDelta}
              onChange={(e) => setTempDelta(parseFloat(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-command-subtle">
              <span>-5.0°C (Cooler)</span>
              <span>Baseline</span>
              <span>+8.0°C (Extreme Heat)</span>
            </div>
          </div>

          {/* Relative Humidity Delta */}
          <div className="p-4 rounded-lg bg-command-panel border border-command-border space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-command-muted flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                Humidity Anomaly (ΔRH):
              </span>
              <span className="text-cyan-400 font-bold text-sm">
                {rhDelta >= 0 ? `+${rhDelta}` : rhDelta}%
              </span>
            </div>
            <input
              type="range"
              min={-30}
              max={35}
              step={1}
              value={rhDelta}
              onChange={(e) => setRhDelta(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-command-subtle">
              <span>-30% (Dry winds)</span>
              <span>Baseline</span>
              <span>+35% (Coastal surge)</span>
            </div>
          </div>

          {/* Wind Speed Delta */}
          <div className="p-4 rounded-lg bg-command-panel border border-command-border space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-command-muted flex items-center gap-1">
                <Wind className="w-3.5 h-3.5 text-emerald-400" />
                Wind Speed Anomaly (Δv):
              </span>
              <span className="text-emerald-400 font-bold text-sm">
                {windDelta >= 0 ? `+${windDelta}` : windDelta} m/s
              </span>
            </div>
            <input
              type="range"
              min={-4}
              max={5}
              step={0.5}
              value={windDelta}
              onChange={(e) => setWindDelta(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-command-subtle">
              <span>-4.0 m/s (Stagnant)</span>
              <span>Baseline</span>
              <span>+5.0 m/s (Sea breeze)</span>
            </div>
          </div>
        </div>

        {/* 15-WARD CALCULATION PROGRESS TICKER */}
        {isSimulating && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/70 via-slate-900 to-cyan-950/70 border border-cyan-500/40 space-y-3 shadow-xl">
            <div className="flex flex-wrap items-center justify-between text-xs font-mono gap-2">
              <span className="flex items-center gap-2 text-cyan-300 font-bold">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
                <span>EVALUATING 15-WARD DETERMINISTIC BIOMETEOROLOGY: {simProgressPercent}%</span>
              </span>
              <span className="text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-950/50 border border-amber-500/30">
                {CHENNAI_15_WARDS[simWardIndex]?.name} ({simWardIndex + 1}/15)
              </span>
            </div>

            {/* Segmented 15-ward LED progress matrix */}
            <div className="grid grid-cols-5 sm:grid-cols-15 gap-1.5 h-3">
              {CHENNAI_15_WARDS.map((w, idx) => (
                <div
                  key={w.id}
                  className={`h-full rounded-sm transition-all duration-150 ${
                    idx < simWardIndex
                      ? 'bg-cyan-400 shadow-sm shadow-cyan-400/50'
                      : idx === simWardIndex
                      ? 'bg-amber-400 animate-pulse ring-1 ring-amber-300'
                      : 'bg-slate-800/80'
                  }`}
                  title={`${w.name} - ${idx <= simWardIndex ? 'Completed' : 'Pending'}`}
                />
              ))}
            </div>

            <p className="text-[11px] font-mono text-slate-300 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
              <span className="truncate">{simPhaseText}</span>
            </p>
          </div>
        )}
      </div>

      {/* SECTION 3: BEFORE VS AFTER COMPARATIVE IMPACT CARDS */}
      {simulationResult && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Comparative Impact Metrics (Baseline vs Simulated)
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Run ID: {simulationResult.simulation_id}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Citywide HTSI Shift */}
            <div className="p-4 rounded-xl bg-command-card border border-command-border space-y-1">
              <div className="text-[11px] font-mono text-command-muted">Citywide Mean HTSI</div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-command-subtle">
                  {simulationResult.baseline_snapshot.citywide_mean_htsi}
                </span>
                <span className="text-slate-400 font-mono">→</span>
                <span className="text-2xl font-black text-white">
                  {simulationResult.simulated_snapshot.citywide_mean_htsi}
                </span>
              </div>
              <div className="text-xs font-mono font-bold text-orange-400">
                Δ {simulationResult.delta_metrics.citywide_mean_htsi_delta >= 0 ? `+${simulationResult.delta_metrics.citywide_mean_htsi_delta}` : simulationResult.delta_metrics.citywide_mean_htsi_delta} pts
              </div>
            </div>

            {/* High/Extreme Risk Population */}
            <div className="p-4 rounded-xl bg-command-card border border-command-border space-y-1">
              <div className="text-[11px] font-mono text-command-muted">Population at Extreme Risk</div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-command-subtle">
                  {(simulationResult.delta_metrics.population_at_high_risk_baseline / 1000).toFixed(0)}k
                </span>
                <span className="text-slate-400 font-mono">→</span>
                <span className="text-2xl font-black text-red-400">
                  {(simulationResult.delta_metrics.population_at_high_risk_simulated / 1000).toFixed(0)}k
                </span>
              </div>
              <div className="text-xs font-mono font-bold text-red-400">
                +{simulationResult.delta_metrics.high_risk_population_delta.toLocaleString()} residents
              </div>
            </div>

            {/* Hospital Emergency Surge */}
            <div className="p-4 rounded-xl bg-command-card border border-command-border space-y-1">
              <div className="text-[11px] font-mono text-command-muted">Mean Hospital Surge Index</div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-command-subtle">
                  {simulationResult.baseline_snapshot.citywide_mean_surge}
                </span>
                <span className="text-slate-400 font-mono">→</span>
                <span className="text-2xl font-black text-amber-400">
                  {simulationResult.simulated_snapshot.citywide_mean_surge}
                </span>
              </div>
              <div className="text-xs font-mono font-bold text-amber-400">
                Δ +{simulationResult.delta_metrics.mean_hospital_surge_delta} surge index
              </div>
            </div>

            {/* Triggered Extreme Alerts */}
            <div className="p-4 rounded-xl bg-command-card border border-command-border space-y-1">
              <div className="text-[11px] font-mono text-command-muted">Cross-Threshold Alerts</div>
              <div className="text-2xl font-black text-red-400">
                {simulationResult.delta_metrics.triggered_alerts_count}
              </div>
              <div className="text-xs font-mono text-command-subtle">
                Wards crossing HTSI &gt; 75 / WBGT &gt; 33°C
              </div>
            </div>
          </div>

          {/* SECTION 4: WARD-BY-WARD COMPARISON TABLE */}
          <div className="bg-command-card border border-command-border rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              Ward-Level Comparative Microclimate Matrix
            </h3>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs text-left text-command-muted">
                <thead className="bg-command-panel text-command-muted font-mono uppercase text-[10px] border-b border-command-border sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Ward Name</th>
                    <th className="py-2.5 px-3">Baseline Temp</th>
                    <th className="py-2.5 px-3">Simulated Temp</th>
                    <th className="py-2.5 px-3">Simulated WBGT</th>
                    <th className="py-2.5 px-3">Baseline HTSI</th>
                    <th className="py-2.5 px-3">Simulated HTSI</th>
                    <th className="py-2.5 px-3">Hospital Surge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-command-border/50 font-mono">
                  {simulationResult.simulated_snapshot.ward_samples.map((simWard: any, i: number) => {
                    const baseWard = simulationResult.baseline_snapshot.ward_samples[i] || simWard;
                    const htsiDiff = Math.round((simWard.htsi_score - baseWard.htsi_score) * 10) / 10;
                    return (
                      <tr key={simWard.ward_id} className="hover:bg-command-panel/60 transition">
                        <td className="py-2.5 px-3 text-white font-bold">{simWard.ward_name}</td>
                        <td className="py-2.5 px-3">{baseWard.temp_c}°C</td>
                        <td className="py-2.5 px-3 text-orange-400 font-bold">{simWard.temp_c}°C</td>
                        <td className="py-2.5 px-3 text-amber-400 font-bold">{simWard.wbgt_c}°C</td>
                        <td className="py-2.5 px-3">{baseWard.htsi_score}</td>
                        <td className="py-2.5 px-3">
                          <span className={simWard.htsi_score >= 80 ? 'text-red-400 font-bold' : 'text-cyan-300 font-bold'}>
                            {simWard.htsi_score} ({htsiDiff >= 0 ? `+${htsiDiff}` : htsiDiff})
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-amber-300">{simWard.surge_index} / 100</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: HISTORICAL RUNS DRAWER */}
      {simulationHistory.length > 0 && (
        <div className="bg-command-card border border-command-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              Simulation Audit History ({simulationHistory.length} Runs)
            </h3>
            <span className="text-[11px] font-mono text-command-muted">Immutable Run Logs</span>
          </div>

          <div className="space-y-2">
            {simulationHistory.slice(0, 5).map((h) => (
              <div
                key={h.id}
                className="p-3 rounded-lg bg-command-panel border border-command-border flex flex-wrap items-center justify-between gap-3 text-xs font-mono"
              >
                <div className="flex items-center gap-3">
                  <span className="text-white font-bold">{h.scenario_name}</span>
                  <span className="text-cyan-400">
                    ΔT: {h.input_parameters?.temp_delta >= 0 ? `+${h.input_parameters?.temp_delta}` : h.input_parameters?.temp_delta}°C
                  </span>
                  <span className="text-command-subtle">|</span>
                  <span className="text-command-muted">
                    Mean HTSI Shift: +{h.delta_metrics?.citywide_mean_htsi_delta || 0} pts
                  </span>
                </div>

                <div className="flex items-center gap-3 text-command-muted text-[11px]">
                  <span>By: {h.created_by}</span>
                  <span>{new Date(h.created_at_utc).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</span>
                  <span className="px-2 py-0.5 rounded bg-command-card text-emerald-400 border border-command-border">
                    {h.id}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: RESET BASELINE CONFIRMATION */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-command-panel border border-command-border rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center gap-2 text-amber-400">
              <RotateCcw className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">
                Restore Canonical Baseline?
              </h3>
            </div>

            <p className="text-xs text-command-muted leading-relaxed">
              This will deactivate active simulation states and restore all 15 Chennai wards to standard baseline observation values. Historical simulation run logs will remain preserved.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-command-border">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-command-card border border-command-border text-xs text-command-muted hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleResetBaseline}
                className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition"
              >
                Confirm Baseline Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
