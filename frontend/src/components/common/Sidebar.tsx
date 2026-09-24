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
        isCollapsed ? 'w-20' : 'w-64'
      } h-full overflow-hidden`}
    >
      {/* 1. Main Navigation List with all features */}
      <div className="p-3 flex-1 overflow-y-auto space-y-1.5 scrollbar-thin">
        
        {/* Collapse toggle button */}
        <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-[#f5f3ef]">
          {!isCollapsed && (
            <span className="text-[10px] font-bold text-[#a8a29e] uppercase tracking-wider">
              Operational Features
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

        {/* Section Divider for Advanced Command Features */}
        {!isCollapsed && (
          <div className="pt-3 pb-1 px-2 border-t border-[#f5f3ef]">
            <span className="text-[10px] font-bold text-[#a8a29e] uppercase tracking-wider">
              Advanced Modules
            </span>
          </div>
        )}

        {/* Advanced Features directly accessible (No Image below!) */}
        {ADVANCED_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 group ${
                  isActive
                    ? 'bg-orange-50 text-orange-700 font-bold border border-orange-200'
                    : 'text-[#57534e] hover:text-[#1c1917] hover:bg-[#faf9f6]'
                }`
              }
              title={isCollapsed ? item.label : undefined}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className="w-4 h-4 text-[#78716c] group-hover:text-orange-600 transition-transform group-hover:scale-110 shrink-0" />
                {!isCollapsed && (
                  <span className="truncate tracking-tight">{item.label}</span>
                )}
              </div>
              {!isCollapsed && item.badge && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${item.badgeColor || 'bg-stone-100'}`}>
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}

      </div>

      {/* 2. Compact Bottom System Status Strip (Image completely removed!) */}
      {!isCollapsed && (
        <div className="p-3 border-t border-[#ede7de] text-[10px] text-[#78716c] flex items-center justify-between font-medium bg-[#faf9f6]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-[#44403c]">National Grid Live</span>
          </div>
          <span className="font-mono text-[#a8a29e]">GoI • NDMA</span>
        </div>
      )}

    </aside>
  );
};
