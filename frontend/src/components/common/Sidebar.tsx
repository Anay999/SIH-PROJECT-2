import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Sun,
  Map,
  Calendar,
  Activity,
  Building2,
  Bell,
  FileText,
  BarChart3,
  Compass,
  Users,
  Lock,
  ChevronLeft,
  ChevronRight,
  Sliders
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const { actionPlans } = useWorkspace();
  const { user } = useAuth();

  const pendingActionsCount = actionPlans.filter(a => a.status === 'Suggested' || a.status === 'Under Review').length;
  const isAdmin = user?.role === 'ADMIN';

  // Primary operational features
  const PRIMARY_NAV_ITEMS = [
    { to: '/overview', label: 'Dashboard', icon: Home },
    { to: '/emergency-gis', label: 'Heat Operations', icon: Sun },
    { to: '/map', label: 'ThermoMap', icon: Map },
    { to: '/forecast', label: 'Forecast', icon: Calendar },
    { to: '/vulnerability', label: 'Ward Risk', icon: Activity },
    { to: '/cooling-centres', label: 'Facilities', icon: Building2 },
    { to: '/alerts', label: 'Alerts', icon: Bell, badge: '3', badgeColor: 'bg-red-600 text-white' },
    { to: '/heat-action-plan', label: 'Heat Action Plan', icon: FileText, badge: pendingActionsCount > 0 ? `${pendingActionsCount}` : undefined, badgeColor: 'bg-orange-600 text-white' },
    { to: '/analytics', label: 'Reports', icon: BarChart3 },
  ];

  // Advanced features (all kept fully operational and accessible)
  const ADVANCED_NAV_ITEMS = [
    { to: '/thermal-terrain', label: '3D Command Center', icon: Compass, badge: '3D Topo', badgeColor: 'bg-gradient-to-r from-orange-600 to-amber-600 text-white' },
    { to: '/users', label: 'Registered Users', icon: Users, badge: 'Citizens', badgeColor: 'bg-emerald-100 text-emerald-800' },
    { to: '/priority-areas', label: 'Priority Vulnerability', icon: Sliders },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin Console', icon: Lock, badge: 'Superuser', badgeColor: 'bg-purple-100 text-purple-800' }] : [])
  ];

  return (
    <aside
      className={`bg-white border-r border-[#ede7de] flex flex-col justify-between shrink-0 transition-all duration-300 z-30 ${
        isCollapsed ? 'w-20' : 'w-60'
      } h-full overflow-hidden`}
    >
      {/* 1. Main Navigation List */}
      <div className="p-3 flex-1 overflow-y-auto space-y-1 scrollbar-thin">
        
        {/* Collapse toggle button */}
        <div className="flex items-center justify-between px-2 pb-2 mb-1.5 border-b border-[#f5f3ef]">
          {!isCollapsed && (
            <span className="text-[10px] font-bold text-[#78716c] uppercase tracking-wider">
              MAIN OPERATIONS
            </span>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg hover:bg-[#faf9f6] text-[#78716c] hover:text-[#1c1917] transition ml-auto"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Primary Features */}
        <div className="space-y-1">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/overview'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group ${
                    isActive
                      ? 'bg-orange-50 text-orange-950 font-bold border border-orange-200/80 shadow-xs'
                      : 'text-[#475569] hover:text-[#0f172a] hover:bg-[#f8fafc]'
                  }`
                }
                title={isCollapsed ? item.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-orange-600' : 'text-[#64748b] group-hover:text-orange-600'
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate tracking-tight">{item.label}</span>
                      )}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                          isActive
                            ? 'bg-orange-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Section Divider for Advanced Modules */}
        {!isCollapsed && (
          <div className="pt-4 pb-1.5 px-2 border-t border-[#f1f5f9] mt-3">
            <span className="text-[10px] font-bold text-[#78716c] uppercase tracking-wider">
              ADVANCED MODULES
            </span>
          </div>
        )}

        {/* Advanced Features */}
        <div className="space-y-1">
          {ADVANCED_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group ${
                    isActive
                      ? 'bg-orange-50 text-orange-950 font-bold border border-orange-200/80 shadow-xs'
                      : 'text-[#475569] hover:text-[#0f172a] hover:bg-[#f8fafc]'
                  }`
                }
                title={isCollapsed ? item.label : undefined}
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-orange-600' : 'text-[#64748b] group-hover:text-orange-600'
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate tracking-tight">{item.label}</span>
                      )}
                    </div>
                    {!isCollapsed && item.badge && (
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold shrink-0 ${
                        isActive ? 'bg-orange-200/60 text-orange-900' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

      </div>

      {/* 2. Minimal Government System Status Area */}
      {!isCollapsed && (
        <div className="p-3 border-t border-[#ede7de] text-[11px] bg-[#faf9f6] space-y-1.5">
          <div className="flex items-center justify-between font-medium text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>National Grid</span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Online</span>
          </div>
          <div className="flex items-center justify-between font-medium text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Data Services</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-600">Operational</span>
          </div>
        </div>
      )}

    </aside>
  );
};
