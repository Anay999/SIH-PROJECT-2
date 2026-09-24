import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import {
  Shield,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Building,
  Mail,
  ShieldCheck,
  Server,
  Globe,
  HardHat,
  Droplets,
  Thermometer,
  ChevronLeft,
  Eye,
  EyeOff,
  PhoneCall,
  Sparkles,
  Layers,
  Radio,
  Check,
  Activity,
  X,
  LifeBuoy
} from 'lucide-react';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../utils/translations';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { login, register, loginWithOtp } = useAuth();
  const { setActiveCity } = useWorkspace();

  const roleParam = searchParams.get('role');

  // Navigation view: 'hub' (3-Card Landing Overview matching Image 3) vs 'login' (Full-Sized Split Screen matching Image 1 & 2)
  const [activeView, setActiveView] = useState<'hub' | 'login'>('hub');

  // Role Gate: 'CITIZEN' | 'MUNICIPAL_OFFICER' | 'ADMIN'
  const [roleGate, setRoleGate] = useState<'CITIZEN' | 'MUNICIPAL_OFFICER' | 'ADMIN'>('CITIZEN');
  const [citizenMode, setCitizenMode] = useState<'signin' | 'register' | 'otp'>('signin');

  // Password visibility toggle
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Credentials
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('Chennai');

  // Registration state
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

  // Language state
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>('en');

  // Modals for Header links
  const [activeModal, setActiveModal] = useState<'about' | 'howItWorks' | 'science' | 'helpline' | null>(null);

  // Feedback states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync role and view from URL query params or route
  useEffect(() => {
    if (location.pathname === '/login' || roleParam) {
      setActiveView('login');
      if (roleParam === 'citizen') setRoleGate('CITIZEN');
      else if (roleParam === 'officer' || roleParam === 'authority' || roleParam === 'municipal_officer') setRoleGate('MUNICIPAL_OFFICER');
      else if (roleParam === 'admin' || roleParam === 'worker') setRoleGate('ADMIN');
    }
  }, [location.pathname, roleParam]);

  // Navigate back to the 3-Card Civic Landing Hub
  const handleBackToHub = () => {
    setActiveView('hub');
    setSearchParams({});
    setErrorMessage(null);
    setSuccessMessage(null);
    if (location.pathname === '/login') {
      navigate('/auth');
    }
  };

  // Open the full-sized login view for a specific role
  const openRoleLogin = (role: 'CITIZEN' | 'MUNICIPAL_OFFICER' | 'ADMIN', mode: 'signin' | 'register' = 'signin') => {
    setRoleGate(role);
    setCitizenMode(mode);
    setErrorMessage(null);
    setSuccessMessage(null);
    setActiveView('login');
    const roleSlug = role === 'CITIZEN' ? 'citizen' : role === 'MUNICIPAL_OFFICER' ? 'officer' : 'admin';
    setSearchParams({ role: roleSlug });
  };

  // Quick autofill helper
  const handleQuickFill = (userStr: string, passStr: string, role: 'CITIZEN' | 'MUNICIPAL_OFFICER' | 'ADMIN') => {
    setRoleGate(role);
    setIdentifier(userStr);
    setPassword(passStr);
    setCitizenMode('signin');
    setErrorMessage(null);
    setSuccessMessage(`Autofilled demo credentials. Click 'Login →' below.`);
    setActiveView('login');
    const roleSlug = role === 'CITIZEN' ? 'citizen' : role === 'MUNICIPAL_OFFICER' ? 'officer' : 'admin';
    setSearchParams({ role: roleSlug });
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
      setSuccessMessage('Verification code sent via WhatsApp.');
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

  // Reusable Informative Modals
  const renderModals = () => {
    if (!activeModal) return null;
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
        <div className="bg-white border border-[#ede7de] rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl relative">
          <button
            onClick={() => setActiveModal(null)}
            className="absolute top-5 right-5 p-1 rounded-full bg-stone-100 hover:bg-stone-200 text-[#57534e]"
          >
            <X className="w-4 h-4" />
          </button>

          {activeModal === 'about' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-orange-600">
                <Shield className="w-5 h-5" />
                <h3 className="text-lg font-black text-[#1c1917]">About THERMOSAFE AI</h3>
              </div>
              <p className="text-xs text-[#57534e] leading-relaxed">
                THERMOSAFE AI is an intelligent, GIS-enabled heatwave early warning and human thermal stress platform designed to forecast how extreme weather conditions impact human physiology.
              </p>
              <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 text-xs text-orange-950 space-y-1">
                <strong>NDMA Heat Action Plan Alignment:</strong>
                <p className="text-[#57534e]">
                  Compliant with National Disaster Management Authority guidelines for threshold-based cooling shelter activation, shaded transit stops, and midday labor suspension.
                </p>
              </div>
            </div>
          )}

          {activeModal === 'howItWorks' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-600">
                <Activity className="w-5 h-5" />
                <h3 className="text-lg font-black text-[#1c1917]">How It Works (5-Stage Pipeline)</h3>
              </div>
              <ol className="space-y-2 text-xs text-[#57534e] list-decimal list-inside">
                <li><strong>Weather Ingestion:</strong> Real-time dry-bulb, humidity, wind, and radiation via Open-Meteo.</li>
                <li><strong>Thermal Stress Modeling:</strong> High-precision WBGT (ISO 7243), UTCI, and HTSI composite metrics.</li>
                <li><strong>Spatial GIS Triage:</strong> Ward-level choropleths, H3 hex indexing, and demographic vulnerability overlays.</li>
                <li><strong>Health Surge Prediction:</strong> Non-linear excess mortality ranges and hospital emergency surge forecasting.</li>
                <li><strong>Targeted Interventions:</strong> Automated WhatsApp/SMS broadcasts and crowdsourced incident resolution.</li>
              </ol>
            </div>
          )}

          {activeModal === 'science' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-blue-600">
                <Thermometer className="w-5 h-5" />
                <h3 className="text-lg font-black text-[#1c1917]">Why Temperature Alone Fails</h3>
              </div>
              <p className="text-xs text-[#57534e] leading-relaxed">
                At 40°C with 20% humidity, human sweat evaporates quickly to cool the core. At 40°C with 70% humidity, evaporation ceases, trapping metabolic heat and triggering heat exhaustion or fatal heat stroke.
              </p>
              <p className="text-xs text-[#57534e] leading-relaxed">
                THERMOSAFE AI models the complete physiological energy balance to deliver action before thresholds turn critical.
              </p>
            </div>
          )}

          {activeModal === 'helpline' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-600">
                <PhoneCall className="w-5 h-5" />
                <h3 className="text-lg font-black text-[#1c1917]">National Emergency Heat Helplines</h3>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between">
                  <div>
                    <strong className="text-red-950 block">108 — Emergency Medical Ambulance</strong>
                    <span className="text-[#57534e]">Direct triage dispatch for acute heat stroke</span>
                  </div>
                  <a href="tel:108" className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold">Call 108</a>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                  <div>
                    <strong className="text-amber-950 block">1077 — District Disaster Control Room</strong>
                    <span className="text-[#57534e]">Heatwave advisories & relief center status</span>
                  </div>
                  <a href="tel:1077" className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold">Call 1077</a>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                  <div>
                    <strong className="text-blue-950 block">1913 — Municipal Public Corporation</strong>
                    <span className="text-[#57534e]">Report broken water kiosks or unshaded sites</span>
                  </div>
                  <a href="tel:1913" className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold">Call 1913</a>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() => setActiveModal(null)}
            className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#1c1917] font-bold text-xs transition"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  };

  // =========================================================================
  // VIEW A: FULL-SIZED SPLIT SCREEN LOGIN PAGE (Matches Reference Images 1 & 2)
  // =========================================================================
  if (activeView === 'login') {
    return (
      <div className="min-h-screen w-full bg-white text-[#1c1917] font-sans selection:bg-orange-500 selection:text-white flex flex-col lg:flex-row overflow-x-hidden">
        
        {/* ----------------------------------------------------------------- */}
        {/* LEFT PANE: FULL-HEIGHT AUTH WORKSPACE (50% on Desktop, 100% Mobile) */}
        {/* ----------------------------------------------------------------- */}
        <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 bg-white border-r border-[#ede7de] z-10 overflow-y-auto">
          
          {/* Top Bar with Prominent Back Button & Branding */}
          <div className="flex items-center justify-between gap-4 pb-6 border-b border-[#f5f3ef]">
            <button
              onClick={handleBackToHub}
              className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#faf9f6] hover:bg-[#f2ede4] text-[#292524] hover:text-black border border-[#ede7de] text-xs font-bold transition shadow-2xs group"
            >
              <ChevronLeft className="w-4 h-4 text-orange-600 transition group-hover:-translate-x-1" />
              <span>← Back to role selection</span>
            </button>

            {/* Logo Badge & Language Dropdown */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-xs">
                  <Shield className="w-4 h-4" />
                </div>
                <span className="text-xs font-black tracking-tight text-[#1c1917]">
                  THERMOSAFE <span className="text-orange-600">AI</span>
                </span>
              </div>

              <select
                value={currentLang}
                onChange={(e) => setCurrentLang(e.target.value as SupportedLanguage)}
                className="text-xs font-semibold bg-[#faf9f6] border border-[#ede7de] rounded-xl px-2.5 py-1.5 text-[#44403c] focus:outline-none"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Center Form Container (Roomy, Full-Sized, Clean) */}
          <div className="max-w-md w-full mx-auto my-auto py-8 space-y-6">
            
            {/* Role Header Banner */}
            <div className="space-y-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 ${
                    roleGate === 'CITIZEN'
                      ? 'bg-orange-600 shadow-orange-600/20'
                      : roleGate === 'MUNICIPAL_OFFICER'
                      ? 'bg-blue-600 shadow-blue-600/20'
                      : 'bg-purple-600 shadow-purple-600/20'
                  }`}
                >
                  {roleGate === 'CITIZEN' && <User className="w-6 h-6" />}
                  {roleGate === 'MUNICIPAL_OFFICER' && <Building className="w-6 h-6" />}
                  {roleGate === 'ADMIN' && <Server className="w-6 h-6" />}
                </div>

                <div>
                  <h2 className="text-2xl font-black text-[#1c1917] tracking-tight">
                    {roleGate === 'CITIZEN' && 'Citizen Login'}
                    {roleGate === 'MUNICIPAL_OFFICER' && 'Municipal Officer Login'}
                    {roleGate === 'ADMIN' && 'Admin & Operations Login'}
                  </h2>
                  <p className="text-xs text-[#57534e] mt-1 leading-snug">
                    {roleGate === 'CITIZEN' && 'Access local heat alerts, check thermal risk, find nearby help, and stay safe.'}
                    {roleGate === 'MUNICIPAL_OFFICER' && 'Monitor ward-level risk, manage alerts, view forecasts, and take action.'}
                    {roleGate === 'ADMIN' && 'Manage platform, monitor systems, configure municipalities, and oversee operations.'}
                  </p>
                </div>
              </div>

              {/* Quick Role Switcher Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-[#faf9f6] border border-[#ede7de] rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setRoleGate('CITIZEN');
                    setErrorMessage(null);
                    setSearchParams({ role: 'citizen' });
                  }}
                  className={`flex-1 py-2 rounded-xl transition ${
                    roleGate === 'CITIZEN'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-[#57534e] hover:text-[#1c1917]'
                  }`}
                >
                  Citizen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRoleGate('MUNICIPAL_OFFICER');
                    setErrorMessage(null);
                    setSearchParams({ role: 'officer' });
                  }}
                  className={`flex-1 py-2 rounded-xl transition ${
                    roleGate === 'MUNICIPAL_OFFICER'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-[#57534e] hover:text-[#1c1917]'
                  }`}
                >
                  Municipal Officer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRoleGate('ADMIN');
                    setErrorMessage(null);
                    setSearchParams({ role: 'admin' });
                  }}
                  className={`flex-1 py-2 rounded-xl transition ${
                    roleGate === 'ADMIN'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-[#57534e] hover:text-[#1c1917]'
                  }`}
                >
                  Admin & Operations
                </button>
              </div>

              {/* Submode Switcher (For Citizen: Sign In vs Create Account vs OTP) */}
              {roleGate === 'CITIZEN' && (
                <div className="flex items-center space-x-6 border-b border-[#ede7de] text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setCitizenMode('signin');
                      setErrorMessage(null);
                    }}
                    className={`pb-2.5 transition relative ${
                      citizenMode === 'signin'
                        ? 'text-orange-600 border-b-2 border-orange-600'
                        : 'text-[#78716c] hover:text-[#1c1917]'
                    }`}
                  >
                    Password Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCitizenMode('register');
                      setErrorMessage(null);
                    }}
                    className={`pb-2.5 transition relative ${
                      citizenMode === 'register'
                        ? 'text-orange-600 border-b-2 border-orange-600'
                        : 'text-[#78716c] hover:text-[#1c1917]'
                    }`}
                  >
                    Create Account
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCitizenMode('otp');
                      setErrorMessage(null);
                    }}
                    className={`pb-2.5 transition relative ${
                      citizenMode === 'otp'
                        ? 'text-orange-600 border-b-2 border-orange-600'
                        : 'text-[#78716c] hover:text-[#1c1917]'
                    }`}
                  >
                    WhatsApp Code
                  </button>
                </div>
              )}
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span className="leading-snug">{successMessage}</span>
              </div>
            )}

            {/* 1. PASSWORD SIGN IN (Standard) */}
            {(roleGate !== 'CITIZEN' || citizenMode === 'signin') && (
              <form onSubmit={handlePasswordLogin} className="space-y-4 text-xs">
                
                {/* Email or Phone */}
                <div className="space-y-1.5">
                  <label className="block text-[#44403c] font-bold">
                    {roleGate === 'CITIZEN'
                      ? 'Email or Mobile Number'
                      : roleGate === 'MUNICIPAL_OFFICER'
                      ? 'Official Email ID or Username'
                      : 'System Admin Identifier'}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#78716c] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={
                        roleGate === 'CITIZEN'
                          ? '+91 98765 43210 or user@example.com'
                          : roleGate === 'MUNICIPAL_OFFICER'
                          ? 'officer@chennaicorp.gov.in'
                          : 'admin@thermosafe.gov.in'
                      }
                      className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917] text-sm placeholder-[#a8a29e] focus:outline-none focus:border-orange-500 focus:bg-white transition"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="block text-[#44403c] font-bold">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#78716c] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917] text-sm placeholder-[#a8a29e] focus:outline-none focus:border-orange-500 focus:bg-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#78716c] hover:text-[#1c1917]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Officer Municipality Scope Selector */}
                {roleGate === 'MUNICIPAL_OFFICER' && (
                  <div className="space-y-1.5">
                    <label className="block text-[#44403c] font-bold">Assigned Corporation Jurisdiction</label>
                    <select
                      value={selectedMunicipality}
                      onChange={(e) => setSelectedMunicipality(e.target.value)}
                      className="w-full px-3.5 py-3 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917] text-xs focus:outline-none focus:border-blue-500 font-semibold"
                    >
                      <option value="Chennai">Greater Chennai Corporation (Tamil Nadu)</option>
                      <option value="Ahmedabad">Ahmedabad Municipal Corporation (Gujarat)</option>
                      <option value="Delhi">Municipal Corporation of Delhi (NCT Delhi)</option>
                      <option value="Mumbai">Brihanmumbai Municipal Corporation (Maharashtra)</option>
                      <option value="Bengaluru">Bruhat Bengaluru Mahanagara Palike (Karnataka)</option>
                    </select>
                  </div>
                )}

                {/* Remember me & Forgot Password */}
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-[#ede7de] text-orange-600 focus:ring-0"
                    />
                    <span className="text-[11px] text-[#57534e]">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setErrorMessage('For demonstration, use the quick demo credentials below.')}
                    className="text-[11px] font-bold text-orange-700 hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3.5 rounded-2xl text-white font-black text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2 ${
                    roleGate === 'CITIZEN'
                      ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/20'
                      : roleGate === 'MUNICIPAL_OFFICER'
                      ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                      : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/20'
                  }`}
                >
                  <span>{isSubmitting ? 'Authenticating...' : 'Login →'}</span>
                </button>
              </form>
            )}

            {/* 2. REGISTRATION FORM (Citizen Sign Up) */}
            {roleGate === 'CITIZEN' && citizenMode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="block text-[#44403c] font-bold">Full Name</label>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Ananya Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[#44403c] font-bold">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="ananya@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[#44403c] font-bold">Mobile (+91)</label>
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[#44403c] font-bold">City</label>
                    <select
                      value={regCity}
                      onChange={(e) => setRegCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917]"
                    >
                      <option value="Chennai">Chennai</option>
                      <option value="Ahmedabad">Ahmedabad</option>
                      <option value="Delhi">Delhi</option>
                      <option value="Mumbai">Mumbai</option>
                      <option value="Bengaluru">Bengaluru</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[#44403c] font-bold">Create Password</label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917]"
                  />
                </div>
                <label className="flex items-center space-x-2 pt-1 text-[11px] text-[#57534e]">
                  <input
                    type="checkbox"
                    checked={locationConsent}
                    onChange={(e) => setLocationConsent(e.target.checked)}
                    className="rounded text-orange-600"
                  />
                  <span>Enable GPS auto-assignment for hyper-local heat alerts</span>
                </label>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider transition shadow-sm"
                >
                  {isSubmitting ? 'Registering...' : 'Create Account & Enter Portal'}
                </button>
              </form>
            )}

            {/* 3. OTP VERIFICATION FORM (Citizen WhatsApp) */}
            {roleGate === 'CITIZEN' && citizenMode === 'otp' && (
              <div className="space-y-3.5 text-xs">
                {!challengeId ? (
                  <form onSubmit={handleRequestOtp} className="space-y-3.5">
                    <p className="text-[#57534e]">
                      Receive a secure 6-digit heat alert login code via WhatsApp or SMS.
                    </p>
                    <div className="space-y-1">
                      <label className="block text-[#44403c] font-bold">Mobile Number</label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3.5 py-3 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider transition"
                    >
                      {isSubmitting ? 'Sending...' : 'Send WhatsApp Code'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                    {demoOtpCode && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-mono">
                        Demo Code: <strong>{demoOtpCode}</strong>
                      </div>
                    )}
                    <div className="space-y-1">
                      <label className="block text-[#44403c] font-bold">Enter 6-Digit Code</label>
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="123456"
                        className="w-full px-3.5 py-3 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-center text-lg font-mono tracking-widest text-[#1c1917]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider transition"
                    >
                      {isSubmitting ? 'Verifying...' : 'Verify Code & Enter Portal'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Alternative SSO / Google Button (Image 1 style) */}
            <div className="space-y-2 pt-2">
              <div className="relative flex items-center justify-center">
                <div className="border-t border-[#ede7de] w-full" />
                <span className="bg-white px-2 text-[10px] text-[#a8a29e] uppercase font-bold tracking-wider absolute">
                  or
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (roleGate === 'CITIZEN') handleQuickFill('+919876543210', 'Citizen@123', 'CITIZEN');
                  else if (roleGate === 'MUNICIPAL_OFFICER') handleQuickFill('officer@chennaicorp.gov.in', 'Officer@123', 'MUNICIPAL_OFFICER');
                  else handleQuickFill('admin@thermosafe.gov.in', 'Admin@123', 'ADMIN');
                }}
                className="w-full py-3 px-4 rounded-xl border border-[#ede7de] hover:bg-[#faf9f6] text-xs font-bold text-[#44403c] transition flex items-center justify-center gap-2 shadow-2xs"
              >
                <span>{roleGate === 'CITIZEN' ? 'Google Account Single Sign-On' : 'National Digital Municipal SSO'}</span>
              </button>
            </div>

            {/* Quick Demo Autofill Chips */}
            <div className="pt-4 border-t border-[#ede7de] space-y-2">
              <span className="text-[10px] font-bold text-[#78716c] uppercase tracking-wider block">
                Quick Demo Autofill Credentials:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill('+919876543210', 'Citizen@123', 'CITIZEN')}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100 transition"
                >
                  Demo Citizen (+919876543210)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('officer@chennaicorp.gov.in', 'Officer@123', 'MUNICIPAL_OFFICER')}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition"
                >
                  Demo Officer (officer@chennaicorp.gov.in)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('admin@thermosafe.gov.in', 'Admin@123', 'ADMIN')}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 transition"
                >
                  Demo Admin (admin@thermosafe.gov.in)
                </button>
              </div>
            </div>

          </div>

          {/* Bottom Security Watermark inside Left Pane */}
          <div className="pt-6 border-t border-[#f5f3ef] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#78716c]">
            <span>Official Heat Early Warning & Resilience System • Govt of India</span>
            <div className="flex items-center gap-3 font-semibold">
              <button onClick={() => setActiveModal('about')} className="hover:text-orange-600 transition">About</button>
              <button onClick={() => setActiveModal('science')} className="hover:text-orange-600 transition">Science</button>
              <button onClick={() => setActiveModal('helpline')} className="hover:text-red-600 transition">Helplines</button>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* RIGHT PANE: FULL-HEIGHT HERO ARTWORK (50% on Desktop, Sticky Screen) */}
        {/* ----------------------------------------------------------------- */}
        <div className="hidden lg:flex lg:w-1/2 min-h-screen relative overflow-hidden bg-gradient-to-br from-amber-100 via-orange-100 to-amber-200 flex-col justify-between p-8 xl:p-14 sticky top-0 h-screen">
          
          {/* Background Artwork */}
          <img
            src={
              roleGate === 'CITIZEN'
                ? '/assets/citizen_hero.jpg'
                : roleGate === 'MUNICIPAL_OFFICER'
                ? '/assets/officer_hero.jpg'
                : '/assets/admin_hero.jpg'
            }
            alt="HeatSafe Thermal Operations Illustration"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />

          {/* Gradient Overlay for Rich Contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/30" />

          {/* Top Watermark Badge */}
          <div className="relative z-10 self-end">
            <div className="flex items-center gap-2.5 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/60 shadow-lg">
              <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center text-white text-xs">
                ☀️
              </div>
              <div>
                <span className="text-xs font-black uppercase text-[#1c1917] tracking-wider block">
                  THERMOSAFE AI
                </span>
                <span className="text-[9px] text-[#57534e] block leading-none font-medium">
                  Safer Communities. Cooler Tomorrows.
                </span>
              </div>
            </div>
          </div>

          {/* Floating Glassmorphic Quote Card */}
          <div className="relative z-10 self-end max-w-sm animate-subtle-float">
            <div className="bg-white/95 backdrop-blur-md border border-white/70 rounded-3xl p-6 shadow-2xl space-y-2.5">
              <h4 className="text-xl font-black text-[#1c1917] leading-snug tracking-tight">
                {roleGate === 'CITIZEN' && 'Informed Communities Build a Safer Tomorrow.'}
                {roleGate === 'MUNICIPAL_OFFICER' && 'Data-Driven Decisions for Healthier Cities.'}
                {roleGate === 'ADMIN' && 'Monitor. Adapt. Scale. Impact.'}
              </h4>
              <div
                className={`w-10 h-1 rounded-full ${
                  roleGate === 'CITIZEN'
                    ? 'bg-orange-600'
                    : roleGate === 'MUNICIPAL_OFFICER'
                    ? 'bg-blue-600'
                    : 'bg-purple-600'
                }`}
              />
              <p className="text-xs text-[#78716c] font-medium leading-relaxed">
                {roleGate === 'CITIZEN' && 'Hyper-local biometeorological intelligence for outdoor labor and families.'}
                {roleGate === 'MUNICIPAL_OFFICER' && 'Ward-level heat-action plan triage and automated alert dispatches.'}
                {roleGate === 'ADMIN' && 'National spatial thermal modeling, live APIs, and municipal supervision.'}
              </p>
            </div>
          </div>

        </div>

        {/* Informative Modals */}
        {renderModals()}
      </div>
    );
  }

  // =========================================================================
  // VIEW B: THREE-CARD CIVIC LANDING HUB (Matches Reference Image 3)
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1c1917] font-sans selection:bg-orange-500 selection:text-white flex flex-col justify-between">
      
      {/* ---------------------------------------------------- */}
      {/* TOP CIVIC NAVIGATION BAR (Image 3)                   */}
      {/* ---------------------------------------------------- */}
      <header className="bg-white/95 backdrop-blur-md border-b border-[#ede7de] sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Brand Identity */}
          <div
            onClick={() => setActiveView('hub')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-yellow-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black tracking-tight text-[#1c1917]">
                  THERMOSAFE <span className="text-orange-600">AI</span>
                </span>
                <span className="hidden sm:inline-block px-2 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 border border-orange-200">
                  HeatSafe
                </span>
              </div>
              <p className="text-[10px] text-[#78716c] font-medium tracking-wide">
                Safer Communities. Cooler Tomorrows.
              </p>
            </div>
          </div>

          {/* Center Informative Navigation Links */}
          <nav className="hidden md:flex items-center space-x-7 text-xs font-semibold text-[#57534e]">
            <button
              onClick={() => setActiveModal('about')}
              className="hover:text-orange-600 transition"
            >
              About
            </button>
            <button
              onClick={() => setActiveModal('howItWorks')}
              className="hover:text-orange-600 transition"
            >
              How It Works
            </button>
            <button
              onClick={() => setActiveModal('science')}
              className="hover:text-orange-600 transition"
            >
              Thermal Science
            </button>
            <button
              onClick={() => setActiveModal('helpline')}
              className="hover:text-red-600 transition flex items-center gap-1"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Emergency Helplines
            </button>
          </nav>

          {/* Right Action: Language Switcher & Quick Demo */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Globe className="w-4 h-4 text-[#78716c] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={currentLang}
                onChange={(e) => setCurrentLang(e.target.value as SupportedLanguage)}
                className="pl-8 pr-7 py-1.5 text-xs font-semibold bg-[#faf9f6] border border-[#ede7de] rounded-xl text-[#44403c] hover:border-stone-400 focus:outline-none appearance-none cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName} ({lang.name})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => handleQuickFill('+919876543210', 'Citizen@123', 'CITIZEN')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-bold shadow-xs transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quick Demo Access</span>
            </button>
          </div>

        </div>
      </header>

      {/* ---------------------------------------------------- */}
      {/* CIVIC HERO SECTION & THREE CARDS                     */}
      {/* ---------------------------------------------------- */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex-1 flex flex-col justify-center space-y-10">
        
        {/* Government Badge & Headline */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Official Municipal Digital Civic Service • National Heatwave Early Warning & Resilience System
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-[#1c1917] tracking-tight leading-tight">
            A Cooler, Safer India <br />
            <span className="relative inline-block text-emerald-700">
              Starts with You
              <svg className="absolute -bottom-2 left-0 w-full h-3 text-emerald-500" viewBox="0 0 100 12" preserveAspectRatio="none">
                <path d="M0,7 Q25,0 50,7 T100,7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-[#57534e] max-w-2xl mx-auto leading-relaxed pt-1">
            Report heat emergencies. Monitor real-time WBGT thermal stress. Locate free drinking water kiosks, and build heat-resilient communities together.
          </p>
        </div>

        {/* 3 Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Card 1: Citizen Login */}
          <div className="bg-white border border-[#ede7de] rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl hover:border-orange-300 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden aspect-video bg-stone-100 shadow-inner">
                <img
                  src="/assets/card_citizen.jpg"
                  alt="Indian Citizen checking heat alert and drinking water kiosk"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded-lg bg-emerald-600/90 text-white text-[10px] font-bold backdrop-blur-xs flex items-center gap-1">
                  <User className="w-3 h-3" />
                  Public
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-[#1c1917] group-hover:text-orange-600 transition">
                  Citizen Login
                </h3>
                <p className="text-xs text-[#57534e] mt-1 leading-snug">
                  Check hyper-local heat risk, receive proactive advisories, locate free water points, and protect loved ones.
                </p>
              </div>

              <ul className="space-y-2 pt-2 text-xs text-[#44403c]">
                <li className="flex items-center gap-2">
                  <Droplets className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Report Issues with Water Taps & Shade</span>
                </li>
                <li className="flex items-center gap-2">
                  <Thermometer className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Track Live Street Heat & WBGT Burden</span>
                </li>
                <li className="flex items-center gap-2">
                  <LifeBuoy className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>View Nearby Cooling Shelters & Water</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Protect Loved Ones in Care Circle</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <button
                onClick={() => openRoleLogin('CITIZEN')}
                className="w-full py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm hover:shadow-orange-600/25 transition flex items-center justify-center gap-2 group-hover:gap-3"
              >
                <span>Login as Citizen</span>
                <ArrowRight className="w-4 h-4 transition" />
              </button>
            </div>
          </div>

          {/* Card 2: Authority Login */}
          <div className="bg-white border border-[#ede7de] rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden aspect-video bg-stone-100 shadow-inner">
                <img
                  src="/assets/card_officer.jpg"
                  alt="Municipal Officer analyzing ward thermal map"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded-lg bg-blue-600/90 text-white text-[10px] font-bold backdrop-blur-xs flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  Official
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-[#1c1917] group-hover:text-blue-600 transition">
                  Authority Login
                </h3>
                <p className="text-xs text-[#57534e] mt-1 leading-snug">
                  Manage ward-level risk, assign departments, monitor progress, and keep the city heat-safe.
                </p>
              </div>

              <ul className="space-y-2 pt-2 text-xs text-[#44403c]">
                <li className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Ward-Level HTSI Choropleth & Satellite GIS</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Heat Action Plan (HAP) Triage & Directives</span>
                </li>
                <li className="flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Targeted SMS & WhatsApp Broadcasts</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Hospital Surge & ICU Readiness Forecast</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <button
                onClick={() => openRoleLogin('MUNICIPAL_OFFICER')}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm hover:shadow-blue-600/25 transition flex items-center justify-center gap-2 group-hover:gap-3"
              >
                <span>Login as Authority</span>
                <ArrowRight className="w-4 h-4 transition" />
              </button>
            </div>
          </div>

          {/* Card 3: Department Worker Login */}
          <div className="bg-white border border-[#ede7de] rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden aspect-video bg-stone-100 shadow-inner">
                <img
                  src="/assets/card_worker.jpg"
                  alt="Municipal Worker in safety gear at cooling shelter"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded-lg bg-orange-600/90 text-white text-[10px] font-bold backdrop-blur-xs flex items-center gap-1">
                  <HardHat className="w-3 h-3" />
                  Operations
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-[#1c1917] group-hover:text-amber-600 transition">
                  Department Worker Login
                </h3>
                <p className="text-xs text-[#57534e] mt-1 leading-snug">
                  View assigned field directives, monitor occupational WBGT limits, and submit ground evidence.
                </p>
              </div>

              <ul className="space-y-2 pt-2 text-xs text-[#44403c]">
                <li className="flex items-center gap-2">
                  <Thermometer className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  <span>ISO 7243 Work/Rest Break Standards (45/15m)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Droplets className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  <span>Mobile Water Tanker & Kiosk Replenishment</span>
                </li>
                <li className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  <span>Upload Ground Photos & Verification</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  <span>Mark Heat Interventions as Completed</span>
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <button
                onClick={() => openRoleLogin('ADMIN')}
                className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm hover:shadow-amber-600/25 transition flex items-center justify-center gap-2 group-hover:gap-3"
              >
                <span>Login as Worker / Admin</span>
                <ArrowRight className="w-4 h-4 transition" />
              </button>
            </div>
          </div>

        </div>

        {/* Bottom Feature Strip (Image 3 Highlights) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          <div className="p-4 rounded-2xl bg-white border border-[#ede7de] text-center space-y-1">
            <span className="text-lg">🌡️</span>
            <div className="text-xs font-bold text-[#1c1917]">Real-Time Thermal Risk</div>
            <p className="text-[10px] text-[#78716c]">WBGT, Heat Index & UTCI updated hourly</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-[#ede7de] text-center space-y-1">
            <span className="text-lg">🗺️</span>
            <div className="text-xs font-bold text-[#1c1917]">GIS-Based ThermoMap</div>
            <p className="text-[10px] text-[#78716c]">Interactive ward-level thermal maps</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-[#ede7de] text-center space-y-1">
            <span className="text-lg">📲</span>
            <div className="text-xs font-bold text-[#1c1917]">Targeted Alerts</div>
            <p className="text-[10px] text-[#78716c]">Role-based SMS & WhatsApp broadcasts</p>
          </div>
          <div className="p-4 rounded-2xl bg-white border border-[#ede7de] text-center space-y-1">
            <span className="text-lg">💧</span>
            <div className="text-xs font-bold text-[#1c1917]">Proactive Interventions</div>
            <p className="text-[10px] text-[#78716c]">Cooling centers, water kiosks & advisories</p>
          </div>
        </div>

      </main>

      {/* ---------------------------------------------------- */}
      {/* CIVIC FOOTER                                         */}
      {/* ---------------------------------------------------- */}
      <footer className="bg-white border-t border-[#ede7de] py-4 text-xs text-[#78716c] mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <p className="text-[11px]">
            © 2026 <strong>THERMOSAFE AI (HeatSafe)</strong>. Built for National Smart Cities Mission & Public Heat Resilience.
          </p>
          <div className="flex items-center space-x-4 text-[11px] font-semibold">
            <button onClick={() => setActiveModal('about')} className="hover:text-orange-600 transition">About System</button>
            <button onClick={() => setActiveModal('science')} className="hover:text-orange-600 transition">Biometeorology</button>
            <button onClick={() => setActiveModal('helpline')} className="hover:text-red-600 transition">Emergency 108</button>
          </div>
        </div>
      </footer>

      {/* Informative Modals */}
      {renderModals()}
    </div>
  );
};
