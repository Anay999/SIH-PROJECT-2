import React, { useState } from 'react';
import { FileCode2, BookOpen, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import { DataStatus } from '../components/common/DataStatus';

export const MethodologyPage: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>('indicators');

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-command-border pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <FileCode2 className="w-5 h-5 text-purple-400" />
              Evidence & methodology
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 font-semibold">
              METHODS, SOURCES & LIMITATIONS
            </span>
          </div>
          <p className="text-xs text-command-muted mt-1 max-w-3xl leading-relaxed">
            Transparent calculation methods, meteorological input requirements, standard formulas, and explicit system boundaries. Plain-English definitions are provided before mathematical formulations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <DataStatus status="Illustrative research estimate" />
        </div>
      </div>

      {/* 1. What the Platform Measures (Plain English Overview) */}
      <div className="p-5 rounded-2xl bg-command-card border border-command-border space-y-3">
        <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-cyan-400" />
          1. What HEATSHIELD AI Measures (Plain English)
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          Air temperature alone does not tell the full story of human heat danger. When humidity is high, the human body cannot cool itself effectively because sweat does not evaporate into moisture-laden air. When nighttime temperatures remain hot, biological recovery is disrupted.
        </p>
        <p className="text-xs text-slate-300 leading-relaxed">
          HEATSHIELD AI combines <strong>ambient weather forecasts</strong> with <strong>human thermal stress indices</strong> (how heat physically stresses the body during work) and <strong>demographic exposure</strong> (outdoor labor and vulnerable older residents) to help municipal officers prioritize water distribution, shaded rest stops, and cooling shelter operations.
        </p>
      </div>

      {/* 2. Primary & Supporting Thermal Indicators */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
          2. Thermal Indicators Explained
        </h2>

        {/* Heat Index */}
        <div className="p-5 rounded-xl bg-command-card border border-command-border space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-command-border/60 pb-2">
            <div>
              <h3 className="text-sm font-bold text-white">Heat Index (HI)</h3>
              <span className="text-xs text-command-muted">Apparent temperature perceived by human skin</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 text-[10px] font-mono border border-blue-500/30">
              Reference-Based · Standard Implementation
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            <strong>Plain Meaning:</strong> Estimates how hot weather actually feels when ambient temperature combines with relative humidity. Used widely for public weather advisories.
          </p>
          <div className="text-[11px] font-mono text-command-muted space-y-1">
            <div><strong>Inputs:</strong> Air Temperature (°C), Relative Humidity (%)</div>
            <div><strong>Standard Reference:</strong> Rothfusz (1990) National Weather Service Regression Equation.</div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection('hi_math')}
            className="text-xs text-cyan-300 hover:text-white flex items-center gap-1 font-mono transition"
          >
            <span>{expandedSection === 'hi_math' ? 'Hide Mathematical Equation' : 'Expand Mathematical Equation'}</span>
            {expandedSection === 'hi_math' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {expandedSection === 'hi_math' && (
            <div className="p-3 bg-command-panel rounded-lg font-mono text-[11px] text-cyan-200 overflow-x-auto border border-command-border mt-2">
              HI = -42.379 + 2.04901523*T + 10.14333127*R - 0.22475541*T*R - 0.00683783*T² - 0.05481717*R² + 0.00122874*T²*R + 0.00085282*T*R² - 0.00000199*T²*R²
            </div>
          )}
        </div>

        {/* WBGT */}
        <div className="p-5 rounded-xl bg-command-card border border-command-border space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-command-border/60 pb-2">
            <div>
              <h3 className="text-sm font-bold text-white">Wet Bulb Globe Temperature (WBGT)</h3>
              <span className="text-xs text-command-muted">Exertional occupational heat strain metric</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px] font-mono border border-amber-500/30">
              Approximate Research Implementation
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            <strong>Plain Meaning:</strong> The international gold standard for assessing heat strain on physical workers and outdoor laborers in direct sun. Factors in evaporative cooling limits and solar radiation.
          </p>
          <div className="text-[11px] font-mono text-command-muted space-y-1">
            <div><strong>Inputs:</strong> Air Temp, Humidity, Wind Speed, Solar Radiation (Global horizontal irradiance)</div>
            <div><strong>Standard Reference:</strong> Liljegren et al. (2008) approximation via Stull (2011) psychrometric wet-bulb formulation.</div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection('wbgt_math')}
            className="text-xs text-cyan-300 hover:text-white flex items-center gap-1 font-mono transition"
          >
            <span>{expandedSection === 'wbgt_math' ? 'Hide Formulation' : 'Expand Formulation'}</span>
            {expandedSection === 'wbgt_math' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {expandedSection === 'wbgt_math' && (
            <div className="p-3 bg-command-panel rounded-lg font-mono text-[11px] text-amber-200 overflow-x-auto border border-command-border mt-2">
              WBGT_outdoor = 0.7*Tw (natural wet-bulb) + 0.2*Tg (black globe radiative temp) + 0.1*Ta (ambient air)
            </div>
          )}
        </div>

        {/* Human Thermal Stress Index (HTSI) */}
        <div className="p-5 rounded-xl bg-command-card border border-command-border space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-command-border/60 pb-2">
            <div>
              <h3 className="text-sm font-bold text-white">Human Thermal Stress Index (HTSI)</h3>
              <span className="text-xs text-command-muted">Municipal composite prioritization indicator (0 - 100)</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 text-[10px] font-mono border border-purple-500/30">
              Demonstration Planning Formula
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            <strong>Plain Meaning:</strong> A normalized municipal scoring metric designed to rank demonstration areas by total operational burden. Balances immediate physical thermal strain (45%), nocturnal heat persistence (20%), outdoor population vulnerability (20%), and built environment density (15%).
          </p>
          <div className="text-[11px] font-mono text-command-muted">
            <strong>Weights Note:</strong> Weights represent demonstration baseline assumptions for civic evaluation. They are transparent and can be calibrated by municipal planners for local urban typologies.
          </div>
        </div>
      </div>

      {/* 3. System Transparency & Limitations Table */}
      <div className="p-5 rounded-2xl bg-command-card border border-command-border space-y-4">
        <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          3. Explicit System Boundaries & Known Limitations
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-command-panel border border-command-border space-y-1.5">
            <strong className="text-amber-400 font-mono text-[11px] uppercase block">Not a Clinical Diagnosis</strong>
            <p className="text-slate-300 leading-relaxed">
              Health-service pressure indicators are planning proxies based on population exposure. They must never be treated as clinical forecasts, individual health predictions, or certified medical advice.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-command-panel border border-command-border space-y-1.5">
            <strong className="text-amber-400 font-mono text-[11px] uppercase block">Synthetic Demonstration Geography</strong>
            <p className="text-slate-300 leading-relaxed">
              Ward polygons in this prototype are synthetic multi-vertex boundaries created for spatial UI demonstration. They do not replace official survey maps from the Greater Chennai Corporation.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-command-panel border border-command-border space-y-1.5">
            <strong className="text-amber-400 font-mono text-[11px] uppercase block">Local Sensor Network Unconnected</strong>
            <p className="text-slate-300 leading-relaxed">
              Weather values are derived from numerical weather model grids. Hyper-local street microclimates may vary depending on tree canopy shade and building geometry.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-command-panel border border-command-border space-y-1.5">
            <strong className="text-amber-400 font-mono text-[11px] uppercase block">Operational Human Review Required</strong>
            <p className="text-slate-300 leading-relaxed">
              Model action recommendations do not automatically trigger government dispatch. All municipal actions require authorized human officer review and departmental coordination.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
