import React, { useState } from 'react';
import { Outlet, Navigate, useLocation, Link } from 'react-router-dom';
import { UserCheck, MessageSquare, Compass, ArrowLeft } from 'lucide-react';
import { TopHeader } from '../components/common/TopHeader';
import { Sidebar } from '../components/common/Sidebar';
import { GlobalContextBar } from '../components/common/GlobalContextBar';
import { WardInspectorDrawer } from '../components/common/WardInspectorDrawer';
import { OtpModal } from '../components/auth/OtpModal';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';

export const AppShell: React.FC = () => {
  const { authSession, loginAsDemoOfficer } = useWorkspace();
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // If citizen accesses public emergency routing or weather outlook, render dedicated citizen layout
  if (user?.role === 'CITIZEN') {
    if (location.pathname === '/emergency-gis' || location.pathname === '/forecast') {
      return (
        <div className="h-screen max-h-screen overflow-hidden bg-slate-50 flex flex-col text-slate-800 font-sans">
          {/* Dedicated Citizen Top Bar */}
          <header className="border-b border-slate-200 bg-white/95 backdrop-blur px-4 py-2.5 shrink-0 flex items-center justify-between z-40 shadow-xs">
            <div className="flex items-center gap-3">
              <Link
                to="/citizen"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition shadow-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>← Back to Citizen Safety Portal</span>
              </Link>
              <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 pl-3">
                <span className="font-black text-sm text-slate-900 tracking-wider">HEATSHIELD AI</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold uppercase">
                  {location.pathname === '/forecast' ? '5-Day Heat Outlook' : 'Emergency Route Navigation'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-slate-500 font-mono hidden md:inline">
                {user?.full_name} ({user?.city || 'Jurisdiction'})
              </span>
              <Link
                to="/citizen"
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
              >
                Safety Portal
              </Link>
            </div>
          </header>

          {/* Scrollable Citizen Content Area */}
          <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 bg-slate-50 scrollbar-thin">
            <div className="max-w-7xl mx-auto w-full">
              <Outlet />
            </div>
          </main>
        </div>
      );
    }

    // Citizens cannot access any other municipal operations views
    return <Navigate to="/citizen" replace />;
  }

  const isUserAuthenticated = isAuthenticated || authSession?.authenticated;

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-slate-50 flex flex-col text-slate-900 font-sans">
      {/* 1. Unauthenticated Entry Gate */}
      {!isUserAuthenticated ? (
        <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center p-6 bg-slate-100 relative">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-7 shadow-xl space-y-6 text-slate-800 z-10 my-auto">
            {/* Header */}
            <div className="space-y-1.5 border-b border-slate-200 pb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-xs">
                  HS
                </div>
                <span className="font-bold text-lg text-slate-900 tracking-tight">HEATSHIELD AI</span>
              </div>
              <h1 className="text-base font-semibold text-slate-900">
                Municipal Climate-Health Operations Platform
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                Decision workspace for biometeorological heat triage, localized vulnerability assessment, and emergency resource coordination.
              </p>
            </div>

            {/* Entry Paths */}
            <div className="space-y-3">
              {/* Evaluator Demo Access Button */}
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    Evaluator Demo Access
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                    Demo Role
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Enter directly as <strong>DEMO MUNICIPAL OFFICER</strong> to evaluate operational workflows without credential entry.
                </p>
                <button
                  type="button"
                  onClick={loginAsDemoOfficer}
                  className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Enter as Municipal Officer (Demo)</span>
                </button>
              </div>

              {/* WhatsApp OTP Access */}
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium transition flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Simulate WhatsApp OTP Verification</span>
              </button>
            </div>

            {/* Public Citizen Portal Shortcut */}
            <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-200 pt-4">
              <a
                href="/public-safety"
                className="text-emerald-700 hover:text-emerald-800 font-medium transition flex items-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Public Citizen Advisory</span>
              </a>
              <span className="text-[11px] text-slate-400 font-mono">India Command Area</span>
            </div>
          </div>
        </div>
      ) : (
        /* 2. Authenticated Municipal Operations Workspace */
        <>
          <div className="shrink-0 z-40">
            <TopHeader />
            <GlobalContextBar />
          </div>

          <div className="flex flex-1 min-h-0 overflow-hidden relative">
            <Sidebar />
            <main className="flex-1 min-h-0 overflow-y-auto p-6 bg-slate-50 scrollbar-thin">
              <Outlet />
            </main>
          </div>

          {/* Shared Global Ward Inspector Drawer */}
          <WardInspectorDrawer />
        </>
      )}

      {/* WhatsApp OTP Modal */}
      <OtpModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={loginAsDemoOfficer}
      />
    </div>
  );
};
