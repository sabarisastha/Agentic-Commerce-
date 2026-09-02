import { useRef, useEffect, useState } from 'react';
import { Send, ShieldCheck, FileText, RefreshCw, BarChart2 } from 'lucide-react';
import { useChatSimulation } from '../hooks/useChatSimulation';
import { MessageBubble } from './MessageBubble';
import { ProductCarousel } from './ProductCarousel';
import { CartSummary } from './CartSummary';
import { AuthRequestCard } from './AuthRequestCard';
import { PaymentResultCard } from './PaymentResultCard';
import { AgentThinkingPanel } from './AgentThinkingPanel';
import { OrderHistorySidebar } from './OrderHistorySidebar';
import { AuditTrailModal } from './AuditTrailModal';
import { MerchantDashboardModal } from './MerchantDashboardModal';

export function ChatInterface() {
  const { messages, agentEvents, isTyping, sendMessage, handleAction, sessionId, mockScriptOptions, orderRefreshTrigger } =
    useChatSimulation();
  const [input, setInput] = useState('');
  const [showAudit, setShowAudit] = useState(false);
  const [showMerchantDashboard, setShowMerchantDashboard] = useState(false);
  const [resetting, setResetting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleNewSession = async () => {
    if (!confirm('Start a new session? This will clear your current cart and chat history.')) return;
    setResetting(true);
    try {
      await fetch(`http://localhost:3001/session/${sessionId}/reset`, { method: 'POST' });
    } catch (_) {}
    // Clear local session ID so a brand new one is generated on reload
    localStorage.removeItem('nexus_session_id');
    window.location.reload();
  };

  return (
    <div className="flex h-screen bg-sky-50 overflow-hidden">
      {/* Left — Order History Sidebar (xl+ screens) */}
      <OrderHistorySidebar sessionId={sessionId} refreshTrigger={orderRefreshTrigger} />

      {/* Center — Chat */}
      <div className="flex flex-col flex-1 min-w-0 sm:shadow-xl">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-sky-100 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center">
              <span className="text-white font-bold text-sm">AI</span>
            </div>
            <div>
              <h1 className="font-semibold text-neutral-ink">Nexus Commerce</h1>
              <p className="text-xs text-sky-600">AI Assistant · Session {sessionId.slice(-6)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMerchantDashboard(true)}
              className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors px-2.5 py-1 rounded-lg font-semibold shadow-sm"
              title="View Merchant Revenue & Analytics Dashboard"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Merchant Insights</span>
            </button>
            <button
              onClick={handleNewSession}
              disabled={resetting}
              title="Start a new shopping session (clears cart)"
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">New Session</span>
            </button>
            <button
              onClick={() => setShowAudit(true)}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-blue transition-colors px-2 py-1 rounded-lg hover:bg-sky-50"
              title="View full agent audit trail"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Audit Trail</span>
            </button>
            <div className="flex items-center space-x-1.5 bg-pale-blue px-2.5 py-1 rounded-full border border-sky-100">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-blue" />
              <span className="text-[10px] font-medium text-brand-blue uppercase tracking-wider">
                Secured by Razorpay
              </span>
            </div>
          </div>
        </header>

        {/* Messages — status events DO NOT render here */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.map(msg => {
            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex justify-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-brand-blue text-white px-4 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%] shadow-sm">
                    {msg.content}
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className="flex items-start space-x-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center shrink-0 mt-1 shadow-sm">
                  <span className="text-white font-bold text-sm">AI</span>
                </div>
                <div className="flex-1 space-y-2 max-w-[90%]">
                  {msg.type === 'text' && <MessageBubble content={msg.content || ''} />}
                  {msg.type === 'products' && (
                    <ProductCarousel
                      products={msg.products || []}
                      onAddToCart={p => sendMessage(`Add ${p.name} to my cart`)}
                    />
                  )}
                  {msg.type === 'cart_summary' && (
                    <CartSummary cart={msg.cart || []} total={msg.total || 0} />
                  )}
                  {msg.type === 'auth_request' && (
                    <AuthRequestCard
                      messageId={msg.id}
                      cart={msg.cart || []}
                      total={msg.total || 0}
                      status={msg.authStatus || 'pending'}
                      sessionId={sessionId}
                      onAction={(action, payload) =>
                        handleAction(action, { ...payload, messageId: msg.id })
                      }
                    />
                  )}
                  {msg.type === 'payment_result' && (
                    <PaymentResultCard
                      status={msg.paymentStatus!}
                      orderRef={msg.orderRef}
                      paymentAmount={msg.paymentAmount}
                      reason={msg.paymentReason}
                      onVerify={(payload) => handleAction('verify_payment', payload)}
                      onRetry={
                        msg.paymentStatus === 'failure'
                          ? () => sendMessage('Retry the payment')
                          : undefined
                      }
                      onModifyCart={
                        msg.paymentStatus === 'failure'
                          ? () => sendMessage('Show me my cart')
                          : undefined
                      }
                    />
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-start space-x-3 animate-in fade-in duration-300">
              <div className="w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center shrink-0 mt-1 shadow-sm">
                <span className="text-white font-bold text-sm">AI</span>
              </div>
              <div className="bg-white border border-sky-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                <div className="flex space-x-1.5">
                  <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </main>

        {/* Quick actions strip */}
        <div className="px-4 py-2 bg-sky-100/50 flex gap-2 overflow-x-auto no-scrollbar border-t border-sky-100">
          <span className="text-xs text-sky-600 py-1 font-medium shrink-0">Try:</span>
          {mockScriptOptions.map(opt => (
            <button
              key={opt}
              onClick={() => setInput(opt)}
              className="text-xs bg-white border border-sky-200 px-3 py-1 rounded-full text-neutral-ink hover:bg-sky-50 whitespace-nowrap transition-colors"
            >
              "{opt}"
            </button>
          ))}
        </div>

        {/* Input bar */}
        <footer className="p-4 bg-white border-t border-sky-100">
          <form onSubmit={onSubmit} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isTyping}
              placeholder={isTyping ? 'Agent is thinking...' : 'Type your message...'}
              className="w-full bg-pale-blue border border-sky-200 rounded-full pl-5 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition-all text-neutral-ink placeholder:text-slate-400 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="absolute right-2 p-2 bg-brand-blue text-white rounded-full hover:bg-opacity-90 disabled:bg-slate-300 disabled:text-slate-500 transition-colors shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </footer>
      </div>

      {/* Right — Agent Thinking Panel (lg+ screens) */}
      <AgentThinkingPanel events={agentEvents} isActive={isTyping} />

      {/* Audit Trail Modal */}
      {showAudit && <AuditTrailModal sessionId={sessionId} onClose={() => setShowAudit(false)} />}
      
      {/* Merchant Dashboard Modal */}
      <MerchantDashboardModal 
        isOpen={showMerchantDashboard} 
        onClose={() => setShowMerchantDashboard(false)} 
      />
    </div>
  );
}
