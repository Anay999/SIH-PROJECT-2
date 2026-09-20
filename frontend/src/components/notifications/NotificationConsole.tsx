import React, { useState, useEffect } from 'react';
import {
  Send,
  MessageSquare,
  Smartphone,
  RefreshCw,
  Clock
} from 'lucide-react';

interface NotificationStatus {
  status: string;
  providers: {
    callmebot: {
      name: string;
      purpose: string;
      is_configured: boolean;
      mode: string;
      target_phone_masked: string;
      notes: string;
    };
    fast2sms: {
      name: string;
      purpose: string;
      is_configured: boolean;
      mode: string;
      sender_id: string;
      dlt_configured: boolean;
      notes: string;
    };
  };
  recent_dispatches: Array<{
    id: string;
    channel: string;
    recipient: string;
    ward: string;
    timestamp: string;
    status: string;
    message_preview: string;
  }>;
}

export const NotificationConsole: React.FC = () => {
  const [statusData, setStatusData] = useState<NotificationStatus | null>(null);
  const [loading, setLoading] = useState(false);

  // WhatsApp Form
  const [waPhone, setWaPhone] = useState('+919876543210');
  const [waWard, setWaWard] = useState('Ward 114 (Teynampet)');
  const [waRisk, setWaRisk] = useState('HIGH');
  const [waHtsi, setWaHtsi] = useState(78.5);
  const [waFacility, setWaFacility] = useState('Government Multi Super Speciality Hospital');
  const [waDistance, setWaDistance] = useState('1.4 km');
  const [waSending, setWaSending] = useState(false);
  const [waResult, setWaResult] = useState<any>(null);

  // SMS Form
  const [smsNumbers, setSmsNumbers] = useState('9876543210');
  const [smsWard, setSmsWard] = useState('Ward 114 (Teynampet)');
  const [smsRoute, setSmsRoute] = useState<'q' | 'dlt'>('q');
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState<any>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const resp = await fetch('/api/notifications/status');
      if (resp.ok) {
        const data = await resp.json();
        setStatusData(data);
      }
    } catch (err) {
      console.error('Failed to fetch notification status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSendWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setWaSending(true);
    setWaResult(null);
    try {
      const resp = await fetch('/api/notifications/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: waPhone,
          ward: waWard,
          risk: waRisk,
          htsi: Number(waHtsi),
          facility: waFacility,
          distance: waDistance,
        }),
      });
      const data = await resp.json();
      setWaResult(data);
      fetchStatus();
    } catch (err: any) {
      setWaResult({ success: false, note: err.message });
    } finally {
      setWaSending(false);
    }
  };

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmsSending(true);
    setSmsResult(null);
    try {
      const resp = await fetch('/api/notifications/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numbers: smsNumbers,
          ward: smsWard,
          value: 78.5,
          route: smsRoute,
        }),
      });
      const data = await resp.json();
      setSmsResult(data);
      fetchStatus();
    } catch (err: any) {
      setSmsResult({ success: false, note: err.message });
    } finally {
      setSmsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Send className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-wide">
              MULTICHANNEL NOTIFICATION ENGINE & TEST CONSOLE
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Isolates CallMeBot WhatsApp testing & Fast2SMS DLT bulk emergency alert gateways behind backend services.
          </p>
        </div>

        <button
          onClick={fetchStatus}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${loading ? 'animate-spin' : ''}`} />
          Refresh Providers
        </button>
      </div>

      {/* Two Testing Consoles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CONSOLE 1: CallMeBot WhatsApp */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">CallMeBot WhatsApp Test Console</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                TEST MODE
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Constructs standardized emergency notification alerts with destination coordinates, hospital proximity, and thermal stress indices.
            </p>

            <form onSubmit={handleSendWhatsApp} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Recipient Phone (+91...)</label>
                <input
                  type="text"
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Ward Identifier</label>
                  <input
                    type="text"
                    value={waWard}
                    onChange={(e) => setWaWard(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nearest Facility</label>
                  <input
                    type="text"
                    value={waFacility}
                    onChange={(e) => setWaFacility(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Risk Level</label>
                  <input
                    type="text"
                    value={waRisk}
                    onChange={(e) => setWaRisk(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-400 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">HTSI Score</label>
                  <input
                    type="number"
                    step="0.1"
                    value={waHtsi}
                    onChange={(e) => setWaHtsi(parseFloat(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-rose-400 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Distance</label>
                  <input
                    type="text"
                    value={waDistance}
                    onChange={(e) => setWaDistance(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-cyan-400 font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={waSending}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {waSending ? 'Constructing & Dispatching...' : 'SEND TEST WHATSAPP'}
              </button>
            </form>

            {/* Response Card */}
            {waResult && (
              <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-emerald-400">Dispatch Status:</span>
                  <span className="text-[10px] text-slate-400 font-mono">{waResult.mode}</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">{waResult.note || waResult.disclaimer}</p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between mt-4">
            <span>Provider: {statusData?.providers.callmebot.name || 'CallMeBot'}</span>
            <span>Zero frontend secrets</span>
          </div>
        </div>

        {/* CONSOLE 2: Fast2SMS SMS */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Fast2SMS SMS Console</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                DLT READY
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              India national SMS gateway supporting Quick SMS & TRAI DLT approved template headers for mass civic broadcasts.
            </p>

            <form onSubmit={handleSendSms} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Ward Identifier</label>
                <input
                  type="text"
                  value={smsWard}
                  onChange={(e) => setSmsWard(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Mobile Numbers (10 Digits)</label>
                <input
                  type="text"
                  value={smsNumbers}
                  onChange={(e) => setSmsNumbers(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Gateway Route</label>
                  <select
                    value={smsRoute}
                    onChange={(e) => setSmsRoute(e.target.value as 'q' | 'dlt')}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="q">Quick SMS (Bulk V2)</option>
                    <option value="dlt">DLT Template (Official)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Sender ID</label>
                  <input
                    type="text"
                    value={statusData?.providers.fast2sms.sender_id || 'TXTIND'}
                    readOnly
                    className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={smsSending}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {smsSending ? 'Broadcasting via Gateway...' : 'SEND TEST SMS'}
              </button>
            </form>

            {/* Response Card */}
            {smsResult && (
              <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-blue-400">Gateway Status:</span>
                  <span className="text-[10px] text-slate-400 font-mono">{smsResult.mode}</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">{smsResult.note || smsResult.disclaimer}</p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between mt-4">
            <span>Provider: Fast2SMS bulkV2</span>
            <span>TRAI DLT Compliant</span>
          </div>
        </div>
      </div>

      {/* Recent Dispatches Audit Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-bold text-white">Recent Notification Audit Log</h3>
          </div>
          <span className="text-xs text-slate-400">Showing last {statusData?.recent_dispatches.length || 0} alerts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="pb-2">Timestamp</th>
                <th className="pb-2">Channel</th>
                <th className="pb-2">Recipient</th>
                <th className="pb-2">Ward</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Message Snippet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {statusData?.recent_dispatches && statusData.recent_dispatches.length > 0 ? (
                statusData.recent_dispatches.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 font-mono text-[11px] text-slate-400">{log.timestamp}</td>
                    <td className="py-2.5 font-medium text-white">{log.channel}</td>
                    <td className="py-2.5 font-mono text-slate-300">{log.recipient}</td>
                    <td className="py-2.5 text-slate-300">{log.ward}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-400 text-[11px] max-w-xs truncate">{log.message_preview}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No notifications dispatched yet in this runtime session. Trigger a test alert above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
