import React from 'react';
import {
  TrendingUp,
  Flame,
  Calendar
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area
} from 'recharts';
import { DataFlowVisualization } from '../components/common/DataFlowVisualization';

const HISTORICAL_HEAT_TRENDS = [
  { year: '2019', heatwaveDays: 14, peakTemp: 42.4, admissions: 310, wbgtEvents: 6 },
  { year: '2020', heatwaveDays: 11, peakTemp: 41.8, admissions: 240, wbgtEvents: 5 },
  { year: '2021', heatwaveDays: 16, peakTemp: 43.1, admissions: 420, wbgtEvents: 8 },
  { year: '2022', heatwaveDays: 22, peakTemp: 44.2, admissions: 680, wbgtEvents: 14 },
  { year: '2023', heatwaveDays: 25, peakTemp: 44.8, admissions: 810, wbgtEvents: 17 },
  { year: '2024', heatwaveDays: 29, peakTemp: 45.4, admissions: 950, wbgtEvents: 21 },
  { year: '2025', heatwaveDays: 32, peakTemp: 45.8, admissions: 1120, wbgtEvents: 24 },
  { year: '2026 (YTD)', heatwaveDays: 18, peakTemp: 44.5, admissions: 620, wbgtEvents: 15 },
];

const WBGT_SURGE_CORRELATION = [
  { wbgt: '26°C', relativeRisk: 1.0, baseline: 1.0, description: 'Normal comfort baseline' },
  { wbgt: '28°C', relativeRisk: 1.15, baseline: 1.0, description: 'Mild heat stress' },
  { wbgt: '30°C', relativeRisk: 1.45, baseline: 1.0, description: 'Sweat evaporation slowing' },
  { wbgt: '31°C', relativeRisk: 1.88, baseline: 1.0, description: 'High cardiac strain' },
  { wbgt: '32°C', relativeRisk: 2.65, baseline: 1.0, description: 'Severe danger threshold' },
  { wbgt: '33°C+', relativeRisk: 3.80, baseline: 1.0, description: 'Critical physiological threshold' },
];

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <TrendingUp className="w-5 h-5" />
          </span>
          <h1 className="text-xl font-bold text-white tracking-wide">
            CLIMATE ANALYTICS & PHYSIOLOGICAL TRENDS
          </h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Multi-year longitudinal analysis of extreme heat frequency, Wet-Bulb escalation, and healthcare surge correlation.
        </p>
      </div>

      {/* 1. Technical Data Flow Architecture */}
      <DataFlowVisualization />

      {/* 2. Multi-Year Longitudinal Heatwave Days vs Admissions */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              Longitudinal Heatwave Days vs Emergency Heat Admissions (2019 – 2026)
            </h3>
            <span className="text-xs text-slate-400">
              Correlating IMD severe heat duration with municipal healthcare facility surge.
            </span>
          </div>
          <span className="text-[11px] font-mono text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded border border-blue-800/40">
            Historical Registry
          </span>
        </div>

        <div className="h-[320px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={HISTORICAL_HEAT_TRENDS} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" stroke="#64748b" tick={{ fontSize: 12 }} label={{ value: 'Heatwave Days', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#64748b" tick={{ fontSize: 12 }} label={{ value: 'Emergency Cases', angle: 90, position: 'insideRight', fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Bar yAxisId="left" dataKey="heatwaveDays" name="Heatwave Days (>40°C)" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="admissions" name="Heat Admissions Surge" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
              <Line yAxisId="left" type="monotone" dataKey="wbgtEvents" name="Severe WBGT (>31°C)" stroke="#38bdf8" strokeWidth={2} strokeDasharray="4 4" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. WBGT (Wet-Bulb) Relative Risk Exponential Escalation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-400" />
              Wet-Bulb Globe Temperature (WBGT) Non-Linear Health Risk Curve
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Demonstrates why temperature alone fails: once WBGT exceeds 31°C, human evaporative cooling collapses.
            </p>
          </div>

          <div className="h-[250px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={WBGT_SURGE_CORRELATION}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="wbgt" stroke="#64748b" tick={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} label={{ value: 'Relative Risk Ratio (RR)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="relativeRisk" name="Relative Emergency Risk" fill="#ef444422" stroke="#ef4444" strokeWidth={3} />
                <Line type="monotone" dataKey="baseline" name="Baseline Normal (1.0)" stroke="#64748b" strokeDasharray="3 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-2">Physiological Tipping Points</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When ambient humidity is high, the body's primary cooling mechanism—perspiration evaporation—diminishes exponentially.
            </p>

            <div className="space-y-3 mt-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="font-bold text-amber-400 block">WBGT 28°C – 30°C: Moderate Caution</span>
                <p className="text-slate-300 mt-0.5">Hydration breaks required every 45 mins. Outdoor labor productivity drops ~25%.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-orange-500/30">
                <span className="font-bold text-orange-400 block">WBGT 31°C: High Danger</span>
                <p className="text-slate-300 mt-0.5">Heavy exertion dangerous. Relative hospital admission risk rises 1.88x above baseline.</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-rose-500/40">
                <span className="font-bold text-rose-400 block">WBGT 32°C+: Severe Physiological Crisis</span>
                <p className="text-slate-300 mt-0.5">Body core temp exceeds 38.5°C within 60 mins of direct sun exertion. Rapid heat stroke onset.</p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Source: Liljegren et al. / ICMR Guidelines</span>
            <span className="text-blue-400 font-mono">Calibrated Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
};
