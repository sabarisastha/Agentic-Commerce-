import { CheckCircle2, XCircle, ExternalLink, RotateCcw, ShoppingCart } from 'lucide-react';

export function PaymentResultCard({
  status,
  orderRef,
  paymentAmount,
  reason,
  onRetry,
  onModifyCart,
  onVerify
}: {
  status: 'success' | 'failure' | 'pending_capture';
  orderRef?: string;
  paymentAmount?: number;
  reason?: string;
  onRetry?: () => void;
  onModifyCart?: () => void;
  onVerify?: (payload: any) => void;
}) {
  const handlePayNow = () => {
    if (!window.Razorpay) {
      alert("Razorpay SDK not loaded");
      return;
    }

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'test_key', // Ensure this matches your backend test key
      amount: paymentAmount || 0,
      currency: "INR",
      name: "Nexus Commerce",
      description: "Order Checkout",
      order_id: orderRef,
      handler: function (response: any) {
        if (onVerify) {
          onVerify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });
        }
      },
      prefill: {
        name: "Test User",
        email: "test@example.com",
        contact: "9999999999"
      },
      theme: {
        color: "#0284c7" // brand-blue
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  if (status === 'pending_capture') {
    return (
      <div className="bg-white border border-sky-200 rounded-2xl p-5 shadow-sm w-80">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-sky-50 rounded-full flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-sky-500" />
          </div>
          <div>
            <h3 className="font-bold text-neutral-ink">Order Created</h3>
            <p className="text-xs text-slate-500 mt-0.5">Ready to complete payment</p>
          </div>
        </div>
        <button
          onClick={handlePayNow}
          className="w-full py-2.5 bg-brand-blue text-white font-semibold text-sm rounded-xl hover:bg-brand-blue/90 transition-colors shadow-sm flex items-center justify-center"
        >
          Pay Now
        </button>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="bg-white border border-green-200 rounded-2xl p-5 shadow-sm w-80">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h3 className="font-bold text-neutral-ink">Payment Successful!</h3>
            <p className="text-xs text-slate-500">Your order has been placed</p>
          </div>
        </div>
        {orderRef && (
          <div className="bg-green-50 rounded-xl p-3 border border-green-100">
            <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wider mb-1">Razorpay Order ID</p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs font-mono text-green-800 truncate">{orderRef}</code>
              <a href="https://dashboard.razorpay.com/app/orders" target="_blank" rel="noreferrer">
                <ExternalLink className="w-3.5 h-3.5 text-green-600 shrink-0" />
              </a>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-red-200 rounded-2xl p-5 shadow-sm w-80">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
          <XCircle className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <h3 className="font-bold text-neutral-ink">Payment Failed</h3>
          <p className="text-xs text-slate-500 mt-0.5">{reason || 'An error occurred during payment'}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full py-2.5 bg-brand-blue text-white font-semibold text-sm rounded-xl hover:bg-brand-blue/90 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
        )}
        {onModifyCart && (
          <button
            onClick={onModifyCart}
            className="w-full py-2.5 bg-white border border-slate-200 text-slate-600 font-medium text-sm rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Modify Cart
          </button>
        )}
      </div>
    </div>
  );
}
