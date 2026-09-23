import React, { useState } from 'react';
import {
  ClipboardList,
  Clock,
  UserCheck,
  Check,
  Play,
  RotateCcw,
  Activity,
  ChevronRight,
  Snowflake,
  HardHat,
  Megaphone,
  Thermometer,
  Droplets,
  Users
} from 'lucide-react';
import { useWorkspace, type MunicipalAction } from '../context/WorkspaceContext';
import { DataStatus } from '../components/common/DataStatus';

export const AlertsPage: React.FC = () => {
  const {
    actionPlans,
    updateActionStatus,
    activityFeed,
    authSession,
    cityProfile
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
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-orange-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Municipal Heat Action Plan & Departmental Workflow
            </h1>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-300 font-bold tracking-wide">
              HAP DIRECTIVES & TRIAGE
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Authorized municipal action management. Heat recommendations follow a formal accountability lifecycle from <strong>Suggested → Under Review → Approved → In Progress → Completed</strong>. Every departmental decision is audited.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 shadow-xs flex items-center gap-2">
            <span className="text-slate-500">Pending Review:</span>
            <strong className="text-amber-700 font-bold">{pendingCount}</strong>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">Active:</span>
            <strong className="text-blue-700 font-bold">{approvedCount}</strong>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">Completed:</span>
            <strong className="text-emerald-700 font-bold">{completedCount}</strong>
          </div>
          <DataStatus status="Synthetic demonstration data" />
        </div>
      </div>

      {/* Operational Lifecycle Pipeline Visual - Light Theme (Screenshot 5 Reference) */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span className="uppercase tracking-wider font-bold text-slate-800">Action Lifecycle Stages</span>
          <span>Actor: {authSession?.role || 'DEMO MUNICIPAL OFFICER'}</span>
        </div>
        <div className="flex items-center justify-between gap-2 overflow-x-auto text-xs font-semibold py-1">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 shrink-0">
            <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-[10px] font-bold flex items-center justify-center">1</span>
            <span>1. Suggested</span>
            <span className="px-1.5 py-0.2 rounded-full bg-orange-200/80 text-orange-900 text-[10px] font-bold">5</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 shrink-0">
            <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center">2</span>
            <span>2. Under Review</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-200/80 text-amber-900 text-[10px] font-bold">3</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 shrink-0">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">3</span>
            <span>3. Approved</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-200/80 text-emerald-900 text-[10px] font-bold">2</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 shrink-0">
            <span className="w-5 h-5 rounded-full bg-orange-600 text-white text-[10px] font-bold flex items-center justify-center">4</span>
            <span>4. In Progress</span>
            <span className="px-1.5 py-0.2 rounded-full bg-orange-200/80 text-orange-900 text-[10px] font-bold">4</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 shrink-0">
            <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] font-bold flex items-center justify-center">5</span>
            <span>5. Completed</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-200/80 text-amber-900 text-[10px] font-bold">12</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar - Clean Light Theme */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* Status Filter */}
          <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1 shadow-xs">
            {['all', 'Suggested', 'Under Review', 'Approved', 'In Progress', 'Completed'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-lg transition font-bold ${
                  selectedStatus === st
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:border-orange-500 shadow-xs"
          >
            <option value="all">All Departments</option>
            <option value="Public Health">Public Health</option>
            <option value="Labor & Outdoor Work">Labor & Outdoor Work</option>
            <option value="Municipal Cooling">Municipal Cooling</option>
            <option value="Power & Water">Power & Water</option>
          </select>
        </div>

        <span className="text-[11px] font-mono text-slate-500 font-medium">
          Showing {filteredActions.length} operational actions
        </span>
      </div>

      {/* Layout: Action Workflow Cards (Left 8 cols) + Audit Activity Stream & Key Metrics (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Actions List (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {filteredActions.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-500 font-mono shadow-xs">
              No actions match the selected filter criteria.
            </div>
          ) : (
            filteredActions.map((act) => (
              <div
                key={act.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3.5 hover:border-orange-300 transition group"
              >
                {/* Header & Badges */}
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                      {act.department === 'Municipal Cooling' ? (
                        <Snowflake className="w-5 h-5 text-orange-600" />
                      ) : act.department === 'Labor & Outdoor Work' ? (
                        <HardHat className="w-5 h-5 text-orange-600" />
                      ) : (
                        <Megaphone className="w-5 h-5 text-orange-600" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-bold text-orange-700 uppercase">
                          {act.wardName}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-semibold">
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
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">
                        {act.title}
                      </h3>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2.5 py-1 rounded-full font-bold ${
                      act.priority === 'Critical'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : act.priority === 'Urgent'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-orange-50 text-orange-700 border border-orange-200'
                    }`}
                  >
                    {act.priority} Priority
                  </span>
                </div>

                {/* Reason Explanation */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-500 font-semibold block">
                    Reason / Trigger:
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 font-sans">
                    {act.reason}
                  </p>
                </div>

                {/* Meta & Interactive Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Logged at {act.timestamp}</span>
                    {act.reviewedBy && (
                      <>
                        <span className="text-slate-300">·</span>
                        <span className="text-orange-700 flex items-center gap-1 font-semibold">
                          <UserCheck className="w-3.5 h-3.5" />
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
                          className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition shadow-2xs"
                        >
                          Mark Under Review
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTransition(act.id, 'Approved')}
                          className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-xs"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTransition(act.id, 'Dismissed')}
                          className="px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs transition"
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
                          className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-xs"
                        >
                          Approve Action
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTransition(act.id, 'Dismissed')}
                          className="px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs transition"
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
                          className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                        >
                          <Play className="w-3 h-3" />
                          <span>Dispatch / In Progress</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTransition(act.id, 'Completed')}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                        >
                          Mark Completed
                        </button>
                      </>
                    )}

                    {act.status === 'In Progress' && (
                      <button
                        type="button"
                        onClick={() => handleTransition(act.id, 'Completed')}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm Completed</span>
                      </button>
                    )}

                    {(act.status === 'Completed' || act.status === 'Dismissed') && (
                      <button
                        type="button"
                        onClick={() => handleTransition(act.id, 'Suggested', 'Re-opened by officer')}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono transition flex items-center gap-1 shadow-2xs"
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
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-orange-600" />
                Operational Audit Trail
              </h3>
              <span className="text-[10px] text-emerald-600 font-mono font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live state
              </span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
              Every status change across actions or simulations appends an immutable audit event recording actor, category, and timestamp.
            </p>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
              {activityFeed.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span className="text-orange-700 font-bold">{ev.category}</span>
                    <span>{ev.time} IST</span>
                  </div>
                  <p className="text-slate-800 text-[11px] leading-snug font-sans">
                    {ev.message}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Key Metrics (City) Card - Matching Screenshot 5 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-orange-600" />
                Key Metrics ({cityProfile?.name || 'Chennai'})
              </h3>
              <span className="text-[10px] font-mono text-orange-600 font-bold hover:underline cursor-pointer">
                View All &gt;
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-orange-50/50 border border-orange-100 space-y-1">
                <div className="flex items-center justify-between">
                  <Thermometer className="w-4 h-4 text-orange-600" />
                  <span className="text-[10px] font-mono font-bold text-rose-600">+2.1°C</span>
                </div>
                <div className="text-base font-black text-slate-900">38.5°C</div>
                <div className="text-[10px] text-slate-500">Avg. Temperature</div>
              </div>

              <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-100 space-y-1">
                <div className="flex items-center justify-between">
                  <Activity className="w-4 h-4 text-rose-600" />
                  <span className="text-[9px] font-mono font-bold px-1 rounded bg-rose-100 text-rose-700">High</span>
                </div>
                <div className="text-base font-black text-slate-900">0.72</div>
                <div className="text-[10px] text-slate-500">Avg. HTSI</div>
              </div>

              <div className="p-3 rounded-xl bg-sky-50/50 border border-sky-100 space-y-1">
                <div className="flex items-center justify-between">
                  <Droplets className="w-4 h-4 text-sky-600" />
                  <span className="text-[9px] font-mono font-bold px-1 rounded bg-emerald-100 text-emerald-700">Normal</span>
                </div>
                <div className="text-base font-black text-slate-900">68%</div>
                <div className="text-[10px] text-slate-500">Avg. Humidity</div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100 space-y-1">
                <div className="flex items-center justify-between">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span className="text-[10px] font-mono font-bold text-emerald-600">+3</span>
                </div>
                <div className="text-base font-black text-slate-900">12</div>
                <div className="text-[10px] text-slate-500">Active Actions</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
