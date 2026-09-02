import { useState, useEffect } from 'react';
import { 
  X, TrendingUp, DollarSign, ShoppingBag, ShieldCheck, 
  Users, RefreshCw, Award, Zap, CheckCircle2, ShieldAlert
} from 'lucide-react';

interface MerchantAnalyticsData {
  metrics: {
    aiAssistedRevenue: number;
    capturedOrdersCount: number;
    averageOrderValue: number;
    bundleDiscountUptakeRate: number;
    activeCatalogProducts: number;
    inStockCatalogProducts: number;
  };
  funnel: {
    sessions: number;
    searches: number;
    cartAdds: number;
    checkoutsInitiated: number;
    authorizationsApproved: number;
    paymentsCaptured: number;
  };
  trustBoundary: {
    totalEnforcements: number;
    stateGuards: number;
    stockFilterGuards: number;
    priceIntegrityGuards: number;
    recentEvents: Array<{
      type: string;
      detail: string;
      timestamp: string;
    }>;
  };
  orderStatusBreakdown: Array<{
    status: string;
    count: number;
    sumAmount: number;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    category: string;
    price: number;
    rating: number;
    cartCount: number;
    totalQty: number;
  }>;
  recentOrders: Array<{
    id: string;
    session_id: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    amount: number;
    status: string;
    created_at: string;
  }>;
}

export function MerchantDashboardModal({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<MerchantAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:3001/merchant/analytics');
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || 'Error loading analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const m = data?.metrics;
  const f = data?.funnel;
  const tb = data?.trustBoundary;

  const maxFunnelVal = Math.max(
    f?.sessions || 1,
    f?.searches || 1,
    f?.cartAdds || 1,
    f?.checkoutsInitiated || 1,
    f?.paymentsCaptured || 1
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Merchant Revenue & Conversion Analytics</h2>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-mono font-semibold">
                  LIVE DB SYNC
                </span>
              </div>
              <p className="text-xs text-slate-400">Real-time metrics aggregated from Orders, State Machine & Audit Trail</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 rounded-xl text-xs">
              {error}
            </div>
          )}

          {/* 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: AI-Assisted Revenue */}
            <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">AI-Assisted Revenue</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                ₹{((m?.aiAssistedRevenue || 0)).toLocaleString('en-IN')}
              </div>
              <div className="mt-1 text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3 h-3" />
                <span>{m?.capturedOrdersCount || 0} orders captured safely</span>
              </div>
            </div>

            {/* Card 2: Average Order Value */}
            <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Average Order Value</span>
                <ShoppingBag className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                ₹{((m?.averageOrderValue || 0)).toLocaleString('en-IN')}
              </div>
              <div className="mt-1 text-[11px] text-sky-400 flex items-center gap-1 font-medium">
                <span>Driven by Multi-Factor cross-sells</span>
              </div>
            </div>

            {/* Card 3: Bundle Discount Uptake */}
            <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Bundle Uptake (3+ Items)</span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {m?.bundleDiscountUptakeRate || 0}%
              </div>
              <div className="mt-1 text-[11px] text-amber-400 flex items-center gap-1 font-medium">
                <span>10% volume incentive conversion</span>
              </div>
            </div>

            {/* Card 4: Trust Boundary Enforcements */}
            <div className="bg-slate-800/60 border border-slate-700/60 p-4 rounded-xl shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Security Interventions</span>
                <ShieldCheck className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {tb?.totalEnforcements || 0}
              </div>
              <div className="mt-1 text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                <span>Zero unauthorized bypasses</span>
              </div>
            </div>
          </div>

          {/* Grid Layout: Funnel + Trust Boundary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conversion Funnel */}
            <div className="bg-slate-800/40 border border-slate-700/60 p-5 rounded-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  Agentic Conversion Funnel
                </h3>
                <span className="text-xs text-slate-400 font-mono">Session to Capture</span>
              </div>

              <div className="space-y-3 pt-1 text-xs">
                {/* Step 1: Sessions */}
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span className="font-medium">1. Active Shopper Sessions</span>
                    <span className="font-mono font-bold text-white">{f?.sessions || 0}</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-slate-500 h-full rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>

                {/* Step 2: Catalog Searches */}
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span className="font-medium">2. Catalog Scored Searches</span>
                    <span className="font-mono font-bold text-white">{f?.searches || 0}</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-sky-500 h-full rounded-full" style={{ width: `${Math.min(100, ((f?.searches || 0) / maxFunnelVal) * 100)}%` }} />
                  </div>
                </div>

                {/* Step 3: Cart Additions */}
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span className="font-medium">3. Cart Intent Additions</span>
                    <span className="font-mono font-bold text-white">{f?.cartAdds || 0}</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(100, ((f?.cartAdds || 0) / maxFunnelVal) * 100)}%` }} />
                  </div>
                </div>

                {/* Step 4: Checkouts Initiated */}
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span className="font-medium">4. Payment Authorization Requests</span>
                    <span className="font-mono font-bold text-white">{f?.checkoutsInitiated || 0}</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, ((f?.checkoutsInitiated || 0) / maxFunnelVal) * 100)}%` }} />
                  </div>
                </div>

                {/* Step 5: Captured */}
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span className="font-medium text-emerald-400">5. Cryptographically Captured Orders</span>
                    <span className="font-mono font-bold text-emerald-400">{f?.paymentsCaptured || 0}</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(15, ((f?.paymentsCaptured || 0) / maxFunnelVal) * 100))}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Trust Boundary & Safety Guard Breakdown */}
            <div className="bg-slate-800/40 border border-slate-700/60 p-5 rounded-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Trust Boundary & Safety Breakdown
                </h3>
                <span className="text-xs text-rose-400 font-mono">Enforcement Log</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-lg font-bold text-rose-400 font-mono">{tb?.stateGuards || 0}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Payment Gates</div>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-lg font-bold text-amber-400 font-mono">{tb?.stockFilterGuards || 0}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Stock Blocks</div>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-lg font-bold text-sky-400 font-mono">{tb?.priceIntegrityGuards || 0}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Price Checks</div>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Recent Security Interventions:</p>
                {tb?.recentEvents && tb.recentEvents.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-[11px]">
                    {tb.recentEvents.map((ev, i) => (
                      <div key={i} className="bg-rose-950/30 border border-rose-900/40 p-2 rounded-lg text-rose-300 font-mono flex items-start gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span className="truncate">{ev.detail}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic py-2 text-center">
                    All checks currently passing clean.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top In-Cart & Purchased Products */}
          <div className="bg-slate-800/40 border border-slate-700/60 p-5 rounded-xl space-y-3">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Top AI-Recommended Products
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(data?.topProducts || []).slice(0, 6).map((prod) => (
                <div key={prod.id} className="bg-slate-900/70 border border-slate-800 p-3 rounded-xl flex justify-between items-center">
                  <div className="truncate pr-2">
                    <p className="text-xs font-semibold text-white truncate">{prod.name}</p>
                    <p className="text-[10px] text-slate-400 capitalize">{prod.category} · {prod.rating || 4.5}★</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-emerald-400 font-mono">₹{prod.price.toLocaleString('en-IN')}</p>
                    <span className="text-[10px] text-slate-500">{prod.totalQty}x added</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Captured Transactions */}
          <div className="bg-slate-800/40 border border-slate-700/60 p-5 rounded-xl space-y-3">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Recent Captured Transactions (Razorpay Secured)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 font-semibold">
                    <th className="pb-2">Order Ref</th>
                    <th className="pb-2">Payment ID</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                  {(data?.recentOrders || []).slice(0, 5).map((order) => (
                    <tr key={order.id} className="hover:bg-slate-800/30">
                      <td className="py-2 font-medium text-white">{order.razorpay_order_id || order.id}</td>
                      <td className="py-2 text-slate-400">{order.razorpay_payment_id || '—'}</td>
                      <td className="py-2 font-bold text-emerald-400">₹{(order.amount || 0).toLocaleString('en-IN')}</td>
                      <td className="py-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {order.status}
                        </span>
                      </td>
                      <td className="py-2 text-slate-500 text-[10px]">
                        {order.created_at ? new Date(order.created_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Recent'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
