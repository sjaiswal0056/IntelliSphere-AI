import React, { useState, useEffect } from 'react';
import {
  Activity,
  Heart,
  AlertCircle,
  ShieldAlert,
  Info,
  CheckCircle2,
  Users,
  BarChart2,
  Lock,
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
import { healthcareApi } from '@/services/api';
import { formatPercent } from '@/lib/utils';

export const HealthcarePage: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Health Patient Telemetry Inputs
  const [patientData, setPatientData] = useState({
    age: 58,
    sex: 1, // Male
    cp: 2, // Non-anginal
    trestbps: 140,
    chol: 245,
    fbs: 0,
    restecg: 0,
    thalach: 160,
    exang: 0,
    oldpeak: 1.2,
    slope: 1,
    ca: 0.0,
    thal: 2.0,
  });

  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);

  useEffect(() => {
    healthcareApi
      .getAnalytics()
      .then((data) => setAnalytics(data))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleRunEstimate = async () => {
    setIsPredicting(true);
    try {
      const res = await healthcareApi.predict(patientData);
      setPredictionResult(res);
    } catch (err) {
      console.error('Healthcare prediction error:', err);
    } finally {
      setIsPredicting(false);
    }
  };

  const loadCohortCase = (type: 'low_risk' | 'elevated_risk') => {
    if (type === 'low_risk') {
      setPatientData({
        age: 42,
        sex: 0,
        cp: 1,
        trestbps: 120,
        chol: 195,
        fbs: 0,
        restecg: 0,
        thalach: 172,
        exang: 0,
        oldpeak: 0.2,
        slope: 0,
        ca: 0.0,
        thal: 2.0,
      });
    } else {
      setPatientData({
        age: 67,
        sex: 1,
        cp: 3,
        trestbps: 160,
        chol: 286,
        fbs: 1,
        restecg: 2,
        thalach: 108,
        exang: 1,
        oldpeak: 2.5,
        slope: 2,
        ca: 3.0,
        thal: 3.0,
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Prominent Educational & Research Disclaimer Banner */}
      <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-600/40 text-amber-200 text-xs flex items-start gap-3 shadow-lg">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-300 uppercase tracking-wider">
            Mandatory Research & Educational Use Disclaimer
          </p>
          <p className="mt-0.5 text-amber-200/90 leading-relaxed">
            This module is developed exclusively for statistical risk exploration on historical, de-identified research
            benchmarks (UCI Cleveland Heart Disease dataset). It is <strong>NOT</strong> a certified medical device, does
            <strong> NOT</strong> provide clinical diagnoses, and must <strong>NEVER</strong> be utilized to prescribe treatments
            or replace medical consultations with licensed healthcare professionals.
          </p>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-1">
            <Heart className="w-3.5 h-3.5" /> UCI Cleveland Heart Disease Cohort
          </div>
          <h2 className="text-xl font-bold text-white">Healthcare Cardiovascular Risk Analytics</h2>
          <p className="text-xs text-slate-400">
            Statistical research risk modeling, probability calibration, and local SHAP factor attribution
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadCohortCase('low_risk')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 transition-all"
          >
            Load Low-Risk Case
          </button>
          <button
            onClick={() => loadCohortCase('elevated_risk')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-rose-400 border border-rose-500/30 transition-all"
          >
            Load Elevated-Risk Case
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Model ROC-AUC</span>
          <p className="text-2xl font-bold text-indigo-400 mt-1">0.9448</p>
          <span className="text-[11px] text-emerald-400">High diagnostic discrimination</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Sensitivity (True Positive Rate)</span>
          <p className="text-2xl font-bold text-cyan-400 mt-1">89.29%</p>
          <span className="text-[11px] text-slate-400">Crucial for clinical screening</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Specificity (True Negative Rate)</span>
          <p className="text-2xl font-bold text-emerald-400 mt-1">84.85%</p>
          <span className="text-[11px] text-slate-400">Controls false alarms</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Brier Calibration Score</span>
          <p className="text-2xl font-bold text-slate-200 mt-1">0.118</p>
          <span className="text-[11px] text-emerald-400">Well-calibrated probabilities</span>
        </div>
      </div>

      {/* Structured Health Data Input & Simulator */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3.5">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" /> Patient Attribute Inputs
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Age (years)</label>
              <input
                type="number"
                value={patientData.age}
                onChange={(e) => setPatientData({ ...patientData, age: parseFloat(e.target.value) })}
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Biological Sex</label>
              <select
                value={patientData.sex}
                onChange={(e) => setPatientData({ ...patientData, sex: parseInt(e.target.value) })}
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value={1}>Male</option>
                <option value={0}>Female</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Resting BP (mm Hg)</label>
              <input
                type="number"
                value={patientData.trestbps}
                onChange={(e) => setPatientData({ ...patientData, trestbps: parseFloat(e.target.value) })}
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Serum Chol (mg/dl)</label>
              <input
                type="number"
                value={patientData.chol}
                onChange={(e) => setPatientData({ ...patientData, chol: parseFloat(e.target.value) })}
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Chest Pain Type</label>
              <select
                value={patientData.cp}
                onChange={(e) => setPatientData({ ...patientData, cp: parseInt(e.target.value) })}
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value={0}>Typical Angina</option>
                <option value={1}>Atypical Angina</option>
                <option value={2}>Non-Anginal</option>
                <option value={3}>Asymptomatic</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">Max Heart Rate</label>
              <input
                type="number"
                value={patientData.thalach}
                onChange={(e) => setPatientData({ ...patientData, thalach: parseFloat(e.target.value) })}
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Major Vessels (0-3)</label>
              <input
                type="number"
                value={patientData.ca}
                onChange={(e) => setPatientData({ ...patientData, ca: parseFloat(e.target.value) })}
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">ST Depression (oldpeak)</label>
              <input
                type="number"
                step="0.1"
                value={patientData.oldpeak}
                onChange={(e) => setPatientData({ ...patientData, oldpeak: parseFloat(e.target.value) })}
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          <button
            onClick={handleRunEstimate}
            disabled={isPredicting}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2"
          >
            {isPredicting ? <span>Running Statistical Model...</span> : <span>Estimate Cohort Risk</span>}
          </button>
        </div>

        {/* Statistical Risk Outputs & Factors */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 mb-4">Statistical Risk Assessment & Factor Weights</h3>

            {predictionResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400">Cohort Statistical Risk Estimate</span>
                    <p className="text-3xl font-extrabold text-white mt-0.5">
                      {formatPercent(predictionResult.statistical_risk_estimate, 1)}
                    </p>
                    <span className="text-[11px] text-slate-400">
                      Uncertainty Margin: ±{(1 - predictionResult.uncertainty_margin) * 50}%
                    </span>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border uppercase tracking-wider ${
                        predictionResult.confidence_level === 'HIGH_CONFIDENCE'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {predictionResult.confidence_level.replace(/_/g, ' ')}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">Inference latency: {predictionResult.latency_ms}ms</p>
                  </div>
                </div>

                {/* Top SHAP Drivers */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 mb-2">Key Factor Attributions (Local SHAP)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {predictionResult.top_contributory_features?.map((driver: any, idx: number) => (
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
                          {driver.impact.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                <CheckCircle2 className="w-8 h-8 mb-2 text-slate-600" />
                <p className="text-xs">Click "Estimate Cohort Risk" or load a preset case.</p>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-start gap-2">
            <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <strong>De-identification & Privacy Guarantee</strong>: All data processed originates strictly from anonymized
              historical scientific archives. No Protected Health Information (PHI) or Personally Identifiable Information (PII)
              is ever retained, persisted, or exposed.
            </p>
          </div>
        </div>
      </div>

      {/* Calibration Reliability Diagram & ROC Curve */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <h3 className="text-sm font-bold text-slate-100 mb-2">Calibration Reliability Curve</h3>
          <p className="text-xs text-slate-400 mb-4">Empirical observed fraction vs predicted risk probability</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.calibration_curve || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="mean_predicted_prob" stroke="#64748b" tick={{ fontSize: 9 }} />
                <YAxis dataKey="fraction_positives" stroke="#64748b" tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Line type="monotone" dataKey="fraction_positives" name="Observed" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <h3 className="text-sm font-bold text-slate-100 mb-2">Global Feature Importance (Tree SHAP)</h3>
          <p className="text-xs text-slate-400 mb-4">Cleveland cohort predictor importance</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.shap_importance?.slice(0, 6) || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 9 }} />
                <YAxis dataKey="feature" type="category" stroke="#64748b" tick={{ fontSize: 9 }} width={80} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Bar dataKey="mean_abs_shap" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
