import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { RoleGuard } from './components/auth/RoleGuard';
import { AppShell } from './layouts/AppShell';

import { AuthPage } from './pages/AuthPage';
import { CitizenPortalPage } from './pages/CitizenPortalPage';
import { AdminConsolePage } from './pages/AdminConsolePage';
import { OverviewPage } from './pages/OverviewPage';
import { LiveHeatMapPage } from './pages/LiveHeatMapPage';
import { ForecastPage } from './pages/ForecastPage';
import { AlertsPage } from './pages/AlertsPage';
import { AlertManagementPage } from './pages/AlertManagementPage';
import { CoolingCentersPage } from './pages/CoolingCentersPage';
import { HospitalReadinessPage } from './pages/HospitalReadinessPage';
import { SimulationPage } from './pages/SimulationPage';
import { MethodologyPage } from './pages/MethodologyPage';
import { EmergencyGisPage } from './pages/EmergencyGisPage';
import { PublicSafetyPage } from './pages/PublicSafetyPage';
import { ApiMonitorPage } from './pages/ApiMonitorPage';
import { SettingsPage } from './pages/SettingsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { VulnerabilityPage } from './pages/VulnerabilityPage';
import { ThermalStressPage } from './pages/ThermalStressPage';
import { HealthRiskPage } from './pages/HealthRiskPage';
import { RegisteredUsersPage } from './pages/RegisteredUsersPage';
import { Municipal3DCommandCenter } from './components/thermomap/Municipal3DCommandCenter';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WorkspaceProvider>
          <BrowserRouter>
            <Routes>
              {/* Public & Authentication Gateways */}
              <Route path="/landing" element={<Navigate to="/" replace />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/login" element={<AuthPage />} />

              {/* Dedicated Citizen Safety Portal */}
              <Route
                path="/citizen"
                element={
                  <RoleGuard allowedRoles={['CITIZEN', 'MUNICIPAL_OFFICER', 'ADMIN']}>
                    <CitizenPortalPage />
                  </RoleGuard>
                }
              />

              {/* Main Decision Workspace Shell */}
              <Route
                path="/"
                element={
                  <RoleGuard allowedRoles={['CITIZEN', 'MUNICIPAL_OFFICER', 'ADMIN']}>
                    <AppShell />
                  </RoleGuard>
                }
              >
                {/* System Administration Console */}
                <Route
                  path="admin"
                  element={
                    <RoleGuard allowedRoles={['ADMIN']}>
                      <AdminConsolePage />
                    </RoleGuard>
                  }
                />

                {/* 8 Core Municipal Operations Workflows */}
                <Route index element={<OverviewPage />} />
                <Route path="overview" element={<OverviewPage />} />
                
                {/* 2. Heat Situation */}
                <Route path="heat-situation" element={<ForecastPage />} />
                <Route path="forecast" element={<ForecastPage />} />
                <Route path="thermal" element={<ThermalStressPage />} />

                {/* 3. Priority Areas */}
                <Route path="priority-areas" element={<VulnerabilityPage />} />
                <Route path="vulnerability" element={<VulnerabilityPage />} />

                {/* 4. Alert Management (Emergency Broadcasts & Warnings) */}
                <Route path="alerts" element={<AlertManagementPage />} />
                <Route path="alert-management" element={<AlertManagementPage />} />

                {/* 5. Heat Action Plan (HAP Workflow & Departmental Directives) */}
                <Route path="heat-action-plan" element={<AlertsPage />} />
                <Route path="action-plan" element={<AlertsPage />} />

                {/* 5. Cooling & Resources */}
                <Route path="cooling-resources" element={<CoolingCentersPage />} />
                <Route path="cooling-centres" element={<CoolingCentersPage />} />
                <Route path="cooling-centers" element={<CoolingCentersPage />} />

                {/* 6. Health Readiness */}
                <Route path="health-readiness" element={<HospitalReadinessPage />} />
                <Route path="health-risk" element={<HealthRiskPage />} />
                <Route path="hospitals" element={<HospitalReadinessPage />} />

                {/* 7. Scenario Planning (Admin Superuser Simulation Studio) */}
                <Route
                  path="scenario-planning"
                  element={
                    <RoleGuard allowedRoles={['ADMIN']}>
                      <SimulationPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="simulation"
                  element={
                    <RoleGuard allowedRoles={['ADMIN']}>
                      <SimulationPage />
                    </RoleGuard>
                  }
                />

                {/* 8. Evidence, Sources & Limitations */}
                <Route path="evidence" element={<MethodologyPage />} />
                <Route path="methodology" element={<MethodologyPage />} />
                <Route path="data-sources" element={<MethodologyPage />} />

                {/* Secondary Supporting Tools */}
                <Route path="map" element={<LiveHeatMapPage />} />
                <Route path="thermal-terrain" element={<Municipal3DCommandCenter centerLat={13.0827} centerLon={80.2707} municipalityName="Greater Chennai Corporation" wardName="Ward 114 - Central Operations" onClose={() => window.history.back()} />} />
                <Route path="3d-command" element={<Municipal3DCommandCenter centerLat={13.0827} centerLon={80.2707} municipalityName="Greater Chennai Corporation" wardName="Ward 114 - Central Operations" onClose={() => window.history.back()} />} />
                <Route path="emergency-gis" element={<EmergencyGisPage />} />
                <Route path="public-safety" element={<PublicSafetyPage />} />
                <Route
                  path="users"
                  element={
                    <RoleGuard allowedRoles={['MUNICIPAL_OFFICER', 'ADMIN']}>
                      <RegisteredUsersPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="analytics"
                  element={
                    <RoleGuard allowedRoles={['MUNICIPAL_OFFICER', 'ADMIN']}>
                      <AnalyticsPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="api-monitor"
                  element={
                    <RoleGuard allowedRoles={['ADMIN']}>
                      <ApiMonitorPage />
                    </RoleGuard>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <RoleGuard allowedRoles={['ADMIN']}>
                      <SettingsPage />
                    </RoleGuard>
                  }
                />

                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </WorkspaceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
