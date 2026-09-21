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
  CheckCircle2,
  Building,
  UserPlus,
  Mail,
  ShieldCheck,
  Server
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, loginWithOtp } = useAuth();
  const { setActiveCity } = useWorkspace();

  // Primary Role Gate: 'CITIZEN' | 'MUNICIPAL_OFFICER' | 'ADMIN'
  const [roleGate, setRoleGate] = useState<'CITIZEN' | 'MUNICIPAL_OFFICER' | 'ADMIN'>('CITIZEN');
  const [citizenMode, setCitizenMode] = useState<'signin' | 'register' | 'otp'>('signin');

  // Sign In credentials
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('Chennai');

  // Registration state for Public User
  const [regFullName, setRegFullName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('+91');
  const [regCity, setRegCity] = useState<string>('Chennai');
  const [regPassword, setRegPassword] = useState<string>('');
  const [locationConsent, setLocationConsent] = useState<boolean>(true);

  // OTP state
  const [phone, setPhone] = useState<string>('+919876543210');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState<string>('');
  const [demoOtpCode, setDemoOtpCode] = useState<string | null>(null);

  // Status & Feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleQuickFill = (userStr: string, passStr: string, roleName: string) => {
    setIdentifier(userStr);
    setPassword(passStr);
    setErrorMessage(null);
    setSuccessMessage(`Autofilled credentials for ${roleName}. Click 'Sign In' below.`);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const result = await login(identifier.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      if (result.role === 'CITIZEN') {
        navigate('/citizen', { replace: true });
      } else if (result.role === 'ADMIN') {
        const from = (location.state as any)?.from?.pathname;
        if (from && from !== '/auth' && from !== '/login') {
          navigate(from, { replace: true });
        } else {
          navigate('/admin', { replace: true });
        }
      } else {
        // Municipal Officer
        setActiveCity(selectedMunicipality);
        navigate('/overview', { replace: true });
      }
    } else {
      setErrorMessage(result.error || 'Authentication failed. Please verify your credentials and try again.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    setActiveCity(regCity);

    const result = await register({
      phone_number: regPhone.trim(),
      full_name: regFullName.trim(),
      email: regEmail.trim() || undefined,
      city: regCity,
      password: regPassword,
      role: 'CITIZEN'
    });
    setIsSubmitting(false);

    if (result.success) {
      if (locationConsent && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => {},
          () => console.warn('Location permission denied by user')
        );
      }
      navigate('/citizen', { replace: true });
    } else {
      setErrorMessage(result.error || 'Registration failed. Please verify your mobile number and email.');
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
        setOtpCode(data.data.demo_otp);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err.message || 'Error communicating with verification service.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeId) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const result = await loginWithOtp(challengeId, otpCode);
    setIsSubmitting(false);

    if (result.success) {
      navigate('/citizen', { replace: true });
    } else {
      setErrorMessage(result.error || 'Invalid or expired verification code.');
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1c1917] flex flex-col justify-center py-8 sm:px-6 lg:px-8 font-sans selection:bg-orange-500 selection:text-white">
      {/* Top Brand Banner */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 shadow-lg shadow-orange-500/25 mb-3 text-white">
          <Shield className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-[#1c1917] uppercase">
          THERMOSAFE <span className="text-orange-600">AI</span>
        </h1>
        <p className="text-xs text-[#57534e] mt-1 font-medium">
          Hyper-Local Heat Risk & Emergency Response Intelligence
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white border border-[#ede7de] rounded-3xl p-6 sm:p-8 shadow-xl shadow-stone-200/50 space-y-6">
          
          {/* Role Gateway Selector Tabs */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#78716c] mb-2">
              Select Access Gateway
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#f5f3ef] rounded-2xl border border-[#ede7de]">
              <button
                type="button"
                onClick={() => {
                  setRoleGate('CITIZEN');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  roleGate === 'CITIZEN'
                    ? 'bg-white text-orange-600 shadow-xs border border-[#ede7de]'
                    : 'text-[#57534e] hover:text-[#1c1917]'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Citizen</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRoleGate('MUNICIPAL_OFFICER');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  roleGate === 'MUNICIPAL_OFFICER'
                    ? 'bg-white text-orange-600 shadow-xs border border-[#ede7de]'
                    : 'text-[#57534e] hover:text-[#1c1917]'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span>Officer</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRoleGate('ADMIN');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  roleGate === 'ADMIN'
                    ? 'bg-white text-orange-600 shadow-xs border border-[#ede7de]'
                    : 'text-[#57534e] hover:text-[#1c1917]'
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            </div>
          </div>

          {/* Error & Success Feedback Alerts */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* GATEWAY 1: PUBLIC CITIZEN USER                           */}
          {/* ======================================================== */}
          {roleGate === 'CITIZEN' && (
            <div className="space-y-4">
              {/* Citizen Subtabs */}
              <div className="flex border-b border-[#ede7de] text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCitizenMode('signin')}
                  className={`pb-2.5 px-3 border-b-2 transition ${
                    citizenMode === 'signin'
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-[#78716c] hover:text-[#1c1917]'
                  }`}
                >
                  Citizen Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setCitizenMode('register')}
                  className={`pb-2.5 px-3 border-b-2 transition ${
                    citizenMode === 'register'
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-[#78716c] hover:text-[#1c1917]'
                  }`}
                >
                  Create Citizen Account
                </button>
                <button
                  type="button"
                  onClick={() => setCitizenMode('otp')}
                  className={`pb-2.5 px-3 border-b-2 transition ${
                    citizenMode === 'otp'
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-[#78716c] hover:text-[#1c1917]'
                  }`}
                >
                  WhatsApp / SMS Code
                </button>
              </div>

              {/* Citizen Sign In Form */}
              {citizenMode === 'signin' && (
                <form onSubmit={handlePasswordLogin} className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="block text-[#44403c] font-semibold">Mobile Number or Email</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#78716c] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="+91 98765 43210 or citizen@gmail.com"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#ede7de] text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-orange-500 transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[#44403c] font-semibold">Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#78716c] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#ede7de] text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-orange-500 transition"
                      />
                    </div>
                  </div>

                  {/* Evaluator Quick Autofill */}
                  <div className="p-3 rounded-xl bg-[#faf9f6] border border-[#ede7de] space-y-1.5">
                    <span className="text-[10px] font-mono text-[#78716c] uppercase font-bold">Evaluator Demo Login:</span>
                    <button
                      type="button"
                      onClick={() => handleQuickFill('+919876543210', 'Citizen@123', 'Public Citizen')}
                      className="block text-left text-xs text-orange-600 font-semibold hover:underline"
                    >
                      Use Demo Citizen (+919876543210 / Citizen@123)
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-600/25 transition flex items-center justify-center space-x-2"
                  >
                    <span>{isSubmitting ? 'Authenticating...' : 'Enter Citizen Safety Portal'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* Citizen Self-Registration Form */}
              {citizenMode === 'register' && (
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
                  <div className="p-3 rounded-xl bg-orange-50/70 border border-orange-200 text-orange-950 text-xs">
                    <strong className="block font-bold">Public Citizen Registration</strong>
                    <p className="text-[11px] text-[#57534e] mt-0.5">
                      Receive hyper-local biometeorological heat advisories, cooling shelter locator, and emergency navigation.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[#44403c] font-semibold">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#ede7de] text-[#1c1917] focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[#44403c] font-semibold">Email Address (Optional)</label>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#ede7de] text-[#1c1917] focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[#44403c] font-semibold">Mobile Number *</label>
                      <input
                        type="text"
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="+91 98765 00000"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#ede7de] text-[#1c1917] focus:outline-none focus:border-orange-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[#44403c] font-semibold">Home Municipality Jurisdiction *</label>
                    <select
                      value={regCity}
                      onChange={(e) => setRegCity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#ede7de] text-[#1c1917] focus:outline-none focus:border-orange-500"
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

                  <div className="space-y-1">
                    <label className="block text-[#44403c] font-semibold">Account Password *</label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#ede7de] text-[#1c1917] focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  {/* Location Permission Checkbox */}
                  <div className="p-2.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] flex items-start space-x-2">
                    <input
                      type="checkbox"
                      id="locConsent"
                      checked={locationConsent}
                      onChange={(e) => setLocationConsent(e.target.checked)}
                      className="mt-0.5 rounded border-stone-300 text-orange-600 focus:ring-orange-500"
                    />
                    <label htmlFor="locConsent" className="text-[11px] text-[#57534e]">
                      Allow <strong>ThermoSafe AI</strong> to detect my geographic location for hyper-local heat risk calculations and nearby cooling center routing.
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-600/20 transition flex items-center justify-center space-x-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{isSubmitting ? 'Registering...' : 'Register & Enter Dashboard'}</span>
                  </button>
                </form>
              )}

              {/* Citizen OTP Login Form */}
              {citizenMode === 'otp' && (
                <div className="space-y-4 text-xs">
                  {!challengeId ? (
                    <form onSubmit={handleRequestOtp} className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="block text-[#44403c] font-semibold">Registered Mobile Number</label>
                        <input
                          type="text"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-[#ede7de] text-[#1c1917] font-mono focus:outline-none focus:border-orange-500"
                        />
                        <p className="text-[10px] text-[#78716c]">
                          Verification code will be dispatched via Fast2SMS / CallMeBot WhatsApp gateway.
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow-md transition flex items-center justify-center space-x-1.5"
                      >
                        <span>{isSubmitting ? 'Sending Code...' : 'Request Verification Code'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-emerald-900">
                        <span className="font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Code Dispatched
                        </span>
                        {demoOtpCode && (
                          <p className="text-[11px] font-mono text-emerald-800">
                            Evaluator Demo OTP: <strong className="text-emerald-950 font-bold">{demoOtpCode}</strong>
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[#44403c] font-semibold">Enter 6-Digit Code</label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="123456"
                          className="w-full text-center text-lg tracking-widest font-mono py-2 rounded-xl bg-white border border-[#ede7de] text-[#1c1917] focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-md transition"
                      >
                        {isSubmitting ? 'Verifying...' : 'Confirm & Enter Dashboard'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* GATEWAY 2: MUNICIPAL OFFICER GATEWAY                     */}
          {/* ======================================================== */}
          {roleGate === 'MUNICIPAL_OFFICER' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-950">
                <span className="font-bold text-amber-900 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-amber-700" />
                  Municipal Officer Operational Portal
                </span>
                <p className="text-[11px] text-[#57534e] mt-1">
                  Officers belong to exactly ONE municipality with operational command over ward triage, emergency resource dispatches, and public heat alert broadcasts.
                </p>
              </div>

              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[#44403c] font-semibold">Official Email or Officer Handle</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#78716c] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="officer@thermosafe.gov.in or officer"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#ede7de] text-[#1c1917] focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[#44403c] font-semibold">Assigned Municipality</label>
                  <select
                    value={selectedMunicipality}
                    onChange={(e) => setSelectedMunicipality(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#ede7de] text-[#1c1917] focus:outline-none focus:border-orange-500"
                  >
                    <option value="Chennai">Greater Chennai Corporation (GCC)</option>
                    <option value="Delhi NCR">Municipal Corporation of Delhi (MCD)</option>
                    <option value="Mumbai">Brihanmumbai Municipal Corp (BMC)</option>
                    <option value="Ahmedabad">Ahmedabad Municipal Corporation (AMC)</option>
                    <option value="Bengaluru">Bruhat Bengaluru Mahanagara Palike (BBMP)</option>
                    <option value="Hyderabad">Greater Hyderabad Municipal Corp (GHMC)</option>
                    <option value="Kolkata">Kolkata Municipal Corporation (KMC)</option>
                    <option value="Jaipur">Jaipur Nagar Nigam (JNN)</option>
                    <option value="Lucknow">Lucknow Municipal Corporation (LMC)</option>
                    <option value="Pune">Pune Municipal Corporation (PMC)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[#44403c] font-semibold">Officer Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#78716c] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#ede7de] text-[#1c1917] focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Evaluator Demo Quickfill */}
                <div className="p-3 rounded-xl bg-[#faf9f6] border border-[#ede7de] space-y-1.5">
                  <span className="text-[10px] font-mono text-[#78716c] uppercase font-bold">Evaluator Quick Fill:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('officer', 'Officer@123', 'Municipal Heat Officer (Chennai)')}
                    className="block text-left text-xs text-orange-600 font-semibold hover:underline"
                  >
                    Use Demo Officer (officer / Officer@123 · GCC Chennai)
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-600/20 transition flex items-center justify-center space-x-2"
                >
                  <span>{isSubmitting ? 'Verifying Authority...' : 'Enter Municipal Command Center'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* GATEWAY 3: DEDICATED ADMINISTRATOR GATEWAY              */}
          {/* ======================================================== */}
          {roleGate === 'ADMIN' && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-red-50/80 border border-red-200 text-red-950">
                <span className="font-bold text-red-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-red-700" />
                  System Administrator Security Console
                </span>
                <p className="text-[11px] text-[#57534e] mt-1">
                  Zero Client Trust administrative authority: Manage AI model calibration, monitor external APIs, review security audit trails, and provision municipal team members.
                </p>
              </div>

              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[#44403c] font-semibold">Admin Email or Handle</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#78716c] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="admin@thermosafe.gov.in or admin"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#ede7de] text-[#1c1917] focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[#44403c] font-semibold">Admin Master Password</label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[#78716c] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#ede7de] text-[#1c1917] focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Evaluator Quick Fill */}
                <div className="p-3 rounded-xl bg-[#faf9f6] border border-[#ede7de] space-y-1.5">
                  <span className="text-[10px] font-mono text-[#78716c] uppercase font-bold">SysAdmin Quick Access:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('admin', 'Admin@123', 'System Administrator')}
                    className="block text-left text-xs text-red-600 font-semibold hover:underline"
                  >
                    Use Master Admin (admin / Admin@123)
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-600/20 transition flex items-center justify-center space-x-2"
                >
                  <span>{isSubmitting ? 'Authenticating Admin...' : 'Enter System Admin Console'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

        </div>

        {/* Footer Disclaimer */}
        <p className="text-center text-[10px] text-[#78716c] mt-6 px-4">
          THERMOSAFE AI provides biometeorological thermal stress calculations and emergency resource guidance for public safety. Not intended for clinical or medical diagnoses.
        </p>
      </div>
    </div>
  );
};
