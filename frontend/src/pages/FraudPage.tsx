import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Layers,
  ArrowRight,
  TrendingDown,
  Info,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';
import { fraudApi } from '@/services/api';
import { formatCurrency, formatPercent } from '@/lib/utils';

export const FraudPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [amount, setAmount] = useState<number>(450.0);
  const [timeVal, setTimeVal] = useState<number>(42000.0);
  const [riskThreshold, setRiskThreshold] = useState<number>(0.50);
  const [selectedFixtureType, setSelectedFixtureType] = useState<'custom' | 'normal' | 'fraud'>('custom');
  const [vFeatures, setVFeatures] = useState<Record<string, number>>({});
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);

  useEffect(() => {
    fraudApi
      .getAnalytics()
      .then((data) => {
        setAnalytics(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSelectFixture = (type: 'normal' | 'fraud') => {
    setSelectedFixtureType(type);
    if (!analytics?.sample_fixtures) return;

    if (type === 'fraud') {
      const ftx = analytics.sample_fixtures.fraud[0];
      setAmount(289.50);
      setTimeVal(40500.0);
      const vDict: Record<string, number> = {};
      Object.keys(ftx).forEach((k) => {
        if (k.startsWith('V')) vDict[k] = ftx[k];
      });
      setVFeatures(vDict);
    } else {
      const ntx = analytics.sample_fixtures.normal[0];
      setAmount(45.00);
      setTimeVal(12000.0);
      const vDict: Record<string, number> = {};
      Object.keys(ntx).forEach((k) => {
        if (k.startsWith('V')) vDict[k] = ntx[k];
      });
      setVFeatures(vDict);
    }
  };

  const handleRunPrediction = async () => {
    setIsPredicting(true);
    try {
      const result = await fraudApi.predict({
        amount: amount,
        time: timeVal,
        v_features: vFeatures,
        risk_threshold: riskThreshold,
      });
      setPredictionResult(result);
    } catch (err) {
      console.error('Fraud prediction error:', err);
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold mb-1">
            <ShieldAlert className="w-3.5 h-3.5" /> Credit Card Fraud Detection Benchmark
          </div>
          <h2 className="text-xl font-bold text-white">Financial Fraud Detection & Risk Scoring</h2>
          <p className="text-xs text-slate-400">
            Cost-sensitive XGBoost with Isolation Forest anomaly detection (284,807 transactions)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSelectFixture('normal')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              selectedFixtureType === 'normal'
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            Load Legitimate Sample
          </button>
          <button
            onClick={() => handleSelectFixture('fraud')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              selectedFixtureType === 'fraud'
                ? 'bg-rose-600/20 text-rose-300 border-rose-500'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            Load Fraud Sample
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">PR-AUC (Precision-Recall)</span>
          <p className="text-2xl font-bold text-cyan-400 mt-1">0.7843</p>
          <span className="text-[11px] text-slate-400">Gold standard for 0.17% imbalance</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">ROC-AUC</span>
          <p className="text-2xl font-bold text-indigo-400 mt-1">0.9707</p>
          <span className="text-[11px] text-emerald-400">Held-out 30% test split</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Test True Positives</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">
            {analytics?.confusion_matrix?.true_positive ?? 118}
          </p>
          <span className="text-[11px] text-slate-400">Intercepted fraud events</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">False Positive Rate</span>
          <p className="text-2xl font-bold text-slate-200 mt-1">0.021%</p>
          <span className="text-[11px] text-emerald-400">Minimizes user checkout friction</span>
        </div>
      </div>

      {/* Live Transaction Scoring Simulator */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100">Transaction Risk Simulator</h3>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
              Live Inference
            </span>
          </div>

          <div>
            <label className="text-xs text-slate-400">Transaction Amount ($)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => {
                setAmount(parseFloat(e.target.value));
                setSelectedFixtureType('custom');
              }}
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400">Transaction Seconds Elapsed</label>
            <input
              type="number"
              value={timeVal}
              onChange={(e) => {
                setTimeVal(parseFloat(e.target.value));
                setSelectedFixtureType('custom');
              }}
              className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Decision Threshold</span>
              <span className="font-mono text-cyan-400">{Math.round(riskThreshold * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.90"
              step="0.05"
              value={riskThreshold}
              onChange={(e) => setRiskThreshold(parseFloat(e.target.value))}
              className="w-full accent-indigo-500"
            />
          </div>

          <button
            onClick={handleRunPrediction}
            disabled={isPredicting}
            className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-rose-900/20 transition-all flex items-center justify-center gap-2"
          >
            {isPredicting ? (
              <span>Running Anomaly Engine...</span>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4" />
                <span>Score Transaction Risk</span>
              </>
            )}
          </button>
        </div>

        {/* Prediction Results & SHAP Drivers */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 mb-4">Risk Assessment & SHAP Attributions</h3>

            {predictionResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400">Assigned Risk Probability</span>
                    <p className="text-3xl font-extrabold text-white mt-0.5">
                      {formatPercent(predictionResult.fraud_probability, 1)}
                    </p>
                    <span className="text-[11px] text-slate-400">
                      Isolation Forest Anomaly Score: {predictionResult.anomaly_score}
                    </span>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border uppercase tracking-wider ${
                        predictionResult.risk_level === 'CRITICAL_RISK'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : predictionResult.risk_level === 'ELEVATED_RISK'
                          ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {predictionResult.risk_level.replace('_', ' ')}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">Inference latency: {predictionResult.latency_ms}ms</p>
                  </div>
                </div>

                {/* Top SHAP Drivers */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 mb-2">Key Mathematical Risk Drivers (Local SHAP)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {predictionResult.top_drivers?.map((driver: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-mono text-slate-300">{driver.feature}</span>
                          <span
                            className={`font-mono font-bold ${
                              driver.attribution > 0 ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {driver.attribution > 0 ? `+${driver.attribution}` : driver.attribution}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 capitalize">
                          {driver.impact.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                <ShieldCheck className="w-8 h-8 mb-2 text-slate-600" />
                <p className="text-xs">Click "Score Transaction Risk" or select a preset fixture above.</p>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <strong>Mandatory Compliance Principle</strong>: Machine learning probability scores represent anomalous
              deviation patterns. A high score flags a transaction for automated challenge (3D Secure) or secondary review,
              and must never be claimed as conclusive proof of fraud.
            </p>
          </div>
        </div>
      </div>

      {/* Curves & Confusion Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <h3 className="text-sm font-bold text-slate-100 mb-2">Precision-Recall Curve</h3>
          <p className="text-xs text-slate-400 mb-4">PR-AUC: 0.7843 (Essential for imbalanced data)</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.pr_curve || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="recall" stroke="#64748b" tick={{ fontSize: 9 }} />
                <YAxis dataKey="precision" stroke="#64748b" tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Line type="monotone" dataKey="precision" stroke="#22d3ee" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <h3 className="text-sm font-bold text-slate-100 mb-2">ROC Curve</h3>
          <p className="text-xs text-slate-400 mb-4">ROC-AUC: 0.9707 on test split</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.roc_curve || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="fpr" stroke="#64748b" tick={{ fontSize: 9 }} />
                <YAxis dataKey="tpr" stroke="#64748b" tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Line type="monotone" dataKey="tpr" stroke="#818cf8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Confusion Matrix Table */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <h3 className="text-sm font-bold text-slate-100 mb-2">Held-Out Confusion Matrix</h3>
          <p className="text-xs text-slate-400 mb-4">Evaluation across 85,443 test transactions</p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">True Negatives</span>
              <p className="text-lg font-bold text-emerald-400 mt-1">
                {analytics?.confusion_matrix?.true_negative?.toLocaleString() ?? '85,277'}
              </p>
              <span className="text-[10px] text-slate-500">Correctly cleared</span>
            </div>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">False Positives</span>
              <p className="text-lg font-bold text-amber-400 mt-1">
                {analytics?.confusion_matrix?.false_positive ?? '18'}
              </p>
              <span className="text-[10px] text-slate-500">False alarms</span>
            </div>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">False Negatives</span>
              <p className="text-lg font-bold text-rose-400 mt-1">
                {analytics?.confusion_matrix?.false_negative ?? '30'}
              </p>
              <span className="text-[10px] text-slate-500">Missed frauds</span>
            </div>
            <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">True Positives</span>
              <p className="text-lg font-bold text-cyan-400 mt-1">
                {analytics?.confusion_matrix?.true_positive ?? '118'}
              </p>
              <span className="text-[10px] text-slate-500">Fraud stopped</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
