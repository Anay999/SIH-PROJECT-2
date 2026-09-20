/**
 * Type-Safe Authentication API Client for HEATSHIELD AI.
 * Handles WhatsApp OTP challenge requests, verification, resend, sessions, and logout.
 */

const API_BASE = 'http://127.0.0.1:8000/api/v1';

export interface OtpRequestResponse {
  challenge_id: string;
  phone_masked: string;
  expires_in_seconds: number;
  resend_after_seconds: number;
  channel: string;
  provider: string;
  mode: 'MOCK' | 'LIVE';
  demo_otp?: string | null;
  demo_helper_active: boolean;
  message: string;
}

export interface OtpVerifyResponse {
  authenticated: boolean;
  session_id: string;
  session_token: string;
  actor_id: string;
  role: string;
  phone_masked: string;
  expires_at_utc: string;
  message: string;
}

export interface OtpResendResponse {
  challenge_id: string;
  resend_count: number;
  expires_in_seconds: number;
  resend_after_seconds: number;
  demo_otp?: string | null;
  demo_helper_active: boolean;
  message: string;
}

export interface SessionResponse {
  authenticated: boolean;
  session_id: string | null;
  actor_id: string;
  role: string;
  phone_masked: string | null;
  auth_method: string;
}

export interface ProviderStatusResponse {
  active_provider: string;
  status: string;
  is_mock: boolean;
  demo_mode: boolean;
  demo_helper_allowed: boolean;
  rate_limits: {
    max_attempts: number;
    expiry_seconds: number;
    cooldown_seconds: number;
    max_resends: number;
  };
  safeguards: string;
}

const SESSION_STORAGE_KEY = 'heatshield_session_data';

export function getStoredSession(): OtpVerifyResponse | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredSession(data: OtpVerifyResponse): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event('heatshield-auth-changed'));
  } catch (err) {
    console.warn('Failed to save auth session:', err);
  }
}

export function clearStoredSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    window.dispatchEvent(new Event('heatshield-auth-changed'));
  } catch (err) {
    console.warn('Failed to clear auth session:', err);
  }
}

export function createEvaluatorDemoSession(role: string = 'OFFICER'): OtpVerifyResponse {
  const session: OtpVerifyResponse = {
    authenticated: true,
    session_id: `eval_session_${Date.now()}`,
    session_token: `eval_token_${Math.random().toString(36).substring(2)}`,
    actor_id: 'officer_chennai_01',
    role: role,
    phone_masked: 'DEMO USER · MUNICIPAL OFFICER',
    expires_at_utc: new Date(Date.now() + 86400000).toISOString(),
    message: 'Evaluator Demo Access granted. Simulation mode active.',
  };
  saveStoredSession(session);
  return session;
}

export async function requestOtp(phoneNumber: string): Promise<OtpRequestResponse> {
  const res = await fetch(`${API_BASE}/auth/otp/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: phoneNumber, channel: 'whatsapp' }),
  });

  const body = await res.json();
  if (!res.ok) {
    const err = body.detail || body.error || { message: 'Failed to dispatch verification code.' };
    throw new Error(err.message || 'Error requesting OTP');
  }
  return body.data;
}

export async function verifyOtp(challengeId: string, otp: string): Promise<OtpVerifyResponse> {
  const res = await fetch(`${API_BASE}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challenge_id: challengeId, otp }),
  });

  const body = await res.json();
  if (!res.ok) {
    const err = body.detail || body.error || { message: 'Failed to verify code.' };
    throw new Error(err.message || 'Error verifying OTP');
  }
  saveStoredSession(body.data);
  return body.data;
}

export async function resendOtp(challengeId: string): Promise<OtpResendResponse> {
  const res = await fetch(`${API_BASE}/auth/otp/resend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challenge_id: challengeId }),
  });

  const body = await res.json();
  if (!res.ok) {
    const err = body.detail || body.error || { message: 'Failed to resend code.' };
    throw new Error(err.message || 'Error resending OTP');
  }
  return body.data;
}

export async function logoutUser(): Promise<void> {
  const session = getStoredSession();
  if (session?.session_id) {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: session.session_id }),
      });
    } catch (e) {
      console.warn('Logout API warning:', e);
    }
  }
  clearStoredSession();
}

export async function fetchCurrentSession(): Promise<SessionResponse> {
  const session = getStoredSession();
  const url = session?.session_id
    ? `${API_BASE}/auth/session?session_id=${session.session_id}`
    : `${API_BASE}/auth/session`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch session');
  }
  const body = await res.json();
  return body.data;
}

export async function fetchOtpProviderStatus(): Promise<ProviderStatusResponse> {
  const res = await fetch(`${API_BASE}/auth/provider-status`);
  if (!res.ok) {
    throw new Error('Failed to fetch provider status');
  }
  const body = await res.json();
  return body.data;
}
