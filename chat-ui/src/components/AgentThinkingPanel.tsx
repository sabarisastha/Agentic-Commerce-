import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Cpu, CheckCircle2, XCircle, Loader2, Terminal, ShieldAlert, Zap } from 'lucide-react';
import type { AgentEvent } from '../types';

function EventRow({ event }: { event: AgentEvent }) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon =
    event.status === 'active'
      ? <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-blue" />
      : event.status === 'done'
      ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
      : <XCircle className="w-3.5 h-3.5 text-red-400" />;

  // Trust Boundary Highlight
  const filteredCount = (event.output as any)?.meta?.filtered_by_constraints || 0;
  const topScoring = (event.output as any)?.meta?.top_scoring_breakdown || null;

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors text-left"
      >
        {statusIcon}
        <span className="flex-1 text-xs font-mono text-slate-700 truncate">{event.toolName}</span>
        <span className="text-[10px] text-slate-400">
          {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
        {expanded
          ? <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          : <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
      </button>

      {/* Trust Boundary Search Filter UI */}
      {filteredCount > 0 && (
        <div className="px-3 pb-2 animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-100 text-amber-700 px-2.5 py-1.5 rounded-md text-[10px] font-medium shadow-sm">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>Backend filtered: {filteredCount} results excluded (safety constraint)</span>
          </div>
        </div>
      )}

      {/* Explicit Trust Boundary Rejection / Block UI */}
      {(event.output as any)?.trust_boundary_enforced && (
        <div className="px-3 pb-2 animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2 rounded-lg text-[10px] shadow-sm flex flex-col gap-1">
            <div className="flex items-center gap-1.5 font-bold text-rose-900 text-[11px]">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Security Barrier Enforced</span>
            </div>
            <p className="text-rose-700 font-medium leading-tight">
              {(event.output as any).label || (event.output as any).reason}
            </p>
          </div>
        </div>
      )}

      {/* Multi-Factor Recommendation Scoring Breakdown */}
      {topScoring && Array.isArray(topScoring) && topScoring.length > 0 && (
        <div className="px-3 pb-2.5 animate-in fade-in slide-in-from-top-1 duration-300">
          <div className="bg-slate-900 text-white rounded-xl p-2.5 shadow-sm border border-slate-800">
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
              <span className="text-[10px] font-semibold text-sky-300 uppercase tracking-wider flex items-center gap-1">
                ⚡ Deterministic Scoring (Top {topScoring.length})
              </span>
              <span className="text-[9px] text-slate-400 font-mono">w1..w5 model</span>
            </div>
            <div className="space-y-2">
              {topScoring.map((item: any, idx: number) => {
                const b = item.breakdown || {};
                return (
                  <div key={item.id || idx} className="bg-slate-800/80 rounded-lg p-2 border border-slate-700/50">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-300 font-bold text-[9px] flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="text-[11px] font-medium text-slate-200 truncate">{item.name}</span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-400 shrink-0 font-mono">
                        {b.totalPercent || Math.round((item.score || 0) * 100)}% match
                      </span>
                    </div>
                    {/* Score Bar Breakdown */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] text-slate-300 pt-1">
                      <div className="flex items-center justify-between bg-slate-900/60 px-1.5 py-0.5 rounded">
                        <span className="text-slate-400">Budget Fit</span>
                        <span className="font-mono text-sky-300">{b.budgetFit}%</span>
                      </div>
                      <div className="flex items-center justify-between bg-slate-900/60 px-1.5 py-0.5 rounded">
                        <span className="text-slate-400">Intent Match</span>
                        <span className="font-mono text-sky-300">{b.useCaseMatch}%</span>
                      </div>
                      <div className="flex items-center justify-between bg-slate-900/60 px-1.5 py-0.5 rounded">
                        <span className="text-slate-400">Value (Spec/₹)</span>
                        <span className="font-mono text-amber-300">{b.valueScore}%</span>
                      </div>
                      <div className="flex items-center justify-between bg-slate-900/60 px-1.5 py-0.5 rounded">
                        <span className="text-slate-400">Rating</span>
                        <span className="font-mono text-yellow-300">{b.rating || 4.5}★</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {event.input && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Input</p>
              <pre className="text-[10px] bg-slate-50 rounded-lg p-2 overflow-x-auto text-slate-600 border border-slate-100">
                {JSON.stringify(event.input, null, 2)}
              </pre>
            </div>
          )}
          {event.output !== undefined && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Output</p>
              <pre className="text-[10px] bg-slate-50 rounded-lg p-2 overflow-x-auto text-slate-600 border border-slate-100">
                {JSON.stringify(event.output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AgentThinkingPanel({
  events,
  isActive
}: {
  events: AgentEvent[];
  isActive: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [metrics, setMetrics] = useState<{latencyMs: number, totalTokens: number} | null>(null);

  useEffect(() => {
    const handleMetrics = (e: any) => setMetrics(e.detail);
    window.addEventListener('agent_metrics', handleMetrics);
    return () => window.removeEventListener('agent_metrics', handleMetrics);
  }, []);

  if (events.length === 0 && !isActive && !metrics) return null;

  return (
    <aside
      className={`hidden lg:flex flex-col border-l border-slate-100 bg-white/90 backdrop-blur-sm transition-all duration-300 ${
        collapsed ? 'w-10' : 'w-72'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-slate-100 shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-brand-blue animate-pulse' : 'bg-green-400'}`} />
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Agent Trace</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="p-1 hover:bg-slate-100 rounded-md transition-colors ml-auto"
          title={collapsed ? 'Expand trace panel' : 'Collapse trace panel'}
        >
          <Terminal className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>
      
      {!collapsed && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                <Cpu className="w-6 h-6 mb-2 opacity-40" />
                <p className="text-xs">Waiting for agent...</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {events.map(ev => <EventRow key={ev.id} event={ev} />)}
              </div>
            )}
          </div>
          
          {/* Pitch specific Metrics Footer */}
          {metrics && (
            <div className="shrink-0 p-3 bg-slate-50 border-t border-slate-100">
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Latency: {metrics.latencyMs}ms
                </div>
                <div className="text-slate-500 font-medium">
                  Tokens: <span className="font-mono">{metrics.totalTokens}</span>
                </div>
              </div>
              <div className="mt-1 text-center">
                <span className="text-[9px] font-semibold tracking-wider text-green-600 uppercase bg-green-100 px-1.5 py-0.5 rounded">
                  Cost: $0.00 (Open Source Free Tier)
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
