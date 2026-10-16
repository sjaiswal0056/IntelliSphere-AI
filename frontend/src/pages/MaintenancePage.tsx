import React, { useState, useEffect } from 'react';
import {
  Wrench,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Gauge,
  Thermometer,
  Zap,
  Info,
  Clock
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
import { maintenanceApi } from '@/services/api';
import { formatNumber, formatPercent } from '@/lib/utils';

export const MaintenancePage: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Machine Telemetry Form
  const [machineType, setMachineType] = useState('M');
  const [airTemp, setAirTemp] = useState<number>(300.5);
  const [procTemp, setProcTemp] = useState<number>(310.8);
  const [rpm, setRpm] = useState<number>(1450.0);
  const [torque, setTorque] = useState<number>(45.0);
  const [toolWear, setToolWear] = useState<number>(120.0);
  const [threshold, setThreshold] = useState<number>(0.50);

  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);

  useEffect(() => {
    maintenanceApi
      .getAnalytics()
      .then((data) => setAnalytics(data))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleRunPrediction = async () => {
    setIsPredicting(true);
    try {
      const res = await maintenanceApi.predict({
        machine_type: machineType,
        air_temp_k: airTemp,
        process_temp_k: procTemp,
        rotational_speed_rpm: rpm,
        torque_nm: torque,
        tool_wear_min: toolWear,
        threshold: threshold,
      });
      setPredictionResult(res);
    } catch (err) {
      console.error('Maintenance prediction error:', err);
    } finally {
      setIsPredicting(false);
    }
  };

  const loadPreset = (type: 'healthy' | 'overstrain' | 'thermal') => {
    if (type === 'healthy') {
      setMachineType('M');
      setAirTemp(298.2);
      setProcTemp(308.5);
      setRpm(1510.0);
      setTorque(38.0);
      setToolWear(45.0);
    } else if (type === 'overstrain') {
      setMachineType('L');
      setAirTemp(302.1);
      setProcTemp(311.4);
      setRpm(1340.0);
      setTorque(68.5);
      setToolWear(215.0);
    } else {
      // Thermal dissipation failure
      setMachineType('H');
      setAirTemp(304.5);
      setProcTemp(313.2);
      setRpm(1280.0);
      setTorque(55.0);
      setToolWear(180.0);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-1">
            <Wrench className="w-3.5 h-3.5" /> UCI AI4I 2020 Predictive Maintenance
          </div>
          <h2 className="text-xl font-bold text-white">Industrial Predictive Maintenance Engine</h2>
          <p className="text-xs text-slate-400">
            Equipment failure diagnostics and sensor telemetry analysis (10,000 milling operations)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadPreset('healthy')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 transition-all"
          >
            Healthy Preset
          </button>
          <button
            onClick={() => loadPreset('overstrain')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-rose-400 border border-rose-500/30 transition-all"
          >
            Overstrain Preset
          </button>
          <button
            onClick={() => loadPreset('thermal')}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 transition-all"
          >
            Heat Preset
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Model ROC-AUC</span>
          <p className="text-2xl font-bold text-indigo-400 mt-1">0.9810</p>
          <span className="text-[11px] text-emerald-400">Held-out 20% test split</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Model PR-AUC</span>
          <p className="text-2xl font-bold text-cyan-400 mt-1">0.8929</p>
          <span className="text-[11px] text-slate-400">High precision on rare failures</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Failure Modes Tracked</span>
          <p className="text-2xl font-bold text-white mt-1">5 Diagnostics</p>
          <span className="text-[11px] text-slate-400">TWF, HDF, PWF, OSF, RNF</span>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <span className="text-xs text-slate-400">Total Analyzed Records</span>
          <p className="text-2xl font-bold text-slate-200 mt-1">10,000</p>
          <span className="text-[11px] text-slate-400">339 historical failures</span>
        </div>
      </div>

      {/* Live Machine Sensor Simulator */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-amber-400" /> Sensor Input Telemetry
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Machine Type</label>
              <select
                value={machineType}
                onChange={(e) => setMachineType(e.target.value)}
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value="L">L (Low quality, 50%)</option>
                <option value="M">M (Medium quality, 30%)</option>
                <option value="H">H (Heavy duty, 20%)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400">Tool Wear (min)</label>
              <input
                type="number"
                value={toolWear}
                onChange={(e) => setToolWear(parseFloat(e.target.value))}
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Air Temp [K]</label>
              <input
                type="number"
                step="0.1"
                value={airTemp}
                onChange={(e) => setAirTemp(parseFloat(e.target.value))}
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Process Temp [K]</label>
              <input
                type="number"
                step="0.1"
                value={procTemp}
                onChange={(e) => setProcTemp(parseFloat(e.target.value))}
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400">Speed (RPM)</label>
              <input
                type="number"
                value={rpm}
                onChange={(e) => setRpm(parseFloat(e.target.value))}
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Torque (Nm)</label>
              <input
                type="number"
                step="0.5"
                value={torque}
                onChange={(e) => setTorque(parseFloat(e.target.value))}
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          <button
            onClick={handleRunPrediction}
            disabled={isPredicting}
            className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-amber-900/20 transition-all flex items-center justify-center gap-2"
          >
            {isPredicting ? <span>Evaluating Telemetry...</span> : <span>Run Equipment Diagnostic</span>}
          </button>
        </div>

        {/* Diagnostic Results */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 mb-4">Real-time Diagnostic State & Physical Telemetry</h3>

            {predictionResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400">Failure Likelihood</span>
                    <p className="text-3xl font-extrabold text-white mt-0.5">
                      {formatPercent(predictionResult.failure_probability, 1)}
                    </p>
                    <span className="text-[11px] text-slate-400">
                      Mechanical Power: {predictionResult.physical_telemetry?.mechanical_power_watts} W
                    </span>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border uppercase tracking-wider ${
                        predictionResult.health_status.includes('CRITICAL')
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : predictionResult.health_status.includes('WARNING')
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {predictionResult.health_status.replace(/_/g, ' ')}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Thermal Gradient: {predictionResult.physical_telemetry?.temp_gradient_k} K
                    </p>
                  </div>
                </div>

                {/* Top SHAP Drivers */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 mb-2">Key Diagnostic Determinants (Local SHAP)</h4>
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
                <p className="text-xs">Click "Run Equipment Diagnostic" or choose a preset above.</p>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <strong>Crucial Engineering Limitation</strong>: The UCI AI4I 2020 dataset provides instantaneous point-in-time
              sensor snapshots. It does not provide continuous run-to-failure degradation histories; therefore, remaining useful
              life (RUL) cannot be accurately estimated from this dataset without longitudinal sensory streams.
            </p>
          </div>
        </div>
      </div>

      {/* Failure Modes Breakdown & SHAP Feature Importance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <h3 className="text-sm font-bold text-slate-100 mb-2">Failure Mode Distribution</h3>
          <p className="text-xs text-slate-400 mb-4">Historical distribution across 339 recorded failure events</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {analytics?.failure_mode_breakdown &&
              Object.entries(analytics.failure_mode_breakdown).map(([k, v]: [string, any]) => (
                <div key={k} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">{k} Failure</span>
                  <p className="text-xl font-bold text-amber-400 mt-1">{v} events</p>
                  <span className="text-[10px] text-slate-500">
                    {k === 'HDF' ? 'Heat Dissipation' : k === 'PWF' ? 'Power Overload' : k === 'OSF' ? 'Overstrain' : k === 'TWF' ? 'Tool Wear' : 'Random'}
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
          <h3 className="text-sm font-bold text-slate-100 mb-2">Global Feature Importance (Tree SHAP)</h3>
          <p className="text-xs text-slate-400 mb-4">Primary physical predictors influencing XGBoost model decisions</p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.shap_importance?.slice(0, 5) || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 9 }} />
                <YAxis dataKey="feature" type="category" stroke="#64748b" tick={{ fontSize: 9 }} width={110} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                <Bar dataKey="mean_abs_shap" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
