import React, { useState } from 'react';
import { Shield, Building2, User, KeyRound, X } from 'lucide-react';

export type UserRole = 'PUBLIC_USER' | 'MUNICIPAL_ADMIN' | 'HEALTHCARE_ADMIN' | 'DISASTER_MANAGER' | 'SUPER_ADMIN';

export interface UserSession {
  role: UserRole;
  name: string;
  phone?: string;
  email?: string;
  orgName?: string;
  orgType?: string;
  badgeId?: string;
  language?: string;
  allowLocation?: boolean;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (session: UserSession) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onAuthenticated }) => {
  const [activeTab, setActiveTab] = useState<'PUBLIC' | 'AUTHORITY' | 'EVALUATOR'>('EVALUATOR');

  // Public Form
  const [publicName, setPublicName] = useState('Sundar R');
  const [publicPhone, setPublicPhone] = useState('+91 98401 23456');
  const [publicEmail, setPublicEmail] = useState('sundar.chennai@citizen.in');
  const [publicLang, setPublicLang] = useState('English');
  const [allowLocation, setAllowLocation] = useState(true);

  // Authority Form
  const [orgName, setOrgName] = useState('Greater Chennai Corporation (GCC)');
  const [orgType, setOrgType] = useState('Municipal Corporation');
  const [officerName, setOfficerName] = useState('Dr. Priya Venkat');
  const [officerEmail, setOfficerEmail] = useState('heat.disaster@chennaicorporation.gov.in');
  const [badgeId, setBadgeId] = useState('GCC-HAP-2026-09');
  const [authRole, setAuthRole] = useState<UserRole>('MUNICIPAL_ADMIN');

  if (!isOpen) return null;

  const handlePublicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const session: UserSession = {
      role: 'PUBLIC_USER',
      name: publicName,
      phone: publicPhone,
      email: publicEmail,
      language: publicLang,
      allowLocation,
    };
    localStorage.setItem('thermosafe_session', JSON.stringify(session));
    onAuthenticated(session);
    onClose();
  };

  const handleAuthoritySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const session: UserSession = {
      role: authRole,
      name: officerName,
      email: officerEmail,
      orgName,
      orgType,
      badgeId,
    };
    localStorage.setItem('thermosafe_session', JSON.stringify(session));
    onAuthenticated(session);
    onClose();
  };

  const handleQuickEvaluatorLogin = (role: UserRole) => {
    let name = 'Evaluator';
    let org = 'Disaster Evaluation Council';
    let orgT = 'Municipal Corporation';

    switch (role) {
      case 'MUNICIPAL_ADMIN':
        name = 'Thiru J. Radhakrishnan (IAS)';
        org = 'Greater Chennai Corporation';
        orgT = 'Municipal Corporation';
        break;
      case 'HEALTHCARE_ADMIN':
        name = 'Dr. K. Narayanasamy (Medical Superintendent)';
        org = 'Rajiv Gandhi Government General Hospital';
        orgT = 'Hospital';
        break;
      case 'DISASTER_MANAGER':
        name = 'S. Murugan (Director of Operations)';
        org = 'Tamil Nadu State Disaster Management Authority (TNSDMA)';
        orgT = 'Disaster Management Authority';
        break;
      case 'PUBLIC_USER':
        name = 'Ravi Kumar (Outdoor Delivery Executive)';
        org = 'Public Citizen';
        orgT = 'Public Citizen';
        break;
      case 'SUPER_ADMIN':
        name = 'Chief Systems Architect';
        org = 'National Thermal Disaster Mission';
        orgT = 'Super Administrator';
        break;
    }

    const session: UserSession = {
      role,
      name,
      orgName: org,
      orgType: orgT,
      badgeId: `EVAL-${role}-2026`,
      allowLocation: true,
      phone: '+91 98765 43210',
    };
    localStorage.setItem('thermosafe_session', JSON.stringify(session));
    onAuthenticated(session);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">THERMOSAFE AI ACCESS GATEWAY</h2>
              <p className="text-xs text-slate-400">Role-Based Access Control & Civic Safety Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 p-1.5 gap-1.5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('EVALUATOR')}
            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'EVALUATOR'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <KeyRound className="w-4 h-4 text-amber-400" />
            1-Click Evaluator Access
          </button>
          <button
            onClick={() => setActiveTab('PUBLIC')}
            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'PUBLIC'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <User className="w-4 h-4" />
            Citizen Portal
          </button>
          <button
            onClick={() => setActiveTab('AUTHORITY')}
            className={`flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all ${
              activeTab === 'AUTHORITY'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Authority / Disaster Org
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* TAB 1: 1-CLICK EVALUATOR ACCESS */}
          {activeTab === 'EVALUATOR' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/50 text-xs text-blue-300">
                <span className="font-semibold text-white">Hackathon & Jury Fast Access:</span> Select any verified organizational role to inspect the platform from that specific stakeholder perspective with live permission scopes.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button
                  onClick={() => handleQuickEvaluatorLogin('MUNICIPAL_ADMIN')}
                  className="p-4 rounded-xl text-left bg-slate-800/60 border border-slate-700 hover:border-blue-500 hover:bg-blue-950/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">MUNICIPAL_ADMIN</span>
                    <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">Executive</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-blue-400">Municipal Commissioner</h4>
                  <p className="text-xs text-slate-400 mt-1">Direct Heat Action Plan orders, cooling center activations, water station dispatch.</p>
                </button>

                <button
                  onClick={() => handleQuickEvaluatorLogin('HEALTHCARE_ADMIN')}
                  className="p-4 rounded-xl text-left bg-slate-800/60 border border-slate-700 hover:border-emerald-500 hover:bg-emerald-950/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">HEALTHCARE_ADMIN</span>
                    <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">Medical</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-emerald-400">Hospital Superintendent</h4>
                  <p className="text-xs text-slate-400 mt-1">Inpatient heat surge triage, ORS electrolyte logistics, ambulance staging.</p>
                </button>

                <button
                  onClick={() => handleQuickEvaluatorLogin('DISASTER_MANAGER')}
                  className="p-4 rounded-xl text-left bg-slate-800/60 border border-slate-700 hover:border-rose-500 hover:bg-rose-950/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">DISASTER_MANAGER</span>
                    <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">Command</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-rose-400">SDMA Disaster Controller</h4>
                  <p className="text-xs text-slate-400 mt-1">Multi-ward red alert declarations, Fast2SMS DLT broadcasts, inter-agency command.</p>
                </button>

                <button
                  onClick={() => handleQuickEvaluatorLogin('PUBLIC_USER')}
                  className="p-4 rounded-xl text-left bg-slate-800/60 border border-slate-700 hover:border-cyan-500 hover:bg-cyan-950/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">PUBLIC_USER</span>
                    <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">Citizen</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white group-hover:text-cyan-400">Public Citizen / Worker</h4>
                  <p className="text-xs text-slate-400 mt-1">Emergency "FIND HELP NEAR ME" navigation, personal thermal stress gauge, SMS alert alerts.</p>
                </button>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleQuickEvaluatorLogin('SUPER_ADMIN')}
                  className="w-full py-2.5 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Shield className="w-3.5 h-3.5 text-blue-400" />
                  Sign In as Platform Super Administrator
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PUBLIC CITIZEN REGISTRATION */}
          {activeTab === 'PUBLIC' && (
            <form onSubmit={handlePublicSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={publicName}
                  onChange={(e) => setPublicName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number (SMS/WhatsApp)</label>
                  <input
                    type="tel"
                    value={publicPhone}
                    onChange={(e) => setPublicPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Preferred Language</label>
                  <select
                    value={publicLang}
                    onChange={(e) => setPublicLang(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="English">English</option>
                    <option value="Tamil">தமிழ் (Tamil)</option>
                    <option value="Hindi">हिन्दी (Hindi)</option>
                    <option value="Telugu">తెలుగు (Telugu)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={publicEmail}
                  onChange={(e) => setPublicEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-3">
                <input
                  type="checkbox"
                  id="loc_check"
                  checked={allowLocation}
                  onChange={(e) => setAllowLocation(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 focus:ring-0"
                />
                <label htmlFor="loc_check" className="text-xs text-slate-300 leading-relaxed cursor-pointer">
                  <span className="font-semibold text-white">Enable GPS Geolocation:</span> Used strictly on-device to route you to the closest emergency cooling shelter or tertiary hospital during acute heat stress events.
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-colors shadow-lg shadow-blue-600/30"
              >
                Sign In as Public Citizen
              </button>
            </form>
          )}

          {/* TAB 3: AUTHORITY REGISTRATION */}
          {activeTab === 'AUTHORITY' && (
            <form onSubmit={handleAuthoritySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Organization Name</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Organization Type</label>
                  <select
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Municipal Corporation">Municipal Corporation</option>
                    <option value="Disaster Management Authority">Disaster Management Authority</option>
                    <option value="Hospital">Hospital / Medical College</option>
                    <option value="Emergency Response Team">Emergency Response Team (108/Fire)</option>
                    <option value="NGO">Civil Society / Red Cross NGO</option>
                    <option value="Public Health Department">Public Health Department</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Role</label>
                  <select
                    value={authRole}
                    onChange={(e) => setAuthRole(e.target.value as UserRole)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="MUNICIPAL_ADMIN">Municipal Admin</option>
                    <option value="HEALTHCARE_ADMIN">Healthcare Admin</option>
                    <option value="DISASTER_MANAGER">Disaster Manager</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Officer Name</label>
                  <input
                    type="text"
                    value={officerName}
                    onChange={(e) => setOfficerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Govt ID / Badge Number</label>
                  <input
                    type="text"
                    value={badgeId}
                    onChange={(e) => setBadgeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Official Email</label>
                <input
                  type="email"
                  value={officerEmail}
                  onChange={(e) => setOfficerEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm rounded-xl transition-colors shadow-lg shadow-amber-600/30"
              >
                Sign In to Authority Command Center
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
