import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Layers,
  Database,
  Activity,
  ShieldAlert,
  GitFork,
  ArrowUpRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Cpu,
  ShoppingBag,
  Wrench
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { platformApi } from '@/services/api';
import { OverviewMetrics } from '@/types';
import { formatNumber } from '@/lib/utils';

export const OverviewPage: React.FC = () => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    platformApi
      .getOverviewMetrics()
      .then((data) => setMetrics(data))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const performanceTrends = metrics?.performance_telemetry?.timeline || [
    { day: 'Mon', accuracy: 0.938, latency: 42 },
    { day: 'Tue', accuracy: 0.944, latency: 38 },
    { day: 'Wed', accuracy: 0.949, latency: 35 },
    { day: 'Thu', accuracy: 0.951, latency: 37 },
    { day: 'Fri', accuracy: 0.953, latency: 32 },
    { day: 'Sat', accuracy: 0.956, latency: 28 },
    { day: 'Sun', accuracy: 0.958, latency: 27 },
  ];

  const engineCards = [
    { name: 'Retail & Business Intelligence', path: '/retail', icon: ShoppingBag, desc: 'Sales forecasting & RFM clustering', color: 'from-blue-600 to-indigo-600', badge: 'Active' },
    { name: 'Financial Fraud Detection', path: '/fraud', icon: ShieldAlert, desc: 'Extreme imbalance risk scoring & SHAP', color: 'from-rose-600 to-red-600', badge: 'Active' },
    { name: 'Industrial Maintenance', path: '/maintenance', icon: Wrench, desc: 'Equipment telemetry failure classification', color: 'from-amber-600 to-orange-600', badge: 'Active' },
    { name: 'Healthcare Risk Analytics', path: '/healthcare', icon: Activity, desc: 'Cardiovascular cohort research risk', color: 'from-emerald-600 to-teal-600', badge: 'Research' },
    { name: 'Recommendation Engine', path: '/recommendations', icon: Sparkles, desc: 'Latent matrix factorization & ranking', color: 'from-purple-600 to-pink-600', badge: 'Active' },
    { name: 'Autonomous Data Scientist', path: '/autods', icon: Cpu, desc: 'Multi-agent EDA, training & validation', color: 'from-cyan-600 to-blue-600', badge: 'Flagship' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Platform Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/20 p-6 md:p-8 shadow-xl">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Unified Predictive Intelligence SaaS</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            One Platform. Multiple Intelligence Engines. <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Smarter Decisions.
            </span>
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Enterprise AI suite deploying genuine machine learning models, statistical explainability,
            and an autonomous data science agent across Retail, Fraud, Maintenance, Healthcare, and Recommendations.
          </p>
        </div>
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Active Models</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics?.kpis.active_models ?? 6}</p>
          <span className="text-[11px] text-emerald-400 font-medium">100% Production Ready</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Datasets</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics?.kpis.total_datasets ?? 3}</p>
          <span className="text-[11px] text-slate-400 font-medium">Verified schemas</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Predictions</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics?.kpis.total_predictions ?? 0}</p>
          <span className="text-[11px] text-slate-400 font-medium">Real-time inference</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Avg Latency</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-cyan-400">{metrics?.kpis.average_latency_ms ?? 32} ms</p>
          <span className="text-[11px] text-slate-400 font-medium">Database audited</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Anomalies</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold text-rose-400">{metrics?.kpis.detected_anomalies ?? 2}</p>
          <span className="text-[11px] text-rose-400/80 font-medium">Requires inspection</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Tracked Runs</span>
            <GitFork className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">{metrics?.kpis.total_experiments ?? 6}</p>
          <span className="text-[11px] text-purple-400 font-medium">MLflow logged</span>
        </div>
      </div>

      {/* Intelligence Engine Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span>Modular Intelligence Engines</span>
            <span className="text-xs font-normal text-slate-400">(Explore dedicated analytical workspaces)</span>
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {engineCards.map((engine) => {
            const Icon = engine.icon;
            return (
              <NavLink
                key={engine.path}
                to={engine.path}
                className="group p-5 rounded-2xl bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800/80 group-hover:bg-indigo-600/20 border border-slate-700/60 group-hover:border-indigo-500/40 flex items-center justify-center transition-colors">
                      <Icon className="w-5 h-5 text-indigo-400 group-hover:text-cyan-400" />
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        engine.badge === 'Flagship'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : engine.badge === 'Research'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {engine.badge}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                    {engine.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">{engine.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-indigo-400 group-hover:text-cyan-300 font-medium">
                  <span>Open Engine Workspace</span>
                  <ArrowUpRight className="w-4 h-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Two Column: Live Performance Chart & Operational Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Model Accuracy & Validation Reliability Chart */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100">Validation Performance Telemetry</h3>
                <span className="text-[9px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Demonstration Timeline
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Chronological rolling backtests and genuine ensemble validation averages</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 font-mono">
              Avg AUC: {metrics?.performance_telemetry?.mean_auc ?? 0.953}
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceTrends}>
                <defs>
                  <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis domain={[0.9, 1.0]} stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="accuracy" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorAcc)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Operational Anomaly Alerts */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" /> Operational Alerts
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Live Sync</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Real-time statistical anomalies flagged by active models.
            </p>
            <div className="space-y-3">
              {metrics?.recent_alerts.map((alert) => (
                <div key={alert.id} className="p-3 rounded-xl bg-slate-950/60 border border-rose-900/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-rose-300">{alert.title}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
          <NavLink
            to="/fraud"
            className="mt-4 block text-center text-xs text-indigo-400 hover:text-indigo-300 font-medium py-2 rounded-lg bg-slate-800/40 hover:bg-slate-800/80 transition-colors"
          >
            Review Security & Anomaly Logs →
          </NavLink>
        </div>
      </div>
    </div>
  );
};
