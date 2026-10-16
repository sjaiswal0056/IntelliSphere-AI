import React, { useState } from 'react';
import { Settings, Shield, Key, Database, Cpu, CheckCircle2, Server, Save } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [llmProvider, setLlmProvider] = useState('gemini');
  const [modelName, setModelName] = useState('gemini-2.5-flash');
  const [maxTokens, setMaxTokens] = useState(4096);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="border-b border-slate-800 pb-4">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold mb-1">
          <Settings className="w-3.5 h-3.5" /> Platform Configuration
        </div>
        <h2 className="text-xl font-bold text-white">System Settings & LLM Providers</h2>
        <p className="text-xs text-slate-400">
          Manage Generative AI provider abstractions, database connectivity, and security parameters
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Generative AI Provider Form */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" /> Generative AI & LLM Provider Abstraction
          </h3>
          <p className="text-xs text-slate-400">
            Configure an optional LLM API key. If no API key is supplied, IntelliSphere AI uses deterministic,
            high-fidelity analytical reasoning grounded in local model artifacts.
          </p>

          <form onSubmit={handleSave} className="space-y-3.5">
            <div>
              <label className="text-xs text-slate-400 font-medium">Configured LLM Provider</label>
              <select
                value={llmProvider}
                onChange={(e) => setLlmProvider(e.target.value)}
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="gemini">Google Gemini (google-genai SDK)</option>
                <option value="openai">OpenAI (Configurable)</option>
                <option value="local_deterministic">Local Deterministic Reasoning (Zero-Key Mode)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium">Gemini API Key</label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Stored in memory / local environment. Never committed to version control.
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 font-medium">Model ID</label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-medium">Max Output Tokens</label>
                <input
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20"
            >
              <Save className="w-4 h-4" />
              <span>{isSaved ? 'Settings Saved!' : 'Save Configuration'}</span>
            </button>
          </form>
        </div>

        {/* System & Database Architecture Info */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-400" /> Platform Infrastructure Status
          </h3>

          <div className="space-y-3">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-slate-200">Database Engine</p>
                <p className="text-[10px] text-slate-500">SQLite (Local) / PostgreSQL Ready (Docker)</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                Connected
              </span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-slate-200">MLflow Tracking URI</p>
                <p className="text-[10px] text-slate-500 font-mono">sqlite:///./data/mlflow.db</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                Active
              </span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-slate-200">LangGraph Agent Runtime</p>
                <p className="text-[10px] text-slate-500">8 Deterministic Graph Nodes</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                Compiled
              </span>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-slate-200">Security Guardrails</p>
                <p className="text-[10px] text-slate-500">Adversarial Regex & Path Traversal Validator</p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                Enforced
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
