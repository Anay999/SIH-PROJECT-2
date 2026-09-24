import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const { login, register, loginWithOtp } = useAuth();
  const { setActiveCity } = useWorkspace();

  // Navigation view: 'hub' (3-Card Landing Overview matching Image 3) vs 'login' (Split Login matching Image 1 & 2)
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

  // Quick autofill helper
  const handleQuickFill = (userStr: string, passStr: string, role: 'CITIZEN' | 'MUNICIPAL_OFFICER' | 'ADMIN') => {
    setRoleGate(role);
    setIdentifier(userStr);
    setPassword(passStr);
    setCitizenMode('signin');
    setErrorMessage(null);
    setSuccessMessage(`Autofilled demo credentials. Click 'Login →' below.`);
    setActiveView('login');
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

  const openRoleLogin = (role: 'CITIZEN' | 'MUNICIPAL_OFFICER' | 'ADMIN', mode: 'signin' | 'register' = 'signin') => {
    setRoleGate(role);
    setCitizenMode(mode);
    setErrorMessage(null);
    setSuccessMessage(null);
    setActiveView('login');
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#1c1917] font-sans selection:bg-orange-500 selection:text-white flex flex-col justify-between">
      
      {/* ======================================================== */}
      {/* 1. TOP CIVIC NAVIGATION BAR (Matching Image 3 & 2)       */}
      {/* ======================================================== */}
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
              <PhoneCall className="w-3 h-3 text-red-500" />
              <span>Emergency Helplines</span>
            </button>
          </nav>

          {/* Right Actions: Language Selector & Quick Demo Login */}
          <div className="flex items-center space-x-2.5">
            {/* 8 Indian Languages Dropdown */}
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#f5f3ef] border border-[#ede7de] text-xs font-bold text-[#1c1917] hover:border-orange-300 transition">
              <Globe className="w-3.5 h-3.5 text-orange-600" />
              <select
                value={currentLang}
                onChange={(e) => setCurrentLang(e.target.value as SupportedLanguage)}
                className="bg-transparent font-bold text-[#1c1917] focus:outline-none cursor-pointer text-xs"
                title="Select Regional Language"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.nativeName} ({l.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Demo Dropdown or Action */}
            {activeView === 'login' ? (
              <button
                onClick={() => setActiveView('hub')}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#ede7de] hover:bg-[#f5f3ef] text-xs font-bold text-[#57534e] transition flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Role Hub</span>
              </button>
            ) : (
              <button
                onClick={() => handleQuickFill('+919876543210', 'Citizen@123', 'CITIZEN')}
                className="hidden sm:flex px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-xs items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Quick Demo Access</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* VIEW A: 3-CARD CIVIC LANDING HUB (Exact Image 3 Layout)  */}
      {/* ======================================================== */}
      {activeView === 'hub' && (
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col justify-between space-y-10">
          
          {/* Hero Header Area */}
          <div className="text-center max-w-3xl mx-auto space-y-3.5">
            {/* Official Seal Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[11px] font-bold tracking-wide shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Official Municipal Digital Civic Service • National Heatwave Early Warning & Resilience System</span>
            </div>

            {/* Main Headline with Animated Wave Underline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1c1917] tracking-tight leading-tight">
              A Cooler, Safer India{' '}
              <span className="relative inline-block text-emerald-600">
                Starts with You
                {/* Decorative SVG Animated Squiggle Underline */}
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3 text-emerald-500 overflow-visible"
                  viewBox="0 0 120 12"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M1 6 Q 15 1, 30 6 T 60 6 T 90 6 T 119 6"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-xs sm:text-sm text-[#57534e] max-w-2xl mx-auto leading-relaxed pt-1">
              Report heat emergencies. Monitor real-time WBGT thermal stress. Locate free drinking water kiosks, and build heat-resilient communities together.
            </p>
          </div>

          {/* ======================================================== */}
          {/* THE 3 REALISTIC CIVIC ROLE CARDS (Matching Image 3)       */}
          {/* ======================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            
            {/* CARD 1: CITIZEN LOGIN */}
            <div className="bg-white border border-[#ede7de] hover:border-emerald-400 rounded-3xl p-5 sm:p-6 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group space-y-5">
              <div className="space-y-4">
                {/* Illustration with Pill Icon */}
                <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-[#faf9f6] border border-[#ede7de]">
                  <img
                    src="/assets/card_citizen.jpg"
                    alt="Citizen on street checking heat alert near water kiosk"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Floating Role Emblem Badge */}
                  <div className="absolute top-3 left-3 w-9 h-9 rounded-xl bg-emerald-600/95 backdrop-blur-md text-white flex items-center justify-center shadow-md">
                    <User className="w-5 h-5" />
                  </div>
                </div>

                {/* Card Title & Description */}
                <div>
                  <h3 className="text-lg font-black text-[#1c1917] tracking-tight">Citizen Login</h3>
                  <p className="text-xs text-[#57534e] mt-1 leading-relaxed">
                    Check hyper-local heat risk, receive proactive advisories, locate free water points, and protect loved ones.
                  </p>
                </div>

                {/* Feature Checklist matching Image 3 style */}
                <div className="space-y-2 pt-1 border-t border-[#f5f3ef] text-xs">
                  <div className="flex items-start gap-2.5 text-[#44403c]">
                    <div className="w-4 h-4 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Droplets className="w-2.5 h-2.5" />
                    </div>
                    <span>Report Issues with Water Taps & Shade</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-[#44403c]">
                    <div className="w-4 h-4 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Thermometer className="w-2.5 h-2.5" />
                    </div>
                    <span>Track Live Street Heat & WBGT Burden</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-[#44403c]">
                    <div className="w-4 h-4 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <LifeBuoy className="w-2.5 h-2.5" />
                    </div>
                    <span>View Nearby Cooling Shelters & Water</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-[#44403c]">
                    <div className="w-4 h-4 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                    <span>Protect Loved Ones in Care Circle</span>
                  </div>
                </div>
              </div>

              {/* Action Button & Sublink */}
              <div className="space-y-2 pt-3 border-t border-[#ede7de]">
                <button
                  type="button"
                  onClick={() => openRoleLogin('CITIZEN', 'signin')}
                  className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2 group-hover:gap-3"
                >
                  <span>Login as Citizen</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => openRoleLogin('CITIZEN', 'register')}
                    className="text-[11px] font-bold text-emerald-700 hover:underline"
                  >
                    New Citizen? Create an Account
                  </button>
                </div>
              </div>
            </div>

            {/* CARD 2: AUTHORITY / MUNICIPAL OFFICER LOGIN */}
            <div className="bg-white border border-[#ede7de] hover:border-blue-400 rounded-3xl p-5 sm:p-6 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group space-y-5">
              <div className="space-y-4">
                {/* Illustration with Pill Icon */}
                <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-[#faf9f6] border border-[#ede7de]">
                  <img
                    src="/assets/card_officer.jpg"
                    alt="Municipal officer in control room analyzing ward heat map"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Floating Role Emblem Badge */}
                  <div className="absolute top-3 left-3 w-9 h-9 rounded-xl bg-blue-600/95 backdrop-blur-md text-white flex items-center justify-center shadow-md">
                    <Building className="w-5 h-5" />
                  </div>
                </div>

                {/* Card Title & Description */}
                <div>
                  <h3 className="text-lg font-black text-[#1c1917] tracking-tight">Authority Login</h3>
                  <p className="text-xs text-[#57534e] mt-1 leading-relaxed">
                    Manage ward-level risk, assign departments, monitor progress, and keep the city heat-safe.
                  </p>
                </div>

                {/* Feature Checklist matching Image 3 style */}
                <div className="space-y-2 pt-1 border-t border-[#f5f3ef] text-xs">
                  <div className="flex items-start gap-2.5 text-[#44403c]">
                    <div className="w-4 h-4 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Layers className="w-2.5 h-2.5" />
                    </div>
                    <span>Ward-Level HTSI Choropleth & Satellite GIS</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-[#44403c]">
                    <div className="w-4 h-4 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-2.5 h-2.5" />
                    </div>
                    <span>Heat Action Plan (HAP) Triage & Directives</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-[#44403c]">
                    <div className="w-4 h-4 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Radio className="w-2.5 h-2.5" />
                    </div>
                    <span>Targeted SMS & WhatsApp Broadcasts</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-[#44403c]">
                    <div className="w-4 h-4 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                    <span>Hospital Surge & ICU Readiness Forecast</span>
                  </div>
                </div>
              </div>

              {/* Action Button & Sublink */}
              <div className="space-y-2 pt-3 border-t border-[#ede7de]">
                <button
                  type="button"
                  onClick={() => openRoleLogin('MUNICIPAL_OFFICER', 'signin')}
                  className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2 group-hover:gap-3"
                >
                  <span>Login as Authority</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div className="text-center">
                  <span className="text-[11px] font-medium text-[#78716c]">
                    Municipal Officers, Ward Inspectors & Health Staff
                  </span>
                </div>
              </div>
            </div>

            {/* CARD 3: DEPARTMENT WORKER / FIELD OPS / ADMIN LOGIN */}
            <div className="bg-white border border-[#ede7de] hover:border-orange-400 rounded-3xl p-5 sm:p-6 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group space-y-5">
              <div className="space-y-4">
                {/* Illustration with Pill Icon */}
                <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-[#faf9f6] border border-[#ede7de]">
                  <img
                    src="/assets/card_worker.jpg"
                    alt="Municipal department worker with tablet inspecting cooling shelter and water kiosk"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Floating Role Emblem Badge */}
                  <div className="absolute top-3 left-3 w-9 h-9 rounded-xl bg-orange-600/95 backdrop-blur-md text-white flex items-center justify-center shadow-md">
                    <HardHat className="w-5 h-5" />
                  </div>
                </div>

                {/* Card Title & Description */}
                <div>
                  <h3 className="text-lg font-black text-[#1c1917] tracking-tight">Department Worker Login</h3>
                  <p className="text-xs text-[#57534e] mt-1 leading-relaxed">
                    View assigned field directives, monitor occupational WBGT limits, and submit ground evidence.
                  </p>
                </div>

                {/* Feature Checklist matching Image 3 style */}
                <div className="space-y-2 pt-1 border-t border-[#f5f3ef] text-xs">
                  <div className="flex items-start gap-2.5 text-[#44403c]">
                    <div className="w-4 h-4 rounded-md bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Thermometer className="w-2.5 h-2.5" />
                    </div>
                    <span>ISO 7243 Work/Rest Break Standards (45/15m)</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-[#44403c]">
                    <div className="w-4 h-4 rounded-md bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Droplets className="w-2.5 h-2.5" />
                    </div>
                    <span>Mobile Water Tanker & Kiosk Replenishment</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-[#44403c]">
                    <div className="w-4 h-4 rounded-md bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Activity className="w-2.5 h-2.5" />
                    </div>
                    <span>Upload Ground Photos & Verification</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-[#44403c]">
                    <div className="w-4 h-4 rounded-md bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5" />
                    </div>
                    <span>Mark Heat Interventions as Completed</span>
                  </div>
                </div>
              </div>

              {/* Action Button & Sublink */}
              <div className="space-y-2 pt-3 border-t border-[#ede7de]">
                <button
                  type="button"
                  onClick={() => openRoleLogin('ADMIN', 'signin')}
                  className="w-full py-3 px-4 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2 group-hover:gap-3"
                >
                  <span>Login as Worker / Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div className="text-center">
                  <span className="text-[11px] font-medium text-[#78716c]">
                    Field Staff, Site Supervisors & Operations Admins
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* ======================================================== */}
          {/* BOTTOM FEATURE HIGHLIGHT STRIP (Matching Image 2)        */}
          {/* ======================================================== */}
          <div className="bg-white border border-[#ede7de] rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-[#ede7de]">
              
              {/* Feature 1 */}
              <div className="space-y-1 sm:px-3 pt-2 md:pt-0">
                <div className="flex items-center gap-2 text-orange-600">
                  <Thermometer className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-wider text-[#1c1917]">
                    Real-time Thermal Risk
                  </span>
                </div>
                <p className="text-[11px] text-[#78716c] leading-relaxed">
                  Beyond temperature. Real human biometeorological impact (WBGT & UTCI).
                </p>
              </div>

              {/* Feature 2 */}
              <div className="space-y-1 sm:px-3 pt-2 md:pt-0">
                <div className="flex items-center gap-2 text-orange-600">
                  <Layers className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-wider text-[#1c1917]">
                    GIS-Based ThermoMap
                  </span>
                </div>
                <p className="text-[11px] text-[#78716c] leading-relaxed">
                  High-resolution street-level thermal grid mesh from India to your ward.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="space-y-1 sm:px-3 pt-2 md:pt-0">
                <div className="flex items-center gap-2 text-orange-600">
                  <Radio className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-wider text-[#1c1917]">
                    Targeted Alerts
                  </span>
                </div>
                <p className="text-[11px] text-[#78716c] leading-relaxed">
                  Right people. Right time (SMS, WhatsApp broadcast, and Siren).
                </p>
              </div>

              {/* Feature 4 */}
              <div className="space-y-1 sm:px-3 pt-2 md:pt-0">
                <div className="flex items-center gap-2 text-orange-600">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-wider text-[#1c1917]">
                    Proactive Interventions
                  </span>
                </div>
                <p className="text-[11px] text-[#78716c] leading-relaxed">
                  Cooler cities. Healthier lives through municipal heat action plans.
                </p>
              </div>

            </div>
          </div>

        </main>
      )}

      {/* ======================================================== */}
      {/* VIEW B: SPLIT SCREEN LOGIN VIEW (Matching Image 1 & 2)   */}
      {/* ======================================================== */}
      {activeView === 'login' && (
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex flex-col justify-center">
          
          {/* Back Button & Role Switcher Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <button
              onClick={() => setActiveView('hub')}
              className="inline-flex items-center gap-2 text-xs font-bold text-orange-700 hover:text-orange-900 transition self-start"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>← Back to role selection</span>
            </button>

            {/* Quick Role Switcher Tabs */}
            <div className="flex items-center gap-1 p-1 bg-white border border-[#ede7de] rounded-2xl shadow-2xs self-start sm:self-auto text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setRoleGate('CITIZEN');
                  setErrorMessage(null);
                }}
                className={`px-3 py-1.5 rounded-xl transition ${
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
                }}
                className={`px-3 py-1.5 rounded-xl transition ${
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
                }}
                className={`px-3 py-1.5 rounded-xl transition ${
                  roleGate === 'ADMIN'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-[#57534e] hover:text-[#1c1917]'
                }`}
              >
                Admin & Operations
              </button>
            </div>
          </div>

          {/* Master Split Card matching Image 1 & 2 */}
          <div className="bg-white border border-[#ede7de] rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
            
            {/* ---------------------------------------------------- */}
            {/* LEFT COLUMN: AUTHENTICATION FORM (5 Columns on Large) */}
            {/* ---------------------------------------------------- */}
            <div className="lg:col-span-6 p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-6">
              
              <div className="space-y-5">
                {/* Header with Role Emblem */}
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0 ${
                      roleGate === 'CITIZEN'
                        ? 'bg-orange-600 shadow-orange-600/20'
                        : roleGate === 'MUNICIPAL_OFFICER'
                        ? 'bg-blue-600 shadow-blue-600/20'
                        : 'bg-purple-600 shadow-purple-600/20'
                    }`}
                  >
                    {roleGate === 'CITIZEN' && <User className="w-5 h-5" />}
                    {roleGate === 'MUNICIPAL_OFFICER' && <Building className="w-5 h-5" />}
                    {roleGate === 'ADMIN' && <Server className="w-5 h-5" />}
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-[#1c1917] tracking-tight">
                      {roleGate === 'CITIZEN' && 'Citizen Login'}
                      {roleGate === 'MUNICIPAL_OFFICER' && 'Municipal Officer Login'}
                      {roleGate === 'ADMIN' && 'Admin & Operations Login'}
                    </h2>
                    <p className="text-xs text-[#57534e] mt-0.5 leading-snug">
                      {roleGate === 'CITIZEN' && 'Access local heat alerts, check thermal risk, find nearby help, and stay safe.'}
                      {roleGate === 'MUNICIPAL_OFFICER' && 'Monitor ward-level risk, manage alerts, view forecasts, and take action.'}
                      {roleGate === 'ADMIN' && 'Manage platform, monitor systems, configure municipalities, and oversee operations.'}
                    </p>
                  </div>
                </div>

                {/* Submode Switcher (For Citizen: Sign In vs Create Account vs OTP) */}
                {roleGate === 'CITIZEN' && (
                  <div className="flex border-b border-[#ede7de] text-xs font-bold gap-4">
                    <button
                      type="button"
                      onClick={() => setCitizenMode('signin')}
                      className={`pb-2 border-b-2 transition ${
                        citizenMode === 'signin'
                          ? 'border-orange-600 text-orange-600'
                          : 'border-transparent text-[#78716c] hover:text-[#1c1917]'
                      }`}
                    >
                      Password Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => setCitizenMode('register')}
                      className={`pb-2 border-b-2 transition ${
                        citizenMode === 'register'
                          ? 'border-orange-600 text-orange-600'
                          : 'border-transparent text-[#78716c] hover:text-[#1c1917]'
                      }`}
                    >
                      Create Account
                    </button>
                    <button
                      type="button"
                      onClick={() => setCitizenMode('otp')}
                      className={`pb-2 border-b-2 transition ${
                        citizenMode === 'otp'
                          ? 'border-orange-600 text-orange-600'
                          : 'border-transparent text-[#78716c] hover:text-[#1c1917]'
                      }`}
                    >
                      WhatsApp Code
                    </button>
                  </div>
                )}

                {/* Feedback Alerts */}
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{errorMessage}</span>
                  </div>
                )}
                {successMessage && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {/* 1. PASSWORD SIGN IN FORM (Used by Citizen Signin, Officer, Admin) */}
                {((roleGate === 'CITIZEN' && citizenMode === 'signin') || roleGate !== 'CITIZEN') && (
                  <form onSubmit={handlePasswordLogin} className="space-y-3.5 text-xs">
                    {/* Identifier */}
                    <div className="space-y-1">
                      <label className="block text-[#44403c] font-bold">
                        {roleGate === 'CITIZEN' && 'Email or Mobile Number'}
                        {roleGate === 'MUNICIPAL_OFFICER' && 'Official Email ID'}
                        {roleGate === 'ADMIN' && 'Admin Email'}
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
                              ? '+91 98765 43210 or citizen@gmail.com'
                              : roleGate === 'MUNICIPAL_OFFICER'
                              ? 'officer@chennaicorp.gov.in'
                              : 'admin@thermosafe.gov.in'
                          }
                          className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-orange-500 transition"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                      <label className="block text-[#44403c] font-bold">Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-[#78716c] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917] placeholder-[#a8a29e] focus:outline-none focus:border-orange-500 transition"
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
                      <div className="space-y-1">
                        <label className="block text-[#44403c] font-bold">Assigned Corporation Jurisdiction</label>
                        <select
                          value={selectedMunicipality}
                          onChange={(e) => setSelectedMunicipality(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917] focus:outline-none focus:border-blue-500 font-medium"
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
                      className={`w-full py-3 rounded-2xl text-white font-black text-xs uppercase tracking-wider transition shadow-sm flex items-center justify-center gap-2 ${
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
                  <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="block text-[#44403c] font-bold">Full Name</label>
                      <input
                        type="text"
                        required
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="Ananya Sharma"
                        className="w-full px-3 py-2.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[#44403c] font-bold">Email Address (Optional)</label>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="ananya@example.com"
                        className="w-full px-3 py-2.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917]"
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
                          className="w-full px-3 py-2.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[#44403c] font-bold">City</label>
                        <select
                          value={regCity}
                          onChange={(e) => setRegCity(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917]"
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
                        className="w-full px-3 py-2.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917]"
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
                      className="w-full py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider transition shadow-sm"
                    >
                      {isSubmitting ? 'Registering...' : 'Create Account & Enter Portal'}
                    </button>
                  </form>
                )}

                {/* 3. OTP VERIFICATION FORM (Citizen WhatsApp) */}
                {roleGate === 'CITIZEN' && citizenMode === 'otp' && (
                  <div className="space-y-3 text-xs">
                    {!challengeId ? (
                      <form onSubmit={handleRequestOtp} className="space-y-3">
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
                            className="w-full px-3 py-2.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917]"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider transition"
                        >
                          {isSubmitting ? 'Sending...' : 'Send WhatsApp Code'}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyOtp} className="space-y-3">
                        {demoOtpCode && (
                          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-mono">
                            Demo Code: <strong>{demoOtpCode}</strong>
                          </div>
                        )}
                        <div className="space-y-1">
                          <label className="block text-[#44403c] font-bold">Enter 6-Digit Code</label>
                          <input
                            type="text"
                            required
                            maxLength={6}
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl bg-[#faf9f6] border border-[#ede7de] text-[#1c1917] font-mono text-center tracking-widest text-base font-bold"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider transition"
                        >
                          {isSubmitting ? 'Verifying...' : 'Verify Code & Enter'}
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
                    className="w-full py-2.5 px-4 rounded-xl border border-[#ede7de] hover:bg-[#faf9f6] text-xs font-bold text-[#44403c] transition flex items-center justify-center gap-2 shadow-2xs"
                  >
                    <span>{roleGate === 'CITIZEN' ? 'Google Account Single Sign-On' : 'National Digital Municipal SSO'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Demo Autofill Chips (Bottom of form) */}
              <div className="pt-4 border-t border-[#ede7de] space-y-1.5">
                <span className="text-[10px] font-bold text-[#78716c] uppercase tracking-wider block">
                  Quick Demo Autofill Credentials:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickFill('+919876543210', 'Citizen@123', 'CITIZEN')}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100 transition"
                  >
                    Demo Citizen (+919876543210)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('officer@chennaicorp.gov.in', 'Officer@123', 'MUNICIPAL_OFFICER')}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition"
                  >
                    Demo Officer (officer@chennaicorp.gov.in)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('admin@thermosafe.gov.in', 'Admin@123', 'ADMIN')}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 transition"
                  >
                    Demo Admin (admin@thermosafe.gov.in)
                  </button>
                </div>
              </div>

            </div>

            {/* ---------------------------------------------------- */}
            {/* RIGHT COLUMN: ATMOSPHERIC HERO ARTWORK (Exact Image 1)*/}
            {/* ---------------------------------------------------- */}
            <div className="lg:col-span-6 relative bg-gradient-to-br from-amber-100 via-orange-100 to-amber-200 overflow-hidden min-h-[360px] lg:min-h-full flex flex-col justify-between p-6 sm:p-8">
              
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

              {/* Subtle Gradient Overlay for Contrast */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

              {/* Top Watermark Tag (Image 1 style) */}
              <div className="relative z-10 self-end">
                <div className="flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/40 shadow-md">
                  <div className="w-5 h-5 rounded-full bg-orange-600 flex items-center justify-center text-white text-[10px]">
                    ☀️
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#1c1917] tracking-wider block">
                      THERMOSAFE AI
                    </span>
                    <span className="text-[8px] text-[#57534e] block leading-none">
                      Safer Communities. Cooler Tomorrows.
                    </span>
                  </div>
                </div>
              </div>

              {/* Floating Quote Card with Slogan (Exact Match to Image 1) */}
              <div className="relative z-10 self-end max-w-xs animate-subtle-float">
                <div className="bg-white/95 backdrop-blur-md border border-white/60 rounded-3xl p-5 shadow-2xl space-y-2">
                  <h4 className="text-lg font-black text-[#1c1917] leading-snug tracking-tight">
                    {roleGate === 'CITIZEN' && 'Informed Communities Build a Safer Tomorrow.'}
                    {roleGate === 'MUNICIPAL_OFFICER' && 'Data-Driven Decisions for Healthier Cities.'}
                    {roleGate === 'ADMIN' && 'Monitor. Adapt. Scale. Impact.'}
                  </h4>
                  
                  {/* Color Accent Bar */}
                  <div
                    className={`w-8 h-1 rounded-full ${
                      roleGate === 'CITIZEN'
                        ? 'bg-orange-600'
                        : roleGate === 'MUNICIPAL_OFFICER'
                        ? 'bg-blue-600'
                        : 'bg-purple-600'
                    }`}
                  />
                  
                  <p className="text-[10px] text-[#78716c] font-medium pt-1">
                    {roleGate === 'CITIZEN' && 'Hyper-local biometeorological intelligence for outdoor labor and families.'}
                    {roleGate === 'MUNICIPAL_OFFICER' && 'Ward-level heat-action plan triage and automated alert dispatches.'}
                    {roleGate === 'ADMIN' && 'National spatial thermal modeling, live APIs, and municipal supervision.'}
                  </p>
                </div>
              </div>

            </div>

          </div>

        </main>
      )}

      {/* ======================================================== */}
      {/* 3. CIVIC FOOTER                                          */}
      {/* ======================================================== */}
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

      {/* ======================================================== */}
      {/* INFORMATIVE MODALS (About, How It Works, Science, Help)   */}
      {/* ======================================================== */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
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
      )}

    </div>
  );
};
