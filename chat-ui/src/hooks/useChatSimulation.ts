import { useState, useCallback, useEffect, useRef } from 'react';
import type { Message, AgentEvent } from '../types';

const SESSION_KEY = 'nexus_session_id';

function getOrCreateSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `session_${Date.now()}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function useChatSimulation() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentEvents, setAgentEvents] = useState<AgentEvent[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [orderRefreshTrigger, setOrderRefreshTrigger] = useState(0);
  const [sessionId] = useState(getOrCreateSessionId);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  // On mount: check for existing session and rehydrate
  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch(`http://localhost:3001/session/${sessionId}/history`);
        if (res.ok) {
          const data = await res.json();
          if (data.hasHistory) {
            setMessages([
              {
                id: 'm0',
                role: 'agent',
                type: 'text',
                content: `Welcome back! Your session has been restored. Your cart has ${data.cart?.length || 0} item(s). How can I help you?`
              }
            ]);
            return;
          }
        }
      } catch (_) { /* first visit */ }
      setMessages([
        { id: 'm0', role: 'agent', type: 'text', content: 'Hi! I am your AI Commerce Assistant. How can I help you shop today?' }
      ]);
    };
    init();
  }, [sessionId]);

  // SSE connection for live events
  useEffect(() => {
    const eventSource = new EventSource(`http://localhost:3001/chat/stream/${sessionId}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('SSE:', data);

      // Handle legacy status events
      if (data.type === 'status') {
        setAgentEvents(prev => {
          const existing = prev.findIndex(e => e.toolName === data.label && e.status === 'active');
          if (existing !== -1) {
            const updated = [...prev];
            updated[existing] = { ...updated[existing], status: data.done ? 'done' : 'active' };
            return updated;
          }
          return [...prev, {
            id: Date.now().toString() + Math.random().toString(36).slice(2),
            toolName: data.label || 'Processing...',
            status: data.done ? 'done' : 'active',
            timestamp: Date.now()
          }];
        });
        return;
      }

      // Handle detailed tool events (inputs/outputs)
      if (data.type === 'tool_event') {
        setAgentEvents(prev => {
          const existing = prev.findIndex(e => e.id === data.id);
          if (existing !== -1) {
            const updated = [...prev];
            updated[existing] = {
              ...updated[existing],
              status: data.status,
              output: data.output || updated[existing].output,
            };
            return updated;
          }
          return [...prev, {
            id: data.id,
            toolName: data.toolName,
            status: data.status,
            input: data.input,
            output: data.output,
            timestamp: Date.now()
          }];
        });
        return;
      }

      // Handle metrics
      if (data.type === 'metrics') {
        // dispatch custom event so AgentThinkingPanel can catch it easily without drilling deep props
        window.dispatchEvent(new CustomEvent('agent_metrics', { detail: data }));
        return;
      }

      // Handle explicit trust boundary rejections
      if (data.type === 'trust_boundary') {
        setAgentEvents(prev => [...prev, {
          id: Date.now().toString() + Math.random().toString(36).slice(2),
          toolName: data.toolName ? `🛡 Blocked: ${data.toolName}` : '🛡 Trust Boundary Enforced',
          status: 'error',
          output: {
            trust_boundary_enforced: true,
            label: data.label,
            reason: data.reason
          },
          timestamp: Date.now()
        }]);
        return;
      }

      const newMsgId = Date.now().toString() + Math.random().toString(36).slice(2);

      setMessages(prev => {
        if (data.type === 'text') {
          setIsTyping(false);
          return [...prev, { id: newMsgId, role: 'agent', type: 'text', content: data.text } as Message];
        }
        if (data.type === 'products') {
          const mapped = (data.products || []).map((p: Record<string, unknown>) => ({
            ...p,
            image: (p.image_url as string) || (p.image as string) || 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop',
            specs: (p.tags as string[]) || (p.specs as string[]) || []
          }));
          return [...prev, { id: newMsgId, role: 'agent', type: 'products', products: mapped } as Message];
        }
        if (data.type === 'cart_summary') {
          return [...prev, { id: newMsgId, role: 'agent', type: 'cart_summary', cart: data.cart, total: data.total } as Message];
        }
        if (data.type === 'auth_request') {
          if (data.status === 'approved' || data.status === 'cancelled') {
            return prev.map(m => m.type === 'auth_request' ? { ...m, authStatus: data.status } : m);
          }
          setIsTyping(false);
          return [...prev, {
            id: newMsgId, role: 'agent', type: 'auth_request',
            authStatus: 'pending', cart: data.items, total: data.total
          } as Message];
        }
        if (data.type === 'payment_result') {
          setIsTyping(false);
          setOrderRefreshTrigger(prev => prev + 1); // Trigger sidebar update
          
          let paymentStatus: 'success' | 'failure' | 'pending_capture' = 'failure';
          if (data.order?.status === 'PAYMENT_CAPTURED') paymentStatus = 'success';
          else if (data.order?.status === 'created') paymentStatus = 'pending_capture';
          
          return [...prev, {
            id: newMsgId, role: 'agent', type: 'payment_result',
            paymentStatus,
            paymentAmount: data.order?.amount,
            orderRef: data.order?.order_id || data.order?.razorpay_order_id,
            paymentReason: data.order?.reason || data.order?.note
          } as Message];
        }
        return prev;
      });
    };

    eventSource.onerror = () => { setIsTyping(false); };
    return () => eventSource.close();
  }, [sessionId]);

  const handleAction = useCallback(async (
    actionType: string,
    payload?: { messageId?: string; passkeyToken?: string }
  ) => {
    if (actionType === 'approve_auth') {
      setIsTyping(true);
      setAgentEvents([]);
      try {
        await fetch(`http://localhost:3001/session/${sessionIdRef.current}/authorize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved: true, passkey_token: payload?.passkeyToken })
        });
      } catch (e) {
        console.error(e);
        setIsTyping(false);
      }
    }
    if (actionType === 'cancel_auth') {
      setMessages(prev => prev.map(m =>
        m.id === payload?.messageId ? { ...m, authStatus: 'cancelled' as const } : m
      ));
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'agent', type: 'text',
        content: 'Payment cancelled. Your cart is still saved — let me know if you want to make any changes.'
      } as Message]);
      try {
        await fetch(`http://localhost:3001/session/${sessionIdRef.current}/authorize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved: false })
        });
      } catch (_) { /* ignore */ }
    }
    
    if (actionType === 'verify_payment' && payload) {
      setIsTyping(true);
      try {
        await fetch(`http://localhost:3001/session/${sessionIdRef.current}/verify-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (e) {
        console.error("Payment verification failed", e);
        setIsTyping(false);
      }
    }
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(), role: 'user', type: 'text', content: text
    } as Message]);
    setIsTyping(true);
    setAgentEvents([]);

    try {
      await fetch(`http://localhost:3001/chat/message/${sessionIdRef.current}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
    } catch (e) {
      console.error(e);
      setIsTyping(false);
    }
  }, []);

  return {
    messages,
    agentEvents,
    isTyping,
    sendMessage,
    handleAction,
    sessionId,
    orderRefreshTrigger,
    mockScriptOptions: [
      'Show me a gaming laptop',
      'Show me noise cancelling headphones',
      'Add it to my cart',
      'I am ready to checkout'
    ]
  };
}
