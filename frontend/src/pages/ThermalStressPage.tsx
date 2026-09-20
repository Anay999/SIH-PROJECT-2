import React, { useState, useEffect } from 'react';
import {
  ThermometerSun,
  Sun,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { calculateThermalStress } from '../services/api';

export const ThermalStressPage: React.FC = () => {
  // Input parameters
  const [temp, setTemp] = useState<number>(38.5);
  const [rh, setRh] = useState<number>(68);
  const [wind, setWind] = useState<number>(2.0);
  const [solar, setSolar] = useState<number>(750);
  const [environment, setEnvironment] = useState<string>('outdoor');
  const [consecutiveDays, setConsecutiveDays] = useState<number>(3);
  const [nightTemp, setNightTemp] = useState<number>(29.5);
  const [vulnerability, setVulnerability] = useState<number>(65);

  // Calculation output state
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const runCalculation = async () => {
    setLoading(true);
    try {
      const data = await calculateThermalStress({
        air_temp_c: temp,
        relative_humidity: rh,
        wind_speed_ms: wind,
        solar_radiation_wm2: environment === 'outdoor' ? solar : 0,
        environment,
        consecutive_hot_days: consecutiveDays,
        min_night_temp_c: nightTemp,
        vulnerability_score: vulnerability,
      });
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      runCalculation();
    }, 250);
    return () => clearTimeout(timer);
  }, [temp, rh, wind, solar, environment, consecutiveDays, nightTemp, vulnerability]);

  const hi = result?.heat_index;
  const wbgt = result?.wbgt;
  const utci = result?.utci;
  const htsi = result?.htsi;
  const sens = result?.sensitivity_analysis;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-command-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <ThermometerSun className="w-5 h-5 text-amber-400" />
              Scientific Thermal Stress Intelligence Lab
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
              PEER-REVIEWED BIO-METEOROLOGY
            </span>
          </div>
          <p className="text-xs text-command-muted mt-1">
            Live multi-model simulation: NOAA Rothfusz Heat Index, ISO 7243 WBGT (natural wet-bulb & globe balance), COST Action 730 UTCI, and HTSI composite.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={runCalculation}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded text-xs font-mono transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Recalculate</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Simulation Sliders (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-command-card border border-command-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-command-border pb-2">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Sun className="w-4 h-4 text-amber-400" />
                Microclimate Simulation Inputs
              </h2>
              <span className="text-[10px] font-mono text-cyan-400">Dynamic Reactive</span>
            </div>

            {/* Slider 1: Air Temperature */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-command-muted">Air Dry-Bulb Temp (Ta)</span>
                <strong className="text-amber-400 text-sm">{temp}°C</strong>
              </div>
              <input
                type="range"
                min="25"
                max="50"
                step="0.5"
                value={temp}
                onChange={(e) => setTemp(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-command-bg rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-command-subtle font-mono">
                <span>25°C</span>
                <span>37.5°C (Chennai avg)</span>
                <span>50°C</span>
              </div>
            </div>

            {/* Slider 2: Relative Humidity */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-command-muted">Relative Humidity (RH)</span>
                <strong className="text-cyan-400 text-sm">{rh}%</strong>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="1"
                value={rh}
                onChange={(e) => setRh(parseInt(e.target.value))}
                className="w-full h-1.5 bg-command-bg rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] text-command-subtle font-mono">
                <span>10% (Dry desert)</span>
                <span>65% (Chennai coastal)</span>
                <span>100%</span>
              </div>
            </div>

            {/* Slider 3: Wind Speed */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-command-muted">Wind Velocity (10m height)</span>
                <strong className="text-emerald-400 text-sm">{wind} m/s</strong>
              </div>
              <input
                type="range"
                min="0.5"
                max="15"
                step="0.5"
                value={wind}
                onChange={(e) => setWind(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-command-bg rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-command-subtle font-mono">
                <span>0.5 m/s (Calm air)</span>
                <span>3.0 m/s (Sea breeze)</span>
                <span>15.0 m/s</span>
              </div>
            </div>

            {/* Slider 4: Solar Irradiance & Environment Toggle */}
            <div className="space-y-2 pt-2 border-t border-command-border/50">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-command-muted">Exposure Setting</span>
                <div className="flex rounded-md bg-command-bg p-0.5 border border-command-border">
                  <button
                    onClick={() => setEnvironment('outdoor')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                      environment === 'outdoor' ? 'bg-amber-500 text-black' : 'text-command-muted hover:text-white'
                    }`}
                  >
                    Direct Sun
                  </button>
                  <button
                    onClick={() => setEnvironment('shade')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                      environment === 'shade' ? 'bg-cyan-500 text-black' : 'text-command-muted hover:text-white'
                    }`}
                  >
                    Shade / Indoor
                  </button>
                </div>
              </div>

              {environment === 'outdoor' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-command-subtle">Solar Irradiance Flux</span>
                    <strong className="text-yellow-400 text-xs">{solar} W/m²</strong>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="1100"
                    step="50"
                    value={solar}
                    onChange={(e) => setSolar(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-command-bg rounded-lg appearance-none cursor-pointer accent-yellow-500"
                  />
                </div>
              )}
            </div>

            {/* Persistence & Nocturnal Heat */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-command-border/50">
              <div className="space-y-1">
                <span className="text-[10px] text-command-subtle font-mono block">Consecutive Hot Days</span>
                <select
                  value={consecutiveDays}
                  onChange={(e) => setConsecutiveDays(parseInt(e.target.value))}
                  className="w-full bg-command-bg text-xs font-mono text-white p-1.5 rounded border border-command-border"
                >
                  <option value="1">1 Day (Isolated)</option>
                  <option value="2">2 Days</option>
                  <option value="3">3 Days (Wave)</option>
                  <option value="5">5 Days (Severe)</option>
                  <option value="7">7+ Days (Prolonged)</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-command-subtle font-mono block">Night Minimum Temp</span>
                <select
                  value={nightTemp}
                  onChange={(e) => setNightTemp(parseFloat(e.target.value))}
                  className="w-full bg-command-bg text-xs font-mono text-white p-1.5 rounded border border-command-border"
                >
                  <option value="24.0">24°C (Comfortable)</option>
                  <option value="27.0">27°C (Mild recovery)</option>
                  <option value="29.5">29.5°C (Trapped heat)</option>
                  <option value="32.0">32°C (Extreme nocturnal)</option>
                </select>
              </div>
            </div>

            {/* Slider 5: Ward Vulnerability Factor */}
            <div className="space-y-1.5 pt-2 border-t border-command-border/50">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-command-muted">Ward Demographic Vulnerability</span>
                <strong className="text-purple-400 text-sm">{vulnerability} / 100</strong>
              </div>
              <input
                type="range"
                min="10"
                max="95"
                step="5"
                value={vulnerability}
                onChange={(e) => setVulnerability(parseInt(e.target.value))}
                className="w-full h-1.5 bg-command-bg rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-[10px] text-command-subtle font-mono">
                <span>10 (Low vulnerability)</span>
                <span>55 (Average)</span>
                <span>95 (Extreme risk)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Biometeorological Gauges & Output Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main 4 Metric Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1: NOAA Heat Index */}
            <div className="bg-command-card border border-command-border rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">NOAA Heat Index</span>
                <span className="text-[10px] font-mono text-cyan-400">Rothfusz Equation</span>
              </div>
              <div className="my-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-amber-400">{hi?.value_c ?? '...'}°C</span>
                  <span className="text-xs text-command-subtle font-mono">({hi?.value_f ?? '...'}°F)</span>
                </div>
                <div className="mt-1">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                      hi?.category === 'Extreme Danger'
                        ? 'bg-red-500/20 text-red-400 border-red-500/40'
                        : hi?.category === 'Danger'
                        ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    }`}
                  >
                    {hi?.category?.toUpperCase()}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-command-muted border-t border-command-border/50 pt-2 leading-tight">
                Reflects how temperature feels when high relative humidity retards evaporative sweat rate.
              </p>
            </div>

            {/* Card 2: Wet-Bulb Globe Temp (WBGT) */}
            <div className="bg-command-card border border-command-border rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Wet-Bulb Globe Temp (WBGT)</span>
                <span className="text-[10px] font-mono text-amber-400">ISO 7243</span>
              </div>
              <div className="my-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-red-400">{wbgt?.wbgt_c ?? '...'}°C</span>
                  <span className="text-[10px] font-mono text-command-subtle">
                    (Tw: {wbgt?.natural_wet_bulb_c}°C | Tg: {wbgt?.globe_temp_c}°C)
                  </span>
                </div>
                <div className="mt-1">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                      wbgt?.category === 'Extreme'
                        ? 'bg-red-500/20 text-red-400 border-red-500/40'
                        : wbgt?.category === 'Very High'
                        ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    }`}
                  >
                    {wbgt?.category?.toUpperCase()} STRESS
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-command-muted border-t border-command-border/50 pt-2 leading-tight">
                <strong>Guideline:</strong> {wbgt?.work_rest_recommendation}
              </div>
            </div>

            {/* Card 3: Universal Thermal Climate Index (UTCI) */}
            <div className="bg-command-card border border-command-border rounded-xl p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Universal Thermal Climate Index</span>
                <span className="text-[10px] font-mono text-purple-400">COST 730 / Fiala</span>
              </div>
              <div className="my-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-purple-300">{utci?.utci_c ?? '...'}°C</span>
                  <span className="text-[10px] font-mono text-command-subtle">
                    (Vapour: {utci?.water_vapour_pressure_hpa} hPa)
                  </span>
                </div>
                <div className="mt-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40 uppercase">
                    {utci?.stress_category}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-command-muted border-t border-command-border/50 pt-2 leading-tight">
                Physiological equivalent temperature derived from the 187-node human thermoregulation model.
              </p>
            </div>

            {/* Card 4: Human Thermal Stress Index (HTSI) */}
            <div className="bg-command-card border border-command-border rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-red-500 to-amber-500"></div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Human Thermal Stress (HTSI)</span>
                <span className="text-[10px] font-mono text-amber-400">Composite Decision Metric</span>
              </div>
              <div className="my-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">{htsi?.htsi_score ?? '...'}</span>
                  <span className="text-xs text-command-subtle font-mono">/ 100</span>
                </div>
                <div className="mt-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-red-500/20 text-red-400 border border-red-500/40 uppercase">
                    {htsi?.category} RISK
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-command-muted border-t border-command-border/50 pt-2 leading-tight">
                Fuses physical heat burden (45%), nocturnal persistence (20%), demographic vulnerability (20%), and concrete exposure (15%).
              </p>
            </div>
          </div>

          {/* Explainability & Sensitivity Card */}
          <div className="bg-command-panel border border-command-border rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-command-border pb-2">
              <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Explainable Risk Attribution & Sensitivity Analysis
              </h3>
              <span className="text-[10px] font-mono text-command-subtle">Deterministic Factor Engine</span>
            </div>

            <div className="text-xs text-command-muted leading-relaxed">
              <p>
                <strong className="text-white">Primary Risk Driver: </strong>
                <span className="text-amber-300 font-semibold">{htsi?.primary_risk_driver}</span>
              </p>
              <p className="mt-1 text-slate-300">{htsi?.explanation}</p>
            </div>

            {/* Sensitivity analysis metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="p-2.5 rounded bg-command-card border border-command-border">
                <span className="text-[10px] text-command-subtle font-mono block">Humidity Sensitivity (-15% RH)</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {sens?.humidity_drop_15pct?.delta_heat_index_c}°C Heat Index Relief
                </span>
                <p className="text-[10px] text-command-muted mt-0.5">{sens?.humidity_drop_15pct?.note}</p>
              </div>

              <div className="p-2.5 rounded bg-command-card border border-command-border">
                <span className="text-[10px] text-command-subtle font-mono block">Wind Convection Sensitivity (2x Wind)</span>
                <span className="text-cyan-300 font-bold text-sm">
                  {sens?.wind_speed_doubled?.delta_wbgt_c}°C WBGT Convective Relief
                </span>
                <p className="text-[10px] text-command-muted mt-0.5">{sens?.wind_speed_doubled?.note}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
