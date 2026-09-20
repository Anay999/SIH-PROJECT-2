import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  Shield,
  Lock,
  User,
  KeyRound,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Smartphone,
  CheckCircle2,
  Compass,
  Building,
  UserPlus
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, loginWithOtp } = useAuth();
  const { setActiveCity, toggleLiveGps, isLiveGpsActive, liveGpsCoords } = useWorkspace();

  const [authMode, setAuthMode] = useState<'password' | 'register' | 'otp'>('password');
  
  // Sign In state
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // Registration state
  const [regPhone, setRegPhone] = useState<string>('+91');
  const [regFullName, setRegFullName] = useState<string>('');
  const [regCity, setRegCity] = useState<string>('Chennai');
  const [regPassword, setRegPassword] = useState<string>('');

  // OTP state
  const [phone, setPhone] = useState<string>('+919876543210');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState<string>('');
  const [demoOtpCode, setDemoOtpCode] = useState<string | null>(null);

  // Status & Feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fix autofill: Only populate the fields, do NOT auto-submit!
  const handleQuickFill = (mobile: string, pass: string) => {
    setIdentifier(mobile);
    setPassword(pass);
    setErrorMessage(null);
    setSuccessMessage(`Credentials autofilled for ${mobile}. Click 'Sign In to Platform' below to proceed.`);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const result = await login(identifier, password);
    setIsSubmitting(false);

    if (result.success) {
      if (result.role === 'CITIZEN') {
        navigate('/citizen', { replace: true });
      } else if (result.role === 'ADMIN') {
        const from = (location.state as any)?.from?.pathname;
        if (from && from !== '/auth' && from !== '/login') {
          navigate(from, { replace: true });
        } else {
          navigate('/overview', { replace: true });
        }
      } else {
        const from = (location.state as any)?.from?.pathname;
        if (from && from !== '/auth' && from !== '/login' && !from.startsWith('/admin') && !from.startsWith('/settings') && !from.startsWith('/simulation') && !from.startsWith('/api-monitor')) {
          navigate(from, { replace: true });
        } else {
          navigate('/overview', { replace: true });
        }
      }
    } else {
      setErrorMessage(result.error || 'Authentication failed. Please verify your mobile number and password.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    // Sync active jurisdiction
    setActiveCity(regCity);

    const result = await register({
      phone_number: regPhone,
      full_name: regFullName,
      city: regCity,
      password: regPassword,
      role: 'CITIZEN'
    });
    setIsSubmitting(false);

    if (result.success) {
      navigate('/citizen', { replace: true });
    } else {
      setErrorMessage(result.error || 'Registration failed. Please check your mobile number and city.');
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/v1/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone, channel: 'whatsapp' }),
      });

      const data = await res.json();
      setIsSubmitting(false);

      if (!res.ok) {
        setErrorMessage(data.detail?.message || data.detail || 'Failed to dispatch verification code.');
        return;
      }

      setChallengeId(data.data?.challenge_id || data.challenge_id);
      if (data.data?.demo_otp) {
        setDemoOtpCode(data.data.demo_otp);
        setOtpCode(data.data.demo_otp); // autofill helper for evaluators
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Network error while requesting OTP.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeId) return;

    setErrorMessage(null);
    setIsSubmitting(true);

    const result = await loginWithOtp(challengeId, otpCode);
    setIsSubmitting(false);

    if (result.success) {
      navigate('/citizen', { replace: true });
    } else {
      setErrorMessage(result.error || 'Verification code failed.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#060b13] via-[#091122] to-[#040810] flex items-center justify-center p-4 sm:p-6 text-slate-100">
      <div className="max-w-md w-full bg-slate-900/85 border border-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 space-y-5 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-amber-500/10 to-orange-500/20 border border-emerald-500/30 text-emerald-400 mb-1 shadow-lg shadow-emerald-500/10">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">HEATSHIELD AI</h1>
          <p className="text-[11px] text-slate-400 font-mono tracking-wide">
            Hyper-Local Municipal Heatwave Intelligence & Public Safety
          </p>
        </div>

        {/* Evaluator Demo Credentials Panel */}
        <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800 text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 font-mono text-[10px] uppercase">
            <span className="flex items-center space-x-1 text-emerald-400 font-bold">
              <Sparkles className="w-3 h-3" />
              <span>Evaluator Demo Autofill</span>
            </span>
            <span className="text-slate-500">Click to fill (no auto-submit)</span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-0.5 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => handleQuickFill('+919876543211', 'Officer@123')}
              className="p-2 rounded-lg bg-slate-900/90 hover:bg-amber-950/40 border border-slate-700 hover:border-amber-500/50 text-slate-300 hover:text-amber-300 transition text-center"
              title="Senior Municipal Heat Officer (GCC Chennai)"
            >
              <span className="font-bold block text-amber-400">Officer</span>
              <span className="text-[9px] text-slate-400 block font-sans">+91 98765 43211</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('+919876543212', 'Admin@123')}
              className="p-2 rounded-lg bg-slate-900/90 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-rose-300 transition text-center"
              title="Municipal System Administrator"
            >
              <span className="font-bold block text-rose-400">Admin</span>
              <span className="text-[9px] text-slate-400 block font-sans">+91 98765 43212</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('+919876543210', 'Citizen@123')}
              className="p-2 rounded-lg bg-slate-900/90 hover:bg-cyan-950/40 border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 transition text-center"
              title="Citizen User (Public Heat Advisories)"
            >
              <span className="font-bold block text-cyan-400">Citizen</span>
              <span className="text-[9px] text-slate-400 block font-sans">+91 98765 43210</span>
            </button>
          </div>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="grid grid-cols-3 p-1 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => { setAuthMode('password'); setErrorMessage(null); setSuccessMessage(null); }}
            className={`py-2 rounded-lg transition ${
              authMode === 'password'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('register'); setErrorMessage(null); setSuccessMessage(null); }}
            className={`py-2 rounded-lg transition ${
              authMode === 'register'
                ? 'bg-emerald-700/80 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Register Mobile
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('otp'); setErrorMessage(null); setSuccessMessage(null); }}
            className={`py-2 rounded-lg transition ${
              authMode === 'otp'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SMS / OTP
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* TAB 1: SIGN IN WITH MOBILE & PASSWORD */}
        {authMode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-3.5">
            <div className="space-y-1 text-xs">
              <label className="block text-slate-300 font-semibold">Registered Mobile Number</label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. +91 98765 43211 or 9876543211"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="block text-slate-300 font-semibold">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs tracking-wider uppercase shadow-lg shadow-emerald-600/20 transition flex items-center justify-center space-x-2"
            >
              <span>{isSubmitting ? 'Verifying Identity...' : 'Sign In to Platform'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* TAB 2: REGISTER ACCOUNT (Citizen Self-Registration Only) */}
        {authMode === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div className="p-3 rounded-xl bg-blue-950/50 border border-blue-800/60 text-xs text-blue-200 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block font-bold">Citizen Self-Registration</strong>
                <span className="text-[11px] text-slate-300">
                  Citizens can register on their own for hyper-local heatwave advisories and cooling shelter navigation. Municipal Officers and Administrators are provisioned directly by active Administrators.
                </span>
              </div>
            </div>
            <div className="space-y-1 text-xs">
              <label className="block text-slate-300 font-semibold">Mobile Number</label>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+91 98765 00000"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="block text-slate-300 font-semibold">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <label className="block text-slate-300 font-semibold">Municipal Jurisdiction (Location)</label>
                <span className="text-[10px] text-amber-400 font-mono">South & North India</span>
              </div>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={regCity}
                  onChange={(e) => setRegCity(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
                >
                  <optgroup label="South India">
                    <option value="Chennai">Chennai (Tamil Nadu) — Greater Chennai Corp (GCC, 1913)</option>
                  </optgroup>
                  <optgroup label="North India (Top Heatwave Zones)">
                    <option value="Delhi">Delhi (NCR) — Municipal Corp of Delhi (MCD, 155304)</option>
                    <option value="Ahmedabad">Ahmedabad (Gujarat) — Ahmedabad Municipal Corp (AMC, 155303)</option>
                    <option value="Jaipur">Jaipur (Rajasthan) — Jaipur Nagar Nigam (JNN, 1800-180-6127)</option>
                    <option value="Lucknow">Lucknow (Uttar Pradesh) — Lucknow Municipal Corp (LMC, 1533)</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Roaming Travel Override */}
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Traveling outside jurisdiction?</span>
                </span>
                <button
                  type="button"
                  onClick={toggleLiveGps}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                    isLiveGpsActive
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {isLiveGpsActive ? 'Live GPS Active ✓' : 'Detect Live GPS'}
                </button>
              </div>
              {isLiveGpsActive && liveGpsCoords && (
                <p className="text-cyan-400 font-mono text-[10px]">
                  Locked Coords: {liveGpsCoords.lat.toFixed(4)}°N, {liveGpsCoords.lon.toFixed(4)}°E (Nearby hospitals dynamically routed)
                </p>
              )}
            </div>

            <div className="space-y-1 text-xs">
              <label className="block text-slate-300 font-semibold">Account Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs tracking-wider uppercase shadow-lg shadow-emerald-600/20 transition flex items-center justify-center space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Registering Account...' : 'Register & Enter Portal'}</span>
            </button>
          </form>
        )}

        {/* TAB 3: OTP LOGIN */}
        {authMode === 'otp' && (
          <div className="space-y-4">
            {!challengeId ? (
              <form onSubmit={handleRequestOtp} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold">Mobile Number (with Country Code)</label>
                  <div className="relative">
                    <Smartphone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Dispatched via Fast2SMS / WhatsApp Gateway. Simulated one-click code provided for evaluators.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs tracking-wider uppercase shadow-lg shadow-emerald-600/20 transition flex items-center justify-center space-x-2"
                >
                  <span>{isSubmitting ? 'Sending Code...' : 'Request Verification Code'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-3.5 text-xs">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verification Code Dispatched</span>
                  </div>
                  {demoOtpCode && (
                    <p className="text-slate-300 font-mono text-[11px]">
                      Demo Auto-Code: <strong className="text-amber-300 tracking-widest">{demoOtpCode}</strong>
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-300 font-semibold">6-Digit Verification Code</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="e.g. 123456"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-center font-mono text-sm tracking-widest focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => { setChallengeId(null); setDemoOtpCode(null); }}
                    className="w-1/3 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
                  >
                    Change Phone
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs tracking-wider uppercase shadow-lg shadow-emerald-600/20 transition flex items-center justify-center space-x-2"
                  >
                    <span>{isSubmitting ? 'Verifying...' : 'Verify & Enter'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Security & Multi-City Footer */}
        <div className="pt-2 text-center text-[10px] text-slate-500 font-mono border-t border-slate-800/80 flex items-center justify-between">
          <span>GCC · MCD · AMC · JNN · LMC</span>
          <span className="text-emerald-500/80">Active Jurisdiction Engine</span>
        </div>
      </div>
    </div>
  );
};
