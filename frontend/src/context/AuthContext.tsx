import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type UserRole = 'ADMIN' | 'MUNICIPAL_OFFICER' | 'CITIZEN';

export interface AuthUser {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  city?: string;
  phone_masked?: string;
  email?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  loginWithOtp: (challengeId: string, otp: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  register: (payload: { phone_number: string; full_name: string; city: string; password?: string; email?: string; role?: string }) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  updateCity: (city: string) => Promise<boolean>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/auth/me', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'include', // Sends HttpOnly cookie
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser({
            id: data.user.id,
            username: data.user.username,
            full_name: data.user.full_name,
            role: data.user.role as UserRole,
            city: data.user.city || 'Chennai',
            phone_masked: data.user.phone_masked,
          });
          setPermissions(data.permissions || []);
          setIsAuthenticated(true);
          return;
        }
      }
      // If not authenticated or error
      setUser(null);
      setPermissions([]);
      setIsAuthenticated(false);
    } catch (err) {
      console.warn('Session verification fallback:', err);
      setUser(null);
      setPermissions([]);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.detail?.message || data.detail || 'Authentication failed. Please verify credentials.';
        return { success: false, error: errorMsg };
      }

      setUser({
        id: data.user.id,
        username: data.user.username,
        full_name: data.user.full_name,
        role: data.user.role as UserRole,
        city: data.user.city || 'Chennai',
        phone_masked: data.user.phone_masked,
      });
      setPermissions(data.permissions || []);
      setIsAuthenticated(true);
      return { success: true, role: data.user.role as UserRole };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error while connecting to auth server.' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: { phone_number: string; full_name: string; city: string; password?: string; email?: string; role?: string }) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          phone_number: payload.phone_number,
          full_name: payload.full_name,
          city: payload.city,
          email: payload.email || undefined,
          password: payload.password || 'ThermoSafe@2026',
          role: payload.role || 'CITIZEN'
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.detail?.message || data.detail || 'Registration failed. Please verify details.';
        return { success: false, error: errorMsg };
      }

      setUser({
        id: data.user.id,
        username: data.user.username,
        full_name: data.user.full_name,
        role: data.user.role as UserRole,
        city: data.user.city || 'Chennai',
        phone_masked: data.user.phone_masked,
      });
      setPermissions(data.permissions || []);
      setIsAuthenticated(true);
      return { success: true, role: data.user.role as UserRole };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error while connecting to auth server.' };
    } finally {
      setIsLoading(false);
    }
  };

  const updateCity = async (newCity: string) => {
    try {
      const res = await fetch('/api/v1/auth/location', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ city: newCity }),
      });
      if (res.ok) {
        if (user) {
          setUser({ ...user, city: newCity });
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const loginWithOtp = async (challengeId: string, otp: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ challenge_id: challengeId, otp }),
      });

      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.detail?.message || data.detail || 'Invalid verification code.';
        return { success: false, error: errorMsg };
      }

      const verifiedRole = (data.user?.role || data.data?.role || 'CITIZEN') as UserRole;
      setUser({
        id: data.user?.id || data.data?.actor_id || 'citizen_user',
        username: data.user?.username || 'citizen',
        full_name: data.user?.full_name || 'Citizen User',
        role: verifiedRole,
        city: data.user?.city || 'Chennai',
        phone_masked: data.user?.phone_masked || data.data?.phone_masked,
      });
      setPermissions(data.permissions || []);
      setIsAuthenticated(true);
      return { success: true, role: verifiedRole };
    } catch (err: any) {
      return { success: false, error: err.message || 'OTP verification failed.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      setUser(null);
      setPermissions([]);
      setIsAuthenticated(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isAuthenticated,
        isLoading,
        login,
        loginWithOtp,
        register,
        updateCity,
        logout,
        hasPermission,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
