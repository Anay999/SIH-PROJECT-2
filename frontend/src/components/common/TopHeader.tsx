import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  LogOut,
  Activity,
  Navigation,
  Flame,
  Shield
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import { CITIES_REGISTRY } from '../../data/cities';

interface TopHeaderProps {
  health?: any;
  isLoading?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = () => {
  const {
    activityFeed,
    activeCity,
    setActiveCity,
    toggleLiveGps,
    isLiveGpsActive
  } = useWorkspace();
  const { user, logout } = useAuth();

  const [isFeedOpen, setIsFeedOpen] = useState(false);

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur px-4 py-2.5 sticky top-0 z-40 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 via-amber-500 to-blue-600 flex items-center justify-center border border-rose-200 shadow-md shadow-rose-200/50 group-hover:scale-105 transition-transform">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base tracking-wider text-slate-900">HEATSHIELD AI</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200 font-bold uppercase">
                  Heat Action Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-sans tracking-tight">
                Hyper-Local Heat Risk & Emergency Response Platform
              </p>
            </div>
          </Link>
        </div>

        {/* Operational Context Controls */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Quick 1-Click Emergency GIS Road Navigation Button */}
          <Link
            to="/emergency-gis"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm transition"
            title="Instant one-click road navigation to nearest hospital or cooling shelter"
          >
            <Navigation className="w-3.5 h-3.5 text-white" />
            <span>Emergency Route</span>
          </Link>

          {/* Officer Municipality Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="font-bold text-[10px] text-slate-500 uppercase hidden sm:inline">Municipality:</span>
            <select
              value={activeCity}
              onChange={(e) => setActiveCity(e.target.value)}
              className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer pr-1"
              title="Officer Manual Jurisdiction Selection"
            >
              {CITIES_REGISTRY.map((c) => (
                <option key={c.id} value={c.name} className="text-slate-800 font-medium">
                  {c.name} ({c.state})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={toggleLiveGps}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                isLiveGpsActive
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-300'
              }`}
              title="Toggle Officer GPS Detection"
            >
              {isLiveGpsActive ? 'GPS ON' : 'GPS'}
            </button>
          </div>

          {/* Activity Feed Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFeedOpen(!isFeedOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition text-xs font-medium"
              title="Recent operational activity"
            >
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Activity</span>
              <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                {activityFeed.length}
              </span>
            </button>

            {/* Activity Feed Dropdown Popover */}
            {isFeedOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl p-3 z-50 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-800 uppercase text-[10px] font-mono tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-600" />
                    Operational Event Log
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Live</span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {activityFeed.slice(0, 8).map(ev => (
                    <div key={ev.id} className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                        <span className="text-blue-600 font-semibold">{ev.category}</span>
                        <span>{ev.time} IST</span>
                      </div>
                      <p className="text-slate-800 text-[11px] leading-snug">{ev.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Authenticated Role Badge */}
          <Link
            to="/auth"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-mono text-xs transition ${
              user?.role === 'ADMIN'
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 shadow-xs'
                : user?.role === 'CITIZEN'
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 shadow-xs'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 shadow-xs'
            }`}
            title={`Authenticated as @${user?.username || 'user'}. Click to switch identity.`}
          >
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span className="font-bold text-[10px] tracking-wide">
              {user?.role === 'ADMIN' ? 'SUPERUSER ADMIN' : user?.role === 'CITIZEN' ? 'PUBLIC CITIZEN' : 'MUNICIPAL OFFICER'}
            </span>
          </Link>

          {/* Session Logout / Exit */}
          <button
            type="button"
            onClick={() => logout()}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition border border-transparent hover:border-rose-200"
            title="Sign out session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
