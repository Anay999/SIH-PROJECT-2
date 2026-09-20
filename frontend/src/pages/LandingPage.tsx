import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Building2,
  Navigation,
  Flame,
  Activity,
  ArrowRight,
  Radio,
  MapPin,
  Database,
  Cpu,
  Send,
  Users
} from 'lucide-react';
import { InteractiveGlobe } from '../components/3d/InteractiveGlobe';
import { AuthModal, type UserSession } from '../components/auth/AuthModal';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const handleAuthenticated = (session: UserSession) => {
    if (session.role === 'PUBLIC_USER') {
      navigate('/public-safety');
    } else {
      navigate('/overview');
    }
  };

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#060a12]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 text-white shadow-lg shadow-rose-900/30">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-wider text-white">THERMOSAFE AI</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800/60">
                  India Heat Risk
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Hyper-Local Heat Risk & Emergency Response Intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/public-safety')}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              Citizen Portal
            </button>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5" />
              Sign In / Access
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24 border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Narrative Column */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Radio className="w-3.5 h-3.5 animate-pulse text-rose-400" />
                <span>Next-Gen Climate Health Intelligence</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Don't just predict the weather.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500">
                  Predict what it will do to people.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                THERMOSAFE AI combines micro-meteorology, physiological thermal stress indices (WBGT, UTCI, HTSI), and vulnerable population demographics to deliver automated ward-level early warnings, emergency routing, and civic action orchestration.
              </p>

              {/* Dual Entrance CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => setIsAuthOpen(true)}
                  className="px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/25 transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Enter Command Center</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={() => navigate('/public-safety')}
                  className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Navigation className="w-4 h-4 text-emerald-400" />
                  <span>Citizen Heat Safety & Help</span>
                </button>
              </div>

              {/* Live Situation Metric Counters */}
              <div className="pt-4 grid grid-cols-3 gap-2 sm:gap-3 border-t border-slate-800/80">
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Active Risk</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-sm font-extrabold text-rose-400">Extreme</span>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">People Exposed</span>
                  <span className="text-sm font-extrabold text-amber-300 block mt-0.5">14.2 Million</span>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">High-Risk Zones</span>
                  <span className="text-sm font-extrabold text-white block mt-0.5">18 Districts</span>
                </div>
              </div>
            </div>

            {/* Right 3D Earth Globe Column */}
            <div className="lg:col-span-6 flex flex-col items-center">
              <InteractiveGlobe onSelectCity={(city) => console.log('Selected city:', city)} />
              <div className="w-full mt-3 flex items-center justify-between text-[11px] text-slate-400 px-2">
                <span>Rotating 3D Earth: Indian Heat Dome Visualization</span>
                <span className="text-blue-400 hover:underline cursor-pointer" onClick={() => navigate('/overview')}>
                  Open 2D GIS Choropleth →
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Visual Pipeline: PREDICT -> ROUTE -> RESPOND */}
      <section className="py-14 bg-slate-950/70 border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Operational Lifecycle</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1">
              The 8-Stage Rapid Heat Emergency Protocol
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              From atmospheric sensor ingestion to turn-by-turn cooling center evacuation.
            </p>
          </div>

          {/* Flow Stepper */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {[
              { step: '01', title: 'PREDICT', desc: '5-Day atmospheric & solar forecast', icon: Database, color: 'text-blue-400' },
              { step: '02', title: 'CALCULATE', desc: 'Rothfusz HI, WBGT, UTCI, HTSI', icon: Cpu, color: 'text-cyan-400' },
              { step: '03', title: 'AI MODEL', desc: 'Surge & mortality risk indices', icon: Activity, color: 'text-amber-400' },
              { step: '04', title: 'GIS ALERT', desc: 'Ward polygon risk categorization', icon: MapPin, color: 'text-orange-400' },
              { step: '05', title: 'WARN', desc: 'Fast2SMS & WhatsApp broadcast', icon: Send, color: 'text-rose-400' },
              { step: '06', title: 'FIND HELP', desc: 'Nearest tertiary hospital locator', icon: Users, color: 'text-emerald-400' },
              { step: '07', title: 'ROUTE', desc: 'OSRM driving directions & GPS', icon: Navigation, color: 'text-indigo-400' },
              { step: '08', title: 'RESPOND', desc: 'Municipal Heat Action Plan triggers', icon: Shield, color: 'text-purple-400' },
            ].map((item, idx) => (
              <div key={idx} className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl hover:border-slate-700 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-slate-500">{item.step}</span>
                    <item.icon className={`w-4 h-4 ${item.color}`} />
                  </div>
                  <h4 className="text-xs font-bold text-white tracking-wide">{item.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-tight">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-blue-500/40 transition-all">
            <div className="p-3 w-fit rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 mb-4">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">4 Atmospheric Stress Engines</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Calculates Rothfusz NOAA Heat Index, Liljegren/Stull WBGT (indoor shaded vs outdoor direct solar), Bröde UTCI, and configurable Composite Human Thermal Stress Index (HTSI).
            </p>
          </div>

          <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-amber-500/40 transition-all">
            <div className="p-3 w-fit rounded-xl bg-amber-600/10 text-amber-400 border border-amber-500/20 mb-4">
              <Navigation className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Emergency GIS & OSRM Routing</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Citizen-first "FIND HELP NEAR ME" engine connects users in danger zones to nearest emergency hospitals and cooling centers with live turn-by-turn navigation and travel time.
            </p>
          </div>

          <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-rose-500/40 transition-all">
            <div className="p-3 w-fit rounded-xl bg-rose-600/10 text-rose-400 border border-rose-500/20 mb-4">
              <Radio className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Multichannel Citizen Notification</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              CallMeBot WhatsApp testing gateway and Fast2SMS Quick SMS & DLT bulk broadcast integration for localized municipal warnings without exposing API secrets.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>THERMOSAFE AI • Hyper-Local Heat Risk & Emergency Response Intelligence</span>
          <span className="text-[11px] text-slate-600">Built for National Climate Resilience & Civic Safety</span>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  );
};
