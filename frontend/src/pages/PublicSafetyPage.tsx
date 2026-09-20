import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  Navigation,
  Droplets,
  Sun,
  ShieldAlert,
  HeartPulse,
  Bell,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const PublicSafetyPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedWard, setSelectedWard] = useState('Ward 114 (Teynampet)');
  const [phone, setPhone] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setSubmitting(true);
    try {
      await fetch('/api/notifications/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numbers: phone,
          ward: selectedWard,
          value: 84.1,
          route: 'q',
        }),
      });
      setSubscribed(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Hero Alert Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-rose-950/80 via-slate-900 to-amber-950/40 border border-rose-600/50 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-rose-600/20 text-rose-300 border border-rose-500/30">
              <ShieldAlert className="w-4 h-4 animate-bounce" />
              HEAT EMERGENCY RED ALERT ACTIVE
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              CITIZEN HEAT SAFETY PORTAL
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              Real-time physiological heat risk guidance for citizens, delivery workers, outdoor laborers, and seniors across Chennai municipal wards.
            </p>
          </div>

          {/* Big Action Button */}
          <button
            onClick={() => navigate('/emergency-gis')}
            className="px-6 py-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold text-base shadow-xl shadow-rose-900/50 transition-all flex items-center justify-center gap-3 shrink-0 group"
          >
            <Navigation className="w-5 h-5 text-amber-300 group-hover:scale-110 transition-transform" />
            <span>FIND HELP NEAR ME</span>
          </button>
        </div>
      </div>

      {/* Ward Selector & Today's Heat Stress Conditions */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs uppercase font-bold text-slate-400 block">Your Current Locality</span>
            <div className="flex items-center gap-2 mt-1">
              <select
                value={selectedWard}
                onChange={(e) => setSelectedWard(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-white text-sm font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
              >
                <option value="Ward 114 (Teynampet)">Ward 114 (Teynampet / Anna Salai)</option>
                <option value="Ward 104 (Anna Nagar)">Ward 104 (Anna Nagar West)</option>
                <option value="Ward 125 (Mylapore)">Ward 125 (Mylapore / Santhome)</option>
                <option value="Ward 117 (Thyagaraya Nagar)">Ward 117 (T. Nagar Commercial)</option>
                <option value="Ward 170 (Guindy)">Ward 170 (Guindy Industrial Estate)</option>
              </select>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-xs text-slate-400 block">Peak Sun Risk Window</span>
            <span className="text-sm font-extrabold text-amber-400 block">
              11:30 AM — 3:30 PM (Avoid direct exposure)
            </span>
          </div>
        </div>

        {/* 4 Metric Badges in Plain English */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-1">
              <Sun className="w-4 h-4 text-amber-400" />
              Air Temp
            </div>
            <span className="text-2xl font-black text-amber-300">39.4°C</span>
            <span className="text-[11px] text-slate-500 block mt-1">Direct shade reading</span>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-1">
              <Flame className="w-4 h-4 text-orange-400" />
              Feels Like (HI)
            </div>
            <span className="text-2xl font-black text-orange-400">43.2°C</span>
            <span className="text-[11px] text-slate-500 block mt-1">Rothfusz apparent temp</span>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-1">
              <HeartPulse className="w-4 h-4 text-rose-400" />
              Wet-Bulb Stress
            </div>
            <span className="text-2xl font-black text-rose-400">31.2°C</span>
            <span className="text-[11px] text-slate-500 block mt-1">Sweating efficiency low</span>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold mb-1">
              <Droplets className="w-4 h-4 text-cyan-400" />
              Hydration Need
            </div>
            <span className="text-2xl font-black text-cyan-300">750 ml/hr</span>
            <span className="text-[11px] text-slate-500 block mt-1">Water + ORS electrolytes</span>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Emergency First Aid Guide + Free Alert Subscription */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Heat Stroke First Aid Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertCircle className="w-5 h-5" />
            <h3 className="text-sm font-bold text-white">Heat Stroke Emergency First Aid</h3>
          </div>

          <div className="space-y-3 text-xs text-slate-300">
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
              <strong className="text-rose-400 block mb-1">Danger Signs:</strong>
              <p>Hot, dry red skin (lack of sweating), confusion, dizziness, rapid pulse, fainting, or vomiting.</p>
            </div>

            <div className="space-y-1.5 pl-2 border-l-2 border-amber-500">
              <p><strong className="text-white">1. Move to Shade:</strong> Immediately relocate person to air-conditioned room or tree canopy.</p>
              <p><strong className="text-white">2. Rapid Cooling:</strong> Douse clothes with cool water, apply wet cloths to neck, armpits, and groin.</p>
              <p><strong className="text-white">3. Hydration:</strong> Offer small sips of cool water only if conscious. Never force fluids if disoriented.</p>
              <p><strong className="text-white">4. Call 108:</strong> Contact Tamil Nadu Emergency Ambulance Service immediately.</p>
            </div>
          </div>
        </div>

        {/* Free Ward Alert Subscription Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <Bell className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Subscribe to Ward Heat Warnings</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Receive free SMS & WhatsApp text notifications 3 hours prior to acute heat stress peaks in {selectedWard}.
            </p>
          </div>

          {subscribed ? (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <div>
                <strong className="block text-white">Subscription Active!</strong>
                A confirmation text has been dispatched to {phone}. Stay safe and hydrated.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number (SMS / WhatsApp)</label>
                <input
                  type="tel"
                  placeholder="e.g. 98401 23456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50"
              >
                {submitting ? 'Subscribing...' : 'Get Free Local Heat Alerts'}
              </button>
            </form>
          )}

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span>Fast2SMS & CallMeBot Gateway</span>
            <span>Zero Spam • Civic Use Only</span>
          </div>
        </div>
      </div>
    </div>
  );
};
