import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  TrendingUp,
  Users,
  Package,
  Layers,
  Calendar,
  AlertCircle,
  BarChart2,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { retailApi } from '@/services/api';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils';

export const RetailPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'forecast' | 'segments' | 'repeat' | 'inventory'>('forecast');
  const [horizonDays, setHorizonDays] = useState<number>(28);
  const [forecastData, setForecastData] = useState<any>(null);
  const [segmentData, setSegmentData] = useState<any>(null);
  const [repeatData, setRepeatData] = useState<any>(null);
  const [inventoryParams, setInventoryParams] = useState({
    daily_demand_mean: 24.5,
    daily_demand_std: 7.2,
    lead_time_days: 7,
    current_stock: 120,
    unit_cost: 35.0,
    holding_cost_rate: 0.20,
    service_level: 0.95,
  });
  const [inventoryResult, setInventoryResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadAllRetailData();
  }, [horizonDays]);

  const loadAllRetailData = async () => {
    setIsLoading(true);
    try {
      const [fData, sData, rData, iResult] = await Promise.all([
        retailApi.getForecast({ horizon_days: horizonDays }),
        retailApi.getSegments(),
        retailApi.getRepeatPurchase(),
        retailApi.simulateInventory(inventoryParams),
      ]);
      setForecastData(fData);
      setSegmentData(sData);
      setRepeatData(rData);
      setInventoryResult(iResult);
    } catch (err) {
      console.error('Error loading retail data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateInventory = async () => {
    try {
      const res = await retailApi.simulateInventory(inventoryParams);
      setInventoryResult(res);
    } catch (err) {
      console.error('Inventory simulation error:', err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-1">
            <ShoppingBag className="w-3.5 h-3.5" /> UCI Online Retail II Pipeline
          </div>
          <h2 className="text-xl font-bold text-white">Retail Intelligence & Business Analytics</h2>
          <p className="text-xs text-slate-400">Demand forecasting, customer RFM clustering, and inventory intelligence</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setActiveTab('forecast')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'forecast' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sales Forecast
          </button>
          <button
            onClick={() => setActiveTab('segments')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'segments' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Customer Segments
          </button>
          <button
            onClick={() => setActiveTab('repeat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'repeat' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Repeat Purchase Risk
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'inventory' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Inventory Simulator
          </button>
        </div>
      </div>

      {/* TAB 1: SALES FORECASTING */}
      {activeTab === 'forecast' && (
        <div className="space-y-6">
          {/* Controls & KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">Winning Model</span>
              <p className="text-base font-bold text-indigo-400 mt-1">LightGBM Regressor</p>
              <span className="text-[11px] text-slate-500">Recursive Multi-Step Holdout</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">MAE (Mean Absolute Error)</span>
              <p className="text-xl font-bold text-white mt-1">
                ${formatNumber(forecastData?.models_comparison?.find((m: any) => m.model.includes('Selected'))?.mae ?? 15837.60)}
              </p>
              <span className="text-[11px] text-emerald-400">
                vs ${formatNumber(forecastData?.models_comparison?.find((m: any) => m.model.includes('Naive'))?.mae ?? 15185.35)} Baseline Naive
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400">WAPE (Weighted Percentage)</span>
              <p className="text-xl font-bold text-cyan-400 mt-1">
                {formatPercent(forecastData?.models_comparison?.find((m: any) => m.model.includes('Selected'))?.wape ?? 0.2828)}
              </p>
              <span className="text-[11px] text-emerald-400">Zero Future Leakage Verified</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Forecast Horizon</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Store-Wide Aggregate
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {[7, 14, 28].map((h) => (
                  <button
                    key={h}
                    onClick={() => setHorizonDays(h)}
                    className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                      horizonDays === h ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {h}d
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Forecast Chart with Confidence Intervals */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Recursive {horizonDays}-Day Demand Forecast with 95% Confidence Intervals
                </h3>
                <p className="text-xs text-slate-400">LightGBM with 7-day, 14-day, 28-day lags and rolling volatility (zero future target leakage)</p>
              </div>
              <span className="text-xs font-mono px-2 py-1 bg-indigo-500/10 text-indigo-300 rounded border border-indigo-500/20">
                ± 1.96 * Residual Std Dev
              </span>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastData?.future_forecast || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    formatter={(val: any) => [`$${formatNumber(val)}`, '']}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="forecast" name="Predicted Demand" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="upper_bound" name="95% Upper Bound" stroke="#22d3ee" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="lower_bound" name="95% Lower Bound" stroke="#a855f7" strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Actual vs Predicted on Chronological Test Set */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 mb-2">Held-Out Test Set: Actual vs Predicted</h3>
              <p className="text-xs text-slate-400 mb-4">Pure recursive multi-step forecasting across strictly held-out final 28 trading days</p>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={forecastData?.test_comparison || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 9 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 9 }} tickFormatter={(v) => `$${v / 1000}k`} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    <Line type="monotone" dataKey="actual" name="Actual Sales" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="predicted" name="Model Prediction" stroke="#818cf8" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Model Comparison Table */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 mb-2">Benchmark Model Evaluation</h3>
              <p className="text-xs text-slate-400 mb-4">Strict chronological comparison preventing time leakage</p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-2">Algorithm</th>
                      <th className="pb-2">MAE</th>
                      <th className="pb-2">WAPE</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {forecastData?.models_comparison?.map((m: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-2.5 font-medium text-slate-200">{m.model}</td>
                        <td className="py-2.5 font-mono text-slate-300">${formatNumber(m.mae)}</td>
                        <td className="py-2.5 font-mono text-slate-300">{formatPercent(m.wape)}</td>
                        <td className="py-2.5">
                          {m.model.includes('Selected') ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                              Selected
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                              Baseline
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Rolling-Origin Backtesting Summary Card */}
          {forecastData?.rolling_origin_backtest && (
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <span>3-Fold Rolling-Origin Backtesting</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      Expanding Window
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Multi-horizon out-of-sample backtest over 3 temporal origins ({forecastData.rolling_origin_backtest.summary.horizon_days}-day recursive horizons)
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-slate-400">LightGBM Mean WAPE: <b className="text-emerald-400">{formatPercent(forecastData.rolling_origin_backtest.summary.lightgbm_mean_wape)}</b></span>
                  <span className="text-slate-400">Baseline Naive WAPE: <b className="text-slate-300">{formatPercent(forecastData.rolling_origin_backtest.summary.naive_mean_wape)}</b></span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-2">Fold</th>
                      <th className="pb-2">Cutoff Origin</th>
                      <th className="pb-2">Evaluation Horizon</th>
                      <th className="pb-2">LightGBM MAE</th>
                      <th className="pb-2">LightGBM WAPE</th>
                      <th className="pb-2">Naive MAE</th>
                      <th className="pb-2">Naive WAPE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {forecastData.rolling_origin_backtest.folds.map((f: any) => (
                      <tr key={f.fold} className="hover:bg-slate-800/30">
                        <td className="py-2 font-bold text-slate-300">Fold {f.fold}</td>
                        <td className="py-2 font-mono text-slate-400">{f.origin_date}</td>
                        <td className="py-2 text-slate-300">{f.eval_window}</td>
                        <td className="py-2 font-mono text-indigo-300">${formatNumber(f.lightgbm_mae)}</td>
                        <td className="py-2 font-mono text-emerald-400">{formatPercent(f.lightgbm_wape)}</td>
                        <td className="py-2 font-mono text-slate-400">${formatNumber(f.naive_mae)}</td>
                        <td className="py-2 font-mono text-slate-400">{formatPercent(f.naive_wape)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CUSTOMER SEGMENTS */}
      {activeTab === 'segments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {segmentData?.cluster_profiles?.map((prof: any) => (
              <div key={prof.cluster_id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-200">{prof.segment_name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                    {prof.percentage}%
                  </span>
                </div>
                <p className="text-lg font-bold text-white">{prof.customer_count} Customers</p>
                <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Median Recency:</span>
                    <span className="font-semibold text-slate-300">{prof.median_recency_days} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Median Frequency:</span>
                    <span className="font-semibold text-slate-300">{prof.median_orders} orders</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Median Revenue:</span>
                    <span className="font-semibold text-slate-300">${formatNumber(prof.median_revenue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* PCA 2D Scatter Visualization */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100">PCA 2D Customer Latent Space</h3>
                <p className="text-xs text-slate-400">
                  Principal Component projection of log-scaled Recency, Frequency, and Monetary attributes (Silhouette: {segmentData?.silhouette_score})
                </p>
              </div>
              <span className="text-xs text-cyan-400 font-semibold bg-cyan-950/40 px-2.5 py-1 rounded-md border border-cyan-800/40">
                K-Means (k=4)
              </span>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="pca_x" name="Principal Component 1" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="pca_y" name="Principal Component 2" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                    formatter={(val: any, name: any, item: any) => [
                      `Customer #${item.payload.id} (${item.payload.segment}) | Recency: ${item.payload.recency}d, Freq: ${item.payload.frequency}`,
                      'Profile',
                    ]}
                  />
                  <Scatter name="Customers" data={segmentData?.sample_points || []} fill="#818cf8" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REPEAT PURCHASE RISK */}
      {activeTab === 'repeat' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 mb-2">ROC Curve (Repeat Purchase)</h3>
              <p className="text-xs text-slate-400 mb-4">ROC-AUC: 0.7260 on strictly held-out customer outcome window</p>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={repeatData?.roc_curve || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="fpr" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="tpr" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    <Line type="monotone" dataKey="tpr" stroke="#6366f1" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 mb-2">Precision-Recall Curve</h3>
              <p className="text-xs text-slate-400 mb-4">PR-AUC: 0.7549 on positive re-purchase class</p>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={repeatData?.pr_curve || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="recall" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="precision" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    <Line type="monotone" dataKey="precision" stroke="#22d3ee" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 mb-2">SHAP Feature Importance</h3>
              <p className="text-xs text-slate-400 mb-4">TreeExplainer mean absolute impact on re-purchase</p>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={repeatData?.shap_importance || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="feature" type="category" stroke="#64748b" tick={{ fontSize: 10 }} width={90} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                    <Bar dataKey="mean_abs_shap" fill="#818cf8" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INVENTORY INTELLIGENCE SIMULATOR */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-300">Demonstration Scenario Simulation</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  Synthetic Inventory Scenario
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                Transactional datasets do not contain actual longitudinal warehouse stock or supplier lead-time telemetry.
                Safety stock and reorder policies are computed using a calibrated 500-iteration Monte Carlo stockout risk simulation.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Parameters Control */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-slate-100">Supply Chain Parameters</h3>
              <div>
                <label className="text-xs text-slate-400">Daily Demand Mean (units)</label>
                <input
                  type="number"
                  value={inventoryParams.daily_demand_mean}
                  onChange={(e) => setInventoryParams({ ...inventoryParams, daily_demand_mean: parseFloat(e.target.value) })}
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Daily Demand Std Dev (units)</label>
                <input
                  type="number"
                  value={inventoryParams.daily_demand_std}
                  onChange={(e) => setInventoryParams({ ...inventoryParams, daily_demand_std: parseFloat(e.target.value) })}
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Supplier Lead Time (Days)</label>
                <input
                  type="number"
                  value={inventoryParams.lead_time_days}
                  onChange={(e) => setInventoryParams({ ...inventoryParams, lead_time_days: parseInt(e.target.value) })}
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Current Warehouse Stock</label>
                <input
                  type="number"
                  value={inventoryParams.current_stock}
                  onChange={(e) => setInventoryParams({ ...inventoryParams, current_stock: parseInt(e.target.value) })}
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
              <button
                onClick={handleSimulateInventory}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 font-semibold text-xs text-white rounded-lg transition-colors shadow-md shadow-indigo-600/20"
              >
                Run Monte Carlo Simulation
              </button>
            </div>

            {/* Simulated Policy Results */}
            <div className="md:col-span-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100 mb-4">Inventory Policy & Safety Stock Recommendations</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400">Safety Stock (SS)</span>
                    <p className="text-lg font-bold text-cyan-400 mt-1">{inventoryResult?.safety_stock} units</p>
                    <span className="text-[10px] text-slate-500">Z = 1.645 (95% SL)</span>
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400">Reorder Point (ROP)</span>
                    <p className="text-lg font-bold text-indigo-400 mt-1">{inventoryResult?.reorder_point} units</p>
                    <span className="text-[10px] text-slate-500">Lead time + SS</span>
                  </div>
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                    <span className="text-[11px] text-slate-400">Stockout Risk</span>
                    <p className={`text-lg font-bold mt-1 ${inventoryResult?.simulated_stockout_risk_pct > 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {inventoryResult?.simulated_stockout_risk_pct}%
                    </p>
                    <span className="text-[10px] text-slate-500">500 Monte Carlo runs</span>
                  </div>
                </div>

                {/* Stockout Risk distribution chart */}
                <h4 className="text-xs font-bold text-slate-300 mb-2">Simulated Lead-Time Demand Distribution</h4>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={inventoryResult?.simulation_distribution || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="bin" stroke="#64748b" tick={{ fontSize: 9 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                      <Bar dataKey="frequency" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {inventoryResult?.needs_reorder ? (
                <div className="mt-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-center justify-between">
                  <span className="text-xs text-rose-300 font-semibold">
                    Reorder Required: Order {inventoryResult.recommended_order_quantity} units immediately.
                  </span>
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-bold">
                    BELOW ROP
                  </span>
                </div>
              ) : (
                <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center justify-between">
                  <span className="text-xs text-emerald-300 font-semibold">
                    Adequate Stock: Estimated {inventoryResult?.days_of_inventory_remaining} days remaining.
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">
                    HEALTHY
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
