import React, { useState } from 'react';
import {
  Clock,
  FileText,
  History,
  Check,
  Edit3
} from 'lucide-react';
import { DataStatus, type ApprovedDataStatus } from './DataStatus';

export type ActionReviewStatus =
  | 'Suggested'
  | 'Pending review'
  | 'Approved'
  | 'Acknowledged'
  | 'In progress'
  | 'Completed'
  | 'Dismissed';

export interface ActionCardProps {
  id: string;
  title: string;
  reason: string;
  targetArea: string;
  targetPopulation: string;
  responsibleDepartment: string;
  evidenceUsed: string;
  dataStatus?: ApprovedDataStatus;
  priority: 'Immediate' | 'High' | 'Normal';
  initialStatus?: ActionReviewStatus;
  createdTimestamp?: string;
  onStatusChange?: (id: string, newStatus: ActionReviewStatus, note?: string) => void;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  id,
  title,
  reason,
  targetArea,
  targetPopulation,
  responsibleDepartment,
  evidenceUsed,
  dataStatus = 'Synthetic demonstration data',
  priority,
  initialStatus = 'Suggested',
  createdTimestamp = 'Today, 08:30 IST',
  onStatusChange,
}) => {
  const [status, setStatus] = useState<ActionReviewStatus>(initialStatus);
  const [auditNotes, setAuditNotes] = useState<string[]>([]);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [customNote, setCustomNote] = useState('');

  const handleUpdateStatus = (newStatus: ActionReviewStatus, note?: string) => {
    setStatus(newStatus);
    const log = `Marked '${newStatus}' at ${new Date().toLocaleTimeString('en-IN', { hour12: false })} IST${note ? `: ${note}` : ''}`;
    setAuditNotes(prev => [log, ...prev]);
    if (onStatusChange) onStatusChange(id, newStatus, note);
  };

  const getPriorityStyle = () => {
    switch (priority) {
      case 'Immediate':
        return 'bg-red-950/40 text-red-300 border-red-500/40';
      case 'High':
        return 'bg-amber-950/40 text-amber-300 border-amber-500/40';
      default:
        return 'bg-blue-950/40 text-blue-300 border-blue-500/40';
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'Approved':
      case 'Completed':
        return 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40';
      case 'Acknowledged':
      case 'In progress':
        return 'bg-cyan-950/50 text-cyan-300 border-cyan-500/40';
      case 'Dismissed':
        return 'bg-slate-900 text-slate-400 border-slate-700';
      default:
        return 'bg-amber-950/40 text-amber-300 border-amber-500/30';
    }
  };

  return (
    <div className="p-4 rounded-xl bg-command-card border border-command-border hover:border-slate-700 transition space-y-3.5 shadow-sm">
      {/* Top Metadata Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-command-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getPriorityStyle()}`}>
            {priority} Priority
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getStatusBadge()}`}>
            Status: {status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DataStatus status={dataStatus} />
          <span className="text-[10px] text-command-muted font-mono">{createdTimestamp}</span>
        </div>
      </div>

      {/* Action Title & Rationale */}
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-amber-400 font-medium">Why this is recommended: </strong>
          {reason}
        </p>
      </div>

      {/* Target Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] bg-command-panel/60 p-2.5 rounded-lg border border-command-border/40 font-mono">
        <div>
          <span className="text-command-muted block text-[10px] uppercase">Target Area:</span>
          <span className="text-slate-200 font-semibold">{targetArea}</span>
        </div>
        <div>
          <span className="text-command-muted block text-[10px] uppercase">Target Population:</span>
          <span className="text-slate-200 font-semibold">{targetPopulation}</span>
        </div>
        <div>
          <span className="text-command-muted block text-[10px] uppercase">Responsible Dept:</span>
          <span className="text-cyan-300 font-semibold">{responsibleDepartment}</span>
        </div>
      </div>

      {/* Evidence Provenance */}
      <div className="flex items-start gap-1.5 text-[10px] text-command-muted">
        <FileText className="w-3.5 h-3.5 shrink-0 text-slate-500 mt-0.5" />
        <span>
          <strong>Evidence Basis:</strong> {evidenceUsed} (Demonstration model calculation; officer discretion required).
        </span>
      </div>

      {/* Officer Workflow Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-command-border/60">
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          {status !== 'Approved' && status !== 'Completed' && (
            <button
              type="button"
              onClick={() => handleUpdateStatus('Approved')}
              className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 flex items-center gap-1 transition"
            >
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Accept / Approve</span>
            </button>
          )}

          {status !== 'Acknowledged' && (
            <button
              type="button"
              onClick={() => handleUpdateStatus('Acknowledged')}
              className="px-2.5 py-1 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 flex items-center gap-1 transition"
            >
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>Acknowledge</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsEditingNote(!isEditingNote)}
            className="px-2.5 py-1 rounded-lg bg-command-card hover:bg-slate-800 text-slate-300 border border-command-border flex items-center gap-1 transition"
          >
            <Edit3 className="w-3 h-3 text-slate-400" />
            <span>Add Note</span>
          </button>

          {status !== 'Dismissed' && (
            <button
              type="button"
              onClick={() => handleUpdateStatus('Dismissed')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-300 border border-command-border transition"
            >
              Dismiss
            </button>
          )}
        </div>

        {/* Audit Trail Toggle Info */}
        {auditNotes.length > 0 && (
          <div className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
            <History className="w-3 h-3" />
            <span>{auditNotes[0]}</span>
          </div>
        )}
      </div>

      {/* Note Edit Sub-panel */}
      {isEditingNote && (
        <div className="pt-2 flex items-center gap-2">
          <input
            type="text"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="Add operational notes or department assignment..."
            className="flex-1 bg-command-panel border border-command-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
          <button
            type="button"
            onClick={() => {
              if (customNote.trim()) {
                handleUpdateStatus(status, customNote.trim());
                setCustomNote('');
                setIsEditingNote(false);
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-semibold"
          >
            Save Note
          </button>
        </div>
      )}
    </div>
  );
};
