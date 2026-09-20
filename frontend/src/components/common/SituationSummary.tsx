import React from 'react';
import { AlertTriangle, Thermometer, Droplets, Info } from 'lucide-react';
import { DataStatus } from './DataStatus';

interface SituationSummaryProps {
  headline?: string;
  explanation?: string;
  airTempC?: number;
  relativeHumidity?: number;
  heatStressCategory?: string;
  forecastWindow?: string;
  nighttimeMinC?: number;
}

export const SituationSummary: React.FC<SituationSummaryProps> = ({
  headline = 'High heat stress expected across selected Chennai demonstration areas',
  explanation = 'High air temperature combined with elevated humidity is increasing thermal strain. The risk is expected to remain elevated through the afternoon and may persist overnight in dense urban areas.',
  airTempC = 38.5,
  relativeHumidity = 68,
  heatStressCategory = 'High',
  forecastWindow = 'Today, 12:00 to 18:00 IST',
  nighttimeMinC = 29.2,
}) => {
  return (
    <div className="bg-gradient-to-r from-command-card via-slate-900 to-command-card border border-amber-500/30 rounded-2xl p-6 shadow-xl space-y-5">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-command-border/70 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                Current Operational Situation
              </span>
              <DataStatus status="Connected forecast" scope="Chennai Metro Demonstration" />
            </div>
            <span className="text-xs text-command-muted font-mono">{forecastWindow}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-command-muted">Planning Assessment:</span>
          <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
            {heatStressCategory} Heat Risk
          </span>
        </div>
      </div>

      {/* Headline & Plain-English Story */}
      <div className="space-y-2">
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
          {headline}
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed max-w-4xl">
          {explanation}
        </p>
      </div>

      {/* 4 Core Meaningful Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
        <div className="p-3 rounded-xl bg-command-panel border border-command-border space-y-1">
          <div className="flex items-center justify-between text-xs text-command-muted">
            <span>Air Temperature</span>
            <Thermometer className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {airTempC}°C
          </div>
          <p className="text-[10px] text-command-muted leading-tight">
            Peak afternoon ambient air reading
          </p>
        </div>

        <div className="p-3 rounded-xl bg-command-panel border border-command-border space-y-1">
          <div className="flex items-center justify-between text-xs text-command-muted">
            <span>Relative Humidity</span>
            <Droplets className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {relativeHumidity}%
          </div>
          <p className="text-[10px] text-command-muted leading-tight">
            Elevated coastal moisture impairs cooling
          </p>
        </div>

        <div className="p-3 rounded-xl bg-command-panel border border-command-border space-y-1">
          <div className="flex items-center justify-between text-xs text-command-muted">
            <span>Night Minimum Temp</span>
            <Thermometer className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {nighttimeMinC}°C
          </div>
          <p className="text-[10px] text-command-muted leading-tight">
            Remains &gt; 28°C; reduces recovery
          </p>
        </div>

        <div className="p-3 rounded-xl bg-command-panel border border-command-border space-y-1">
          <div className="flex items-center justify-between text-xs text-command-muted">
            <span>Operational Category</span>
            <Info className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 font-mono">
            {heatStressCategory}
          </div>
          <p className="text-[10px] text-command-muted leading-tight">
            Target outdoor labor & vulnerable wards
          </p>
        </div>
      </div>
    </div>
  );
};
