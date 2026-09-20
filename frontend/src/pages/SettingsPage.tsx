import React, { useState } from 'react';
import {
  Bell,
  Save,
  Cpu,
  SlidersHorizontal,
  Send
} from 'lucide-react';
import { NotificationConsole } from '../components/notifications/NotificationConsole';

export const SettingsPage: React.FC = () => {
  // HTSI Weights (Sum = 1.0)
  const [wThermal, setWThermal] = useState(0.35);
  const [wWbgt, setWWbgt] = useState(0.30);
  const [wVuln, setWVuln] = useState(0.20);
  const [wUrban, setWUrban] = useState(0.15);

  // Alert Thresholds
  const [thYellow, setThYellow] = useState(60);
  const [thOrange, setThOrange] = useState(75);
  const [thRed, setThRed] = useState(85);

  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'weights' | 'thresholds' | 'notifications'>('weights');

  const totalWeight = Number((wThermal + wWbgt + wVuln + wUrban).toFixed(2));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <SlidersHorizontal className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-wide">
              ADMIN CONFIGURATION & AI ENGINE SETTINGS
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure dynamic HTSI weights, emergency alert trigger thresholds, and notification provider gateways.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 flex items-center gap-1.5 transition-all"
        >
          <Save className="w-4 h-4" />
          {saved ? 'Settings Saved!' : 'Save Configuration'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 gap-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('weights')}
          className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'weights' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cpu className="w-4 h-4" />
          HTSI Composite Weights
        </button>
        <button
          onClick={() => setActiveTab('thresholds')}
          className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'thresholds' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4" />
          Alert Severity Thresholds
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'notifications' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Send className="w-4 h-4" />
          Notification Consoles
        </button>
      </div>

      {/* TAB 1: HTSI WEIGHTS */}
      {activeTab === 'weights' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Human Thermal Stress Index (HTSI) Calibration</h3>
            <p className="text-xs text-slate-400">
              Adjust the multi-criteria physiological weights used to generate municipal thermal risk scores. Weights automatically sum to 100%.
            </p>
          </div>

          <div className="space-y-5">
            {/* Slider 1 */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-white">Thermal Burden (Heat Index & Apparent Temp)</span>
                <span className="font-mono text-amber-400 font-bold">{Math.round(wThermal * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.60"
                step="0.05"
                value={wThermal}
                onChange={(e) => setWThermal(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <p className="text-[11px] text-slate-500">Weight assigned to ambient temperature + relative humidity interaction.</p>
            </div>

            {/* Slider 2 */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-white">Wet-Bulb Sweating Burden (WBGT Stress)</span>
                <span className="font-mono text-rose-400 font-bold">{Math.round(wWbgt * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.60"
                step="0.05"
                value={wWbgt}
                onChange={(e) => setWWbgt(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <p className="text-[11px] text-slate-500">Physiological cooling barrier when skin cannot evaporate sweat.</p>
            </div>

            {/* Slider 3 */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-white">Vulnerable Population Exposure (Elderly & Labor)</span>
                <span className="font-mono text-emerald-400 font-bold">{Math.round(wVuln * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.40"
                step="0.05"
                value={wVuln}
                onChange={(e) => setWVuln(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <p className="text-[11px] text-slate-500">Amplifies risk in wards with dense elderly populations and outdoor workers.</p>
            </div>

            {/* Slider 4 */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-white">Urban Heat Island & Surface Imperviousness</span>
                <span className="font-mono text-cyan-400 font-bold">{Math.round(wUrban * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.30"
                step="0.05"
                value={wUrban}
                onChange={(e) => setWUrban(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <p className="text-[11px] text-slate-500">Microclimatic trapping caused by concrete density and lack of vegetative tree canopy.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Total Normalized Weight:</span>
            <span className="font-mono font-bold text-white">{Math.round(totalWeight * 100)}%</span>
          </div>
        </div>
      )}

      {/* TAB 2: ALERT THRESHOLDS */}
      {activeTab === 'thresholds' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Municipal Heat Action Plan Thresholds</h3>
            <p className="text-xs text-slate-400">
              Define the HTSI cutoff values that automatically trigger early warnings, cooling center activations, and mass broadcasts.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-amber-400 block">Yellow Heat Advisory Threshold</span>
                <span className="text-[11px] text-slate-400">Public health advice to drink fluids and limit peak sun exposure.</span>
              </div>
              <input
                type="number"
                value={thYellow}
                onChange={(e) => setThYellow(parseInt(e.target.value))}
                className="w-20 bg-slate-900 border border-slate-700 text-amber-400 font-bold text-center py-1.5 rounded-lg text-sm"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-orange-500/30 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-orange-400 block">Orange Severe Alert Threshold</span>
                <span className="text-[11px] text-slate-400">Healthcare preparedness, ORS stations deployed, outdoor labor advisory.</span>
              </div>
              <input
                type="number"
                value={thOrange}
                onChange={(e) => setThOrange(parseInt(e.target.value))}
                className="w-20 bg-slate-900 border border-slate-700 text-orange-400 font-bold text-center py-1.5 rounded-lg text-sm"
              />
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-rose-500/30 flex items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-rose-400 block">Red Extreme Emergency Threshold</span>
                <span className="text-[11px] text-slate-400">Cooling centers mandatory open, Fast2SMS broadcast, inter-agency emergency protocol.</span>
              </div>
              <input
                type="number"
                value={thRed}
                onChange={(e) => setThRed(parseInt(e.target.value))}
                className="w-20 bg-slate-900 border border-slate-700 text-rose-400 font-bold text-center py-1.5 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: NOTIFICATIONS CONSOLE */}
      {activeTab === 'notifications' && (
        <NotificationConsole />
      )}
    </div>
  );
};
