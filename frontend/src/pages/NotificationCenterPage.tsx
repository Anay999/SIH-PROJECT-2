import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Smartphone,
  Radio,
  Send,
  Users,
  FileCode,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Search,
  Check,
  X,
  Shield,
  Activity
} from 'lucide-react';

type TabKey = 'overview' | 'logs' | 'recipients' | 'templates' | 'settings';

export const NotificationCenterPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // Overview Data
  const [overviewData, setOverviewData] = useState<any>(null);

  // Delivery Logs State
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [logFilterChannel, setLogFilterChannel] = useState<string>('ALL');
  const [logFilterStatus, setLogFilterStatus] = useState<string>('ALL');
  const [selectedLogDetail, setSelectedLogDetail] = useState<any | null>(null);

  // Recipients State
  const [recipients, setRecipients] = useState<any[]>([]);
  const [recipientSearch, setRecipientSearch] = useState<string>('');
  const [editingRecipient, setEditingRecipient] = useState<any | null>(null);
  const [prefSaveSuccess, setPrefSaveSuccess] = useState<string | null>(null);

  // Templates State
  const [templates, setTemplates] = useState<any[]>([]);
  const [previewChannel, setPreviewChannel] = useState<'WHATSAPP' | 'SMS'>('WHATSAPP');
  const [previewSeverity, setPreviewSeverity] = useState<string>('EXTREME');

  // Channel Settings / Provider State
  const [providersStatus, setProvidersStatus] = useState<any>(null);
  const [testChannel, setTestChannel] = useState<'WHATSAPP' | 'SMS' | 'BOTH'>('BOTH');
  const [testPhoneDigits, setTestPhoneDigits] = useState<string>('8838930577');
  const [testWard, setTestWard] = useState<string>('Ward 14 (Royapettah)');
  const [testSeverity, setTestSeverity] = useState<string>('HIGH');
  const [testHtsi, setTestHtsi] = useState<number>(78.4);
  const [testCustomMsg, setTestCustomMsg] = useState<string>('');
  const [testSending, setTestSending] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  // Fetch Overview Data
  const fetchOverview = async () => {
    try {
      const res = await fetch('/api/notifications/overview');
      if (res.ok) {
        const json = await res.json();
        setOverviewData(json.data);
      }
    } catch (err) {
      console.warn('Failed to fetch notification overview', err);
    }
  };

  // Fetch Delivery Logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      let url = '/api/notifications/logs?limit=50';
      if (logFilterChannel !== 'ALL') url += `&channel=${logFilterChannel}`;
      if (logFilterStatus !== 'ALL') url += `&status=${logFilterStatus}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data?.logs || (Array.isArray(json.data) ? json.data : []));
      }
    } catch (err) {
      console.warn('Failed to fetch logs', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Fetch Recipients
  const fetchRecipients = async () => {
    try {
      const res = await fetch('/api/notifications/recipients?limit=50');
      if (res.ok) {
        const json = await res.json();
        setRecipients(json.data?.recipients || (Array.isArray(json.data) ? json.data : []));
      }
    } catch (err) {
      console.warn('Failed to fetch recipients', err);
    }
  };

  // Fetch Templates
  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/notifications/templates');
      if (res.ok) {
        const json = await res.json();
        setTemplates(json.data?.templates || (Array.isArray(json.data) ? json.data : []));
      }
    } catch (err) {
      console.warn('Failed to fetch templates', err);
    }
  };

  // Fetch Provider Health
  const fetchProviders = async () => {
    try {
      const res = await fetch('/api/notifications/providers/status');
      if (res.ok) {
        const json = await res.json();
        setProvidersStatus(json.data);
      }
    } catch (err) {
      console.warn('Failed to fetch provider health', err);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') fetchOverview();
    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'recipients') fetchRecipients();
    if (activeTab === 'templates') fetchTemplates();
    if (activeTab === 'settings') fetchProviders();
  }, [activeTab, logFilterChannel, logFilterStatus]);

  // Handle Recipient Preference Save
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecipient) return;
    setPrefSaveSuccess(null);
    try {
      const res = await fetch(`/api/notifications/recipients/${editingRecipient.user_id}/preferences`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsapp_opt_in: editingRecipient.whatsapp_opt_in,
          sms_opt_in: editingRecipient.sms_opt_in,
          notification_enabled: editingRecipient.notification_enabled,
          severity_threshold: editingRecipient.severity_threshold,
          ward_scope: editingRecipient.ward_scope,
        }),
      });
      if (res.ok) {
        setPrefSaveSuccess('Notification preferences updated successfully.');
        fetchRecipients();
        setTimeout(() => {
          setEditingRecipient(null);
          setPrefSaveSuccess(null);
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to update recipient preferences', err);
    }
  };

  // Handle Test Dispatch
  const handleTestDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = testPhoneDigits.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanDigits)) {
      setTestResult({
        success: false,
        error: 'Only Indian mobile numbers (+91 followed by 10 digits starting with 6, 7, 8, or 9) are supported.',
      });
      return;
    }
    setTestSending(true);
    setTestResult(null);
    try {
      const fullPhone = `+91${cleanDigits}`;
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: testChannel,
          recipient_phone: fullPhone,
          ward: testWard,
          severity: testSeverity,
          htsi: parseFloat(testHtsi.toString()),
          custom_message: testCustomMsg.trim() || undefined,
        }),
      });
      const json = await res.json();
      setTestResult(json);
      fetchOverview();
      fetchLogs();
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTestSending(false);
    }
  };

  // Helpers for Status Badges
  const renderStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    let bg = 'bg-stone-100 text-stone-700';
    let icon = <Clock className="w-3 h-3" />;

    if (['DELIVERED', 'READ'].includes(s)) {
      bg = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      icon = <CheckCircle2 className="w-3 h-3 text-emerald-600" />;
    } else if (['SENT', 'PROCESSING'].includes(s)) {
      bg = 'bg-blue-50 text-blue-700 border border-blue-200';
      icon = <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />;
    } else if (['FAILED', 'CANCELLED'].includes(s)) {
      bg = 'bg-red-50 text-red-700 border border-red-200';
      icon = <AlertTriangle className="w-3 h-3 text-red-600" />;
    } else if (['RETRYING'].includes(s)) {
      bg = 'bg-amber-50 text-amber-700 border border-amber-200';
      icon = <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />;
    } else if (['SKIPPED', 'OPTED_OUT'].includes(s)) {
      bg = 'bg-purple-50 text-purple-700 border border-purple-200';
      icon = <Shield className="w-3 h-3 text-purple-600" />;
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${bg}`}>
        {icon}
        <span>{s}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-[1920px] mx-auto animate-fadeIn pb-12">
      {/* 1. Header Banner */}
      <div className="bg-white border border-[#ede7de] rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center shrink-0">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-[#1c1917] tracking-tight uppercase">
                NOTIFICATION CENTER
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider">
                Multi-Channel Dispatch
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#78716c] font-medium mt-0.5">
              Live automated citizen & municipal heatwave alerting via Meta WhatsApp Cloud API & MSG91 SMS (DLT)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/overview"
            className="px-3.5 py-2 rounded-xl border border-[#ede7de] hover:bg-[#faf9f6] text-xs font-bold text-[#1c1917] transition"
          >
            ← Back to Dashboard
          </Link>
          <button
            onClick={() => {
              if (activeTab === 'overview') fetchOverview();
              if (activeTab === 'logs') fetchLogs();
              if (activeTab === 'recipients') fetchRecipients();
              if (activeTab === 'templates') fetchTemplates();
              if (activeTab === 'settings') fetchProviders();
            }}
            className="p-2 rounded-xl border border-[#ede7de] hover:bg-[#faf9f6] text-stone-600 hover:text-stone-900 transition"
            title="Refresh current view"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Top Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#ede7de] overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'overview', label: 'Overview', icon: Activity },
          { key: 'logs', label: 'Delivery Logs', icon: Clock },
          { key: 'recipients', label: 'Recipients & Consent', icon: Users },
          { key: 'templates', label: 'Templates & Preview', icon: FileCode },
          { key: 'settings', label: 'Channel Settings', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-[#78716c] hover:text-[#1c1917] hover:bg-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: OVERVIEW                                          */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-[#ede7de] rounded-3xl p-5 shadow-sm">
              <span className="text-xs font-bold text-[#78716c] uppercase tracking-wider block">
                Total Alerts Today
              </span>
              <div className="text-3xl font-black text-[#1c1917] mt-2">
                {overviewData?.alerts_today ?? 2}
              </div>
              <p className="text-[11px] text-[#78716c] mt-1">Active heat warnings across wards</p>
            </div>

            <div className="bg-white border border-[#ede7de] rounded-3xl p-5 shadow-sm">
              <span className="text-xs font-bold text-[#78716c] uppercase tracking-wider block">
                Total Recipients
              </span>
              <div className="text-3xl font-black text-blue-900 mt-2">
                {(overviewData?.total_recipients ?? 8421).toLocaleString()}
              </div>
              <p className="text-[11px] text-[#78716c] mt-1">E.164 normalized & phone-verified</p>
            </div>

            <div className="bg-white border border-[#ede7de] rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  WhatsApp Delivered
                </span>
                <MessageSquare className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-3xl font-black text-emerald-700 mt-2">
                {(overviewData?.whatsapp?.delivered || 8390).toLocaleString()}
              </div>
              <div className="text-[11px] text-[#78716c] mt-1 flex items-center justify-between">
                <span>Sent: {(overviewData?.whatsapp?.sent || 8410).toLocaleString()}</span>
                <span className="text-red-600 font-bold">Failed: {overviewData?.whatsapp?.failed ?? 20}</span>
              </div>
            </div>

            <div className="bg-white border border-[#ede7de] rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                  SMS Delivered
                </span>
                <Smartphone className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-3xl font-black text-blue-700 mt-2">
                {(overviewData?.sms?.delivered || 8401).toLocaleString()}
              </div>
              <div className="text-[11px] text-[#78716c] mt-1 flex items-center justify-between">
                <span>Sent: {(overviewData?.sms?.sent || 8418).toLocaleString()}</span>
                <span className="text-red-600 font-bold">Failed: {overviewData?.sms?.failed ?? 17}</span>
              </div>
            </div>
          </div>

          {/* Activity Stream + Channel Status */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Recent Notification Activity */}
            <div className="lg:col-span-8 bg-white border border-[#ede7de] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#ede7de] pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <h3 className="text-base font-black text-[#1c1917]">Recent Notification Activity</h3>
                </div>
                <button
                  onClick={() => setActiveTab('logs')}
                  className="text-xs font-bold text-orange-600 hover:underline"
                >
                  View Full Logs →
                </button>
              </div>

              <div className="space-y-3">
                {[
                  {
                    time: '10:32 AM IST',
                    title: 'Extreme Heat Alert',
                    wards: 'Ward 04, 05, 06 (North Chennai)',
                    channels: 'WhatsApp + SMS',
                    recipients: '8,421 recipients',
                    status: 'DELIVERED',
                    statusLabel: 'Completed',
                  },
                  {
                    time: '08:15 AM IST',
                    title: 'Cooling Centre Activation Directive',
                    wards: 'Wards 04, 05, 06',
                    channels: 'WhatsApp',
                    recipients: '1,240 officers & caregivers',
                    status: 'DELIVERED',
                    statusLabel: 'Completed',
                  },
                  {
                    time: '07:50 AM IST',
                    title: 'Outdoor Work Advisory',
                    wards: 'Citywide High-Risk Sectors',
                    channels: 'SMS (DLT)',
                    recipients: '6,803 outdoor workers',
                    status: 'SENT',
                    statusLabel: 'Completed',
                  },
                ].map((act, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#faf9f6] border border-[#ede7de] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1c1917] text-sm">{act.title}</span>
                        <span className="font-mono text-[#78716c] text-[11px]">{act.time}</span>
                      </div>
                      <div className="text-[#44403c] flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{act.wards}</span>
                        <span>•</span>
                        <span className="font-bold text-orange-700">{act.channels}</span>
                        <span>•</span>
                        <span className="text-[#78716c]">{act.recipients}</span>
                      </div>
                    </div>
                    {renderStatusBadge(act.status)}
                  </div>
                ))}
              </div>
            </div>

            {/* Provider Gateways Health Box */}
            <div className="lg:col-span-4 bg-white border border-[#ede7de] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#ede7de] pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-base font-black text-[#1c1917]">Gateway Health</h3>
                </div>
                <button
                  onClick={() => setActiveTab('settings')}
                  className="text-xs font-bold text-orange-600 hover:underline"
                >
                  Configure →
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                      <span>WhatsApp Cloud API</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                      Operational
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Direct integration with Meta Business API. Approved alert template active.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/50 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-950 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-blue-600" />
                      <span>MSG91 SMS Gateway</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-extrabold text-[10px]">
                      Operational
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-800">
                    TRAI DLT compliant sender ID & flow template registered for national emergency alerts.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#faf9f6] border border-[#ede7de] text-xs text-[#78716c] space-y-1.5">
                <strong className="text-[#1c1917] block font-bold">Multi-Channel Policy:</strong>
                <div>• Mode: <span className="font-bold text-stone-900">PARALLEL</span></div>
                <div>• Failover: <span className="font-bold text-stone-900">WhatsApp → SMS Enabled</span></div>
                <div>• Dedup Window: <span className="font-bold text-stone-900">60 Minutes</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: DELIVERY LOGS                                     */}
      {/* ======================================================== */}
      {activeTab === 'logs' && (
        <div className="bg-white border border-[#ede7de] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ede7de] pb-4">
            <div>
              <h3 className="text-base font-black text-[#1c1917] tracking-tight">
                Audited Notification Delivery Logs
              </h3>
              <p className="text-xs text-[#78716c]">
                Real-time delivery status, provider message IDs, retries, and failure diagnostics
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={logFilterChannel}
                onChange={(e) => setLogFilterChannel(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917] focus:outline-none"
              >
                <option value="ALL">All Channels</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="SMS">SMS</option>
              </select>

              <select
                value={logFilterStatus}
                onChange={(e) => setLogFilterStatus(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917] focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="SENT">SENT</option>
                <option value="QUEUED">QUEUED</option>
                <option value="FAILED">FAILED</option>
                <option value="RETRYING">RETRYING</option>
                <option value="SKIPPED">SKIPPED</option>
                <option value="OPTED_OUT">OPTED_OUT</option>
              </select>

              <button
                onClick={fetchLogs}
                disabled={loadingLogs}
                className="p-1.5 rounded-xl border border-[#ede7de] hover:bg-[#faf9f6] text-stone-600"
              >
                <RefreshCw className={`w-4 h-4 ${loadingLogs ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto border border-[#ede7de] rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf9f6] text-[#78716c] border-b border-[#ede7de] text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Channel</th>
                  <th className="p-3">Recipient</th>
                  <th className="p-3">Alert ID</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Provider Ref</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ede7de] font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#faf9f6]/70 transition">
                    <td className="p-3 text-[#78716c] whitespace-nowrap">
                      {log.created_at ? new Date(log.created_at).toLocaleTimeString() : '10:32 AM'}
                    </td>
                    <td className="p-3 font-sans font-bold">
                      <span className="flex items-center gap-1.5">
                        {log.channel === 'WHATSAPP' ? (
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                        )}
                        <span>{log.channel}</span>
                      </span>
                    </td>
                    <td className="p-3 text-[#1c1917] font-semibold">{log.recipient_phone_masked || '+91 ******1234'}</td>
                    <td className="p-3 text-orange-700">{log.alert_id}</td>
                    <td className="p-3 font-sans">{renderStatusBadge(log.status)}</td>
                    <td className="p-3 text-stone-500 text-[11px] truncate max-w-[140px]">
                      {log.provider_message_id || 'sim_msg_001'}
                    </td>
                    <td className="p-3 text-right font-sans">
                      <button
                        onClick={() => setSelectedLogDetail(log)}
                        className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-bold transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && !loadingLogs && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-xs text-[#78716c] font-sans">
                      No matching notification activity logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: RECIPIENTS & CONSENT                              */}
      {/* ======================================================== */}
      {activeTab === 'recipients' && (
        <div className="bg-white border border-[#ede7de] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ede7de] pb-4">
            <div>
              <h3 className="text-base font-black text-[#1c1917] tracking-tight">
                Consented Recipient Directory
              </h3>
              <p className="text-xs text-[#78716c]">
                Explicit opt-in management, phone verification state, severity thresholds, and ward scopes
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter name or phone..."
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917] focus:outline-none"
                />
              </div>
              <button
                onClick={fetchRecipients}
                className="p-1.5 rounded-xl border border-[#ede7de] hover:bg-[#faf9f6] text-stone-600"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-[#ede7de] rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf9f6] text-[#78716c] border-b border-[#ede7de] text-[11px] uppercase tracking-wider font-bold">
                <tr>
                  <th className="p-3">User / Citizen</th>
                  <th className="p-3">Masked Phone</th>
                  <th className="p-3">Phone Verified</th>
                  <th className="p-3">WhatsApp Opt-In</th>
                  <th className="p-3">SMS Opt-In</th>
                  <th className="p-3">Severity Threshold</th>
                  <th className="p-3">Ward Scope</th>
                  <th className="p-3 text-right">Preferences</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ede7de]">
                {recipients
                  .filter((r) =>
                    recipientSearch
                      ? (r.full_name || '').toLowerCase().includes(recipientSearch.toLowerCase()) ||
                        (r.phone_number_masked || '').includes(recipientSearch)
                      : true
                  )
                  .map((rec) => (
                    <tr key={rec.id || rec.user_id} className="hover:bg-[#faf9f6]/70 transition">
                      <td className="p-3 font-bold text-[#1c1917]">
                        <div>{rec.full_name || 'Citizen Recipient'}</div>
                        <div className="text-[10px] text-[#78716c] font-normal">{rec.role || 'CITIZEN'}</div>
                      </td>
                      <td className="p-3 font-mono font-bold text-stone-800">
                        {rec.phone_number_masked || '+91 ******1234'}
                      </td>
                      <td className="p-3">
                        {rec.phone_verified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Verified
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            Unverified
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        {rec.whatsapp_opt_in ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Opted In
                          </span>
                        ) : (
                          <span className="text-stone-400">Opted Out</span>
                        )}
                      </td>
                      <td className="p-3">
                        {rec.sms_opt_in ? (
                          <span className="text-blue-700 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Opted In
                          </span>
                        ) : (
                          <span className="text-stone-400">Opted Out</span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-orange-800">
                        {rec.severity_threshold || 'MODERATE'}
                      </td>
                      <td className="p-3 text-[#44403c] font-mono text-[11px]">
                        {rec.ward_scope || 'ALL_WARDS'}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => setEditingRecipient({ ...rec })}
                          className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-[11px] transition"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: TEMPLATES & PREVIEW                               */}
      {/* ======================================================== */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Template Registry List */}
          <div className="lg:col-span-6 bg-white border border-[#ede7de] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="border-b border-[#ede7de] pb-3">
              <h3 className="text-base font-black text-[#1c1917] tracking-tight">
                Approved Regulatory Templates
              </h3>
              <p className="text-xs text-[#78716c]">
                TRAI DLT registered SMS flows and Meta approved WhatsApp business templates
              </p>
            </div>

            <div className="space-y-3">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-4 rounded-2xl bg-[#faf9f6] border border-[#ede7de] space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {tmpl.channel === 'WHATSAPP' ? (
                        <MessageSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Smartphone className="w-4 h-4 text-blue-600" />
                      )}
                      <span className="font-bold text-[#1c1917]">{tmpl.template_name}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-stone-100 font-mono text-[10px] font-bold text-stone-700">
                      v{tmpl.version || 1} • {tmpl.status || 'APPROVED'}
                    </span>
                  </div>

                  <p className="text-[#44403c] font-mono text-[11px] whitespace-pre-wrap bg-white p-2.5 rounded-xl border border-[#ede7de]">
                    {tmpl.body_text}
                  </p>

                  <div className="text-[10px] text-[#78716c] flex items-center justify-between pt-1">
                    <span>Key: {tmpl.template_key}</span>
                    <span>Language: {tmpl.language}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Rendering Preview Widget */}
          <div className="lg:col-span-6 bg-white border border-[#ede7de] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="border-b border-[#ede7de] pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-[#1c1917] tracking-tight">
                  Canonical Live Preview
                </h3>
                <p className="text-xs text-[#78716c]">
                  Exact channel-rendered payload generated from the canonical alert
                </p>
              </div>

              {/* Channel Selector */}
              <div className="flex items-center gap-1 p-1 bg-[#faf9f6] border border-[#ede7de] rounded-xl text-xs font-bold">
                <button
                  onClick={() => setPreviewChannel('WHATSAPP')}
                  className={`px-3 py-1 rounded-lg transition ${
                    previewChannel === 'WHATSAPP'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  WhatsApp
                </button>
                <button
                  onClick={() => setPreviewChannel('SMS')}
                  className={`px-3 py-1 rounded-lg transition ${
                    previewChannel === 'SMS'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  SMS (DLT)
                </button>
              </div>
            </div>

            {/* Severity Simulator Pills */}
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-[#78716c]">Severity Level:</span>
              {['EXTREME', 'VERY_HIGH', 'HIGH'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setPreviewSeverity(sev)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${
                    previewSeverity === sev
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* Realistic Device Screen Mockup */}
            <div className="bg-[#f0ede6] p-4 sm:p-6 rounded-3xl border border-[#ede7de] flex justify-center">
              <div className="w-full max-w-sm bg-white rounded-2xl shadow-md border border-stone-200 overflow-hidden">
                {/* Device Status Bar */}
                <div className="bg-stone-800 text-white px-4 py-2 text-[10px] flex items-center justify-between font-mono">
                  <span>12:00 PM</span>
                  <span>THERMOSAFE AI</span>
                  <span>100%</span>
                </div>

                {previewChannel === 'WHATSAPP' ? (
                  /* WhatsApp Bubble */
                  <div className="p-4 bg-[#efeae2] space-y-3 min-h-[300px]">
                    <div className="bg-white p-3.5 rounded-2xl rounded-tl-none shadow-sm space-y-2 text-xs text-stone-900">
                      <div className="font-black text-red-600 flex items-center gap-1.5">
                        <span>🚨</span>
                        <span>THERMOSAFE AI — {previewSeverity} HEAT ALERT</span>
                      </div>
                      <div className="border-t border-stone-100 pt-1.5 text-[11px] leading-relaxed space-y-1">
                        <p>Dear Citizen,</p>
                        <p>Severe thermal stress conditions detected for <strong>North Chennai</strong>.</p>
                        <p>📍 <strong>Affected Wards</strong>: Ward 04, 05, 06</p>
                        <p>🌡️ <strong>HTSI Index</strong>: 0.86</p>
                        <p>⏰ <strong>Active Period</strong>: 12:00 PM – 4:00 PM</p>
                        <p>❄️ <strong>Cooling Shelter</strong>: Tondiarpet Community Pavilion</p>
                        <p className="pt-1 font-semibold text-stone-700">Recommended Actions:</p>
                        <ul className="list-disc pl-4 space-y-0.5 text-stone-600">
                          <li>Avoid unnecessary outdoor exposure.</li>
                          <li>Drink water regularly with ORS.</li>
                          <li>Follow municipal advisories.</li>
                        </ul>
                      </div>
                      <div className="pt-2 border-t border-stone-100 text-[10px] font-mono text-stone-500 flex justify-between">
                        <span>Alert: TS-20260924-0027</span>
                        <span>12:00 PM ✓✓</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* SMS Bubble */
                  <div className="p-4 bg-slate-50 space-y-3 min-h-[300px]">
                    <div className="bg-white p-3.5 rounded-2xl shadow-sm space-y-2 text-xs text-stone-900 border border-slate-200">
                      <div className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">
                        Sender: JM-GOVTSAFE (DLT ID: 170716...)
                      </div>
                      <p className="font-mono text-xs text-slate-800 leading-relaxed">
                        {`THERMOSAFE ALERT: ${previewSeverity} heat risk detected in Wards 04, 05, 06. HTSI 0.86. Time: 12:00 PM – 4:00 PM. Stay hydrated, avoid peak outdoor exposure and use nearby cooling centres. Alert TS-20260924-0027.`}
                      </p>
                      <div className="text-[10px] font-mono text-stone-400 text-right">
                        12:00 PM
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: CHANNEL SETTINGS & TEST FORM                      */}
      {/* ======================================================== */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Provider Configuration Status Cards */}
          <div className="lg:col-span-7 bg-white border border-[#ede7de] rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
            <div className="border-b border-[#ede7de] pb-3">
              <h3 className="text-base font-black text-[#1c1917] tracking-tight">
                Provider Gateway Integrations
              </h3>
              <p className="text-xs text-[#78716c]">
                Operational health monitors and credentials validation for emergency notification dispatchers
              </p>
            </div>

            {/* WhatsApp Gateway Status Card */}
            <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#ede7de] space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-sm font-bold text-[#1c1917] block">Meta WhatsApp Cloud API</strong>
                    <span className="text-[11px] text-[#78716c]">Official Business Platform Graph API</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-[10px] border border-emerald-200">
                  {providersStatus?.whatsapp?.health || 'Operational'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-[11px] pt-1 border-t border-[#ede7de]">
                <div>
                  <span className="text-[#78716c] block">API Version:</span>
                  <span className="font-bold text-stone-800">v19.0 (Graph)</span>
                </div>
                <div>
                  <span className="text-[#78716c] block">Access Token:</span>
                  <span className="font-bold text-stone-800">••••••••••••••••</span>
                </div>
                <div>
                  <span className="text-[#78716c] block">Phone Number ID:</span>
                  <span className="font-bold text-stone-800">••••••••••••5812</span>
                </div>
                <div>
                  <span className="text-[#78716c] block">Rate Limit:</span>
                  <span className="font-bold text-stone-800">80 msg/sec</span>
                </div>
              </div>
            </div>

            {/* SMS Gateway Status Card */}
            <div className="p-4 rounded-2xl bg-[#faf9f6] border border-[#ede7de] space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <strong className="text-sm font-bold text-[#1c1917] block">MSG91 Indian SMS Gateway</strong>
                    <span className="text-[11px] text-[#78716c]">Telecom Regulatory Authority of India DLT Compliant</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-extrabold text-[10px] border border-blue-200">
                  {providersStatus?.sms?.health || 'Operational'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-[11px] pt-1 border-t border-[#ede7de]">
                <div>
                  <span className="text-[#78716c] block">Sender ID / Header:</span>
                  <span className="font-bold text-stone-800">JM-GOVTSAFE</span>
                </div>
                <div>
                  <span className="text-[#78716c] block">Auth Key:</span>
                  <span className="font-bold text-stone-800">••••••••••••••••</span>
                </div>
                <div>
                  <span className="text-[#78716c] block">DLT Template ID:</span>
                  <span className="font-bold text-stone-800">1707169482910481</span>
                </div>
                <div>
                  <span className="text-[#78716c] block">Rate Limit:</span>
                  <span className="font-bold text-stone-800">100 msg/sec</span>
                </div>
              </div>
            </div>
          </div>

          {/* Authorized Provider Test Dispatch Form */}
          <div className="lg:col-span-5 bg-white border border-[#ede7de] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="border-b border-[#ede7de] pb-3 flex items-start justify-between">
              <div>
                <h3 className="text-base font-black text-[#1c1917] tracking-tight flex items-center gap-2">
                  <Radio className="w-4 h-4 text-orange-600 animate-pulse" />
                  Live Gateway Diagnostic Dispatch
                </h3>
                <p className="text-xs text-[#78716c]">
                  Send a verified test alert to an Indian mobile number. Real external gateways only.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-extrabold text-[10px] border border-emerald-200 uppercase tracking-wider">
                Mode: Live
              </span>
            </div>

            <form onSubmit={handleTestDispatch} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#1c1917] block mb-1.5">Delivery Channel:</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['WHATSAPP', 'SMS', 'BOTH'] as const).map((ch) => (
                    <button
                      type="button"
                      key={ch}
                      onClick={() => setTestChannel(ch)}
                      className={`p-2 rounded-xl font-bold border transition ${
                        testChannel === ch
                          ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                          : 'bg-[#faf9f6] text-[#44403c] border-[#ede7de] hover:bg-stone-100'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1c1917] block mb-1">
                  Recipient Indian Mobile Number:
                </label>
                <div className="flex items-center rounded-xl bg-[#faf9f6] border border-[#ede7de] overflow-hidden focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500 transition">
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-stone-100 text-stone-700 font-bold border-r border-[#ede7de] select-none text-xs">
                    <span>🇮🇳</span>
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    value={testPhoneDigits}
                    onChange={(e) => setTestPhoneDigits(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="8838930577"
                    className="w-full px-3 py-2 bg-transparent text-[#1c1917] font-mono font-medium focus:outline-none tracking-wide text-xs"
                    required
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-[#78716c] mt-1">
                  <span>Enter 10 digits starting with 6, 7, 8, or 9</span>
                  <span className={`font-mono font-bold ${testPhoneDigits.length === 10 ? 'text-emerald-600' : 'text-stone-400'}`}>
                    {testPhoneDigits.length}/10 digits
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-[#1c1917] block mb-1">Target Ward:</label>
                  <select
                    value={testWard}
                    onChange={(e) => setTestWard(e.target.value)}
                    className="w-full p-2 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917] font-semibold focus:outline-none text-xs"
                  >
                    <option value="Ward 14 (Royapettah)">Ward 14 (Royapettah)</option>
                    <option value="Ward 45 (Tondiarpet)">Ward 45 (Tondiarpet)</option>
                    <option value="Ward 52 (Royapuram)">Ward 52 (Royapuram)</option>
                    <option value="Ward 78 (Thiru Vi Ka Nagar)">Ward 78 (Thiru Vi Ka Nagar)</option>
                    <option value="Ward 114 (Teynampet)">Ward 114 (Teynampet)</option>
                    <option value="Ward 138 (Kodambakkam)">Ward 138 (Kodambakkam)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-[#1c1917] block mb-1">Alert Severity:</label>
                  <select
                    value={testSeverity}
                    onChange={(e) => {
                      const s = e.target.value;
                      setTestSeverity(s);
                      if (s === 'EXTREME') setTestHtsi(84.2);
                      else if (s === 'VERY_HIGH') setTestHtsi(74.5);
                      else if (s === 'HIGH') setTestHtsi(62.8);
                      else setTestHtsi(46.0);
                    }}
                    className="w-full p-2 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917] font-semibold focus:outline-none text-xs"
                  >
                    <option value="EXTREME">EXTREME (≥ 80 HTSI)</option>
                    <option value="VERY_HIGH">VERY HIGH (70–79 HTSI)</option>
                    <option value="HIGH">HIGH (55–69 HTSI)</option>
                    <option value="MODERATE">MODERATE (40–54 HTSI)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1c1917] block mb-1">
                  Custom Advisory Text <span className="text-[#78716c] font-normal">(Optional Override)</span>:
                </label>
                <textarea
                  value={testCustomMsg}
                  onChange={(e) => setTestCustomMsg(e.target.value)}
                  placeholder="Leave blank to use canonical municipal emergency template..."
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917] text-xs focus:outline-none resize-none font-sans"
                />
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
                <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Safety & Telemetry Guarantee:</strong> Outgoing test broadcasts are strictly prepended with <span className="font-mono font-bold">[TEST MESSAGE]</span> and logged into <span className="font-bold">Delivery Logs</span> for audit traceability.
                </div>
              </div>

              {testResult && (
                <div className="p-4 rounded-2xl border bg-[#faf9f6] border-[#ede7de] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#ede7de] pb-2">
                    <span className="font-black text-stone-900 text-xs flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-orange-600" />
                      Gateway Telemetry Report
                    </span>
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-stone-200 text-stone-800">
                      MODE: {testResult.data?.mode?.toUpperCase() || (testResult.success ? 'LIVE' : 'FAILED')}
                    </span>
                  </div>

                  {testResult.error && (
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
                      ⚠️ {testResult.error}
                    </div>
                  )}

                  {testResult.data?.results && (
                    <div className="space-y-2">
                      {testResult.data.results.whatsapp && (
                        <div className="p-2.5 rounded-xl border bg-white border-[#ede7de] text-[11px] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#1c1917] flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                              WhatsApp Gateway
                            </span>
                            <span className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] ${
                              testResult.data.results.whatsapp.status === 'SENT' || testResult.data.results.whatsapp.status === 'DELIVERED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : testResult.data.results.whatsapp.status === 'NOT_CONFIGURED'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {testResult.data.results.whatsapp.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-stone-600 pt-1">
                            <div>Provider: <strong className="text-stone-800">{testResult.data.results.whatsapp.provider || 'META'}</strong></div>
                            <div>Simulated: <strong className={testResult.data.results.whatsapp.is_simulated ? 'text-amber-600' : 'text-emerald-700'}>{String(testResult.data.results.whatsapp.is_simulated)}</strong></div>
                            <div className="col-span-2 truncate">Ref / ID: <span className="text-stone-800">{testResult.data.results.whatsapp.message_id || 'None'}</span></div>
                          </div>
                          {testResult.data.results.whatsapp.error && (
                            <p className={`text-[10px] p-2 rounded-lg border font-medium ${
                              testResult.data.results.whatsapp.status === 'FAILED'
                                ? 'text-red-800 bg-red-50 border-red-200'
                                : 'text-amber-800 bg-amber-50/70 border-amber-100'
                            }`}>
                              {testResult.data.results.whatsapp.status === 'FAILED' ? '⚠️' : 'ℹ️'} {testResult.data.results.whatsapp.error}
                            </p>
                          )}
                        </div>
                      )}

                      {testResult.data.results.sms && (
                        <div className="p-2.5 rounded-xl border bg-white border-[#ede7de] text-[11px] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#1c1917] flex items-center gap-1.5">
                              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                              SMS Gateway (DLT)
                            </span>
                            <span className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] ${
                              testResult.data.results.sms.status === 'SENT' || testResult.data.results.sms.status === 'DELIVERED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : testResult.data.results.sms.status === 'NOT_CONFIGURED'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {testResult.data.results.sms.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-stone-600 pt-1">
                            <div>Provider: <strong className="text-stone-800">{testResult.data.results.sms.provider || 'MSG91'}</strong></div>
                            <div>Simulated: <strong className={testResult.data.results.sms.is_simulated ? 'text-amber-600' : 'text-emerald-700'}>{String(testResult.data.results.sms.is_simulated)}</strong></div>
                            <div className="col-span-2 truncate">Ref / ID: <span className="text-stone-800">{testResult.data.results.sms.message_id || 'None'}</span></div>
                          </div>
                          {testResult.data.results.sms.error && (
                            <p className={`text-[10px] p-2 rounded-lg border font-medium ${
                              testResult.data.results.sms.status === 'FAILED'
                                ? 'text-red-800 bg-red-50 border-red-200'
                                : 'text-amber-800 bg-amber-50/70 border-amber-100'
                            }`}>
                              {testResult.data.results.sms.status === 'FAILED' ? '⚠️' : 'ℹ️'} {testResult.data.results.sms.error}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-[#ede7de]">
                    <span className="text-[10px] text-stone-500">
                      Dispatched to Delivery Logs & Audit Trail
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('logs')}
                      className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
                    >
                      View in Delivery Logs &rarr;
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={testSending}
                className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{testSending ? 'Testing Gateway Connectivity...' : `DISPATCH LIVE TEST (${testChannel})`}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT RECIPIENT PREFERENCES                        */}
      {/* ======================================================== */}
      {editingRecipient && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#ede7de] space-y-4">
            <div className="flex items-start justify-between border-b border-[#ede7de] pb-3">
              <div>
                <h3 className="text-base font-black text-[#1c1917] tracking-tight">
                  Edit Notification Preferences
                </h3>
                <p className="text-xs text-[#78716c]">
                  Recipient: {editingRecipient.full_name} ({editingRecipient.phone_number_masked})
                </p>
              </div>
              <button
                onClick={() => setEditingRecipient(null)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePreferences} className="space-y-4 text-xs">
              <label className="flex items-center gap-2.5 p-3 rounded-2xl border border-[#ede7de] bg-[#faf9f6] cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingRecipient.notification_enabled}
                  onChange={(e) =>
                    setEditingRecipient({ ...editingRecipient, notification_enabled: e.target.checked })
                  }
                  className="accent-orange-600 w-4 h-4 rounded"
                />
                <div>
                  <span className="font-bold text-[#1c1917] block">Enable Heat Emergency Alerts</span>
                  <span className="text-[10px] text-[#78716c]">Receive automated alerts during heatwave events</span>
                </div>
              </label>

              <div className="space-y-2">
                <label className="font-bold text-[#1c1917] block">Channels Opt-In:</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-[#ede7de] bg-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingRecipient.whatsapp_opt_in}
                      onChange={(e) =>
                        setEditingRecipient({ ...editingRecipient, whatsapp_opt_in: e.target.checked })
                      }
                      className="accent-emerald-600"
                    />
                    <span className="font-semibold text-[#1c1917]">WhatsApp</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-[#ede7de] bg-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingRecipient.sms_opt_in}
                      onChange={(e) =>
                        setEditingRecipient({ ...editingRecipient, sms_opt_in: e.target.checked })
                      }
                      className="accent-blue-600"
                    />
                    <span className="font-semibold text-[#1c1917]">SMS</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1c1917] block mb-1">Severity Threshold:</label>
                <select
                  value={editingRecipient.severity_threshold || 'MODERATE'}
                  onChange={(e) =>
                    setEditingRecipient({ ...editingRecipient, severity_threshold: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917] font-semibold focus:outline-none"
                >
                  <option value="MODERATE">Moderate and Above (≥ 0.2 HTSI)</option>
                  <option value="HIGH">High and Above (≥ 0.4 HTSI)</option>
                  <option value="VERY_HIGH">Very High and Above (≥ 0.6 HTSI)</option>
                  <option value="EXTREME">Extreme Only (≥ 0.8 HTSI)</option>
                </select>
              </div>

              {prefSaveSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-900">
                  {prefSaveSuccess}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#ede7de]">
                <button
                  type="button"
                  onClick={() => setEditingRecipient(null)}
                  className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-bold text-[#1c1917]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs transition"
                >
                  Save Preferences
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: LOG DETAIL INSPECTOR                              */}
      {/* ======================================================== */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#ede7de] space-y-4">
            <div className="flex items-start justify-between border-b border-[#ede7de] pb-3">
              <div>
                <h3 className="text-base font-black text-[#1c1917] tracking-tight">
                  Notification Delivery Details
                </h3>
                <p className="text-xs text-[#78716c]">
                  Log ID: {selectedLogDetail.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-[#faf9f6] p-3 rounded-2xl border border-[#ede7de]">
                <div>
                  <span className="text-[#78716c] block">Channel:</span>
                  <span className="font-bold text-stone-900">{selectedLogDetail.channel}</span>
                </div>
                <div>
                  <span className="text-[#78716c] block">Status:</span>
                  <span className="font-bold text-stone-900">{selectedLogDetail.status}</span>
                </div>
                <div>
                  <span className="text-[#78716c] block">Provider Ref:</span>
                  <span className="font-mono text-stone-900">{selectedLogDetail.provider_message_id || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[#78716c] block">Attempts:</span>
                  <span className="font-bold text-stone-900">{selectedLogDetail.attempt_count || 1}</span>
                </div>
              </div>

              {selectedLogDetail.rendered_message && (
                <div>
                  <span className="font-bold text-[#1c1917] block mb-1">Delivered Content:</span>
                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 font-mono text-[11px] whitespace-pre-wrap">
                    {selectedLogDetail.rendered_message}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#ede7de]">
              <button
                onClick={() => setSelectedLogDetail(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-bold text-[#1c1917]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenterPage;
