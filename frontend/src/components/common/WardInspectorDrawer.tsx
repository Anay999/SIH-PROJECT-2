import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  ShieldAlert,
  Users,
  Briefcase,
  Snowflake,
  Hospital,
  Droplets,
  ArrowRight,
  MapPin,
  Flame
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

export const WardInspectorDrawer: React.FC = () => {
  const {
    isWardInspectorOpen,
    closeWardInspector,
    selectedWardData,
    selectedWardId
  } = useWorkspace();
  const navigate = useNavigate();

  if (!isWardInspectorOpen) return null;

  // Fallback / mock data if full ward object is not yet populated
  const wardName = selectedWardData?.name || (selectedWardId === 'ward_04_tondiarpet' ? 'Tondiarpet' : 'Royapuram');
  const wardNumber = selectedWardData?.ward_number || (selectedWardId === 'ward_04_tondiarpet' ? '04' : '05');
  const zoneName = selectedWardData?.zone_name || 'North Chennai Zone';
  const airTemp = selectedWardData?.air_temp_c || 38.8;
  const wbgt = selectedWardData?.wbgt_c || 32.8;
  const htsi = selectedWardData?.htsi_score || 78;
  const outdoorWorkers = selectedWardData?.outdoor_workers || 34200;
  const elderly = selectedWardData?.elderly_population || 16800;

  return (
    <>
      {/* Semi-transparent backdrop */}
      <div
        onClick={closeWardInspector}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 transition-opacity"
      />

      {/* Drawer Panel */}
      <aside className="fixed top-0 right-0 h-full w-full max-w-md bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-cyan-700 uppercase font-semibold">
                Area Inspector
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-300 font-bold">
                Ward {wardNumber}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-cyan-600" />
              {wardName}
            </h2>
            <p className="text-xs text-slate-500 font-sans">{zoneName}</p>
          </div>

          <button
            type="button"
            onClick={closeWardInspector}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition"
            title="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 font-sans text-xs text-slate-700">
          {/* Current Condition */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Status</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                High heat exposure
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 font-mono">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Air Temp</span>
                <span className="text-sm font-bold text-slate-900">{airTemp.toFixed(1)}°C</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">WBGT</span>
                <span className="text-sm font-bold text-amber-600">{wbgt.toFixed(1)}°C</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Heat Stress</span>
                <span className="text-sm font-bold text-rose-600">{htsi}/100</span>
              </div>
            </div>
          </div>

          {/* Why This Area Matters */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              Why this area matters
            </h3>
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-start gap-2.5">
                <span className="text-xs font-bold text-amber-600 font-mono">1.</span>
                <p className="leading-relaxed text-slate-600">
                  <strong className="text-slate-900">High afternoon thermal stress:</strong> Wet-bulb globe temperature consistently exceeds 32°C during peak hours (11:30–15:30).
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-xs font-bold text-amber-600 font-mono">2.</span>
                <p className="leading-relaxed text-slate-600">
                  <strong className="text-slate-900">Elevated nighttime temperature:</strong> Overnight minimums remain near 29.5°C, providing insufficient nocturnal physiological recovery.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-xs font-bold text-amber-600 font-mono">3.</span>
                <p className="leading-relaxed text-slate-600">
                  <strong className="text-slate-900">Limited cooling access:</strong> Dense impervious built-up surface with minimal vegetative canopy (NDVI 0.08) creates microclimatic heat trapping.
                </p>
              </div>
            </div>
          </div>

          {/* Exposure & Demographics */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-600" />
              Population exposure
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1 text-slate-500 text-[10px] mb-1">
                  <Briefcase className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="truncate">Outdoor labor</span>
                </div>
                <div className="text-sm font-bold text-slate-900 font-mono">{outdoorWorkers.toLocaleString()}</div>
                <span className="text-[9px] text-slate-400 font-mono block">Port workers</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1 text-slate-500 text-[10px] mb-1">
                  <Users className="w-3 h-3 text-blue-600 shrink-0" />
                  <span className="truncate">Older adults</span>
                </div>
                <div className="text-sm font-bold text-slate-900 font-mono">{elderly.toLocaleString()}</div>
                <span className="text-[9px] text-slate-400 font-mono block">Age 65+</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1 text-slate-500 text-[10px] mb-1">
                  <Flame className="w-3 h-3 text-rose-600 shrink-0" />
                  <span className="truncate">High-density</span>
                </div>
                <div className="text-sm font-bold text-rose-600 font-mono">82%</div>
                <span className="text-[9px] text-slate-400 font-mono block">Built-up fraction</span>
              </div>
            </div>
          </div>

          {/* Available Resources Nearby */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Snowflake className="w-3.5 h-3.5 text-emerald-600" />
              Available resources nearby
            </h3>
            <div className="space-y-1.5">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Snowflake className="w-4 h-4 text-cyan-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900 text-xs">Cooling Centers</div>
                    <div className="text-[11px] text-slate-500">2 facilities active within 1.5 km</div>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-emerald-700 font-bold">142/300 occupied</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hospital className="w-4 h-4 text-red-500 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900 text-xs">Health Facilities</div>
                    <div className="text-[11px] text-slate-500">Stanley Medical College Hospital</div>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-amber-700 font-bold">Elevated intake</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900 text-xs">Water Access</div>
                    <div className="text-[11px] text-slate-500">GCC municipal tankers active</div>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-blue-700">Operational</span>
              </div>
            </div>
          </div>

          {/* Recommended Review */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
            <span className="text-[10px] font-mono uppercase text-amber-700 font-bold block">
              Recommended Municipal Review
            </span>
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              &quot;Review cooling-center operating hours and water stock.&quot;
            </p>
          </div>
        </div>

        {/* Footer Actions — Exact Prompt 7 Requirement */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                closeWardInspector();
                navigate('/priority-areas');
              }}
              className="py-2.5 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-medium text-xs transition text-center shadow-xs"
            >
              Open Priority Analysis
            </button>
            <button
              type="button"
              onClick={() => {
                closeWardInspector();
                navigate('/cooling-resources');
              }}
              className="py-2.5 px-3 rounded-lg bg-white hover:bg-slate-100 text-cyan-800 border border-cyan-300 font-medium text-xs transition text-center shadow-xs"
            >
              Show Nearby Resources
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              closeWardInspector();
              navigate('/action-plan');
            }}
            className="w-full py-2.5 px-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs transition flex items-center justify-center gap-2 shadow-xs"
          >
            <span>Open Action Plan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    </>
  );
};
