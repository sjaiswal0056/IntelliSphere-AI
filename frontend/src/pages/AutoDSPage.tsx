import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Play,
  Layers,
  Sparkles,
  BarChart2,
  FileText,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { datasetsApi, autodsApi } from '@/services/api';
import { DatasetItem } from '@/types';

export const AutoDSPage: React.FC = () => {
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Target and Task configuration
  const [targetColumn, setTargetColumn] = useState<string>('');
  const [taskType, setTaskType] = useState<string>('classification');
  const [userApprovalGranted, setUserApprovalGranted] = useState<boolean>(false);

  // Training Job execution
  const [isStartingJob, setIsStartingJob] = useState<boolean>(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [finalResults, setFinalResults] = useState<any>(null);

  useEffect(() => {
    datasetsApi.list().then((data) => {
      setDatasets(data);
      if (data.length > 0) {
        setSelectedDatasetId(data[0].id);
      }
    });
  }, []);

  // Poll active training job
  useEffect(() => {
    let interval: any;
    if (activeJobId && (!jobStatus || (jobStatus.status !== 'completed' && jobStatus.status !== 'failed'))) {
      interval = setInterval(async () => {
        try {
          const res = await autodsApi.getJobStatus(activeJobId);
          setJobStatus(res);
          if (res.status === 'completed') {
            const results = await autodsApi.getResults(activeJobId);
            setFinalResults(results);
            clearInterval(interval);
          } else if (res.status === 'failed') {
            clearInterval(interval);
          }
        } catch (err) {
          console.error('Job polling error:', err);
        }
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [activeJobId, jobStatus]);

  const handleRunAnalysis = async () => {
    if (!selectedDatasetId) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setFinalResults(null);
    setJobStatus(null);
    setActiveJobId(null);
    try {
      const res = await autodsApi.analyze(selectedDatasetId);
      setAnalysisResult(res);
      if (res.target_candidates && res.target_candidates.length > 0) {
        setTargetColumn(res.target_candidates[0].column);
        setTaskType(res.target_candidates[0].suggested_task);
      }
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartTraining = async () => {
    if (!selectedDatasetId || !targetColumn || !userApprovalGranted) return;
    setIsStartingJob(true);
    setFinalResults(null);
    try {
      const res = await autodsApi.startTraining({
        dataset_id: selectedDatasetId,
        target_column: targetColumn,
        task_type: taskType,
        user_approval_granted: true,
      });
      setActiveJobId(res.job_id);
      setJobStatus({ status: 'pending', progress_pct: 10, status_message: 'Job submitted to LangGraph engine.' });
    } catch (err) {
      console.error('Training trigger error:', err);
    } finally {
      setIsStartingJob(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Flagship Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-indigo-950/60 border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-semibold mb-2">
            <Cpu className="w-3.5 h-3.5" /> Flagship Autonomous Multi-Agent System
          </div>
          <h2 className="text-2xl font-extrabold text-white">Autonomous AI Data Scientist</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            LangGraph state machine orchestrating Inspection, Data Cleaning, EDA, Feature Engineering, Multi-Model
            Training, and Explainability with strict human-in-the-loop approval.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-cyan-300 bg-cyan-950/80 px-3 py-1.5 rounded-xl border border-cyan-700/50">
            LangGraph 1.2
          </span>
        </div>
      </div>

      {/* STEP 1: SELECT & INSPECT DATASET */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                1
              </span>
              <span>Dataset Ingestion & Schema Discovery</span>
            </h3>
            <p className="text-xs text-slate-400">Select an existing verified dataset or upload from Dataset Manager</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedDatasetId || ''}
              onChange={(e) => setSelectedDatasetId(parseInt(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
            >
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.row_count} rows, {d.column_count} cols)
                </option>
              ))}
            </select>
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl transition-all shadow-md shadow-indigo-600/20"
            >
              {isAnalyzing ? 'Inspecting Schema...' : 'Run AutoDS Inspection'}
            </button>
          </div>
        </div>

        {/* Inspection Results Preview */}
        {analysisResult && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-4 animate-in fade-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400">Observed Records</span>
                <p className="text-lg font-bold text-white mt-0.5">{analysisResult.row_count}</p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400">Total Features</span>
                <p className="text-lg font-bold text-white mt-0.5">{analysisResult.col_count}</p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400">Missing Percentage</span>
                <p className="text-lg font-bold text-cyan-400 mt-0.5">{analysisResult.missing_percentage}%</p>
              </div>
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400">Duplicates Detected</span>
                <p className="text-lg font-bold text-slate-300 mt-0.5">{analysisResult.duplicate_rows} rows</p>
              </div>
            </div>

            {/* Inferred Columns Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 mb-2">Inferred Column Roles & Missing Ratios</h4>
              <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-950 text-slate-400 sticky top-0">
                    <tr>
                      <th className="p-2">Column Name</th>
                      <th className="p-2">Data Type</th>
                      <th className="p-2">Inferred Role</th>
                      <th className="p-2">Missing %</th>
                      <th className="p-2">Unique Cardinality</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {analysisResult.columns?.map((c: any) => (
                      <tr key={c.name} className="hover:bg-slate-800/40">
                        <td className="p-2 font-mono text-indigo-300">{c.name}</td>
                        <td className="p-2 text-slate-400">{c.dtype}</td>
                        <td className="p-2">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold uppercase text-[9px]">
                            {c.inferred_type}
                          </span>
                        </td>
                        <td className="p-2 font-mono">{c.null_pct}%</td>
                        <td className="p-2 font-mono">{c.unique_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* STEP 2: TARGET SELECTION & HUMAN-IN-THE-LOOP APPROVAL */}
      {analysisResult && (
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 animate-in fade-in">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
              2
            </span>
            <span>Target Selection & Preprocessing Governance</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-medium">Select Prediction Target Column</label>
              <select
                value={targetColumn}
                onChange={(e) => setTargetColumn(e.target.value)}
                className="w-full mt-1.5 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                {analysisResult.columns?.map((c: any) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.inferred_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium">Model Objective (Task Type)</label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="w-full mt-1.5 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="classification">Classification (Binary or Multi-class)</option>
                <option value="regression">Regression (Continuous value prediction)</option>
              </select>
            </div>
          </div>

          {/* Preprocessing plan preview */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-2">
            <span className="font-bold text-slate-300">Automated Preprocessing Plan:</span>
            <ul className="list-disc list-inside text-slate-400 space-y-1 text-[11px]">
              <li>Impute numeric missing cells via median imputation; categorical via mode</li>
              <li>Apply standard Z-score scaling (StandardScaler) across continuous features</li>
              <li>One-hot encode categorical features with cardinality ≤ 10 to prevent sparsity</li>
              <li>Partition 75% stratified train / 25% hold-out test validation</li>
            </ul>
          </div>

          {/* User Approval Checkbox & Button */}
          <div className="pt-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={userApprovalGranted}
                onChange={(e) => setUserApprovalGranted(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded"
              />
              <span className="font-medium">
                I review and approve the preprocessing plan to train baseline, Random Forest, and LightGBM models.
              </span>
            </label>

            <button
              onClick={handleStartTraining}
              disabled={!userApprovalGranted || isStartingJob}
              className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-950/40 transition-all flex items-center gap-2 shrink-0"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Launch AutoDS Multi-Model Training</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: LIVE JOB PROGRESS & MULTI-MODEL REPORT */}
      {jobStatus && (
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">
                3
              </span>
              <span>LangGraph Execution Telemetry</span>
            </h3>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${
                jobStatus.status === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              }`}
            >
              {jobStatus.status} ({jobStatus.progress_pct}%)
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-500 to-indigo-500 h-full transition-all duration-300"
              style={{ width: `${jobStatus.progress_pct}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-400 font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            {jobStatus.status_message}
          </p>

          {/* FINAL RESULTS DISPLAY */}
          {finalResults && (
            <div className="mt-6 pt-6 border-t border-slate-800 space-y-6">
              {/* Executive Summary */}
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs mb-1">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>AutoDS Executive Verdict</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {finalResults.explainability_summary ||
                    `The ${finalResults.executive_summary?.best_model} was selected as the optimal algorithm based on holdout validation.`}
                </p>
              </div>

              {/* Models Comparison Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-2">Model Benchmark Comparison Table</h4>
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400">
                      <tr>
                        <th className="p-3">Model Candidate</th>
                        {finalResults.executive_summary?.task_type === 'classification' ? (
                          <>
                            <th className="p-3">Accuracy</th>
                            <th className="p-3">F1-Score</th>
                            <th className="p-3">Precision</th>
                            <th className="p-3">Recall</th>
                          </>
                        ) : (
                          <>
                            <th className="p-3">MAE</th>
                            <th className="p-3">RMSE</th>
                            <th className="p-3">R² Score</th>
                          </>
                        )}
                        <th className="p-3">Verdict</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                      {finalResults.model_comparison?.map((m: any, idx: number) => {
                        const isBest = m.model_name.includes(finalResults.executive_summary?.best_model);
                        return (
                          <tr key={idx} className={isBest ? 'bg-indigo-950/20' : ''}>
                            <td className="p-3 font-semibold text-slate-200">{m.model_name}</td>
                            {finalResults.executive_summary?.task_type === 'classification' ? (
                              <>
                                <td className="p-3 font-mono text-slate-300">{m.accuracy}</td>
                                <td className="p-3 font-mono text-slate-300">{m.f1_score}</td>
                                <td className="p-3 font-mono text-slate-300">{m.precision}</td>
                                <td className="p-3 font-mono text-slate-300">{m.recall}</td>
                              </>
                            ) : (
                              <>
                                <td className="p-3 font-mono text-slate-300">{m.mae}</td>
                                <td className="p-3 font-mono text-slate-300">{m.rmse}</td>
                                <td className="p-3 font-mono text-slate-300">{m.r2_score}</td>
                              </>
                            )}
                            <td className="p-3">
                              {isBest ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  Winning Model
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                                  Candidate
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Feature Importance Bar Chart */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-2">Key Predictive Feature Importance Ranking</h4>
                <div className="h-56 w-full p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={finalResults.feature_importance || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" stroke="#64748b" tick={{ fontSize: 9 }} />
                      <YAxis dataKey="feature" type="category" stroke="#64748b" tick={{ fontSize: 9 }} width={120} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Bar dataKey="importance" fill="#818cf8" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
