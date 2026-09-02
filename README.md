# 🛍️ Nexus Agentic Commerce

> An autonomous, secure, and revenue-optimizing AI Commerce Assistant built for the Razorpay Buildathon 2026.

Nexus is a next-generation AI shopping assistant that goes beyond simple chatbots. It operates on a strict **"LLM Proposes, Backend Disposes"** architecture, meaning the AI drives the conversational UI, but a hardened backend State Machine enforces strict cryptographic, stock, and payment trust boundaries. 

## ✨ Key Features & Differentiators

### 🧠 Agentic Commerce & Negotiation
- **Deterministic Multi-Factor Recommendation**: Product suggestions aren't randomly hallucinated by the LLM. The backend scores products dynamically using a deterministic algorithm: `w1*budgetFit + w2*useCaseMatch + w3*valueScore + w4*featureMatch + w5*avgRating`.
- **Proactive Alternatives**: If a strict constraint (e.g., "Mobile under 20k") yields zero results, the AI autonomously broadens the search to find entry-level alternatives (e.g., 29k) rather than dead-ending the user.
- **Smart Cross-Selling**: Context-aware accessory suggestions are visually offered (never auto-added) immediately after adding primary products to the cart.

### 🛡️ Ironclad Trust Boundaries & Security
- **Backend State Machine Guardrails**: The LLM is restricted from arbitrarily calling payment functions. The backend enforces strict state transitions (e.g., `CART_BUILDING` → `AWAITING_USER_APPROVAL` → `AUTHORIZED` → `PAYMENT_CAPTURED`). 
- **Visible Security Interventions**: If the AI attempts an unauthorized action (e.g., creating a payment without biometric approval, adding out-of-stock items, or price manipulation), the backend blocks it and emits a real-time **Security Barrier Enforced** alert directly to the Agent Thinking Panel.
- **Idempotent Checkouts**: Razorpay orders are securely linked to session states with strict cart-total validation to prevent double-charging or cart-mismatch exploits.
- **WebAuthn Biometric Gates**: High-value checkouts are gated behind Passkey / WebAuthn verification before the Razorpay gateway is even invoked.

### 📊 Real-Time Merchant Analytics
- **Live Database Sync**: A dedicated Merchant Dashboard aggregates live data from the Orders, Session, CartItem, and AuditLog tables.
- **Agentic Conversion Funnel**: Track sessions from initial queries → scored catalog searches → cart additions → biometric authorizations → captured payments.
- **Revenue Impact**: View AI-assisted revenue, average order value, bundle uptake rate (10% discount on 3+ items), and a ledger of recent cryptographically secured transactions.

---

## 🛠️ Technical Architecture

### Backend (Node.js / Express / SQLite)
- **Agent Loop:** Powered by Groq's `qwen/qwen3.8-27b` for high-speed, reliable tool calling.
- **Tool Executor:** Intercepts LLM tool calls (`search_products`, `add_to_cart`, `create_payment`) and routes them through local business logic and security validations.
- **Server-Sent Events (SSE):** Streams real-time AI reasoning, UI blocks (product carousels, payment cards), and trust-boundary interventions directly to the frontend.
- **Razorpay Integration:** Secure, idempotent `orders.create` and signature verification via HMAC SHA256.

### Frontend (React / Vite / Tailwind)
- **Dynamic Rendered UI:** Chat interfaces are no longer just text. The AI dynamically mounts rich React components (Carousels, Cart Summaries, Auth Cards) into the conversation stream based on SSE payloads.
- **Agent Trace / Thinking Panel:** A transparent developer/merchant console that exposes the LLM's internal reasoning, search scoring breakdowns, and security blocks in real-time.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Razorpay Test Account Keys
- Groq API Key

### 1. Backend Setup
\`\`\`bash
cd backend
npm install
# Create a .env file based on .env.example with RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, GROQ_API_KEY
node server.js
\`\`\`
*The backend runs on http://localhost:3001 and will auto-initialize the SQLite catalog database.*

### 2. Frontend Setup
\`\`\`bash
cd chat-ui
npm install
npm run dev
\`\`\`
*The frontend runs on http://localhost:5173.*

---

## 💡 The Pitch
For consumers, Nexus offers a friendly, highly-contextual personal shopper that understands their needs. For merchants and payment gateways, Nexus is a secure, revenue-driving engine that enforces strict cryptographical trust boundaries, ensuring that AI-driven commerce is both profitable and safe.
