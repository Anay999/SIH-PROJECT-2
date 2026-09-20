import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { getFacilitiesForCity } from '../data/realFacilities';
import {
  Sun,
  Shield,
  MapPin,
  PhoneCall,
  Navigation,
  Thermometer,
  Droplets,
  HeartHandshake,
  AlertTriangle,
  Clock,
  Sparkles,
  Search,
  ArrowUpRight,
  Compass
} from 'lucide-react';

export const CitizenPortalPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { cityProfile, isLiveGpsActive, liveGpsCoords, toggleLiveGps } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dynamic live city weather state
  const currentWeather = {
    temp_c: 38.2,
    feels_like_c: 44.6,
    humidity_pct: 64,
    heat_level: 'Very High',
    alert_badge: 'ORANGE ADVISORY',
    issued_for: cityProfile.corporation,
    peak_hours: '11:00 AM – 03:30 PM',
  };

  // Get authentic real facilities for the citizen's active jurisdiction
  const cityFacilities = useMemo(() => {
    return getFacilitiesForCity(cityProfile.id || 'chennai');
  }, [cityProfile.id]);

  const coolingCenters = useMemo(() => {
    return cityFacilities.filter(f => f.type === 'COOLING_CENTRE' || f.type === 'EMERGENCY_CENTRE');
  }, [cityFacilities]);

  const fiveDayForecast = [
    { day: 'Today', max: 39, min: 28, condition: 'Severe Heat & Humidity', severity: 'orange' },
    { day: 'Tomorrow', max: 40, min: 29, condition: 'Extreme Heatwave', severity: 'red' },
    { day: 'Monday', max: 38, min: 28, condition: 'High Thermal Burden', severity: 'orange' },
    { day: 'Tuesday', max: 36, min: 27, condition: 'Moderate Summer Heat', severity: 'yellow' },
    { day: 'Wednesday', max: 35, min: 26, condition: 'Sea Breeze Moderation', severity: 'green' },
  ];

  const filteredCenters = coolingCenters.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.ward_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 font-sans">
      {/* Header Bar */}
      <div className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-orange-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold tracking-tight text-slate-900">HEATSHIELD</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
                  CITIZEN SAFETY PORTAL
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{cityProfile.corporation} Heat Defense Network</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800">{user?.full_name || 'Citizen User'}</span>
              <span className="text-[10px] text-slate-500 font-mono">{user?.city || cityProfile.name} · {user?.phone_masked || 'Active Session'}</span>
            </div>
            <button
              onClick={() => logout()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 border border-slate-200 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Roaming Live GPS Bar - Soft Cyan Tint */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-50/80 via-white to-cyan-50/70 border border-cyan-200/90 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full ${isLiveGpsActive ? 'bg-cyan-500 animate-ping' : 'bg-emerald-500'}`} />
            <div>
              <span className="font-bold text-slate-900 uppercase">{cityProfile.name} ({cityProfile.region})</span>
              <span className="text-slate-600 font-mono text-[11px] ml-2 font-medium">
                {isLiveGpsActive && liveGpsCoords
                  ? `Live Roaming GPS Locked: ${liveGpsCoords.lat.toFixed(4)}°N, ${liveGpsCoords.lon.toFixed(4)}°E`
                  : `Registered Municipal Jurisdiction — ${cityProfile.state}`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLiveGps}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                isLiveGpsActive
                  ? 'bg-cyan-100 text-cyan-800 border border-cyan-300 shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-xs'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-cyan-600" />
              <span>{isLiveGpsActive ? 'Live GPS Active ✓' : 'Detect Live GPS (Roaming)'}</span>
            </button>
            <Link
              to="/emergency-gis"
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Emergency Route Map</span>
            </Link>
          </div>
        </div>

        {/* Emergency Alert Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 border border-orange-200 p-5 shadow-xs relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-orange-100 border border-orange-300 rounded-xl text-orange-600 shrink-0">
                <AlertTriangle className="w-7 h-7 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-orange-500 text-white tracking-wider shadow-xs">
                    {currentWeather.alert_badge}
                  </span>
                  <span className="text-xs text-slate-600 font-mono">Issued for {cityProfile.name} ({cityProfile.corporation})</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  High Heatwave & Moisture Advisory in Effect
                </h1>
                <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                  Ambient temperatures are reaching <strong className="text-amber-700">{currentWeather.temp_c}°C</strong> with human thermal stress feeling like <strong className="text-orange-700">{currentWeather.feels_like_c}°C</strong>. Please stay in shaded, ventilated areas between <span className="underline decoration-orange-400 font-semibold">{currentWeather.peak_hours}</span>.
                </p>
              </div>
            </div>

            {/* Quick Emergency Dial */}
            <div className="flex sm:flex-col gap-2 shrink-0">
              <a
                href={`tel:${cityProfile.helpline}`}
                className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold tracking-wider uppercase shadow-sm transition"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call {cityProfile.helpline} ({cityProfile.name})</span>
              </a>
              <a
                href="tel:108"
                className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold tracking-wider uppercase shadow-sm transition"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Ambulance 108</span>
              </a>
            </div>
          </div>
        </div>

        {/* Current Live Biometeorology Stats - Sleek Dark Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5 shadow-lg text-white">
            <div className="p-2.5 bg-amber-950/80 text-amber-400 rounded-xl border border-amber-800/80">
              <Thermometer className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">Current Temperature</p>
              <p className="text-xl font-bold text-amber-400">{currentWeather.temp_c}°C</p>
            </div>
          </div>

          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5 shadow-lg text-white">
            <div className="p-2.5 bg-orange-950/80 text-orange-400 rounded-xl border border-orange-800/80">
              <Sun className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">Feels Like (Heat Index)</p>
              <p className="text-xl font-bold text-orange-400">{currentWeather.feels_like_c}°C</p>
            </div>
          </div>

          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5 shadow-lg text-white">
            <div className="p-2.5 bg-cyan-950/80 text-cyan-400 rounded-xl border border-cyan-800/80">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">Relative Humidity</p>
              <p className="text-xl font-bold text-cyan-400">{currentWeather.humidity_pct}%</p>
            </div>
          </div>

          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5 shadow-lg text-white">
            <div className="p-2.5 bg-purple-950/80 text-purple-400 rounded-xl border border-purple-800/80">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">Vulnerable Window</p>
              <p className="text-sm font-bold text-purple-300">11:00 AM – 03:30 PM</p>
            </div>
          </div>
        </div>

        {/* 2-Column Main Section: Nearby Help & 5-Day Outlook */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Nearby Help & Directions (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                    <span>Nearby Cooling Centers & Hydration Relief ({cityProfile.name})</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official air-conditioned rest halls, drinking water, and ORS stations maintained by {cityProfile.corporation}.
                  </p>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by area or facility..."
                    className="pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 text-xs text-slate-800 border border-slate-300 focus:border-emerald-500 focus:outline-none w-full sm:w-56"
                  />
                </div>
              </div>

              {/* Center List */}
              <div className="space-y-3">
                {filteredCenters.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                    No matching relief centers found in {cityProfile.name}.
                  </div>
                ) : (
                  filteredCenters.map((center) => (
                    <div
                      key={center.id}
                      className="p-4 rounded-xl bg-[#0f172a] border border-slate-800 hover:border-slate-700 hover:bg-slate-900/90 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md text-white"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-sm">{center.name}</span>
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-950/90 text-emerald-300 border border-emerald-800/80">
                            {center.ward_name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">{center.address}</p>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {center.amenities.map((amenity, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-[10px] rounded-full bg-slate-900 text-slate-200 font-medium border border-slate-800"
                            >
                              ✓ {amenity}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-400 font-mono">{center.distance_km} km away</span>
                          <p className="text-[10px] text-slate-400">{center.open_hours}</p>
                        </div>

                        <button
                          onClick={() => {
                            window.open(
                              `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(center.name + ', ' + cityProfile.name)}`,
                              '_blank'
                            );
                          }}
                          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold tracking-wider transition shadow-sm"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Directions</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Practical Citizen Heat Precautions Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-700 mb-3 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Essential Heatwave Safety Protocol</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#0f172a] rounded-xl border border-slate-800 text-slate-300 shadow-sm">
                  <strong className="text-amber-400 block mb-1">💧 Drink 3+ Liters Daily</strong>
                  Consume oral rehydration salts (ORS), lemon water, buttermilk, or tender coconut even if not feeling thirsty.
                </div>
                <div className="p-3 bg-[#0f172a] rounded-xl border border-slate-800 text-slate-300 shadow-sm">
                  <strong className="text-amber-400 block mb-1">👵 Check on Seniors & Children</strong>
                  Elderly residents and young children suffer heat exhaustion faster. Ensure continuous hydration.
                </div>
                <div className="p-3 bg-[#0f172a] rounded-xl border border-slate-800 text-slate-300 shadow-sm">
                  <strong className="text-amber-400 block mb-1">🧢 Loose, Light Clothing</strong>
                  Wear loose-fitting, light-colored cotton attire and cover head with cloth or hat when outside.
                </div>
                <div className="p-3 bg-[#0f172a] rounded-xl border border-slate-800 text-slate-300 shadow-sm">
                  <strong className="text-amber-400 block mb-1">🚨 Recognize Warning Signs</strong>
                  Dizziness, nausea, rapid pulse, or lack of sweating are symptoms of heat stroke. Seek immediate medical aid.
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: 5-Day Outlook & Community Hotlines */}
          <div className="space-y-6">
            {/* 5-Day Heatwave Forecast */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 shadow-lg text-white">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
                <Sun className="w-4 h-4 text-amber-400" />
                <span>5-Day {cityProfile.name} Heat Outlook</span>
              </h3>

              <div className="space-y-2.5">
                {fiveDayForecast.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs shadow-sm transition hover:border-slate-700"
                  >
                    <div>
                      <span className="font-bold text-white block">{item.day}</span>
                      <span className="text-[11px] text-slate-300 font-medium">{item.condition}</span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <span className="font-bold text-amber-400">{item.max}°C</span>
                        <span className="text-slate-400 text-[10px] ml-1">/ {item.min}°C</span>
                      </div>
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          item.severity === 'red'
                            ? 'bg-rose-500 animate-pulse'
                            : item.severity === 'orange'
                            ? 'bg-orange-400'
                            : item.severity === 'yellow'
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Official Municipal Hotlines */}
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg text-white">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <HeartHandshake className="w-4 h-4 text-emerald-400" />
                <span>Emergency Heatwave Helplines ({cityProfile.name})</span>
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-slate-200 font-medium">{cityProfile.corporation} Control Room</span>
                  <a href={`tel:${cityProfile.helpline}`} className="font-mono font-bold text-emerald-400 hover:underline">{cityProfile.helpline}</a>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-slate-200 font-medium">{cityProfile.state} Disaster Authority</span>
                  <a href="tel:1070" className="font-mono font-bold text-amber-400 hover:underline">1070</a>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-slate-200 font-medium">District Emergency Center</span>
                  <a href="tel:1077" className="font-mono font-bold text-cyan-400 hover:underline">1077</a>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                  <span className="text-slate-200 font-medium">Medical Emergency & Ambulance</span>
                  <a href="tel:108" className="font-mono font-bold text-rose-400 hover:underline">108</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
