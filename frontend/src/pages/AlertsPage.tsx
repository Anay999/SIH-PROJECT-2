import React, { useState } from 'react';
import {
  ClipboardList,
  Clock,
  UserCheck,
  Check,
  Play,
  RotateCcw,
  Activity,
  ChevronRight
} from 'lucide-react';
import { useWorkspace, type MunicipalAction } from '../context/WorkspaceContext';
import { DataStatus } from '../components/common/DataStatus';

export const AlertsPage: React.FC = () => {
  const {
    actionPlans,
    updateActionStatus,
    activityFeed,
    authSession
  } = useWorkspace();

  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const filteredActions = actionPlans.filter((act) => {
    if (selectedDept !== 'all' && act.department !== selectedDept) return false;
    if (selectedStatus !== 'all' && act.status !== selectedStatus) return false;
    return true;
  });

  const getStatusBadge = (status: MunicipalAction['status']) => {
    switch (status) {
      case 'Suggested':
        return 'bg-slate-700 text-slate-300 border-slate-600';
      case 'Under Review':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Approved':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'In Progress':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'Completed':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'Dismissed':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-400';
    }
  };

  const handleTransition = (actionId: string, newStatus: MunicipalAction['status'], note?: string) => {
    updateActionStatus(actionId, newStatus, note);
  };

  const pendingCount = actionPlans.filter(a => a.status === 'Suggested' || a.status === 'Under Review').length;
  const approvedCount = actionPlans.filter(a => a.status === 'Approved' || a.status === 'In Progress').length;
  const completedCount = actionPlans.filter(a => a.status === 'Completed').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">
      {/* Top Header & Workflow Explanation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-command-border pb-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-400" />
              Municipal Action Plan & Operational Workflow
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30 font-semibold">
              DECISION WORKSPACE
            </span>
          </div>
          <p className="text-xs text-command-muted mt-1 max-w-3xl leading-relaxed">
            Authorized municipal action management. Heat recommendations follow a formal accountability lifecycle from <strong>Suggested → Under Review → Approved → In Progress → Completed</strong>. Every decision is audited.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="px-3 py-1.5 rounded-lg bg-command-card border border-command-border flex items-center gap-2">
            <span className="text-command-muted">Pending Review:</span>
            <strong className="text-amber-400">{pendingCount}</strong>
            <span className="text-slate-600">|</span>
            <span className="text-command-muted">Active:</span>
            <strong className="text-blue-400">{approvedCount}</strong>
            <span className="text-slate-600">|</span>
            <span className="text-command-muted">Completed:</span>
            <strong className="text-emerald-400">{completedCount}</strong>
          </div>
          <DataStatus status="Synthetic demonstration data" />
        </div>
      </div>

      {/* Operational Lifecycle Pipeline Visual */}
      <div className="p-4 rounded-xl bg-[#0f172a] border border-[#1e293b] space-y-2">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span className="uppercase tracking-wider font-semibold text-slate-300">Action Lifecycle Stages</span>
          <span>Actor: {authSession?.role || 'DEMO MUNICIPAL OFFICER'}</span>
        </div>
        <div className="flex items-center justify-between gap-1 overflow-x-auto text-[11px] font-mono py-1">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141f36] border border-[#1e293b] text-slate-300 shrink-0">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>1. Suggested</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 shrink-0">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>2. Under Review</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 shrink-0">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>3. Approved</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 shrink-0">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>4. In Progress</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>5. Completed</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* Status Filter */}
          <div className="flex items-center bg-[#0f172a] rounded-xl border border-[#1e293b] p-1">
            {['all', 'Suggested', 'Under Review', 'Approved', 'In Progress', 'Completed'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 rounded-lg transition ${
                  selectedStatus === st
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st === 'all' ? 'All Status' : st}
              </button>
            ))}
          </div>

          {/* Department Filter */}
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-[#0f172a] border border-[#1e293b] rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Departments</option>
            <option value="Public Health">Public Health</option>
            <option value="Labor & Outdoor Work">Labor & Outdoor Work</option>
            <option value="Municipal Cooling">Municipal Cooling</option>
            <option value="Power & Water">Power & Water</option>
          </select>
        </div>

        <span className="text-[11px] font-mono text-slate-400">
          Showing {filteredActions.length} operational actions
        </span>
      </div>

      {/* Layout: Action Workflow Cards (Left 8 cols) + Audit Activity Stream (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Actions List (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {filteredActions.length === 0 ? (
            <div className="p-12 rounded-2xl bg-[#0f172a] border border-[#1e293b] text-center text-xs text-slate-500 font-mono">
              No actions match the selected filter criteria.
            </div>
          ) : (
            filteredActions.map((act) => (
              <div
                key={act.id}
                className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5 shadow-sm space-y-3.5 hover:border-slate-700 transition"
              >
                {/* Header & Badges */}
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#1e293b] pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-cyan-400 uppercase font-semibold">
                        {act.wardName}
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#141f36] text-slate-300 border border-[#1e293b]">
                        {act.department}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${getStatusBadge(
                          act.status
                        )}`}
                      >
                        {act.status}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white leading-snug">
                      {act.title}
                    </h3>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      act.priority === 'Critical'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                        : act.priority === 'Urgent'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    }`}
                  >
                    {act.priority} Priority
                  </span>
                </div>

                {/* Reason Explanation */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">
                    Reason / Trigger:
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed bg-[#141f36] p-3 rounded-xl border border-[#1e293b]">
                    {act.reason}
                  </p>
                </div>

                {/* Meta & Interactive Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-[10px] font-mono text-slate-400 flex items-center gap-2">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>Logged at {act.timestamp}</span>
                    {act.reviewedBy && (
                      <>
                        <span className="text-slate-600">·</span>
                        <span className="text-blue-400 flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          {act.reviewedBy}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Workflow Transitions */}
                  <div className="flex items-center gap-2">
                    {act.status === 'Suggested' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleTransition(act.id, 'Under Review')}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-medium transition"
                        >
                          Mark Under Review
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTransition(act.id, 'Approved')}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTransition(act.id, 'Dismissed')}
                          className="px-2.5 py-1.5 rounded-lg bg-[#141f36] hover:bg-rose-950/30 text-slate-400 hover:text-rose-400 text-xs transition"
                          title="Dismiss recommendation"
                        >
                          Dismiss
                        </button>
                      </>
                    )}

                    {act.status === 'Under Review' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleTransition(act.id, 'Approved')}
                          className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
                        >
                          Approve Action
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTransition(act.id, 'Dismissed')}
                          className="px-3 py-1.5 rounded-lg bg-[#141f36] hover:bg-rose-950/30 text-slate-400 hover:text-rose-400 text-xs transition"
                        >
                          Dismiss
                        </button>
                      </>
                    )}

                    {act.status === 'Approved' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleTransition(act.id, 'In Progress')}
                          className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition flex items-center gap-1.5"
                        >
                          <Play className="w-3 h-3" />
                          <span>Dispatch / In Progress</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTransition(act.id, 'Completed')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition"
                        >
                          Mark Completed
                        </button>
                      </>
                    )}

                    {act.status === 'In Progress' && (
                      <button
                        type="button"
                        onClick={() => handleTransition(act.id, 'Completed')}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm Completed</span>
                      </button>
                    )}

                    {(act.status === 'Completed' || act.status === 'Dismissed') && (
                      <button
                        type="button"
                        onClick={() => handleTransition(act.id, 'Suggested', 'Re-opened by officer')}
                        className="px-2.5 py-1 rounded-lg bg-[#141f36] hover:bg-[#1a2948] text-slate-400 hover:text-white text-[11px] font-mono transition flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Re-open</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Audit Log & Activity Stream (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#1e293b] pb-2.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                Operational Audit Trail
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Live state</span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Every status change across actions or simulations appends an immutable audit event recording actor, category, and timestamp.
            </p>

            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {activityFeed.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl bg-[#141f36] border border-[#1e293b] space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="text-blue-400 font-bold">{ev.category}</span>
                    <span>{ev.time} IST</span>
                  </div>
                  <p className="text-slate-200 text-[11px] leading-snug">
                    {ev.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
