import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, Send, X, Sparkles, AlertCircle, BarChart2, CornerDownLeft } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { copilotApi } from '@/services/api';
import { CopilotMessage } from '@/types';

interface CopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const moduleQuestions: Record<string, string[]> = {
  retail: [
    'Which products have the highest predicted demand?',
    'What is the forecast accuracy and WAPE of the LightGBM model?',
    'Explain the RFM customer segment distribution.',
  ],
  fraud: [
    'Why was this transaction flagged?',
    'What are the strongest predictors of fraud in the dataset?',
    'Explain the precision-recall trade-off on imbalanced transactions.',
  ],
  maintenance: [
    'What are the strongest physical predictors of machine failure?',
    'How does torque and tool wear affect failure probability?',
    'Explain the difference between point failure and RUL.',
  ],
  healthcare: [
    'Which features influenced this research-model estimate?',
    'Explain the calibration curve and model uncertainty.',
    'What are the primary clinical limitations of the Cleveland cohort?',
  ],
  recommendations: [
    'Why was this item recommended to the user?',
    'How does the SVD latent matrix factorization compare to popularity?',
    'How does the system handle cold-start users?',
  ],
  autods: [
    'Compare the accuracy of the candidate trained models.',
    'What feature transformations were applied during preprocessing?',
    'Explain the top feature importance rankings.',
  ],
  overview: [
    'Summarize current active models and platform status.',
    'What anomalies have been flagged in the last 24 hours?',
    'How do the 6 intelligence engines work together?',
  ],
};

export const CopilotDrawer: React.FC<CopilotDrawerProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am your IntelliSphere AI Copilot. I have live contextual access to all 6 predictive intelligence engines, trained model artifacts, and evaluation reports. How can I assist you?',
      created_at: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derive current module context from route
  const path = location.pathname.replace('/', '') || 'overview';
  const currentContext = ['retail', 'fraud', 'maintenance', 'healthcare', 'recommendations', 'autods'].includes(path)
    ? path
    : 'overview';

  const suggestedQuestions = moduleQuestions[currentContext] || moduleQuestions.overview;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
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
      const response = await copilotApi.chat(query, currentContext);
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
        content: `Error communicating with AI Copilot: ${err?.response?.data?.detail || err.message}`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 md:w-[460px] bg-[#0b101c] border-l border-slate-800 shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between bg-[#0e1424]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <Bot className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              AI Copilot
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 capitalize">
                {currentContext}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">Grounded strictly in verified model outputs</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Suggested Questions */}
      <div className="p-3 bg-slate-900/60 border-b border-slate-800">
        <p className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-cyan-400" /> Suggested for this Engine
        </p>
        <div className="flex flex-col gap-1.5">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="text-left text-xs text-slate-300 hover:text-cyan-300 bg-slate-800/40 hover:bg-slate-800/80 p-2 rounded-lg border border-slate-700/40 transition-colors truncate"
            >
              "{q}"
            </button>
          ))}
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[90%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-bl-none'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>

              {/* Render Structured Chart if attached */}
              {m.structured_chart && (
                <div className="mt-3 p-2 bg-[#080d18] rounded-xl border border-slate-700/60">
                  <p className="text-[11px] font-semibold text-cyan-300 mb-2">{m.structured_chart.title}</p>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {m.structured_chart.chart_type === 'bar' ? (
                        <BarChart data={m.structured_chart.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="feature" stroke="#64748b" tick={{ fontSize: 9 }} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                          <Bar dataKey="importance" fill="#818cf8" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      ) : (
                        <LineChart data={m.structured_chart.data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 9 }} />
                          <YAxis stroke="#64748b" tick={{ fontSize: 9 }} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }} />
                          <Line type="monotone" dataKey="forecast" stroke="#22d3ee" strokeWidth={2} dot={{ r: 2 }} />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
            <span className="text-[9px] text-slate-500 mt-1 px-1">
              {m.role === 'user' ? 'You' : 'Copilot'} • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            <span>Querying model registry & analyzing ground truth...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-slate-800 bg-[#0c1220]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about ${currentContext} intelligence...`}
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition-all shadow-md shadow-indigo-600/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
