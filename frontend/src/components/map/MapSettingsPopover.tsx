import React, { useState } from 'react';
import { Settings, AlertTriangle, Layers, RefreshCw } from 'lucide-react';
import type { MapProviderConfig, MapProviderId } from '../../config/mapConfig';

interface MapSettingsPopoverProps {
  currentConfig: MapProviderConfig;
  activeProviderId: MapProviderId;
  onSelectProvider: (id: MapProviderId) => void;
  onRetryProvider: () => void;
}

export const MapSettingsPopover: React.FC<MapSettingsPopoverProps> = ({
  currentConfig,
  activeProviderId,
  onSelectProvider,
  onRetryProvider,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-command-card/90 hover:bg-command-card text-xs font-mono text-slate-300 hover:text-white border border-command-border shadow-md transition"
        title="Open Map Basemap & Provider Settings"
      >
        <Settings className="w-3.5 h-3.5 text-cyan-400" />
        <span className="hidden sm:inline">Map Provider</span>
        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-cyan-300 font-semibold border border-cyan-500/30">
          {currentConfig.name}
        </span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop click to close */}
          <div className="fixed inset-0 z-[500]" onClick={() => setIsOpen(false)} />

          <div className="absolute right-0 bottom-full mb-2 w-80 bg-command-panel/95 backdrop-blur-xl border border-command-border rounded-xl shadow-2xl z-[510] p-4 space-y-3 font-sans text-xs text-slate-300 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-command-border pb-2.5">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>GIS Map Provider Settings</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white font-mono text-xs px-1.5 py-0.5 rounded hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Provider Status Pill */}
            <div className="p-2.5 rounded-lg bg-command-card border border-command-border space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">Status:</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold ${
                    currentConfig.status === 'CONFIGURED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : currentConfig.status === 'FALLBACK ACTIVE'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}
                >
                  {currentConfig.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">Current Basemap:</span>
                <span className="text-cyan-300 font-semibold">{currentConfig.name}</span>
              </div>

              {currentConfig.isFallback && (
                <div className="flex items-center gap-1.5 text-[10px] text-amber-400 pt-1 font-mono">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Fallback basemap active (key unconfigured or offline).</span>
                </div>
              )}
            </div>

            {/* Switch Provider Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                Select Basemap Layer:
              </label>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() => onSelectProvider('esri_satellite')}
                  className={`p-2 rounded-lg border text-left flex flex-col justify-between transition ${
                    activeProviderId === 'esri_satellite'
                      ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200 ring-1 ring-cyan-500'
                      : 'border-command-border bg-command-card hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span className="font-bold">Esri Satellite</span>
                  <span className="text-[9px] text-slate-400">High-Res Aerial</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectProvider('esri_dark')}
                  className={`p-2 rounded-lg border text-left flex flex-col justify-between transition ${
                    activeProviderId === 'esri_dark'
                      ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200 ring-1 ring-cyan-500'
                      : 'border-command-border bg-command-card hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span className="font-bold">Esri Dark Canvas</span>
                  <span className="text-[9px] text-slate-400">Clean Dark Base</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectProvider('osm_demo')}
                  className={`p-2 rounded-lg border text-left flex flex-col justify-between transition ${
                    activeProviderId === 'osm_demo'
                      ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200 ring-1 ring-cyan-500'
                      : 'border-command-border bg-command-card hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span className="font-bold">OpenStreetMap</span>
                  <span className="text-[9px] text-slate-400">Street Map</span>
                </button>

                <button
                  type="button"
                  onClick={() => onSelectProvider('maptiler')}
                  className={`p-2 rounded-lg border text-left flex flex-col justify-between transition ${
                    activeProviderId === 'maptiler'
                      ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200 ring-1 ring-cyan-500'
                      : 'border-command-border bg-command-card hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <span className="font-bold">MapTiler</span>
                  <span className="text-[9px] text-slate-400">Dark Matter (Keyed)</span>
                </button>
              </div>
            </div>

            {/* Geometry Notice */}
            <div className="text-[10px] text-slate-400 p-2 rounded bg-slate-900/80 border border-slate-800 space-y-1">
              <div className="text-amber-400 font-mono font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>SYNTHETIC DEMONSTRATION WARD BOUNDARIES</span>
              </div>
              <p className="leading-tight">
                Not official Greater Chennai Corporation geography. For interactive prototype visualization only.
              </p>
            </div>

            {/* Attribution & Actions */}
            <div className="pt-2 border-t border-command-border flex items-center justify-between text-[10px] font-mono text-slate-400">
              <button
                type="button"
                onClick={onRetryProvider}
                className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 py-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Probe Connectivity</span>
              </button>
              <span>{currentConfig.label}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
