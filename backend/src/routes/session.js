const express = require('express');
const { getCart, calculateTotal, clearCart } = require('../orders/cartService');
const { getState, transition, resetSession } = require('../orders/orderStateMachine');
const { getLogs, logEvent } = require('../audit/auditLogger');
const { emitEvent } = require('../streaming/sseManager');
const { runAgent } = require('../agent/agentLoop');
const db = require('../db/database');

const router = express.Router();

router.get('/:sessionId/cart', (req, res) => {
  const { sessionId } = req.params;
  res.json({ cart: getCart(sessionId), total: calculateTotal(sessionId) });
});

router.get('/:sessionId/state', (req, res) => {
  const { sessionId } = req.params;
  res.json({ state: getState(sessionId) });
});

router.get('/:sessionId/audit', (req, res) => {
  const { sessionId } = req.params;
  res.json({ logs: getLogs(sessionId) });
});

// Session history — returns messages + orders + cart for reconnect
router.get('/:sessionId/history', (req, res) => {
  const { sessionId } = req.params;
  try {
    const messages = db.prepare(
      'SELECT * FROM ConversationMessage WHERE session_id = ? ORDER BY id ASC'
    ).all(sessionId);

    const orders = db.prepare(
      'SELECT * FROM Orders WHERE session_id = ? ORDER BY created_at DESC'
    ).all(sessionId);

    const cart = getCart(sessionId);
    const state = getState(sessionId);

    res.json({ messages, orders, cart, sessionState: state, hasHistory: messages.length > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Orders list for sidebar
router.get('/:sessionId/orders', (req, res) => {
  const { sessionId } = req.params;
  try {
    const orders = db.prepare(
      'SELECT * FROM Orders WHERE session_id = ? ORDER BY created_at DESC'
    ).all(sessionId);
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:sessionId/authorize', (req, res) => {
  const { sessionId } = req.params;
  const { approved, passkey_token } = req.body;

  try {
    const currentState = getState(sessionId);
    if (currentState !== 'AWAITING_USER_APPROVAL') {
      return res.status(400).json({ error: `Cannot authorize in state ${currentState}` });
    }

    if (approved) {
      transition(sessionId, 'AUTHORIZED');
      logEvent(sessionId, 'user_authorization', { approved: true, passkey_verified: !!passkey_token });

      emitEvent(sessionId, 'auth_request', { status: 'approved' });
      runAgent(sessionId, 'User has approved the payment authorization. Please proceed with creating the payment.').catch(console.error);
    } else {
      transition(sessionId, 'CANCELLED');
      logEvent(sessionId, 'user_authorization', { approved: false });

      emitEvent(sessionId, 'auth_request', { status: 'cancelled' });
      runAgent(sessionId, 'User has denied the payment authorization. Do not create a payment. Let the user know the order is cancelled and their cart is still saved.').catch(console.error);
    }

    res.json({ success: true, state: getState(sessionId) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const { verifyPaymentSignature } = require('../orders/paymentService');

router.post('/:sessionId/verify-payment', (req, res) => {
  const { sessionId } = req.params;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  try {
    const isVerified = verifyPaymentSignature(sessionId, razorpay_order_id, razorpay_payment_id, razorpay_signature);
    
    if (isVerified) {
      // Find the final order details to emit
      const order = db.prepare('SELECT * FROM Orders WHERE razorpay_order_id = ?').get(razorpay_order_id);
      
      // Clear cart after successful capture so next shopping starts fresh
      clearCart(sessionId);
      // Reset state to CART_BUILDING so new orders can be placed
      try { transition(sessionId, 'CART_BUILDING'); } catch (_) {}

      // Emit the final success UI to the chat stream
      emitEvent(sessionId, 'payment_result', { order });
      
      // Also notify the agent so it can provide a nice confirmation and receipt
      runAgent(sessionId, `The payment for order ${razorpay_order_id} was successfully verified and captured! Generate a natural language order summary for the user and give them this receipt link: [Download Receipt](http://localhost:3001/session/${sessionId}/receipt/${razorpay_order_id})`).catch(console.error);

      res.json({ success: true, status: 'verified' });
    } else {
      res.status(400).json({ error: 'Signature verification failed' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Hard reset — clears cart, conversation history, resets state to CART_BUILDING
router.post('/:sessionId/reset', (req, res) => {
  try {
    const { sessionId } = req.params;
    resetSession(sessionId);
    logEvent(sessionId, 'session_reset', { reason: 'user_requested' });
    res.json({ success: true, state: 'CART_BUILDING' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:sessionId/receipt/:orderId', (req, res) => {
  const { sessionId, orderId } = req.params;
  const order = db.prepare('SELECT * FROM Orders WHERE session_id = ? AND razorpay_order_id = ?').get(sessionId, orderId);
  if (!order) return res.status(404).send("Order not found");

  const receiptText = `
========================================
       NEXUS COMMERCE - RECEIPT
========================================
Order ID: ${order.razorpay_order_id}
Payment ID: ${order.razorpay_payment_id || 'N/A'}
Date: ${order.created_at}
Status: ${order.status}

Amount Paid: ₹${(order.total_amount / 100).toLocaleString('en-IN')}

Thank you for shopping with Nexus!
========================================
  `.trim();

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename=receipt_${orderId}.txt`);
  res.send(receiptText);
});

module.exports = router;
