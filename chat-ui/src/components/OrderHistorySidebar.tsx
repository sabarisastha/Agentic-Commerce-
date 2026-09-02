import { useState, useEffect } from 'react';
import { History, ChevronRight, Package, ShoppingBag } from 'lucide-react';
import type { Order } from '../types';

export function OrderHistorySidebar({ sessionId, refreshTrigger = 0 }: { sessionId: string; refreshTrigger?: number }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`http://localhost:3001/session/${sessionId}/orders`)
      .then(r => r.json())
      .then(data => setOrders(data.orders || []))
      .catch(() => {});
  }, [sessionId, refreshTrigger]);

  const statusColor: Record<string, string> = {
    PAYMENT_CAPTURED: 'bg-green-100 text-green-700',
    PAYMENT_CREATED: 'bg-blue-100 text-blue-700',
    payment_failed: 'bg-red-100 text-red-700',
    PAYMENT_FAILED: 'bg-red-100 text-red-700',
    CART_BUILDING: 'bg-slate-100 text-slate-500',
    AWAITING_USER_APPROVAL: 'bg-yellow-100 text-yellow-700',
    created: 'bg-blue-100 text-blue-700',
  };

  return (
    <aside
      className={`hidden xl:flex flex-col border-r border-slate-100 bg-slate-50/50 transition-all duration-300 ${
        collapsed ? 'w-10' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-slate-100 shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-brand-blue" />
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Order History</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="p-1 hover:bg-slate-100 rounded-md transition-colors ml-auto"
        >
          <ChevronRight
            className={`w-3.5 h-3.5 text-slate-500 transition-transform ${collapsed ? '' : 'rotate-180'}`}
          />
        </button>
      </div>
      {!collapsed && (
        <div className="flex-1 overflow-y-auto p-3">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400">
              <ShoppingBag className="w-6 h-6 mb-2 opacity-40" />
              <p className="text-xs">No orders yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map(order => (
                <div key={order.id} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                  <div className="flex items-start gap-2 mb-2">
                    <Package className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-neutral-ink truncate font-mono">
                        {order.razorpay_order_id || 'Processing...'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{order.created_at}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-ink">
                      ₹{(order.total_amount / 100).toLocaleString('en-IN')}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColor[order.status] || 'bg-slate-100 text-slate-500'}`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
