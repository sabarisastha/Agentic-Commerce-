import type { CartItem } from '../types';
import { ShoppingBag } from 'lucide-react';

export function CartSummary({ cart, total }: { cart: CartItem[], total: number }) {
  return (
    <div className="bg-white border border-sky-200 rounded-2xl p-4 shadow-sm w-72">
      <div className="flex items-center space-x-2 mb-3 pb-3 border-b border-sky-50">
        <div className="bg-sky-100 p-1.5 rounded-full">
          <ShoppingBag className="w-4 h-4 text-sky-600" />
        </div>
        <span className="font-semibold text-neutral-ink text-sm">Cart Updated</span>
      </div>
      
      <div className="space-y-2 mb-4">
        {cart.map(item => (
          <div key={item.productId} className="flex justify-between text-sm">
            <span className="text-slate-600 truncate pr-2">{item.quantity}x {item.name}</span>
            <span className="font-medium text-neutral-ink">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-sky-50">
        <span className="font-semibold text-neutral-ink text-sm">Subtotal</span>
        <span className="font-bold text-lg text-neutral-ink">₹{total.toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
}
