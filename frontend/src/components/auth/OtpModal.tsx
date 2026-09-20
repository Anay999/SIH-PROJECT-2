import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  Phone,
  MessageSquare,
  Lock,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ArrowLeft,
} from 'lucide-react';
import {
  requestOtp,
  verifyOtp,
  resendOtp,
  type OtpRequestResponse,
} from '../../services/authApi';

interface OtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const OtpModal: React.FC<OtpModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('+91 90000 00001');
  const [challengeData, setChallengeData] = useState<OtpRequestResponse | null>(null);

  // 6 individual OTP digit boxes
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown timer
  const [cooldown, setCooldown] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifiedSuccess, setVerifiedSuccess] = useState<boolean>(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  if (!isOpen) return null;

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const data = await requestOtp(phone);
      setChallengeData(data);
      setCooldown(data.resend_after_seconds || 60);
      setStep('otp');
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    if (val.length > 1) {
      // Handle paste of full 6-digit OTP
      const digits = val.replace(/\D/g, '').slice(0, 6).split('');
      const newDigits = [...otpDigits];
      digits.forEach((d, i) => {
        newDigits[i] = d;
      });
      setOtpDigits(newDigits);
      const nextIdx = Math.min(digits.length, 5);
      inputRefs.current[nextIdx]?.focus();
      return;
    }

    const digit = val.replace(/\D/g, '');
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    // Auto-advance
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6 || !challengeData) {
      setErrorMsg('Please enter the full 6-digit verification code.');
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      await verifyOtp(challengeData.challenge_id, fullOtp);
      setVerifiedSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !challengeData || loading) return;
    setErrorMsg(null);
    setLoading(true);

    try {
      const data = await resendOtp(challengeData.challenge_id);
      setCooldown(data.resend_after_seconds || 60);
      if (data.demo_otp) {
        setChallengeData(prev => prev ? { ...prev, demo_otp: data.demo_otp } : null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCode = () => {
    if (challengeData?.demo_otp && challengeData.demo_otp.length === 6) {
      const digits = challengeData.demo_otp.split('');
      setOtpDigits(digits);
      inputRefs.current[5]?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-command-panel border border-command-border rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-200">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-red-950/50 via-slate-900 to-cyan-950/50 border-b border-command-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center">
              <Flame className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm text-white tracking-wider">HEATSHIELD AI</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Access Portal
                </span>
              </div>
              <span className="text-[11px] text-command-muted font-mono">Secure WhatsApp OTP Authentication</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Error Alert Box */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-xs text-red-200 flex items-start gap-2 font-mono">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Banner */}
          {verifiedSuccess && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Verified! Initializing command center session...</span>
            </div>
          )}

          {step === 'phone' ? (
            /* STEP 1: Phone Entry */
            <div className="space-y-4">
              {/* Quick Evaluator Demo Access Button */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-cyan-950/60 border border-cyan-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    Evaluator Demo Access
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold">
                    1-Click Access
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-tight">
                  Instant prototype access for municipal evaluators, public health reviewers, and hackathon judges.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    import('../../services/authApi').then(({ createEvaluatorDemoSession }) => {
                      createEvaluatorDemoSession('OFFICER');
                      setVerifiedSuccess(true);
                      setTimeout(() => {
                        if (onSuccess) onSuccess();
                        onClose();
                      }, 400);
                    });
                  }}
                  className="w-full py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-cyan-950/50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Enter as DEMO USER · MUNICIPAL OFFICER</span>
                </button>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-command-border"></div>
                <span className="flex-shrink mx-3 text-[10px] font-mono uppercase text-slate-500">
                  Or Simulate WhatsApp OTP
                </span>
                <div className="flex-grow border-t border-command-border"></div>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-300 flex items-center justify-between">
                    <span>Registered Mobile Number:</span>
                    <span className="text-[10px] text-cyan-400 flex items-center gap-1 font-sans">
                      <MessageSquare className="w-3 h-3" />
                      Mock WhatsApp Channel
                    </span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 90000 00001"
                      className="w-full bg-command-card border border-command-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Authentication simulated for prototype evaluation. Zero real SMS or WhatsApp messages dispatched.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-command-border font-mono text-xs font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Dispatching Simulated Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Dispatch Verification Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* STEP 2: 6-Digit OTP Entry */
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex items-center justify-between border-b border-command-border pb-2.5">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Number</span>
                </button>
                <span className="text-xs font-mono text-cyan-300 font-semibold">
                  {challengeData?.phone_masked}
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-slate-300 block text-center">
                  Enter 6-Digit Verification Code
                </label>
                {/* 6 Box Input Row */}
                <div className="flex items-center justify-center gap-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { inputRefs.current[idx] = el; }}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="w-11 h-12 bg-command-card border border-command-border rounded-xl text-center text-lg font-mono font-bold text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                    />
                  ))}
                </div>
              </div>

              {/* Local Dev Demo Helper Box */}
              {challengeData?.demo_helper_active && challengeData?.demo_otp && (
                <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/40 flex items-center justify-between text-xs font-mono text-cyan-200">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-cyan-400 block uppercase">Local Dev Demo OTP:</span>
                      <strong className="text-sm font-black tracking-widest text-white">
                        {challengeData.demo_otp}
                      </strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={fillDemoCode}
                    className="px-2 py-1 rounded bg-cyan-600/40 hover:bg-cyan-600/60 text-cyan-200 text-[11px] font-bold transition"
                  >
                    Auto-Fill
                  </button>
                </div>
              )}

              {/* Cooldown & Resend */}
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1">
                <span>
                  {cooldown > 0 ? (
                    <span className="text-amber-400">Resend in {cooldown}s</span>
                  ) : (
                    <span>Didn't receive code?</span>
                  )}
                </span>
                <button
                  type="button"
                  disabled={cooldown > 0 || loading}
                  onClick={handleResend}
                  className="text-cyan-400 hover:text-cyan-300 disabled:opacity-40 font-semibold"
                >
                  Resend Code
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || verifiedSuccess}
                className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-mono text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Verify & Enter Command Center</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-command-card/80 border-t border-command-border text-[10px] font-mono text-slate-500 flex items-center justify-between">
          <span>HEATSHIELD AI v2.0 RBAC</span>
          <span>DEFAULT ROLE: VIEWER</span>
        </div>
      </div>
    </div>
  );
};
