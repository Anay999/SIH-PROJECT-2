import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  LogOut,
  Activity,
  Navigation,
  Sun,
  Shield,
  Search,
  Bell,
  Globe
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
  const navigate = useNavigate();

  const [isFeedOpen, setIsFeedOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/vulnerability?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const activeAlertsCount = 3;

  return (
    <header className="border-b border-[#ede7de] bg-white sticky top-0 z-40 shadow-xs">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 sm:gap-4">
        
        {/* 1. LEFT SECTION: Ashoka / GCC Seal + THERMOSAFE AI Brand */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          
          {/* Greater Chennai Corporation Official Seal & Bilingual Script */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#faf9f6] border border-[#ede7de] flex items-center justify-center p-1 text-[#1c1917] shrink-0">
              <Shield className="w-5 h-5 text-[#334155]" />
            </div>
            <div className="leading-tight">
              <div className="text-xs sm:text-sm font-black text-[#1c1917] tracking-tight">
                Greater Chennai Corporation
              </div>
              <div className="text-[10px] text-[#78716c] font-medium">
                பெருநகர் சென்னை மாநகராட்சி
              </div>
            </div>
          </div>

          <div className="h-7 w-px bg-[#ede7de] hidden md:block" />

          {/* THERMOSAFE AI Brand */}
          <Link to="/" className="hidden lg:flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-600 via-amber-500 to-yellow-500 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
              <Sun className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black tracking-tight text-[#1c1917]">
                  THERMOSAFE <span className="text-orange-600">AI</span>
                </span>
              </div>
              <p className="text-[9px] text-[#78716c] font-medium leading-none">
                Heatwave Early Warning & Human Thermal Stress Platform • Safer Communities. Cooler Tomorrows.
              </p>
            </div>
          </Link>

        </div>

        {/* 2. CENTER SECTION: Search bar */}
        <div className="flex-1 max-w-xs md:max-w-md hidden md:block">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-3.5 h-3.5 text-[#a8a29e] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ward, location or facility..."
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-xs text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-orange-500 focus:bg-white transition"
            />
          </form>
        </div>

        {/* 3. RIGHT SECTION: City Selector, Notification Bell (3), Officer Avatar, Language, Logout */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs shrink-0">
          
          {/* Quick Emergency Route Navigation */}
          <Link
            to="/emergency-gis"
            className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition"
            title="Instant GIS Navigation to nearest cooling shelter or hospital"
          >
            <Navigation className="w-3.5 h-3.5 text-white" />
            <span>Emergency Route</span>
          </Link>

          {/* Location Selector (Chennai with MapPin) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-xs font-semibold text-[#1c1917]">
            <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <select
              value={activeCity}
              onChange={(e) => setActiveCity(e.target.value)}
              className="bg-transparent font-bold text-xs text-[#1c1917] focus:outline-none cursor-pointer pr-1"
            >
              {CITIES_REGISTRY.map((c) => (
                <option key={c.id} value={c.name} className="text-[#1c1917]">
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={toggleLiveGps}
              className={`hidden sm:inline px-1 py-0.5 rounded text-[9px] font-mono font-bold transition ${
                isLiveGpsActive
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-stone-200 text-stone-600'
              }`}
              title="Toggle Officer GPS"
            >
              GPS
            </button>
          </div>

          {/* Notification Bell with Red Badge "3" */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFeedOpen(!isFeedOpen)}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#faf9f6] hover:bg-[#ede7de] border border-[#ede7de] flex items-center justify-center text-[#44403c] transition relative"
              title="Alert Notifications"
            >
              <Bell className="w-4 h-4 text-[#44403c]" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white font-bold text-[9px] flex items-center justify-center shadow-xs">
                {activeAlertsCount}
              </span>
            </button>

            {/* Notification Popover */}
            {isFeedOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-[#ede7de] rounded-2xl shadow-2xl p-3 z-50 space-y-2 text-xs animate-fadeIn">
                <div className="flex items-center justify-between border-b border-[#ede7de] pb-2">
                  <span className="font-bold text-[#1c1917] text-xs flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-orange-600" />
                    Heat Action & Operational Log
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                    Live Stream
                  </span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {activityFeed.slice(0, 6).map((ev) => (
                    <div key={ev.id} className="p-2.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#78716c]">
                        <span className="text-orange-700 font-bold">{ev.category}</span>
                        <span>{ev.time} IST</span>
                      </div>
                      <p className="text-[#1c1917] text-xs leading-snug">{ev.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Avatar ("M" Municipal Officer) */}
          <div className="flex items-center gap-2 pl-1 border-l border-[#ede7de]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white font-black text-xs shadow-xs shrink-0">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'M'}
            </div>
            <div className="hidden sm:block leading-tight text-left">
              <div className="text-xs font-black text-[#1c1917]">
                {user?.role === 'ADMIN' ? 'System Admin' : user?.role === 'CITIZEN' ? 'Citizen' : 'Municipal Officer'}
              </div>
              <div className="text-[10px] text-[#78716c]">
                {activeCity || 'Greater Chennai'} Corporation
              </div>
            </div>
          </div>

          {/* Language Selector */}
          <div className="relative hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-xs font-semibold text-[#44403c]">
            <Globe className="w-3.5 h-3.5 text-[#78716c]" />
            <span>English</span>
          </div>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={() => logout()}
            className="p-1.5 rounded-xl text-[#78716c] hover:text-red-600 hover:bg-red-50 transition border border-transparent hover:border-red-200"
            title="Sign out session"
          >
            <LogOut className="w-4 h-4" />
          </button>

        </div>

      </div>
    </header>
  );
};
