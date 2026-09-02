# Razorpay Buildathon 2026 — Implementation Plan
### Track 1: AI Growth & Agentic Commerce (+ Track 3: Revenue Recovery, Phase 2)

---

## 1. About the Buildathon

Razorpay Buildathon 2026 (razorpay.com/buildathon) is Razorpay's competitive build challenge aimed at identifying strong AI/product builders — top performers are considered for the **AI Builder Intern** track. This is not a generic hackathon judged only on demo polish; Razorpay is evaluating candidates the way they'd evaluate a hire: can you reason about trust boundaries around money movement, and can you ship something that actually works end-to-end under a real payment API, not just a slide deck.

## 2. Track 1 — AI Growth & Agentic Commerce: What They Expect

The track is about building an **AI agent that can transact on a user's behalf** — not a chatbot that talks about products, but a system that can search a catalog, reason about what fits the user's need, build a cart, and complete a real payment, safely.

The implicit (and sometimes explicit) evaluation criteria for this kind of track are:

- **Agentic behavior, not scripted flow.** The LLM must genuinely decide which tool to call and when, based on conversation context — not a hardcoded if/else chatbot wearing an AI label.
- **Trust boundary discipline.** The LLM must never be the source of truth for price, stock, or payment state. Judges specifically probe this — e.g. trying to get the agent to hallucinate a discount or invent a product.
- **Real Razorpay integration.** Test-mode checkout using actual Razorpay APIs/SDKs, not a mocked "payment successful" screen.
- **Explicit authorization before spend.** The agent must not charge a user without a clear, auditable "yes" — this is both a safety requirement and a strong signal of product maturity.
- **Auditability/explainability.** A visible trail of what the agent decided and why, since this is core to trust in agentic commerce.
- **Graceful failure handling.** Payment failures, invalid input, and ambiguous requests should degrade sanely, not crash or hallucinate a fix.

## 3. Track 3 — Revenue Recovery: What It Adds (Phase 2, if time permits)

Revenue Recovery is about **failed or at-risk payments** — the agent should be able to diagnose *why* a payment failed (insufficient funds, expired card, network drop, etc.) and take a bounded, sensible recovery action (retry, suggest alternate payment method, nudge the user) without looping indefinitely or retrying in a way that could cause duplicate charges. It's a natural extension of Track 1's payment flow, which is why it's scoped as Phase 2 here rather than a separate build.

---

## 4. Our Overall Strategy

Given a **7–9 day solo build**, the strategy is: build one genuinely agentic, end-to-end, trustworthy commerce flow — rather than many shallow features. Depth and correctness on the trust boundary will outweigh breadth of features in judging.

**Core principle carried through every layer:** *the LLM proposes, the backend decides.* The model never touches the database or payment API directly — it emits structured tool calls; deterministic backend code validates, executes, and logs everything. This is the single idea the whole architecture is built around, and it's also the answer to almost any "what if the AI does X wrong" question a judge asks.

**Explicitly out of scope for the build (mentioned only as designed-for in the pitch):**
- Revenue Recovery is designed architecturally but only built if Phase 1 is solid with days to spare.
- No elaborate storefront UI — a clean chat interface is enough; the agent loop is the product, not the frontend.
- No large-scale catalog — a focused synthetic dataset (a few dozen products across 2–3 categories) is sufficient to demonstrate reasoning.

---

## 5. System Architecture

```
User (chat UI)
   │
   ▼
Agent Orchestrator (backend) ──┐
   │                           │  enforces: auth checks, schema
   ▼                           │  validation, state machine rules
LLM (tool-calling loop)        │
   │  emits tool_use            │
   ▼                           │
Tool Executor (backend) ◄──────┘
   │
   ├─► Catalog DB (search/stock/price — source of truth)
   ├─► Cart/Order state machine
   ├─► Razorpay Test-Mode API (order creation, payment capture)
   └─► Audit Log (every decision + tool call + result, timestamped)
```

**Key components:**

1. **Synthetic Merchant Catalog** — a small seeded database (JSON or SQLite) of products with fields like category, price, stock, specs. This is the only source of truth for anything the agent claims about a product.
2. **Tool Definitions** — a fixed set of schemas the LLM can call: `search_products`, `get_product_details`, `add_to_cart`, `view_cart`, `request_payment_authorization`, `create_payment`, `check_payment_status`.
3. **Agent Orchestrator** — the loop described earlier (send messages + tools → read `tool_use` → execute → append `tool_result` → repeat until `end_turn`). This is also where hard validation lives, e.g. refusing to execute `create_payment` unless state shows an approved authorization.
4. **Payment State Machine** — explicit states such as `CART_BUILDING → AWAITING_AUTHORIZATION → AUTHORIZED → PAYMENT_CREATED → PAYMENT_CAPTURED / PAYMENT_FAILED`. Transitions are enforced in code, not suggested by the LLM.
5. **Audit Trail** — a structured log (JSON lines is enough) recording every tool call, its input, its result, and the resulting state transition. This becomes both a debugging tool and a demo asset ("here's exactly what the agent decided and why").
6. **Razorpay Test-Mode Integration** — real Razorpay Orders API (test keys) to create an order and complete a test payment, so the flow is a genuine integration rather than a simulation.

---

## 6. End-to-End Workflow

**Step 1 — User expresses intent in natural language.**
E.g. "I need a laptop under ₹70,000, 16GB RAM, good for programming."

**Step 2 — Agent calls `search_products`.**
Intent extraction is fused into this call (see Section 7): the LLM fills the tool schema directly from the sentence. Backend applies hard filters (price, stock, RAM) and returns only real, validated catalog data.

**Step 3 — Agent presents results and reasons about fit.**
The LLM ranks/describes the returned products in natural language — it can only talk about what the tool actually returned, so it can't invent specs or prices.

**Step 4 — Cross-sell (optional, single rule for demo scope).**
A simple, deterministic rule (e.g. laptop → suggest a laptop bag or mouse) triggers a second tool call, keeping the "agentic, multi-step reasoning" quality visible without overbuilding.

**Step 5 — Cart building.**
`add_to_cart` / `view_cart` tool calls maintain cart state server-side — the LLM never holds the authoritative cart, it just asks for changes and reads back the current state.

**Step 6 — Explicit authorization gate.**
Before any money moves, the agent must call `request_payment_authorization`, which flips state to `AWAITING_USER_APPROVAL` and surfaces a clear confirmation prompt to the user (amount, items, total). Nothing proceeds without an explicit user "yes" — this is enforced in the orchestrator, not just implied by prompting.

**Step 7 — Payment execution.**
Only after approval does `create_payment` run, hitting the real Razorpay test-mode Orders API. The backend refuses this call outright if the state machine isn't in `AUTHORIZED`.

**Step 8 — Failure handling / recovery demo.**
A deliberately triggerable failure case (e.g. a test card that fails) demonstrates: payment fails → state moves to `PAYMENT_FAILED` → agent explains what happened in plain language → offers a bounded retry (this is also the natural seed for Phase 2 Revenue Recovery logic if time allows).

**Step 9 — Audit trail surfaced.**
The full decision trail for the session (searches, tool calls, authorization, payment result) is viewable — this is the explainability artifact judges will want to see.

---

## 7. Design Decisions Already Locked In

- **Intent extraction is fused into tool calls** (not a separate NLP/classifier pipeline) — the same tool-calling mechanism handles both "what does the user want" and "what should I do about it," which is simpler to build correctly in the available time and mechanically identical either way.
- **No LangChain/agent framework** — implementing the tool-calling loop directly against the Anthropic/OpenAI API, since the goal is to actually understand and demonstrate the mechanics, and a framework would abstract away exactly what needs to be shown.
- **Node/Express backend** — fastest to build given existing MERN fluency, and Razorpay's SDKs are Node-first.
- **Hard constraints vs. soft preferences separated in code** — e.g. price/stock/RAM are enforced with real filters; things like "lightweight" or "good for programming" only influence ranking, never filtering, so the LLM's imprecision can't produce a wrong result, only a suboptimal ranking.

---

## 8. What Gets Demonstrated in the Final Pitch

1. Live agent conversation: natural request → search → recommendation → cross-sell → cart → authorization → real test-mode payment.
2. A deliberate failure case, showing graceful handling and (if built) a recovery attempt.
3. The audit trail for that session, as proof of explainability.
4. The architecture diagram and trust-boundary explanation (LLM proposes / backend decides) as the core technical narrative — this is the answer to almost every "what if it goes wrong" question.
5. Revenue Recovery architecture shown as designed-for extension (Track 3), even if not fully built, demonstrating scope awareness under real constraints.
