# Nexus Agentic Commerce — Project Architecture & Workflow Report

## 1. Project Overview
Nexus Agentic Commerce is a next-generation e-commerce platform where the primary user interface is a conversational AI agent. Instead of navigating traditional menus and category pages, users chat with an AI (powered by the Groq Qwen-27B model) to discover products, build a cart, and securely checkout. 

**Key Features:**
*   **Agentic Shopping:** AI strictly utilizes backend tools to fetch products and modify carts (no hallucination).
*   **WebAuthn Passkeys:** Frictionless, biometric (fingerprint/FaceID) payment authorization.
*   **State Machine Enforcement:** Strict transition states prevent bypassing authorization or double-charging.
*   **Real-time Streaming (SSE):** Instantaneous UI updates for product carousels, cart summaries, and live agent thinking traces.
*   **Revenue Recovery:** Graceful payment failure handling with 1-click retry flows.

---

## 2. Folder Structure
The repository is split into two completely decoupled monolithic halves:

### `backend/` (Node.js + Express)
*   `server.js` — Express entry point and middleware setup.
*   `src/agent/` — Core AI logic. `systemPrompt.js` (rules), `tools.js` (JSON schemas), `toolExecutor.js` (bridging AI to DB), `llmClient.js` (Groq API wrapper), `agentLoop.js` (orchestration).
*   `src/catalog/` — `catalogService.js` (fuzzy search, cross-selling), `seed.js` (66+ products).
*   `src/orders/` — `cartService.js` (SQLite cart management), `paymentService.js` (Razorpay integration), `orderStateMachine.js` (lifecycle enforcement).
*   `src/auth/` — `webauthnService.js` (Passkey registration/verification).
*   `src/db/` — `database.js` (SQLite tables for Products, Cart, Orders, Audit Logs, History, Passkeys).
*   `src/routes/` — REST endpoints for UI rehydration (`session.js`), initial streaming (`chat.js`), and passkeys (`auth.js`).

### `chat-ui/` (React + Vite + Tailwind CSS)
*   `src/hooks/useChatSimulation.ts` — The nervous system of the UI. Connects to SSE, intercepts backend events, and maintains local chat state/history.
*   `src/components/ChatInterface.tsx` — The 3-column layout orchestrator.
*   `src/components/ProductCarousel.tsx` — Renders UI cards dynamically from Unsplash images based on AI tool results.
*   `src/components/AuthRequestCard.tsx` — Handles the WebAuthn `navigator.credentials` biometric prompt.
*   `src/components/AgentThinkingPanel.tsx` & `AuditTrailModal.tsx` — Developer observability tools showing live tool inputs/outputs.
*   `src/components/PaymentResultCard.tsx` — Handles Razorpay success/failure states with "Modify Cart" and "Try Again" triggers.

---

## 3. How the Frontend, Backend, and Database Connect

1.  **Database Layer (SQLite):**
    We use `better-sqlite3` for lightning-fast, synchronous file-based data storage. The LLM **never** touches the DB directly. All queries are strictly parameterized inside backend services.
2.  **Backend Layer (Express + SSE):**
    When the user sends a message via `POST /chat/message`, the backend instantly returns a `202 Processing` response. It then fires up an asynchronous `agentLoop`. As the agent thinks and executes tools, the backend pumps updates (like `products` arrays or `cart_summary` updates) down a continuous Server-Sent Events (SSE) connection (`GET /chat/stream`).
3.  **Frontend Layer (React):**
    The React `useChatSimulation` hook listens to the SSE stream. Instead of trying to parse AI text, it listens for strongly-typed JSON events. When it receives a `products` event, it injects a `ProductCarousel` component directly into the chat feed, completely bypassing the AI's text generation.

---

## 4. How the "Agentic" Aspect Works

The AI is not just a chatbot answering questions; it is a **tool-calling agent**.

1.  **The Prompt & Tools:** The AI is given a strict `systemPrompt` (defining categories and rules) and an array of 9 JSON tool schemas (e.g., `search_products`, `add_to_cart`, `request_payment_authorization`).
2.  **The Loop:** 
    *   The user asks: *"Show me gaming laptops."*
    *   The AI recognizes it needs data. It responds not with text, but with a JSON tool call: `search_products({ category: "laptop", keywords: ["gaming"] })`.
    *   The `agentLoop` catches this. It pauses the AI and routes the call to `toolExecutor.js`.
    *   `toolExecutor.js` executes the SQLite query, emits the raw results down the SSE stream to the frontend (so the UI can draw the 3D product cards), and then returns the JSON results back to the AI.
    *   The AI reads the JSON results and finally generates text: *"Here are the gaming laptops I found for you..."*
3.  **Deterministic Cross-Selling:**
    When the AI calls `add_to_cart`, the backend intercepts it, updates the DB, and then **automatically** calls `getCrossSell()` in the background to find a matching accessory (e.g., a laptop bag for a laptop). It appends this suggestion to the AI's context so the AI can naturally say, *"Added! Would you also like a laptop bag?"*

---

## 5. Important Logic & Workflows

### The State Machine Workflow
To prevent the AI from hallucinating a successful checkout, orders must pass through a strict state machine:
`CART_BUILDING` ➔ `AWAITING_USER_APPROVAL` ➔ `AUTHORIZED` ➔ `PAYMENT_CREATED` ➔ `PAYMENT_CAPTURED` or `PAYMENT_FAILED`.
If the AI tries to call `create_payment` while still in `CART_BUILDING`, the backend immediately throws an error, which the AI sees and corrects.

### The Checkout & WebAuthn Workflow
1.  User says: *"I'm ready to checkout."*
2.  AI calls `request_payment_authorization`.
3.  Backend moves state to `AWAITING_USER_APPROVAL` and emits an `auth_request` to the UI.
4.  UI renders the `AuthRequestCard` with an **"Approve with Biometric"** button.
5.  User clicks. The browser triggers WebAuthn (FaceID/Windows Hello/Fingerprint).
6.  The biometric signature is sent to `POST /auth/auth-verify`. If valid, a 90-second secure token is issued.
7.  The UI sends `POST /session/:id/authorize` with the token. State moves to `AUTHORIZED`.
8.  The backend injects a synthetic system message to the AI: *"User has approved. Proceed with payment."*
9.  The AI calls `create_payment`. The backend charges the Razorpay API and returns success.

### Revenue Recovery Workflow
If the Razorpay API fails (or `SIMULATE_FAILURE=true` is set):
1.  State moves to `PAYMENT_FAILED`. 
2.  UI renders a red failure card with a **"Try Again"** button.
3.  Clicking "Try Again" injects a message to the AI, which calls the `retry_payment` tool.
4.  The state machine transitions safely back to `AWAITING_USER_APPROVAL`, requesting a fresh biometric authorization without losing the cart data.
