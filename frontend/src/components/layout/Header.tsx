import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, LogOut, Bell, ShieldCheck, Sparkles, Terminal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  onToggleCopilot: () => void;
  isCopilotOpen: boolean;
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Executive Overview', subtitle: 'Platform-wide telemetry, model status, and anomaly detection' },
  '/retail': { title: 'Retail & Business Intelligence', subtitle: 'Demand forecasting, customer RFM clustering, and inventory planning' },
  '/fraud': { title: 'Financial Fraud Intelligence', subtitle: 'Cost-sensitive anomaly classification and real-time risk scoring' },
  '/maintenance': { title: 'Predictive Maintenance', subtitle: 'Milling machine failure diagnostics and thermal telemetry analysis' },
  '/healthcare': { title: 'Healthcare Risk Analytics', subtitle: 'Academic cardiovascular research cohort risk estimation (Educational only)' },
  '/recommendations': { title: 'Recommendation Intelligence', subtitle: 'Latent factor matrix factorization, item similarity, and hybrid ranking' },
  '/autods': { title: 'Autonomous AI Data Scientist', subtitle: 'End-to-end multi-agent EDA, feature engineering, and automated ML training' },
  '/copilot': { title: 'AI Copilot Assistant', subtitle: 'Ground-truth query engine with structured chart generation' },
  '/datasets': { title: 'Dataset Manager', subtitle: 'Automated schema validation, duplicate detection, and EDA profiling' },
  '/models': { title: 'Model Registry & Performance', subtitle: 'Active model versions, metrics, and production readiness' },
  '/experiments': { title: 'MLflow Experiment Tracking', subtitle: 'Reproducible training runs, parameter logs, and performance metrics' },
  '/reports': { title: 'Analytical Reports', subtitle: 'Exportable executive summaries, model cards, and documentation' },
  '/settings': { title: 'Platform Settings', subtitle: 'API keys, LLM provider settings, and system environment variables' },
};

export const Header: React.FC<HeaderProps> = ({ onToggleCopilot, isCopilotOpen }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const activeMeta = pageTitles[location.pathname] || { title: 'Intelligence Platform', subtitle: 'Unified Analytics' };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#090e18]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          {activeMeta.title}
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
            IntelliSphere 1.0
          </span>
        </h1>
        <p className="text-xs text-slate-400">{activeMeta.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* System Status Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>6 Engines Online</span>
        </div>

        {/* AI Copilot Launch Button */}
        <button
          onClick={onToggleCopilot}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border ${
            isCopilotOpen
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/25'
              : 'bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border-indigo-700/50 hover:border-indigo-500'
          }`}
        >
          <Bot className="w-4 h-4 text-cyan-400" />
          <span>AI Copilot</span>
          <span className="bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded text-[10px]">Ask</span>
        </button>

        {/* User logout */}
        <button
          onClick={logout}
          title="Sign Out"
          className="p-2 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-slate-800/80 transition-colors border border-slate-800"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
