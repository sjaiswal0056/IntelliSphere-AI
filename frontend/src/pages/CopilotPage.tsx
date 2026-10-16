import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, AlertCircle, ShieldCheck, Database, BarChart3, Activity, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { copilotApi } from '@/services/api';
import { CopilotMessage } from '@/types';

const CONTEXT_TABS = [
  { id: 'overview', label: 'Platform Global', desc: 'All 6 engines, metrics & alerts' },
  { id: 'retail', label: 'Retail & Business', desc: 'Demand forecasts, RFM & stockouts' },
  { id: 'fraud', label: 'Financial Fraud', desc: 'Anomaly scoring & precision/recall' },
  { id: 'maintenance', label: 'Predictive Maintenance', desc: 'Equipment risk & sensor limits' },
  { id: 'healthcare', label: 'Healthcare Analytics', desc: 'Calibration, risk & study disclaimers' },
  { id: 'recommendations', label: 'Recommendations', desc: 'SVD, item similarity & cold-start' },
  { id: 'autods', label: 'Autonomous Data Scientist', desc: 'LangGraph multi-agent experiments' },
];

const SUGGESTED_PROMPTS: Record<string, string[]> = {
  overview: [
    'Summarize platform health, active trained models, and latest anomaly alerts.',
    'How do the 6 intelligence engines share datasets and model versioning?',
    'What are the key statistical safeguards against data leakage in this system?',
  ],
  retail: [
    'What is the LightGBM sales forecast accuracy and WAPE on Online Retail II?',
    'Break down the RFM customer segment distribution and champion profiles.',
    'Explain the Monte Carlo stockout simulation under variable supplier lead time.',
  ],
  fraud: [
    'Why was transaction TX-9482 flagged with an 89% risk score?',
    'How does cost-sensitive XGBoost handle the 0.17% class imbalance?',
    'Explain why a high risk score does not legally prove fraudulent intent.',
  ],
  maintenance: [
    'What are the primary sensor predictors of tool wear failure?',
    'Why is it scientifically invalid to predict true RUL from the AI4I 2020 dataset?',
    'What physical features are engineered from torque and rotational speed?',
  ],
  healthcare: [
    'What features contribute most to coronary risk in the Cleveland cohort?',
    'Explain the Brier score and probability calibration curve.',
    'Display the research-use-only disclaimer and clinical boundaries.',
  ],
  recommendations: [
    'How does TruncatedSVD matrix factorization compare to the Bayesian baseline?',
    'Explain how cold-start users are handled without historical ratings.',
    'What is the NDCG@10 and catalog coverage on MovieLens?',
  ],
  autods: [
    'Explain the 17-step LangGraph autonomous data science workflow.',
    'How does the agent choose between Random Forest and LightGBM?',
    'What guardrails prevent prompt injection and arbitrary code execution?',
  ],
};

export const CopilotPage: React.FC = () => {
  const [activeContext, setActiveContext] = useState<string>('overview');
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Welcome to the dedicated IntelliSphere AI Copilot workspace. I have direct programmatic grounding in all 6 predictive intelligence engines, trained model artifacts, MLflow experiments, and dataset profiles.\n\nSelect an engine context on the left or enter any question below. All statistical claims and metric references are verified against genuine local pipeline reports.',
      created_at: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (queryText?: string) => {
    const query = queryText || input;
    if (!query.trim() || isLoading) return;

    const userMsg: CopilotMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await copilotApi.chat(query, activeContext);
      const asstMsg: CopilotMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.reply,
        structured_chart: response.structured_chart,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, asstMsg]);
    } catch (err: any) {
      const errMsg: CopilotMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error contacting intelligence engine: ${err?.response?.data?.detail || err.message}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'reset',
        role: 'assistant',
        content: `Conversation reset. Switched focus to ${activeContext.toUpperCase()} Intelligence Engine. How can I assist you?`,
        created_at: new Date().toISOString(),
      },
    ]);
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col md:flex-row gap-4 overflow-hidden">
      {/* Context Selector Sidebar */}
      <div className="w-full md:w-80 flex flex-col gap-3 bg-[#0d1322] border border-slate-800 rounded-2xl p-4 shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Bot className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Engine Context</h2>
              <p className="text-[11px] text-slate-400">Select active intelligence scope</p>
            </div>
          </div>
          <button
            onClick={handleClearHistory}
            title="Reset conversation"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Engine Tabs */}
        <div className="space-y-1.5 flex-1">
          {CONTEXT_TABS.map((tab) => {
            const isActive = activeContext === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveContext(tab.id)}
                className={`w-full text-left p-3 rounded-xl transition-all border ${
                  isActive
                    ? 'bg-indigo-600/15 border-indigo-500/40 text-white shadow-sm shadow-indigo-500/10'
                    : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold ${isActive ? 'text-cyan-300' : 'text-slate-300'}`}>
                    {tab.label}
                  </span>
                  {isActive && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{tab.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Grounding & Guardrails Badge */}
        <div className="p-3 bg-[#080d1a] border border-cyan-900/30 rounded-xl space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Strict Hallucination Defenses</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal">
            Outputs are bounded by real ML model reports, SHAP vectors, and database states. Prompt injections and arbitrary code requests are rejected.
          </p>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#0d1322] border border-slate-800 rounded-2xl overflow-hidden">
        {/* Chat Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-[#0e1526] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
            <div>
              <h1 className="text-sm font-semibold text-white flex items-center gap-2">
                IntelliSphere AI Grounded Assistant
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {activeContext.toUpperCase()}
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Connected to LightGBM, XGBoost, Isolation Forest, SVD & LangGraph pipelines
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="flex items-center gap-1 text-[11px] bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/50">
              <Database className="w-3 h-3 text-cyan-400" />
              SQLite + MLflow
            </span>
          </div>
        </div>

        {/* Suggested Queries Header */}
        <div className="px-4 py-2 bg-slate-900/50 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-[10px] uppercase font-semibold text-slate-500 shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" /> Suggested:
          </span>
          {(SUGGESTED_PROMPTS[activeContext] || SUGGESTED_PROMPTS.overview).map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="shrink-0 text-[11px] text-slate-300 hover:text-cyan-300 bg-slate-800/60 hover:bg-slate-800 px-3 py-1 rounded-full border border-slate-700/60 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div key={m.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-br-none shadow-lg shadow-indigo-600/20'
                      : 'bg-[#0f172a] text-slate-200 border border-slate-800 rounded-bl-none shadow-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>

                  {/* Render Chart if available */}
                  {m.structured_chart && (
                    <div className="mt-4 p-3 bg-[#080d18] rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-cyan-300">{m.structured_chart.title}</span>
                        <span className="text-[10px] text-slate-500 uppercase">{m.structured_chart.chart_type} chart</span>
                      </div>
                      <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          {m.structured_chart.chart_type === 'bar' ? (
                            <BarChart data={m.structured_chart.data}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                              <XAxis dataKey="feature" stroke="#64748b" tick={{ fontSize: 10 }} />
                              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                              <Bar dataKey="importance" fill="#818cf8" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          ) : (
                            <LineChart data={m.structured_chart.data}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                              <Line type="monotone" dataKey="forecast" stroke="#22d3ee" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                          )}
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 px-1">
                  {isUser ? 'You' : 'Copilot'} • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-3 p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-cyan-400 w-fit">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
              <span>Grounding query with verified pipeline models and reports...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-[#0c1220]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask any question about ${activeContext.toUpperCase()} intelligence, models, or data...`}
              className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask Engine</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
