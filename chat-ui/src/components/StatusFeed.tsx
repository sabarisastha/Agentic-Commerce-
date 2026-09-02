import type { Step } from '../types';
import { Search, Database, Check, ShoppingCart, Shield, Lock } from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  search: <Search className="w-4 h-4" />,
  database: <Database className="w-4 h-4" />,
  check: <Check className="w-4 h-4" />,
  'shopping-cart': <ShoppingCart className="w-4 h-4" />,
  shield: <Shield className="w-4 h-4" />,
  lock: <Lock className="w-4 h-4" />
};

export function StatusFeed({ steps }: { steps: Step[] }) {
  return (
    <div className="bg-white/60 border border-sky-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex flex-col space-y-3">
      {steps.map((step) => (
        <div key={step.id} className="flex items-center space-x-3 text-sm animate-in fade-in slide-in-from-left-2 duration-300">
          <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
            step.status === 'active' ? 'bg-sky-100 text-sky-600 animate-pulse' : 
            step.status === 'done' ? 'bg-green-100 text-green-600' : 
            'bg-slate-100 text-slate-400'
          }`}>
            {step.status === 'done' ? <Check className="w-3.5 h-3.5" /> : (iconMap[step.icon || 'check'] || <div className="w-2 h-2 bg-current rounded-full" />)}
          </div>
          <span className={`font-medium ${step.status === 'active' ? 'text-neutral-ink' : step.status === 'done' ? 'text-slate-500' : 'text-slate-400'}`}>
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}
