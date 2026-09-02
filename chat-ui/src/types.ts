export type Step = {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done';
  icon?: string;
};

export type AgentEvent = {
  id: string;
  toolName: string;
  status: 'active' | 'done' | 'error';
  input?: Record<string, unknown>;
  output?: unknown;
  timestamp: number;
};

export type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  specs: string[];
  description?: string;
  brand?: string;
  stock?: number;
};

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

export type MessageType =
  | 'text'
  | 'products'
  | 'cart_summary'
  | 'auth_request'
  | 'payment_result';

export type Message = {
  id: string;
  role: 'user' | 'agent';
  type: MessageType;
  content?: string;
  products?: Product[];
  cart?: CartItem[];
  total?: number;
  paymentStatus?: 'success' | 'failure' | 'pending_capture';
  paymentAmount?: number;
  paymentReason?: string;
  orderRef?: string;
  authStatus?: 'pending' | 'approved' | 'cancelled';
  passkeyToken?: string;
};

export type Order = {
  id: string;
  razorpay_order_id?: string;
  total_amount: number;
  status: string;
  created_at: string;
};

declare global {
  interface Window {
    Razorpay: any;
  }
}
