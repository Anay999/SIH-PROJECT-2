import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth, type UserRole } from '../../context/AuthContext';
import { ShieldAlert, LogOut, ArrowRight } from 'lucide-react';

interface RoleGuardProps {
  allowedRoles?: UserRole[];
  requiredPermission?: string;
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  requiredPermission,
  children,
}) => {
  const { user, isAuthenticated, isLoading, hasPermission, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 animate-ping" />
          <div className="absolute inset-0 rounded-full border-2 border-t-emerald-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          <div className="absolute inset-2 rounded-full border-2 border-t-transparent border-r-amber-500 border-b-transparent border-l-transparent animate-spin" />
        </div>
        <p className="text-xs uppercase tracking-widest text-slate-400 font-mono">
          Verifying Identity & Cryptographic Session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Check role restriction
  const roleDenied = allowedRoles && user && !allowedRoles.includes(user.role) && user.role !== 'ADMIN';

  // Check granular permission restriction
  const permissionDenied = requiredPermission && !hasPermission(requiredPermission);

  if (roleDenied || permissionDenied) {
    const defaultReturnPath = user?.role === 'CITIZEN' ? '/citizen' : user?.role === 'ADMIN' ? '/admin' : '/overview';

    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-slate-900/90 border border-red-500/30 rounded-xl p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-red-500" />

          <div className="flex items-center space-x-3 mb-6">
            <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 text-red-400">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">403 — Access Restricted</h2>
              <p className="text-xs text-slate-400 font-mono">SERVER-SIDE ZERO CLIENT TRUST ENFORCEMENT</p>
            </div>
          </div>

          <div className="space-y-4 mb-6 text-sm text-slate-300">
            <p>
              Your authenticated session identity does not possess the clearance required to access this operational view.
            </p>

            <div className="bg-slate-950/60 rounded-lg p-4 border border-slate-800 space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Active Identity:</span>
                <span className="text-emerald-400 font-semibold">{user?.username} ({user?.full_name})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Active Role:</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-500/30 font-bold">
                  {user?.role}
                </span>
              </div>
              {allowedRoles && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Required Role:</span>
                  <span className="text-slate-300">{allowedRoles.join(' or ')}</span>
                </div>
              )}
              {requiredPermission && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Required Permission:</span>
                  <span className="text-rose-400 font-semibold">{requiredPermission}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400 italic">
              Audit notice: Unauthorized boundary traversal attempts are logged to the immutable security journal.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-800">
            <Link
              to={defaultReturnPath}
              className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs tracking-wider uppercase transition-colors"
            >
              <span>Return to {user?.role === 'CITIZEN' ? 'Citizen Safety Portal' : 'Command Center'}</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>

            <button
              onClick={() => logout()}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs tracking-wider uppercase border border-slate-700 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              <span>Switch Identity</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
