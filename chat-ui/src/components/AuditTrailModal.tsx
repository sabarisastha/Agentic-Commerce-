import { useState, useEffect } from 'react';
import { X, FileText, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';

type AuditEntry = {
  id: number;
  session_id: string;
  event_type: string;
  payload: string;
  timestamp: string;
};

const EVENT_COLORS: Record<string, string> = {
  tool_call:          'bg-blue-100 text-blue-700',
  tool_result:        'bg-green-100 text-green-700',
  tool_error:         'bg-red-100 text-red-700',
  state_transition:   'bg-purple-100 text-purple-700',
  user_authorization: 'bg-yellow-100 text-yellow-700',
  payment_verified:   'bg-emerald-100 text-emerald-700',
  session_reset:      'bg-orange-100 text-orange-700',
};

function PayloadRow({ payload }: { payload: string }) {
  const [open, setOpen] = useState(false);
  const preview = payload?.replace(/\s+/g, ' ').slice(0, 80);
  const isLong = payload?.length > 80;

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-left w-full group"
      >
        {isLong
          ? open
            ? <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            : <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
          : <span className="w-3 h-3 shrink-0" />
        }
        <span className="text-[10px] text-slate-500 font-mono group-hover:text-slate-700 transition-colors">
          {open ? '' : (preview + (isLong ? '…' : ''))}
        </span>
      </button>
      {open && (
        <pre className="mt-1 ml-4 text-[10px] text-slate-600 whitespace-pre-wrap break-all bg-slate-50 rounded-lg p-2 border border-slate-100 max-w-md">
          {payload}
        </pre>
      )}
    </div>
  );
}

export function AuditTrailModal({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:3001/session/${sessionId}/audit`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setLogs((data.logs || []).reverse()); // newest first
    } catch (e: any) {
      setError(e.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [sessionId]);

  const eventTypes = ['all', ...Array.from(new Set(logs.map(l => l.event_type)))];
  const filtered = filter === 'all' ? logs : logs.filter(l => l.event_type === filter);

  const formatTime = (ts: string) => {
    try {
      return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return ts;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-brand-blue" />
            <div>
              <h2 className="font-bold text-neutral-ink">Agent Audit Trail</h2>
              <p className="text-xs text-slate-500">
                Session: …{sessionId.slice(-12)} · {logs.length} event{logs.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        {!loading && logs.length > 0 && (
          <div className="px-6 py-2 border-b border-slate-50 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
            {eventTypes.map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`text-[10px] px-2.5 py-1 rounded-full font-semibold whitespace-nowrap transition-colors ${
                  filter === type
                    ? 'bg-brand-blue text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {type === 'all' ? `All (${logs.length})` : type}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Loading audit events…
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-32 text-red-400 text-sm gap-1">
              <span className="font-semibold">Failed to load</span>
              <span className="text-xs">{error}</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm gap-1">
              <FileText className="w-8 h-8 opacity-30" />
              <span>No audit events yet for this session.</span>
              <span className="text-xs">Start chatting and events will appear here.</span>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100">
                  <th className="pb-2 pr-3 font-medium whitespace-nowrap">Time</th>
                  <th className="pb-2 pr-4 font-medium">Event</th>
                  <th className="pb-2 font-medium">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(log => (
                  <tr key={log.id} className="align-top hover:bg-slate-50 transition-colors">
                    <td className="py-2 pr-3 text-slate-400 whitespace-nowrap font-mono">
                      {formatTime(log.timestamp)}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${EVENT_COLORS[log.event_type] || 'bg-slate-100 text-slate-600'}`}>
                        {log.event_type}
                      </span>
                    </td>
                    <td className="py-2">
                      <PayloadRow payload={log.payload} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
