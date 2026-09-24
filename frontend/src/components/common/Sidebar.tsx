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
  Sliders,
  ChevronDown
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const { actionPlans } = useWorkspace();
  const { user } = useAuth();

  const pendingActionsCount = actionPlans.filter(a => a.status === 'Suggested' || a.status === 'Under Review').length;
  const isAdmin = user?.role === 'ADMIN';

  // Core items matching Image 1 exactly
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

  // Secondary/Advanced tools to ensure ZERO features are lost
  const SECONDARY_NAV_ITEMS = [
    { to: '/thermal-terrain', label: '3D Command Center', icon: Compass, badge: '3D Topo', badgeColor: 'bg-gradient-to-r from-orange-600 to-amber-600 text-white' },
    { to: '/users', label: 'Registered Users', icon: Users, badge: 'Citizens', badgeColor: 'bg-emerald-100 text-emerald-800' },
    { to: '/priority-areas', label: 'Priority Vulnerability', icon: Sliders },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin Console', icon: Lock, badge: 'Superuser', badgeColor: 'bg-purple-100 text-purple-800' }] : [])
  ];

  return (
    <aside
      className={`bg-white border-r border-[#ede7de] flex flex-col justify-between shrink-0 transition-all duration-300 z-30 ${
        isCollapsed ? 'w-20' : 'w-64'
      } h-full overflow-hidden`}
    >
      {/* 1. Main Navigation List */}
      <div className="p-3 flex-1 overflow-y-auto space-y-1.5 scrollbar-thin">
        
        {/* Collapse toggle button */}
        <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-[#f5f3ef]">
          {!isCollapsed && (
            <span className="text-[10px] font-bold text-[#a8a29e] uppercase tracking-wider">
              Navigation
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

        {/* Primary Image 1 Nav Items */}
        {PRIMARY_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/overview'}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-600/20'
                    : 'text-[#44403c] hover:text-[#1c1917] hover:bg-[#faf9f6]'
                }`
              }
              title={isCollapsed ? item.label : undefined}
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-[#78716c] group-hover:text-orange-600'
                      }`}
                    />
                    {!isCollapsed && (
                      <span className="truncate tracking-tight">{item.label}</span>
                    )}
                  </div>

                  {!isCollapsed && item.badge && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                        isActive
                          ? 'bg-white text-orange-600 shadow-xs'
                          : item.badgeColor || 'bg-stone-100 text-stone-700'
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

        {/* Expandable Advanced Operations Section (Ensures Zero Features are lost) */}
        {!isCollapsed && (
          <div className="pt-2">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-[#78716c] hover:text-[#1c1917] transition"
            >
              <span>More Modules</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>

            {showAdvanced && (
              <div className="mt-1 space-y-1 pl-1 border-l-2 border-orange-100 animate-fadeIn">
                {SECONDARY_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                          isActive
                            ? 'bg-orange-50 text-orange-700 font-bold border border-orange-200'
                            : 'text-[#57534e] hover:text-[#1c1917] hover:bg-[#faf9f6]'
                        }`
                      }
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon className="w-3.5 h-3.5 text-[#78716c]" />
                        <span className="truncate text-[11px]">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${item.badgeColor || 'bg-stone-100'}`}>
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* 2. Bottom Sidebar Heritage Card (Matching Image 1) */}
      {!isCollapsed && (
        <div className="p-3 border-t border-[#ede7de]">
          <div className="bg-[#faf9f6] border border-[#ede7de] rounded-3xl overflow-hidden shadow-2xs group">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-amber-50">
              <img
                src="/assets/chennai_sidebar.jpg"
                alt="Ripon Building Heritage Chennai"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </div>
            <div className="p-3 space-y-1">
              <h4 className="text-xs font-black text-[#1c1917] leading-snug tracking-tight">
                A Cooler, Safer Chennai for a Healthier Tomorrow
              </h4>
              <p className="text-[10px] text-[#78716c] font-medium">
                People • Preparedness • Resilience
              </p>
            </div>
          </div>
        </div>
      )}

    </aside>
  );
};
