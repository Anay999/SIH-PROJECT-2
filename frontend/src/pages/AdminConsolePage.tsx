import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Shield,
  Activity,
  UserPlus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Server,
  FileText,
  LogOut,
  UserCheck,
  UserX,
  MapPin,
  Building,
  Key
} from 'lucide-react';

interface ManagedUser {
  id: string;
  username: string;
  full_name: string;
  role: 'ADMIN' | 'MUNICIPAL_OFFICER' | 'CITIZEN';
  city?: string;
  phone_masked: string;
  phone_number: string;
  email?: string;
  is_active: boolean;
  phone_verified: boolean;
  created_at_utc: string;
  last_login_at_utc?: string;
  permissions: string[];
}

interface AuditRecord {
  id: string;
  actor_id: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  timestamp_utc: string;
  previous_state: any;
  new_state: any;
  request_id: string;
}

interface SystemHealth {
  status: string;
  timestamp_utc: string;
  database: { status: string; engine: string; path?: string };
  security: {
    active_sessions: number;
    total_users: number;
    active_users: number;
    roles_breakdown: { ADMIN: number; MUNICIPAL_OFFICER: number; CITIZEN: number };
  };
  integrations: {
    fast2sms_otp: { status: string; provider: string };
    callmebot_whatsapp: { status: string; provider: string };
    open_meteo: { status: string; provider: string };
    osrm_routing: { status: string; provider: string };
  };
  version: string;
  environment: string;
}

export const AdminConsolePage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'add_member' | 'audit' | 'system'>('users');
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRecord[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New User / Member Onboarding State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>('');
  const [newFullName, setNewFullName] = useState<string>('');
  const [newRole, setNewRole] = useState<'MUNICIPAL_OFFICER' | 'CITIZEN' | 'ADMIN'>('MUNICIPAL_OFFICER');
  const [newCity, setNewCity] = useState<string>('Chennai');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/v1/admin/users', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/v1/admin/audit-logs?limit=50', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const res = await fetch('/api/v1/admin/system-health', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setSystemHealth(data);
      }
    } catch (err) {
      console.error('Failed to load system health:', err);
    }
  };

  const reloadData = async () => {
    setIsLoading(true);
    await Promise.all([fetchUsers(), fetchAuditLogs(), fetchSystemHealth()]);
    setIsLoading(false);
  };

  useEffect(() => {
    reloadData();
  }, []);

  const handleToggleUserStatus = async (user: ManagedUser) => {
    try {
      const res = await fetch(`/api/v1/admin/users/${user.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionFeedback({ type: 'error', message: data.detail?.message || data.detail || 'Failed to update user status.' });
        return;
      }
      setActionFeedback({ type: 'success', message: data.message });
      fetchUsers();
    } catch (e: any) {
      setActionFeedback({ type: 'error', message: e.message || 'Error communicating with server.' });
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionFeedback({ type: 'error', message: data.detail?.message || data.detail || 'Failed to update user role.' });
        return;
      }
      setActionFeedback({ type: 'success', message: data.message });
      fetchUsers();
    } catch (e: any) {
      setActionFeedback({ type: 'error', message: e.message || 'Error communicating with server.' });
    }
  };

  const handleRevokeSessions = async (userId: string) => {
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/revoke-sessions`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        setActionFeedback({ type: 'error', message: data.detail?.message || data.detail || 'Failed to revoke sessions.' });
        return;
      }
      setActionFeedback({ type: 'success', message: data.message });
      fetchSystemHealth();
    } catch (e: any) {
      setActionFeedback({ type: 'error', message: e.message || 'Error communicating with server.' });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: newUsername.trim(),
          full_name: newFullName.trim(),
          role: newRole,
          city: newCity,
          phone_number: newPhone.trim(),
          email: newEmail.trim() || undefined,
          password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionFeedback({ type: 'error', message: data.detail?.message || data.detail || 'Failed to provision user.' });
        return;
      }

      setActionFeedback({ type: 'success', message: data.message });
      setShowCreateModal(false);
      // Reset form
      setNewUsername('');
      setNewFullName('');
      setNewPhone('');
      setNewEmail('');
      setNewPassword('');
      setNewCity('Chennai');
      setActiveTab('users');
      fetchUsers();
      fetchSystemHealth();
    } catch (e: any) {
      setActionFeedback({ type: 'error', message: e.message || 'Error communicating with server.' });
    }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.phone_number.includes(searchQuery)
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
              <Shield className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white">System Administration & Security Console</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
              RBAC LEVEL: ADMIN
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Zero Client Trust operational authority: Provision officers, configure credentials, revoke sessions, and audit platform mutations.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => reloadData()}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition"
            title="Refresh All Records"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setActiveTab('add_member')}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold tracking-wider uppercase shadow-lg shadow-emerald-600/20 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add Member</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionFeedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-white text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 text-xs font-bold tracking-wider uppercase border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'users'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Directory ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('add_member')}
          className={`px-4 py-2.5 text-xs font-bold tracking-wider uppercase border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'add_member'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add Member</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 text-xs font-bold tracking-wider uppercase border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'audit'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Security Audit Trail ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2.5 text-xs font-bold tracking-wider uppercase border-b-2 transition-colors flex items-center space-x-2 ${
            activeTab === 'system'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Provider Health & Telemetry</span>
        </button>
      </div>

      {/* TAB 1: USERS DIRECTORY */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by username, name, or phone..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Showing {filteredUsers.length} of {users.length} accounts
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Account Identity</th>
                    <th className="px-4 py-3">Role Authority</th>
                    <th className="px-4 py-3">Jurisdiction</th>
                    <th className="px-4 py-3">Contact Information</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last Active</th>
                    <th className="px-4 py-3 text-right">Security Operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{u.full_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">@{u.username}</div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider border ${
                            u.role === 'ADMIN'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : u.role === 'MUNICIPAL_OFFICER'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px] text-slate-300">
                        {u.city || 'Chennai'}
                      </td>

                      <td className="px-4 py-3 font-mono text-[11px]">
                        <div className="text-slate-300">{u.phone_number}</div>
                        {u.email && <div className="text-slate-500 text-[10px]">{u.email}</div>}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            u.is_active
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.is_active ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          />
                          <span>{u.is_active ? 'Active' : 'Disabled'}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-400 text-[11px] font-mono">
                        {u.last_login_at_utc ? new Date(u.last_login_at_utc).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Never'}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Role Selector */}
                          <select
                            value={u.role}
                            onChange={(e) => handleChangeRole(u.id, e.target.value)}
                            disabled={u.username === 'admin' && currentUser?.username === 'admin'}
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-emerald-500"
                          >
                            <option value="CITIZEN">Citizen</option>
                            <option value="MUNICIPAL_OFFICER">Municipal Officer</option>
                            <option value="ADMIN">Administrator</option>
                          </select>

                          {/* Enable/Disable Button */}
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            disabled={u.username === 'admin'}
                            className={`p-1.5 rounded border text-[11px] transition ${
                              u.is_active
                                ? 'bg-slate-950 text-rose-400 border-rose-500/30 hover:bg-rose-500/10'
                                : 'bg-slate-950 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10'
                            }`}
                            title={u.is_active ? 'Disable Account' : 'Re-activate Account'}
                          >
                            {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>

                          {/* Revoke Active Sessions */}
                          <button
                            onClick={() => handleRevokeSessions(u.id)}
                            className="p-1.5 rounded bg-slate-950 text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 transition"
                            title="Forcefully Revoke Active Sessions"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: ADD MEMBER (ADMIN PROVISIONING PORTAL) */}
      {activeTab === 'add_member' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <UserPlus className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-white">Provision Team Member / Official</h2>
                  <p className="text-xs text-slate-400">
                    Create new Municipal Officers, Administrators, or pre-provisioned Citizen accounts.
                  </p>
                </div>
              </div>
            </div>

            {/* Explanatory Policy Box */}
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-xs flex items-start space-x-3">
              <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Strict RBAC Authority Rule:</span>
                <p className="mt-1 text-slate-300">
                  Only currently authenticated <strong className="text-emerald-300">Administrators</strong> can create and assign <strong className="text-amber-300">Municipal Officer</strong> or <strong className="text-red-300">Admin</strong> credentials. General public users registering via the public portal are strictly confined to Citizen access.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Role */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5 flex items-center space-x-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Role Authority Level *</span>
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:outline-none focus:border-emerald-500 transition"
                  >
                    <option value="MUNICIPAL_OFFICER">Municipal Officer (Operations, Alerts & Wards)</option>
                    <option value="ADMIN">System Administrator (Full Authority & User Mgmt)</option>
                    <option value="CITIZEN">Citizen (Public Safety & Directions)</option>
                  </select>
                </div>

                {/* City Jurisdiction */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5 flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Municipal Jurisdiction (City) *</span>
                  </label>
                  <select
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-medium focus:outline-none focus:border-emerald-500 transition"
                  >
                    <option value="Chennai">Chennai (Greater Chennai Corporation)</option>
                    <option value="Delhi NCR">Delhi NCR (MCD / NDMC)</option>
                    <option value="Mumbai">Mumbai (BMC / MCGM)</option>
                    <option value="Ahmedabad">Ahmedabad (AMC)</option>
                    <option value="Bengaluru">Bengaluru (BBMP)</option>
                    <option value="Hyderabad">Hyderabad (GHMC)</option>
                    <option value="Kolkata">Kolkata (KMC)</option>
                    <option value="Jaipur">Jaipur (JMC)</option>
                    <option value="Lucknow">Lucknow (LMC)</option>
                    <option value="Pune">Pune (PMC)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Username */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Username Handle *</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="e.g. officer_royapuram or admin_south"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Alphanumeric handle used for login and audit identity.</span>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Official Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Sundaram"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Displayed on public directives and operational logs.</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Phone Number */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Official Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Primary credential token for 2FA and OTP broadcasts.</span>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">Official Email Address (Optional)</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="officer@chennaicorp.gov.in"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Used for report dispatches and administrative notices.</span>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5 flex items-center space-x-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Initial Access Password *</span>
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters (alphanumeric + symbol recommended)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">The member will use this password alongside their mobile/username to log in.</span>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setNewUsername('');
                    setNewFullName('');
                    setNewPhone('');
                    setNewEmail('');
                    setNewPassword('');
                    setNewCity('Chennai');
                    setActiveTab('users');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Provision & Activate Member</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Role Privileges Card */}
          <div className="space-y-5">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Selected Role Privileges</span>
              </h3>

              {newRole === 'MUNICIPAL_OFFICER' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
                    <span className="font-bold text-blue-400 text-xs">MUNICIPAL OFFICER</span>
                    <p className="text-[11px] text-slate-300 mt-1">
                      Operational command over heat emergencies, resource dispatch, and ward heat action plan execution.
                    </p>
                  </div>
                  <ul className="space-y-2 text-[11px] text-slate-300">
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      <span>Issue municipal emergency alerts & broadcasts</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      <span>Manage hospital ICU surge & shelter capacities</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      <span>Ward vulnerability inspector & thermal telemetry</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      <span>Export heatwave risk & analytics intelligence</span>
                    </li>
                  </ul>
                </div>
              )}

              {newRole === 'ADMIN' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                    <span className="font-bold text-red-400 text-xs">SYSTEM ADMINISTRATOR</span>
                    <p className="text-[11px] text-slate-300 mt-1">
                      Unrestricted administrative authority over identity, provisioning, system security, and audit trails.
                    </p>
                  </div>
                  <ul className="space-y-2 text-[11px] text-slate-300">
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      <span>Provision new Municipal Officers & Admins</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      <span>Role elevation & emergency session revocation</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      <span>Account deactivation & security audit trail</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      <span>Infrastructure & telemetry monitoring</span>
                    </li>
                  </ul>
                </div>
              )}

              {newRole === 'CITIZEN' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <span className="font-bold text-emerald-400 text-xs">CITIZEN USER</span>
                    <p className="text-[11px] text-slate-300 mt-1">
                      Public heat protection, emergency route navigation, and community cooling center locator.
                    </p>
                  </div>
                  <ul className="space-y-2 text-[11px] text-slate-300">
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Real-time personal thermal risk assessment</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Emergency shaded route navigation</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Public heat alert subscriptions</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2.5">
              <div className="flex items-center space-x-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <Building className="w-4 h-4 text-cyan-400" />
                <span>Selected Jurisdiction</span>
              </div>
              <p className="text-sm font-semibold text-white">
                {newCity} Municipal Corporation
              </p>
              <p className="text-[11px] text-slate-400">
                The provisioned officer/member will be assigned operational jurisdiction over {newCity} wards, hospitals, and cooling shelters.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Timestamp (IST)</th>
                    <th className="px-4 py-3">Actor & Role</th>
                    <th className="px-4 py-3">Action Event</th>
                    <th className="px-4 py-3">Target Entity</th>
                    <th className="px-4 py-3">State Diff / Journal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition text-[11px]">
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {log.timestamp_utc ? new Date(log.timestamp_utc).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-white font-semibold">{log.actor_id}</span>
                        <span className="text-[10px] text-slate-500 ml-1.5">[{log.actor_role}]</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 font-bold text-[10px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {log.entity_type} <span className="text-slate-500">#{log.entity_id}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 max-w-xs truncate" title={JSON.stringify(log.new_state)}>
                        {log.new_state ? JSON.stringify(log.new_state) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SYSTEM HEALTH & INTEGRATIONS */}
      {activeTab === 'system' && systemHealth && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Security & User Metrics Card */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Identity & Session Telemetry</span>
            </h3>

            <div className="grid grid-cols-2 gap-4 font-mono text-xs">
              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Active Authenticated Sessions</span>
                <span className="text-2xl font-bold text-emerald-400">{systemHealth.security.active_sessions}</span>
              </div>
              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Total Registered Accounts</span>
                <span className="text-2xl font-bold text-cyan-400">{systemHealth.security.total_users}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="text-slate-400 font-semibold mb-1">Role Population Breakdown:</div>
              <div className="flex justify-between text-slate-300">
                <span>Administrators:</span>
                <span className="font-mono font-bold text-rose-400">{systemHealth.security.roles_breakdown.ADMIN}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Municipal Officers:</span>
                <span className="font-mono font-bold text-amber-400">{systemHealth.security.roles_breakdown.MUNICIPAL_OFFICER}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Citizens:</span>
                <span className="font-mono font-bold text-cyan-400">{systemHealth.security.roles_breakdown.CITIZEN}</span>
              </div>
            </div>
          </div>

          {/* External Gateway Integrations Card */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Operational Provider Integrations</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Fast2SMS (India Bulk SMS / DLT)</div>
                  <div className="text-[11px] text-slate-400">Citizen Two-Factor & OTP Dispatcher</div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {systemHealth.integrations.fast2sms_otp.status.toUpperCase()}
                </span>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">CallMeBot WhatsApp Gateway</div>
                  <div className="text-[11px] text-slate-400">Official Municipal Alert Broadcast API</div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {systemHealth.integrations.callmebot_whatsapp.status.toUpperCase()}
                </span>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Open-Meteo High Resolution API</div>
                  <div className="text-[11px] text-slate-400">Solar Radiation, Temperature & Humidity Ingestion</div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {systemHealth.integrations.open_meteo.status.toUpperCase()}
                </span>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">OpenStreetMap OSRM Routing Engine</div>
                  <div className="text-[11px] text-slate-400">Emergency Navigation & Road Network Solver</div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {systemHealth.integrations.osrm_routing.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Provision New Account */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <span>Provision Platform Account</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Username Handle</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. officer_royapuram"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Full Official Name</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Sundaram"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Role Authority Level</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="MUNICIPAL_OFFICER">Municipal Officer (Operations & Directives)</option>
                  <option value="CITIZEN">Citizen (Public Safety & Directions)</option>
                  <option value="ADMIN">System Administrator (Full Authority)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Municipal Jurisdiction (City)</label>
                <select
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Chennai">Chennai (Greater Chennai Corporation)</option>
                  <option value="Delhi NCR">Delhi NCR (MCD / NDMC)</option>
                  <option value="Mumbai">Mumbai (BMC / MCGM)</option>
                  <option value="Ahmedabad">Ahmedabad (AMC)</option>
                  <option value="Bengaluru">Bengaluru (BBMP)</option>
                  <option value="Hyderabad">Hyderabad (GHMC)</option>
                  <option value="Kolkata">Kolkata (KMC)</option>
                  <option value="Jaipur">Jaipur (JMC)</option>
                  <option value="Lucknow">Lucknow (LMC)</option>
                  <option value="Pune">Pune (PMC)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Contact Phone Number</label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="officer@chennaicorp.gov.in"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Confirm Provisioning
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
