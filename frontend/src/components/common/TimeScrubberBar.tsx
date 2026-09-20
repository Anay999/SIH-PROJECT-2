import React from 'react';
import { Clock, History, Calendar } from 'lucide-react';
import { useWorkspace, type TimeScrubberStep } from '../../context/WorkspaceContext';

export const TimeScrubberBar: React.FC = () => {
  const { timeScrubberStep, setTimeScrubberStep, temporalDelta, addActivityEvent } = useWorkspace();

  const handleStepChange = (step: TimeScrubberStep) => {
    setTimeScrubberStep(step);
    const label = step === 'PAST' ? 'Morning baseline (-6h)' : step === 'FORECAST' ? 'Next 24h outlook (+24h)' : 'Current operational observation';
    addActivityEvent('FORECAST', `Time trajectory adjusted to ${label}`);
  };

  return (
    <div className="flex items-center gap-2 bg-slate-100/90 border border-slate-200 p-1 rounded-xl text-xs font-mono">
      <div className="flex items-center gap-1.5 px-2 text-slate-600 font-semibold text-[11px] uppercase tracking-wider hidden sm:flex">
        <Clock className="w-3.5 h-3.5 text-blue-600" />
        <span>Time View:</span>
      </div>

      <div className="grid grid-cols-3 gap-1 flex-1 sm:flex-initial">
        {/* PAST */}
        <button
          type="button"
          onClick={() => handleStepChange('PAST')}
          className={`flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg transition text-[11px] ${
            timeScrubberStep === 'PAST'
              ? 'bg-blue-600 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
          }`}
          title="Morning baseline (-6 hours)"
        >
          <History className="w-3 h-3 shrink-0" />
          <span>PAST (-6h)</span>
        </button>

        {/* NOW */}
        <button
          type="button"
          onClick={() => handleStepChange('NOW')}
          className={`flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg transition text-[11px] ${
            timeScrubberStep === 'NOW'
              ? 'bg-emerald-600 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
          }`}
          title="Current observation"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse shrink-0" />
          <span>NOW</span>
        </button>

        {/* FORECAST */}
        <button
          type="button"
          onClick={() => handleStepChange('FORECAST')}
          className={`flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg transition text-[11px] ${
            timeScrubberStep === 'FORECAST'
              ? 'bg-amber-600 text-white font-bold shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
          }`}
          title="Next 24h peak afternoon (+24 hours)"
        >
          <Calendar className="w-3 h-3 shrink-0" />
          <span>FORECAST (+24h)</span>
        </button>
      </div>

      <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-300 text-[11px] text-slate-600">
        <span className="text-slate-900 font-bold">{temporalDelta.temp.toFixed(1)}°C</span>
        <span>·</span>
        <span>{temporalDelta.humidity}% RH</span>
      </div>
    </div>
  );
};
