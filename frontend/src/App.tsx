import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';

// Page components
import { OverviewPage } from '@/pages/OverviewPage';
import { RetailPage } from '@/pages/RetailPage';
import { FraudPage } from '@/pages/FraudPage';
import { MaintenancePage } from '@/pages/MaintenancePage';
import { HealthcarePage } from '@/pages/HealthcarePage';
import { RecommendationsPage } from '@/pages/RecommendationsPage';
import { AutoDSPage } from '@/pages/AutoDSPage';
import { CopilotPage } from '@/pages/CopilotPage';
import { DatasetManagerPage } from '@/pages/DatasetManagerPage';
import { ModelPerformancePage } from '@/pages/ModelPerformancePage';
import { ExperimentTrackingPage } from '@/pages/ExperimentTrackingPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-cyan-400 rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-mono tracking-wider">INITIALIZING INTELLISPHERE AI...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const PublicRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              }
            />

            {/* Authenticated Application Shell */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<OverviewPage />} />
              <Route path="retail" element={<RetailPage />} />
              <Route path="fraud" element={<FraudPage />} />
              <Route path="maintenance" element={<MaintenancePage />} />
              <Route path="healthcare" element={<HealthcarePage />} />
              <Route path="recommendations" element={<RecommendationsPage />} />
              <Route path="autods" element={<AutoDSPage />} />
              <Route path="copilot" element={<CopilotPage />} />
              <Route path="datasets" element={<DatasetManagerPage />} />
              <Route path="models" element={<ModelPerformancePage />} />
              <Route path="experiments" element={<ExperimentTrackingPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
