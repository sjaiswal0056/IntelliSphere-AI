import React, { useState } from 'react';
import { FileText, Download, ShieldCheck, Layers, Sparkles, BookOpen, ExternalLink } from 'lucide-react';

const modelCards = [
  {
    engine: 'Retail Demand Forecaster',
    dataset: 'UCI Online Retail II (530,105 cleaned transactions)',
    architecture: 'LightGBM Regressor with Recursive Multi-Step Horizon',
    metrics: 'MAE: $16,007.62 | WAPE: 28.59% | R²: 0.68',
    validation: 'Chronological 28-day forward test split (zero lookahead leakage)',
    limitations: 'Sensitive to unseasonal macroeconomic shifts; requires periodic retraining when retail catalog rotates.',
  },
  {
    engine: 'Financial Fraud Interceptor',
    dataset: 'Credit Card Fraud Benchmark (284,807 transactions, 0.173% positive class)',
    architecture: 'Cost-Sensitive XGBoost (scale_pos_weight=578) + Unsupervised Isolation Forest',
    metrics: 'PR-AUC: 0.7843 | ROC-AUC: 0.9707 | False Positive Rate: 0.021%',
    validation: 'Stratified hold-out partition (30% test split preserving rare event density)',
    limitations: 'High anomaly probability flags suspicious vectors for verification; never constitutes conclusive legal proof of fraud.',
  },
  {
    engine: 'Predictive Equipment Maintenance',
    dataset: 'UCI AI4I 2020 Predictive Maintenance (10,000 milling operations)',
    architecture: 'XGBoost Classifier with Mechanical Power & Thermal Gradient Features',
    metrics: 'ROC-AUC: 0.9810 | PR-AUC: 0.8929 | Precision: 0.884',
    validation: 'Stratified 80/20 hold-out split across 5 failure mode diagnostics (TWF, HDF, PWF, OSF, RNF)',
    limitations: 'Dataset provides instantaneous sensor snapshots; remaining useful life (RUL) cannot be estimated without longitudinal continuous run-to-failure telemetry.',
  },
  {
    engine: 'Cardiovascular Risk Estimator (Research Only)',
    dataset: 'UCI Cleveland Heart Disease Cohort (303 patient records)',
    architecture: 'XGBoost Classifier + Reliability Probability Calibration',
    metrics: 'ROC-AUC: 0.9448 | Sensitivity: 89.29% | Specificity: 84.85% | Brier: 0.118',
    validation: 'Stratified 80/20 holdout evaluation with 5-bin calibration curve',
    limitations: 'RESEARCH USE ONLY: Historical academic benchmark. Does not constitute a clinical diagnosis or treatment guide.',
  },
  {
    engine: 'Recommendation Intelligence',
    dataset: 'GroupLens MovieLens Latest Small (100,836 ratings, 610 users, 9,742 items)',
    architecture: 'Hybrid SVD Matrix Factorization (30 latent factors) + Item Latent Cosine Similarity',
    metrics: 'Precision@10: 0.1310 | NDCG@10: 0.1634 | Catalog Coverage: 100%',
    validation: '20% held-out interaction split with Bayesian weighted rating cold-start fallback',
    limitations: 'Susceptible to popularity bias on tail items; mitigated by hybrid genre-weighted similarity blending.',
  },
];

export const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="border-b border-slate-800 pb-4">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-1">
          <BookOpen className="w-3.5 h-3.5" /> Model Documentation & Transparency
        </div>
        <h2 className="text-xl font-bold text-white">Model Cards & Scientific Reports</h2>
        <p className="text-xs text-slate-400">
          Transparent model cards, evaluation methodologies, and architectural boundaries
        </p>
      </div>

      <div className="space-y-4">
        {modelCards.map((card, idx) => (
          <div key={idx} className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Model Card #{idx + 1}</span>
                <h3 className="text-base font-bold text-white">{card.engine}</h3>
              </div>
              <span className="text-xs font-mono px-3 py-1 bg-slate-800 text-slate-300 rounded-full border border-slate-700">
                Audited Production Benchmark
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-semibold text-slate-400">Training Dataset Origin:</span>
                <p className="text-slate-200 mt-0.5">{card.dataset}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-400">Algorithm Architecture:</span>
                <p className="text-slate-200 mt-0.5">{card.architecture}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-400">Audited Test Performance:</span>
                <p className="font-mono text-cyan-300 font-bold mt-0.5">{card.metrics}</p>
              </div>
              <div>
                <span className="font-semibold text-slate-400">Validation Protocol:</span>
                <p className="text-slate-200 mt-0.5">{card.validation}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
              <span className="font-bold text-amber-300">Known Limitations & Guardrails:</span>
              <p className="text-slate-400 mt-0.5 leading-relaxed">{card.limitations}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
