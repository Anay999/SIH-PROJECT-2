import React from 'react';
import { MapPin } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { TimeScrubberBar } from './TimeScrubberBar';

export const GlobalContextBar: React.FC = () => {
  const { cityProfile, timeScrubberStep, temporalDelta } = useWorkspace();

  return (
    <div className="bg-slate-50 border-b border-slate-200 px-5 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
      <div className="flex flex-wrap items-center gap-3">
        {/* City & Date */}
        <div className="flex items-center gap-1.5 font-medium text-slate-800">
          <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span className="font-bold">{cityProfile?.name?.toUpperCase() || 'CHENNAI'}</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-600 font-normal">Active Operations</span>
          <span className="text-slate-400">·</span>
          <span className="font-mono text-slate-500 text-[11px]">{cityProfile?.region || 'Tamil Nadu'}</span>
        </div>

        {/* Time scrubber status tag if shifted */}
        {timeScrubberStep !== 'NOW' && (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-100 text-amber-800 border border-amber-300 font-semibold">
            {temporalDelta.description}
          </span>
        )}
      </div>

      {/* Center/Right: Interactive Time Scrubber Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <TimeScrubberBar />
      </div>
    </div>
  );
};
