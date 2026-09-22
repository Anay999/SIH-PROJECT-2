import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  Calendar,
  Building2,
  Bell,
  ClipboardList,
  BarChart3,
  Activity,
  ChevronLeft,
  ChevronRight,
  Shield,
  Lock,
  LogOut,
  MapPin,
  Sliders,
  Users,
  Server,
  UserPlus,
  FileText,
  AlertTriangle,
  KeyRound
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  to: string;
  label: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const { actionPlans, cityProfile, isLiveGpsActive } = useWorkspace();
  const { user, logout } = useAuth();

  const pendingActionsCount = actionPlans.filter(a => a.status === 'Suggested' || a.status === 'Under Review').length;

  const isCitizen = user?.role === 'CITIZEN';
  const isAdmin = user?.role === 'ADMIN';

  // 1. CITIZEN: Dedicated Citizen Safety Portal
  const CITIZEN_SECTIONS: NavSection[] = [
    {
      title: 'Public Safety Portal',
      items: [
        { to: '/citizen', label: 'Citizen Heat Dashboard', icon: Shield, badge: 'Live', badgeColor: 'bg-orange-100 text-orange-800 border border-orange-300' },
      ]
    }
  ];

  // 2. MUNICIPAL OFFICER: The 10 Specific Municipal Operation Workflows
  const OFFICER_SECTIONS: NavSection[] = [
    {
      title: 'Municipal Intelligence & Maps',
      items: [
        { to: '/overview', label: '1. Municipality Overview', icon: LayoutDashboard },
        { to: '/map', label: '2. ThermoMap', icon: Map, badge: '2D GIS', badgeColor: 'bg-orange-100 text-orange-800 border border-orange-300' },
        { to: '/vulnerability', label: '3. Ward Risk', icon: Activity },
        { to: '/forecast', label: '4. Forecast', icon: Calendar },
        { to: '/priority-areas', label: '5. Vulnerability', icon: AlertTriangle },
      ]
    },
    {
      title: 'Facilities & Emergency Response',
      items: [
        { to: '/cooling-centres', label: '6. Facilities', icon: Building2 },
        { to: '/users', label: '7. Registered Users', icon: Users, badge: 'Citizens', badgeColor: 'bg-emerald-100 text-emerald-800 border border-emerald-300' },
        { to: '/alerts', label: '8. Alert Management', icon: Bell, badge: 'SMS/WA', badgeColor: 'bg-orange-100 text-orange-800 border border-orange-300' },
        { to: '/heat-action-plan', label: '9. Heat Action Plan', icon: ClipboardList, badge: pendingActionsCount > 0 ? `${pendingActionsCount}` : undefined, badgeColor: 'bg-orange-600 text-white' },
        { to: '/analytics', label: '10. Analytics', icon: BarChart3 },
      ]
    }
  ];

  // 3. ADMIN: System Administration, Models, Telemetry & Member Management
  const ADMIN_SECTIONS: NavSection[] = [
    {
      title: 'System Administration',
      items: [
        { to: '/admin', label: 'System & Telemetry Console', icon: Lock, badge: 'SUPERUSER', badgeColor: 'bg-red-100 text-red-800 border border-red-300' },
        { to: '/admin', label: 'Model Configuration (5 AI)', icon: Sliders, badge: 'TFT/GNN', badgeColor: 'bg-orange-100 text-orange-800 border border-orange-300' },
        { to: '/admin', label: 'API Configuration & Health', icon: KeyRound, badge: 'Masked', badgeColor: 'bg-emerald-100 text-emerald-800 border border-emerald-300' },
        { to: '/admin', label: 'User & Officer Management', icon: Users },
        { to: '/admin', label: '+ Provision Team Member', icon: UserPlus },
        { to: '/admin', label: 'Architecture Flow (GeoAI)', icon: Server },
        { to: '/admin', label: 'Security Audit Trail', icon: FileText },
      ]
    }
  ];

  const activeSections = isCitizen ? CITIZEN_SECTIONS : isAdmin ? ADMIN_SECTIONS : OFFICER_SECTIONS;

  return (
    <aside
      className={`bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 transition-all duration-200 z-30 ${
        isCollapsed ? 'w-16' : 'w-64'
      } h-full overflow-hidden`}
    >
      {/* Top Nav List - naturally expands and scrolls smoothly if multiple sections exist */}
      <div className="p-2.5 flex-1 overflow-y-auto space-y-3 scrollbar-thin">
        {/* Navigation Category Label & Collapse Toggle */}
        <div className="flex items-center justify-between px-2 pb-1.5 border-b border-slate-200">
          {!isCollapsed && (
            <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase font-bold">
              {isCitizen ? 'Citizen Navigation' : isAdmin ? 'Superuser Command' : 'Municipal Operations'}
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition ml-auto"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Active Municipal Jurisdiction Badge */}
        {!isCollapsed && (
          <div className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] font-mono">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-slate-500 uppercase text-[9px] flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-600" />
                <span>Jurisdiction</span>
              </span>
              <span className={`text-[9px] font-bold px-1 rounded ${isLiveGpsActive ? 'bg-cyan-100 text-cyan-800' : 'bg-slate-200 text-slate-700'}`}>
                {isLiveGpsActive ? 'Roaming' : cityProfile.region.split(' ')[0]}
              </span>
            </div>
            <p className="text-slate-900 font-bold truncate text-[11px]">{cityProfile.name}</p>
            <p className="text-[9px] text-slate-500 truncate">{cityProfile.corporation.split('(')[0].trim()}</p>
          </div>
        )}

        {/* Dynamic Navigation Sections & Subsections */}
        <div className="space-y-3">
          {activeSections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-2 pt-1 text-[9px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  {section.title}
                </div>
              )}
              <nav className="space-y-0.5">
                {section.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={`${item.to}-${item.label}`}
                      to={item.to}
                      end={item.to === '/'}
                      title={isCollapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition text-xs font-medium group ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-xs font-semibold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                        } ${isCollapsed ? 'justify-center px-1' : ''}`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-blue-600 transition-colors" />
                      {!isCollapsed && (
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span className="truncate">{item.label}</span>
                          {item.badge && (
                            <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${item.badgeColor || 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>

      {/* User Session & Role Footer */}
      <div className="p-2.5 border-t border-slate-200 bg-slate-50">
        {!isCollapsed ? (
          <div className="space-y-2">
            <div className="p-2 rounded-xl bg-white border border-slate-200 text-[10px] shadow-xs">
              <div className="flex items-center justify-between font-mono text-[9px] text-slate-500 mb-1">
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  AUTHENTICATED
                </span>
                <span className={`px-1.5 py-0.5 rounded font-bold ${
                  isAdmin ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                  isCitizen ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {user?.role || 'OFFICER'}
                </span>
              </div>
              <p className="font-semibold text-slate-800 truncate">{user?.full_name || 'User Demo'}</p>
              <p className="text-[9px] text-slate-500 font-mono">{user?.city || 'Chennai'} · {user?.phone_masked || user?.username || 'user'}</p>
            </div>

            <button
              onClick={() => logout()}
              className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-lg bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-[11px] border border-slate-200 hover:border-rose-200 transition shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out Session</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => logout()}
            className="w-full p-2 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
