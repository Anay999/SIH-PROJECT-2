import React from 'react';
import { Database, ShieldAlert, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export type ApprovedDataStatus =
  | 'Verified public source'
  | 'Connected forecast'
  | 'Cached observation'
  | 'Synthetic demonstration data'
  | 'Illustrative research estimate'
  | 'User-entered scenario'
  | 'Data unavailable'
  | 'Not clinically validated';

interface DataStatusProps {
  status: ApprovedDataStatus;
  scope?: string;
  timestamp?: string;
  className?: string;
}

export const DataStatus: React.FC<DataStatusProps> = ({
  status,
  scope,
  timestamp,
  className = '',
}) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'Verified public source':
        return 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30';
      case 'Connected forecast':
        return 'bg-blue-950/40 text-blue-300 border-blue-500/30';
      case 'Cached observation':
        return 'bg-slate-900 text-slate-300 border-slate-700';
      case 'Synthetic demonstration data':
        return 'bg-amber-950/40 text-amber-300 border-amber-500/30';
      case 'Illustrative research estimate':
        return 'bg-purple-950/40 text-purple-300 border-purple-500/30';
      case 'User-entered scenario':
        return 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30';
      case 'Data unavailable':
        return 'bg-slate-900 text-slate-400 border-slate-800';
      case 'Not clinically validated':
        return 'bg-amber-950/30 text-amber-400 border-amber-500/20';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-800';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'Verified public source':
        return <CheckCircle className="w-3 h-3 text-emerald-400" />;
      case 'Connected forecast':
        return <Database className="w-3 h-3 text-blue-400" />;
      case 'Synthetic demonstration data':
      case 'Not clinically validated':
        return <ShieldAlert className="w-3 h-3 text-amber-400" />;
      case 'Data unavailable':
        return <AlertCircle className="w-3 h-3 text-slate-400" />;
      default:
        return <Clock className="w-3 h-3 text-slate-400" />;
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border ${getBadgeStyle()} ${className}`}
      title={scope ? `${status} • Scope: ${scope}` : status}
    >
      {getIcon()}
      <span>{status}</span>
      {scope && <span className="opacity-70">• {scope}</span>}
      {timestamp && <span className="opacity-60 text-[9px]">({timestamp})</span>}
    </div>
  );
};
