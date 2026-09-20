import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Calendar,
  AlertTriangle,
  Info,
  Moon,
  Activity,
  HardHat
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { fetchWeatherForecast } from '../services/api';
import type { ForecastResponseData, HourlyForecastPoint, DailyForecastCard } from '../types';
import { TimeScrubberBar } from '../components/common/TimeScrubberBar';

export const ForecastPage: React.FC = () => {
  const [forecastData, setForecastData] = useState<ForecastResponseData | null>(null);
  const [selectedWardId, setSelectedWardId] = useState<string>('ward_04_tondiarpet');
  const [activeTab, setActiveTab] = useState<'chart' | 'daily' | 'guidelines'>('chart');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Occupational Work-Rest Guidance Interactive Toggles
  const [workIntensity, setWorkIntensity] = useState<'light' | 'moderate' | 'heavy'>('moderate');
  const [isAcclimatized, setIsAcclimatized] = useState<boolean>(true);
  const [clothingType, setClothingType] = useState<'standard' | 'ppe'>('standard');
  const [inDirectSun, setInDirectSun] = useState<boolean>(true);

  useEffect(() => {
    loadForecast(selectedWardId);
  }, [selectedWardId]);

  const loadForecast = async (wardId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchWeatherForecast(wardId, 5);
      setForecastData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load forecast intelligence.');
    } finally {
      setIsLoading(false);
    }
  };

  // Selected hour index for work-rest detail (defaults to peak heat afternoon hour ~14:00)
  const currentHourly: HourlyForecastPoint[] = forecastData?.hourly_series || [];
  const peakHourPoint = currentHourly.reduce<HourlyForecastPoint | null>((max, p) => {
    if (!max || p.wbgt_c > max.wbgt_c) return p;
    return max;
  }, null) || currentHourly[0];

  // Dynamically calculate adjusted indicative guidance
  const computeAdjustedGuidance = (baseWbgt: number) => {
    let effectiveWbgt = baseWbgt;
    if (!isAcclimatized) effectiveWbgt += 1.5;
    if (clothingType === 'ppe') effectiveWbgt += 2.0;
    if (!inDirectSun) effectiveWbgt -= 2.0;

    let workRestRatio = 'Continuous (Normal breaks)';
    let hydrationLiters = 0.5;
    let riskLevel = 'Low Risk';
    let riskColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';

    if (workIntensity === 'heavy') {
      if (effectiveWbgt >= 31.0) {
        workRestRatio = 'Stop Work / Immediate Cool-Down';
        hydrationLiters = 1.0;
        riskLevel = 'Extreme Physiological Hazard';
        riskColor = 'text-red-400 bg-red-500/10 border-red-500/30';
      } else if (effectiveWbgt >= 28.5) {
        workRestRatio = '15 min Work / 45 min Rest';
        hydrationLiters = 0.9;
        riskLevel = 'Very High Strain';
        riskColor = 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      } else if (effectiveWbgt >= 26.0) {
        workRestRatio = '30 min Work / 30 min Rest';
        hydrationLiters = 0.75;
        riskLevel = 'Moderate Heat Strain';
        riskColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      } else {
        workRestRatio = '45 min Work / 15 min Rest';
      }
    } else if (workIntensity === 'moderate') {
      if (effectiveWbgt >= 32.5) {
        workRestRatio = 'Stop Work / Evacuate to Cooling Shelter';
        hydrationLiters = 1.0;
        riskLevel = 'Extreme Physiological Hazard';
        riskColor = 'text-red-400 bg-red-500/10 border-red-500/30';
      } else if (effectiveWbgt >= 30.5) {
        workRestRatio = '15 min Work / 45 min Rest';
        hydrationLiters = 0.85;
        riskLevel = 'Very High Strain';
        riskColor = 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      } else if (effectiveWbgt >= 28.0) {
        workRestRatio = '30 min Work / 30 min Rest';
        hydrationLiters = 0.75;
        riskLevel = 'Moderate Heat Strain';
        riskColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      } else {
        workRestRatio = 'Continuous (Drink water every 20 min)';
      }
    } else {
      if (effectiveWbgt >= 33.5) {
        workRestRatio = '15 min Work / 45 min Rest';
        hydrationLiters = 0.9;
        riskLevel = 'High Strain';
        riskColor = 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      } else if (effectiveWbgt >= 31.0) {
        workRestRatio = '45 min Work / 15 min Rest';
        hydrationLiters = 0.7;
        riskLevel = 'Moderate Strain';
        riskColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      }
    }

    return {
      effectiveWbgt: Math.round(effectiveWbgt * 10) / 10,
      workRestRatio,
      hydrationLiters,
      riskLevel,
      riskColor
    };
  };

  const guidance = computeAdjustedGuidance(peakHourPoint?.wbgt_c || 32.0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Data Provenance Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-command-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-rose-400" />
            <h1 className="text-xl font-bold text-white">
              Heat Situation & 5-Day Biometeorological Outlook
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
              HIGH HEAT · RISING
            </span>
          </div>
          <p className="text-xs text-command-muted mt-1 max-w-3xl leading-relaxed">
            Multi-day operational outlook of afternoon air temperature, coastal humidity, wet-bulb globe temperature (WBGT), and nighttime heat persistence across Chennai.
          </p>
        </div>

        {/* Time Scrubber Integration */}
        <div className="flex flex-wrap items-center gap-2">
          <TimeScrubberBar />
        </div>
      </div>

      {/* Operational Outlook Statement — Prompt Requirement */}
      <div className="p-4 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-start gap-3 text-xs text-slate-300 leading-relaxed shadow-sm">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white block font-mono text-[11px] uppercase">
            Operational Heat Outlook:
          </strong>
          <span className="text-slate-200">
            Heat conditions are expected to remain elevated across Chennai through Tuesday, with afternoon wet-bulb globe temperatures consistently exceeding 32°C and high nighttime retention (&gt;29°C) limiting biological recovery.
          </span>
        </div>
      </div>

      {/* Ward Selector & Time Horizon Strip */}
      <div className="bg-command-card border border-command-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase text-command-muted">Ward Location:</span>
          <select
            value={selectedWardId}
            onChange={(e) => setSelectedWardId(e.target.value)}
            className="bg-command-panel text-white font-medium text-xs px-3 py-2 rounded-lg border border-command-border outline-none focus:border-cyan-500 min-w-[220px]"
          >
            {forecastData?.available_wards?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-1 bg-command-panel p-1 rounded-lg border border-command-border text-xs">
          <button
            onClick={() => setActiveTab('chart')}
            className={`px-3 py-1.5 rounded font-medium transition ${
              activeTab === 'chart' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-command-muted hover:text-white'
            }`}
          >
            Multi-Variable Trajectory
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1.5 rounded font-medium transition ${
              activeTab === 'daily' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-command-muted hover:text-white'
            }`}
          >
            5-Day Horizon Summary
          </button>
          <button
            onClick={() => setActiveTab('guidelines')}
            className={`px-3 py-1.5 rounded font-medium transition ${
              activeTab === 'guidelines' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-command-muted hover:text-white'
            }`}
          >
            Indicative Work-Rest Guidelines
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="bg-command-card border border-command-border rounded-xl p-12 text-center">
          <Activity className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-3" />
          <p className="text-xs font-mono text-command-muted">Generating 5-day biometeorological hourly trajectory...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!isLoading && !error && forecastData && (
        <>
          {/* 5-Day Cards Carousel / Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {forecastData.daily_forecast.map((day: DailyForecastCard) => (
              <div
                key={day.date}
                className={`p-4 rounded-xl border transition relative ${
                  day.is_nocturnal_heat_trap
                    ? 'bg-gradient-to-b from-risk-extreme/10 to-command-card border-red-500/40'
                    : 'bg-command-card border-command-border'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-2">
                  <span className="text-white font-bold">{day.day_label.split(',')[0]}</span>
                  <span className="text-command-subtle text-[11px]">{day.date.slice(5)}</span>
                </div>

                <div className="flex items-baseline justify-between mb-3">
                  <div>
                    <span className="text-2xl font-black text-white">{day.max_temp_c}°</span>
                    <span className="text-xs text-command-muted ml-1">/ {day.min_temp_c}°C</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      day.htsi_category === 'Extreme'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : day.htsi_category === 'Very High'
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {day.htsi_category}
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px] border-t border-command-border/60 pt-2 font-mono">
                  <div className="flex justify-between">
                    <span className="text-command-muted">Peak WBGT:</span>
                    <span className="text-amber-400 font-bold">{day.peak_wbgt_c}°C</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-command-muted">Peak HTSI:</span>
                    <span className="text-cyan-400 font-bold">{day.peak_htsi_score} / 100</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-command-muted flex items-center gap-1">
                      <Moon className="w-3 h-3 text-indigo-400" />
                      Night Min:
                    </span>
                    <span className={day.night_min_temp_c >= 28.0 ? 'text-red-400 font-bold' : 'text-command-muted'}>
                      {day.night_min_temp_c}°C
                    </span>
                  </div>
                </div>

                {day.is_nocturnal_heat_trap && (
                  <div className="mt-2.5 px-2 py-1 rounded bg-red-500/15 border border-red-500/30 text-[10px] font-mono text-red-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
                    <span>Night Heat Trap (≥28°C)</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Tab 1: Multi-Variable Recharts Trajectory */}
          {activeTab === 'chart' && (
            <div className="bg-command-card border border-command-border rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Hourly Biometeorological Projections (5-Day Horizon)
                  </h3>
                  <p className="text-[11px] text-command-muted mt-0.5">
                    Continuous diurnal trajectory displaying sensible heat, evaporative stress (WBGT), and whole-body thermoregulation (UTCI).
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-mono">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                    <span>Heat Index (°C)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
                    <span>Air Temp (°C)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                    <span>WBGT (°C)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                    <span>UTCI (°C)</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                    <span>RH (%)</span>
                  </span>
                </div>
              </div>

              {/* Chart Canvas */}
              <div className="h-[360px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={currentHourly} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="time_display_ist"
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      interval={3}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      domain={[20, 55]}
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickLine={false}
                      unit="°C"
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={[15, 100]}
                      tick={{ fill: '#64748b', fontSize: 10 }}
                      tickLine={false}
                      unit="%"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '8px',
                        fontSize: '11px',
                        color: '#f8fafc'
                      }}
                      formatter={(value: any, name?: any) => {
                        if (name === 'relative_humidity') return [`${value}%`, 'Relative Humidity'];
                        return [`${value}°C`, String(name || '')];
                      }}
                    />
                    {/* Critical Thresholds */}
                    <ReferenceLine yAxisId="left" y={32.2} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'WBGT Extreme (32.2°C)', fill: '#ef4444', fontSize: 9 }} />
                    <ReferenceLine yAxisId="left" y={28.0} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Night Heat Trap (28°C)', fill: '#f59e0b', fontSize: 9 }} />

                    <Line yAxisId="left" type="monotone" dataKey="heat_index_c" stroke="#ef4444" strokeWidth={2} dot={false} name="Heat Index" />
                    <Line yAxisId="left" type="monotone" dataKey="air_temp_c" stroke="#fb923c" strokeWidth={2} dot={false} name="Air Temp" />
                    <Line yAxisId="left" type="monotone" dataKey="wbgt_c" stroke="#f59e0b" strokeWidth={2} dot={false} name="WBGT" />
                    <Line yAxisId="left" type="monotone" dataKey="utci_c" stroke="#c084fc" strokeWidth={2} dot={false} name="UTCI" />
                    <Line yAxisId="right" type="monotone" dataKey="relative_humidity" stroke="#38bdf8" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="relative_humidity" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Uncertainty Band Strip */}
              <div className="p-3 bg-command-panel rounded-lg border border-command-border text-xs text-command-muted flex flex-wrap items-center justify-between gap-3 font-mono">
                <div className="flex items-center gap-2 text-command-muted">
                  <Info className="w-4 h-4 text-cyan-400" />
                  <span>Model Uncertainty Band:</span>
                  <span className="text-white">±{forecastData.uncertainty_band.temperature_c}°C Temp</span>
                  <span>•</span>
                  <span className="text-white">±{forecastData.uncertainty_band.humidity_percent}% RH</span>
                  <span>•</span>
                  <span className="text-white">±{forecastData.uncertainty_band.wbgt_c}°C WBGT</span>
                </div>
                <div className="text-[11px] text-command-subtle">
                  Seed: {forecastData.deterministic_seed} • Engine: {forecastData.engine_version}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Daily Forecast Table */}
          {activeTab === 'daily' && (
            <div className="bg-command-card border border-command-border rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                Comprehensive 5-Day Horizon Breakdown
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-command-muted">
                  <thead className="bg-command-panel text-command-muted font-mono uppercase text-[10px] border-b border-command-border">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Max Temp</th>
                      <th className="py-2.5 px-3">Min / Night</th>
                      <th className="py-2.5 px-3">Peak WBGT</th>
                      <th className="py-2.5 px-3">Peak HTSI</th>
                      <th className="py-2.5 px-3">Nocturnal Heat Status</th>
                      <th className="py-2.5 px-3">Operational Advisory</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-command-border/50 font-mono">
                    {forecastData.daily_forecast.map((d: DailyForecastCard) => (
                      <tr key={d.date} className="hover:bg-command-panel/60 transition">
                        <td className="py-3 px-3 text-white font-bold">{d.day_label}</td>
                        <td className="py-3 px-3 text-orange-400 font-bold">{d.max_temp_c}°C</td>
                        <td className="py-3 px-3">
                          {d.min_temp_c}°C / <span className="text-indigo-300">{d.night_min_temp_c}°C</span>
                        </td>
                        <td className="py-3 px-3 text-amber-400 font-bold">{d.peak_wbgt_c}°C</td>
                        <td className="py-3 px-3 text-cyan-400 font-bold">{d.peak_htsi_score} / 100</td>
                        <td className="py-3 px-3">
                          {d.is_nocturnal_heat_trap ? (
                            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px]">
                              DEFICIT: NO NIGHT RECOVERY
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
                              PASSABLE NIGHT RECOVERY
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {d.peak_wbgt_c >= 32.0
                            ? 'Mandatory labor rest shifts (11:00-16:00 IST)'
                            : 'Standard hydration stations open'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Indicative WBGT-Based Work-Rest Guidance */}
          {activeTab === 'guidelines' && (
            <div className="space-y-4">
              <div className="bg-command-card border border-command-border rounded-xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-command-border pb-4 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <HardHat className="w-5 h-5 text-amber-400" />
                      Indicative WBGT-Based Work-Rest Guidance
                    </h3>
                    <p className="text-xs text-command-muted mt-1">
                      Adaptive occupational safety guidelines calibrated against projected WBGT conditions for field and outdoor workers.
                    </p>
                  </div>
                  <div className="text-xs font-mono px-3 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    DEMONSTRATION & PLANNING SUPPORT ONLY
                  </div>
                </div>

                {/* Important Disclaimer Alert */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 mb-6 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Notice:</strong> For demonstration and planning support only. Verify applicable occupational safety standards, legal limits, and medical evaluations before operational or commercial use.
                  </p>
                </div>

                {/* Interactive Toggles */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {/* Work Intensity */}
                  <div className="p-3.5 rounded-lg bg-command-panel border border-command-border">
                    <label className="text-[11px] font-mono uppercase text-command-muted block mb-2">Workload Intensity</label>
                    <div className="grid grid-cols-3 gap-1 text-xs font-mono">
                      {(['light', 'moderate', 'heavy'] as const).map((w) => (
                        <button
                          key={w}
                          onClick={() => setWorkIntensity(w)}
                          className={`py-1.5 rounded capitalize transition ${
                            workIntensity === w ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-command-card text-command-muted hover:text-white'
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Acclimatization */}
                  <div className="p-3.5 rounded-lg bg-command-panel border border-command-border">
                    <label className="text-[11px] font-mono uppercase text-command-muted block mb-2">Worker Acclimatization</label>
                    <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                      <button
                        onClick={() => setIsAcclimatized(true)}
                        className={`py-1.5 rounded transition ${
                          isAcclimatized ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-command-card text-command-muted hover:text-white'
                        }`}
                      >
                        Acclimatized
                      </button>
                      <button
                        onClick={() => setIsAcclimatized(false)}
                        className={`py-1.5 rounded transition ${
                          !isAcclimatized ? 'bg-red-500/20 text-red-300 border border-red-500/40' : 'bg-command-card text-command-muted hover:text-white'
                        }`}
                      >
                        Unacclimatized
                      </button>
                    </div>
                  </div>

                  {/* Clothing / PPE */}
                  <div className="p-3.5 rounded-lg bg-command-panel border border-command-border">
                    <label className="text-[11px] font-mono uppercase text-command-muted block mb-2">Clothing / PPE Factor</label>
                    <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                      <button
                        onClick={() => setClothingType('standard')}
                        className={`py-1.5 rounded transition ${
                          clothingType === 'standard' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-command-card text-command-muted hover:text-white'
                        }`}
                      >
                        Light Cotton
                      </button>
                      <button
                        onClick={() => setClothingType('ppe')}
                        className={`py-1.5 rounded transition ${
                          clothingType === 'ppe' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' : 'bg-command-card text-command-muted hover:text-white'
                        }`}
                      >
                        Coveralls / PPE (+2°C)
                      </button>
                    </div>
                  </div>

                  {/* Solar Exposure */}
                  <div className="p-3.5 rounded-lg bg-command-panel border border-command-border">
                    <label className="text-[11px] font-mono uppercase text-command-muted block mb-2">Solar Exposure</label>
                    <div className="grid grid-cols-2 gap-1 text-xs font-mono">
                      <button
                        onClick={() => setInDirectSun(true)}
                        className={`py-1.5 rounded transition ${
                          inDirectSun ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-command-card text-command-muted hover:text-white'
                        }`}
                      >
                        Direct Sun
                      </button>
                      <button
                        onClick={() => setInDirectSun(false)}
                        className={`py-1.5 rounded transition ${
                          !inDirectSun ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-command-card text-command-muted hover:text-white'
                        }`}
                      >
                        Covered / Shade (-2°C)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Guidance Output Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-command-panel border border-command-border">
                    <div className="text-[11px] font-mono text-command-muted mb-1">Effective Adjusted WBGT</div>
                    <div className="text-2xl font-black text-white">{guidance.effectiveWbgt}°C</div>
                    <div className="text-[11px] text-command-subtle mt-1 font-mono">
                      Base: {peakHourPoint?.wbgt_c || 32.0}°C (Peak Hour)
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-command-panel border border-command-border">
                    <div className="text-[11px] font-mono text-command-muted mb-1">Recommended Work-Rest Cycle</div>
                    <div className="text-base font-bold text-cyan-300">{guidance.workRestRatio}</div>
                    <div className="text-[11px] text-command-subtle mt-1 font-mono">
                      Shift: 10:30 AM – 16:00 PM peak interval
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-command-panel border border-command-border">
                    <div className="text-[11px] font-mono text-command-muted mb-1">Fluid Replacement Protocol</div>
                    <div className="text-2xl font-black text-emerald-400">{guidance.hydrationLiters} L / hr</div>
                    <div className="text-[11px] text-command-subtle mt-1 font-mono">
                      Electrolyte ORS water at 20-minute intervals
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
