import { useState } from 'react';
import type { CartItem } from '../types';
import { ShieldCheck, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export function AuthRequestCard({
  cart,
  total,
  status,
  onAction,
  sessionId
}: {
  messageId: string;
  cart: CartItem[];
  total: number;
  status: 'pending' | 'approved' | 'cancelled';
  onAction: (action: 'approve_auth' | 'cancel_auth', payload?: { passkeyToken?: string }) => void;
  sessionId: string;
}) {
  const [approveState, setApproveState] = useState<'idle' | 'prompting' | 'verified' | 'error'>('idle');
  const [confirmed, setConfirmed] = useState(false);

  const handleApprove = async () => {
    if (!confirmed) return;
    setApproveState('prompting');
    try {
      const res = await fetch(`http://localhost:3001/auth/${sessionId}/fallback-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: true })
      });
      const data = await res.json();
      if (data.token) {
        setApproveState('verified');
        setTimeout(() => onAction('approve_auth', { passkeyToken: data.token }), 400);
      } else {
        setApproveState('error');
      }
    } catch {
      setApproveState('error');
    }
  };

  return (
    <div
      className={`bg-white border-2 rounded-2xl p-5 shadow-md w-80 relative overflow-hidden transition-all duration-300 ${
        status === 'pending'
          ? 'border-accent-money/50'
          : status === 'approved'
          ? 'border-green-200'
          : 'border-red-200 opacity-75'
      }`}
    >
      <div
        className={`absolute top-0 left-0 right-0 h-1.5 ${
          status === 'pending' ? 'bg-accent-money' : status === 'approved' ? 'bg-green-500' : 'bg-red-400'
        }`}
      />

      <div className="flex justify-between items-start mb-4 mt-1">
        <div>
          <h3 className="font-bold text-neutral-ink text-lg">Payment Authorization</h3>
          <p className="text-xs text-slate-500 mt-0.5">Review your order before approving</p>
        </div>
        <div className="bg-pale-blue p-1.5 rounded-lg border border-sky-100">
          <ShieldCheck className="w-5 h-5 text-brand-blue" />
        </div>
      </div>

      <div className="bg-sky-50 rounded-xl p-3 mb-4 space-y-2 border border-sky-100/50">
        {(cart || []).map(item => (
          <div key={item.productId} className="flex justify-between text-sm">
            <span className="text-slate-700 truncate pr-2 text-xs">
              {item.name} × {item.quantity}
            </span>
            <span className="font-medium text-neutral-ink text-xs">
              ₹{(item.price * item.quantity).toLocaleString('en-IN')}
            </span>
          </div>
        ))}
        <div className="pt-2 border-t border-sky-200/50 flex justify-between items-center">
          <span className="font-semibold text-neutral-ink text-sm">Total Due</span>
          <span className="font-bold text-xl text-neutral-ink">
            ₹{(total || 0).toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {status === 'pending' ? (
        <div className="flex flex-col space-y-3">

          {approveState === 'error' && (
            <div className="text-xs text-red-600 text-center bg-red-50 border border-red-200 rounded-lg p-2">
              Something went wrong. Please try again.
            </div>
          )}

          <label className="flex items-start space-x-2 p-2 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 rounded text-brand-blue focus:ring-brand-blue"
            />
            <span className="text-xs text-slate-600 font-medium">
              I confirm this purchase and authorize payment of ₹{(total || 0).toLocaleString('en-IN')}.
            </span>
          </label>

          <button
            onClick={handleApprove}
            disabled={!confirmed || approveState === 'prompting' || approveState === 'verified'}
            className="w-full py-3 bg-brand-blue text-white font-semibold rounded-xl hover:bg-brand-blue/90 transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {approveState === 'prompting' && <Loader2 className="w-4 h-4 animate-spin" />}
            {approveState === 'verified' && <CheckCircle2 className="w-4 h-4" />}
            <span>
              {approveState === 'verified' ? 'Verified!' : approveState === 'prompting' ? 'Processing...' : 'Approve Payment'}
            </span>
          </button>

          <button
            onClick={() => onAction('cancel_auth')}
            className="w-full py-2.5 bg-white text-slate-600 font-medium text-sm rounded-xl hover:bg-slate-50 transition-colors border border-slate-200"
          >
            Cancel
          </button>
        </div>

      ) : (
        <div
          className={`flex items-center justify-center space-x-2 py-3 rounded-xl border ${
            status === 'approved'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {status === 'approved' ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <XCircle className="w-5 h-5" />
          )}
          <span className="font-semibold">
            {status === 'approved' ? 'Payment Approved' : 'Payment Cancelled'}
          </span>
        </div>
      )}

      <div className="mt-4 flex items-center justify-center space-x-1 opacity-70">
        <ShieldCheck className="w-3 h-3 text-slate-400" />
        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">
          Secured by Razorpay
        </span>
      </div>
    </div>
  );
}
