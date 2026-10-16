import React, { useState, useEffect } from 'react';
import {
  Database,
  Upload,
  Trash2,
  FileText,
  Table,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  Search,
} from 'lucide-react';
import { datasetsApi } from '@/services/api';
import { DatasetItem, DatasetDetail } from '@/types';
import { formatNumber } from '@/lib/utils';

export const DatasetManagerPage: React.FC = () => {
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<DatasetDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Upload Form
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState<string>('');
  const [uploadDesc, setUploadDesc] = useState<string>('');
  const [uploadSourceType, setUploadSourceType] = useState<string>('custom');

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    setIsLoading(true);
    try {
      const data = await datasetsApi.list();
      setDatasets(data);
    } catch (err) {
      console.error('Failed to load datasets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = async (id: number) => {
    try {
      const detail = await datasetsApi.get(id);
      setSelectedDataset(detail);
    } catch (err) {
      console.error('Failed to load dataset details:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this dataset?')) return;
    try {
      await datasetsApi.delete(id);
      setDatasets(datasets.filter((d) => d.id !== id));
      if (selectedDataset?.id === id) setSelectedDataset(null);
    } catch (err) {
      console.error('Failed to delete dataset:', err);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadName.trim()) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('name', uploadName);
    formData.append('description', uploadDesc);
    formData.append('source_type', uploadSourceType);

    try {
      const newDataset = await datasetsApi.upload(formData);
      setDatasets([newDataset, ...datasets]);
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadName('');
      setUploadDesc('');
      setSelectedDataset(newDataset);
    } catch (err: any) {
      alert(`Upload failed: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const filteredDatasets = datasets.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.source_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-1">
            <Database className="w-3.5 h-3.5" /> Storage & Governance
          </div>
          <h2 className="text-xl font-bold text-white">Dataset Manager & Profiler</h2>
          <p className="text-xs text-slate-400">
            Validated repositories, automated schema extraction, and EDA quality statistics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search datasets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 w-48"
            />
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Dataset</span>
          </button>
        </div>
      </div>

      {/* Dataset List Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3.5">Dataset Name</th>
                <th className="p-3.5">Source Type</th>
                <th className="p-3.5">Rows</th>
                <th className="p-3.5">Columns</th>
                <th className="p-3.5">Format</th>
                <th className="p-3.5">Origin</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDatasets.map((d) => (
                <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3.5">
                    <p className="font-semibold text-slate-200">{d.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono truncate max-w-xs">{d.filename}</p>
                  </td>
                  <td className="p-3.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 font-medium uppercase text-slate-300">
                      {d.source_type}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-slate-300">{d.row_count.toLocaleString()}</td>
                  <td className="p-3.5 font-mono text-slate-300">{d.column_count}</td>
                  <td className="p-3.5 uppercase font-mono text-slate-400">{d.format}</td>
                  <td className="p-3.5">
                    {d.is_sample ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">
                        System Benchmark
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                        User Upload
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-right space-x-2">
                    <button
                      onClick={() => handleViewDetails(d.id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium transition-colors"
                    >
                      Inspect Profile
                    </button>
                    {!d.is_sample && (
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="p-1 rounded-lg hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dataset Profile Detail Drawer/Section */}
      {selectedDataset && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-indigo-500/30 space-y-6 animate-in slide-in-from-bottom duration-200 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Profile: {selectedDataset.name}</span>
                <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                  Quality Score: {selectedDataset.profile?.quality_score}/100
                </span>
              </h3>
              <p className="text-xs text-slate-400">{selectedDataset.description || 'Verified dataset profile.'}</p>
            </div>
            <button
              onClick={() => setSelectedDataset(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Profiling Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400">Total Observations</span>
              <p className="text-lg font-bold text-white mt-0.5">{selectedDataset.row_count.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400">Missing Cell Ratio</span>
              <p className="text-lg font-bold text-cyan-400 mt-0.5">
                {selectedDataset.profile?.missing_percentage ?? 0}%
              </p>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400">Duplicate Records</span>
              <p className="text-lg font-bold text-slate-300 mt-0.5">{selectedDataset.profile?.duplicate_rows ?? 0}</p>
            </div>
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400">Memory Footprint</span>
              <p className="text-lg font-bold text-indigo-400 mt-0.5">
                {formatNumber((selectedDataset.profile?.memory_usage_bytes || 0) / (1024 * 1024))} MB
              </p>
            </div>
          </div>

          {/* Schemas Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 mb-2">Column Schemas & Target Suitability</h4>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 sticky top-0">
                  <tr>
                    <th className="p-2.5">Feature Column</th>
                    <th className="p-2.5">Native Dtype</th>
                    <th className="p-2.5">Inferred Semantics</th>
                    <th className="p-2.5">Nullable</th>
                    <th className="p-2.5">Target Candidate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {selectedDataset.schemas?.map((s) => (
                    <tr key={s.column_name} className="hover:bg-slate-800/30">
                      <td className="p-2.5 font-mono text-indigo-300">{s.column_name}</td>
                      <td className="p-2.5 text-slate-400">{s.data_type}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold uppercase">
                          {s.inferred_type}
                        </span>
                      </td>
                      <td className="p-2.5">{s.is_nullable ? 'Yes' : 'No'}</td>
                      <td className="p-2.5">
                        {s.is_target_candidate ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                            Eligible
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">Feature</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-cyan-400" /> Upload New Dataset
              </h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-400 font-medium">Dataset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Q4 Customer Churn Callset"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Description</label>
                <textarea
                  placeholder="Describe data origin and prediction purpose..."
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white h-16 resize-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Category / Source Type</label>
                <select
                  value={uploadSourceType}
                  onChange={(e) => setUploadSourceType(e.target.value)}
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="custom">Custom Tabular</option>
                  <option value="retail">Retail & Sales</option>
                  <option value="fraud">Financial & Fraud</option>
                  <option value="maintenance">Industrial IoT</option>
                  <option value="healthcare">Healthcare & Clinical</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium">Select CSV or XLSX File (Max 50MB)</label>
                <input
                  type="file"
                  required
                  accept=".csv,.xlsx,.xls,.parquet"
                  onChange={(e) => setUploadFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl p-2 text-xs text-slate-300"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
                >
                  {isUploading ? 'Validating & Profiling...' : 'Upload & Analyze'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
