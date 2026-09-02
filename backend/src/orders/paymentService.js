const Razorpay = require('razorpay');
const { v4: uuidv4 } = require('uuid');
const { logEvent } = require('../audit/auditLogger');
const { getState, transition } = require('./orderStateMachine');
const { calculateTotal } = require('./cartService');
const db = require('../db/database');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'test_key',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'test_secret',
});

async function createPaymentOrder(sessionId) {
  const currentState = getState(sessionId);
  if (currentState !== "AUTHORIZED") {
    throw new Error(`Cannot create payment. Order state must be AUTHORIZED, but is currently ${currentState}.`);
  }

  const amount = calculateTotal(sessionId) * 100;

  const existingStmt = db.prepare('SELECT razorpay_order_id, status, total_amount FROM Orders WHERE session_id = ? ORDER BY created_at DESC LIMIT 1');
  const existing = existingStmt.get(sessionId);
  
  // Idempotency: return existing order only if it's still pending and the amount hasn't changed.
  if (existing && existing.razorpay_order_id && existing.status === 'created') {
    if (existing.total_amount === amount) {
      return { order_id: existing.razorpay_order_id, amount: existing.total_amount, status: existing.status, note: "Returned existing order due to idempotency." };
    }
    // If amount changed, we need a new order. (In a real system, we'd mark the old one as voided).
  }
  
  const options = {
    amount,
    currency: "INR",
    receipt: `receipt_${sessionId}_${Date.now()}`
  };

  try {
    // SIMULATE_FAILURE flag for Revenue Recovery demo
    if (process.env.SIMULATE_FAILURE === 'true') {
      const isBankDecline = Math.random() > 0.5;
      const failReason = isBankDecline 
        ? "bank_decline: Issuer rejected transaction due to security policy"
        : "insufficient_funds: Card does not have enough balance";
        
      transition(sessionId, 'PAYMENT_FAILED');
      logEvent(sessionId, 'state_transition', { from: 'AUTHORIZED', to: 'PAYMENT_FAILED', reason: failReason });
      return { status: "payment_failed", reason: failReason };
    }

    const order = await razorpay.orders.create(options);

    const idempotencyKey = uuidv4();
    const insertStmt = db.prepare(`
      INSERT INTO Orders (id, session_id, razorpay_order_id, idempotency_key, total_amount, status) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertStmt.run(uuidv4(), sessionId, order.id, idempotencyKey, amount, order.status);

    const newState = transition(sessionId, 'PAYMENT_CREATED');
    logEvent(sessionId, 'state_transition', { from: 'AUTHORIZED', to: newState, reason: 'Order created in Razorpay' });

    return { order_id: order.id, amount: order.amount, status: order.status };
  } catch (error) {
    throw new Error(`Failed to create Razorpay order: ${error.message}`);
  }
}

function checkPaymentStatus(orderId) {
    if (orderId === "simulated_fail") {
        return { status: "failed", reason: "Test bank declined" };
    }
    const stmt = db.prepare('SELECT status FROM Orders WHERE razorpay_order_id = ?');
    const existing = stmt.get(orderId);
    return { status: existing ? existing.status : "created" };
}

const crypto = require('crypto');

function verifyPaymentSignature(sessionId, orderId, paymentId, signature) {
  const secret = process.env.RAZORPAY_KEY_SECRET || 'test_secret';
  
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(orderId + "|" + paymentId)
    .digest('hex');

  if (generatedSignature === signature) {
    db.prepare(`
      UPDATE Orders 
      SET status = 'PAYMENT_CAPTURED', razorpay_payment_id = ?, razorpay_signature = ? 
      WHERE razorpay_order_id = ? AND session_id = ?
    `).run(paymentId, signature, orderId, sessionId);
    
    transition(sessionId, 'PAYMENT_CAPTURED');
    logEvent(sessionId, 'payment_verified', { orderId, paymentId });
    return true;
  }
  
  return false;
}

module.exports = {
  createPaymentOrder,
  checkPaymentStatus,
  verifyPaymentSignature
};
