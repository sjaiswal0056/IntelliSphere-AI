import React, { useState, useEffect } from 'react';
import { GitFork, CheckCircle2, Clock, Filter, Search } from 'lucide-react';
import { platformApi } from '@/services/api';
import { ExperimentItem } from '@/types';

export const ExperimentTrackingPage: React.FC = () => {
  const [experiments, setExperiments] = useState<ExperimentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    platformApi
      .listExperiments()
      .then((data) => setExperiments(data))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="border-b border-slate-800 pb-4">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-semibold mb-1">
          <GitFork className="w-3.5 h-3.5" /> MLOps Tracking Engine
        </div>
        <h2 className="text-xl font-bold text-white">MLflow Experiment Runs & Reproducibility</h2>
        <p className="text-xs text-slate-400">
          Chronological record of trained architectures, hyperparameters, and held-out validation benchmarks
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3.5">Run Name</th>
                <th className="p-3.5">Module</th>
                <th className="p-3.5">Parameters Logged</th>
                <th className="p-3.5">Validated Metrics</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {experiments.map((e) => (
                <tr key={e.id} className="hover:bg-slate-800/40">
                  <td className="p-3.5 font-semibold text-slate-200">{e.name}</td>
                  <td className="p-3.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 font-medium uppercase text-slate-300">
                      {e.module_type}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-slate-400 max-w-xs truncate">
                    {e.parameters || 'Default'}
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-cyan-300 max-w-xs truncate">
                    {e.metrics || 'Logged'}
                  </td>
                  <td className="p-3.5">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                      {e.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-500 text-[11px]">
                    {new Date(e.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
