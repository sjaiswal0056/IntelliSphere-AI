import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  ShieldAlert,
  Wrench,
  Activity,
  Sparkles,
  Cpu,
  Bot,
  Database,
  Layers,
  GitFork,
  FileText,
  Settings,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  title: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  section?: 'engines' | 'platform' | 'system';
}

const navItems: NavItem[] = [
  { title: 'Overview', path: '/', icon: LayoutDashboard, section: 'platform' },
  { title: 'Retail Intelligence', path: '/retail', icon: ShoppingBag, section: 'engines', badge: 'Online' },
  { title: 'Fraud Detection', path: '/fraud', icon: ShieldAlert, section: 'engines', badge: 'Online' },
  { title: 'Predictive Maintenance', path: '/maintenance', icon: Wrench, section: 'engines', badge: 'Online' },
  { title: 'Healthcare Analytics', path: '/healthcare', icon: Activity, section: 'engines', badge: 'Research' },
  { title: 'Recommendation Engine', path: '/recommendations', icon: Sparkles, section: 'engines', badge: 'Online' },
  { title: 'AI Data Scientist', path: '/autods', icon: Cpu, section: 'engines', badge: 'Flagship' },
  { title: 'AI Copilot', path: '/copilot', icon: Bot, section: 'platform' },
  { title: 'Dataset Manager', path: '/datasets', icon: Database, section: 'platform' },
  { title: 'Model Performance', path: '/models', icon: Layers, section: 'platform' },
  { title: 'Experiment Tracking', path: '/experiments', icon: GitFork, section: 'platform' },
  { title: 'Reports', path: '/reports', icon: FileText, section: 'system' },
  { title: 'Settings', path: '/settings', icon: Settings, section: 'system' },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <aside className="w-64 bg-[#090d16] border-r border-slate-800/80 flex flex-col h-screen sticky top-0 select-none z-30">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800/80 gap-3 bg-[#0a0f1a]/80 backdrop-blur-md">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
            IntelliSphere AI
          </span>
          <span className="block text-[10px] text-cyan-400 font-medium tracking-wider uppercase">
            Predictive Platform
          </span>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Core Platform */}
        <div>
          <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
            Platform Hub
          </div>
          <div className="space-y-1">
            {navItems
              .filter((item) => item.section === 'platform')
              .map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30 shadow-sm shadow-indigo-500/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn('w-4 h-4', isActive ? 'text-indigo-400' : 'text-slate-400')} />
                      <span>{item.title}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
          </div>
        </div>

        {/* Intelligence Engines */}
        <div>
          <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase flex items-center justify-between">
            <span>Intelligence Engines</span>
            <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded">6 Active</span>
          </div>
          <div className="space-y-1">
            {navItems
              .filter((item) => item.section === 'engines')
              .map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-gradient-to-r from-indigo-950/60 to-purple-950/40 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn('w-4 h-4', isActive ? 'text-cyan-400' : 'text-slate-400')} />
                      <span>{item.title}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={cn(
                          'text-[9px] font-semibold px-1.5 py-0.5 rounded tracking-wide uppercase',
                          item.badge === 'Flagship'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : item.badge === 'Research'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
          </div>
        </div>

        {/* Governance & System */}
        <div>
          <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
            Governance
          </div>
          <div className="space-y-1">
            {navItems
              .filter((item) => item.section === 'system')
              .map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn('w-4 h-4', isActive ? 'text-indigo-400' : 'text-slate-400')} />
                      <span>{item.title}</span>
                    </div>
                  </NavLink>
                );
              })}
          </div>
        </div>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-800/80 bg-[#070b12]">
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-xs text-indigo-300">
              {user?.full_name ? user.full_name[0].toUpperCase() : 'AI'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.full_name || 'Scientist'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.role || 'Data Scientist'}</p>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
        </div>
      </div>
    </aside>
  );
};
