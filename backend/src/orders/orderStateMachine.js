const db = require('../db/database');

const allowedTransitions = {
  CART_BUILDING: ["AWAITING_USER_APPROVAL"],
  AWAITING_USER_APPROVAL: ["AUTHORIZED", "CANCELLED"],
  AUTHORIZED: ["PAYMENT_CREATED", "CANCELLED"],
  PAYMENT_CREATED: ["PAYMENT_CAPTURED", "PAYMENT_FAILED", "CART_BUILDING"],
  PAYMENT_CAPTURED: ["CART_BUILDING"],
  PAYMENT_FAILED: ["AWAITING_USER_APPROVAL", "CANCELLED", "CART_BUILDING"],
  CANCELLED: ["CART_BUILDING"]
};

function getState(sessionId) {
  const stmt = db.prepare('SELECT state FROM Session WHERE id = ?');
  const result = stmt.get(sessionId);
  if (!result) {
    db.prepare('INSERT INTO Session (id, state) VALUES (?, ?)').run(sessionId, "CART_BUILDING");
    return "CART_BUILDING";
  }
  return result.state;
}

function transition(sessionId, toState) {
  const currentState = getState(sessionId);
  const allowed = allowedTransitions[currentState] || [];
  
  if (!allowed.includes(toState)) {
    throw new Error(`Invalid state transition from ${currentState} to ${toState}`);
  }
  
  const updateStmt = db.prepare('UPDATE Session SET state = ? WHERE id = ?');
  updateStmt.run(toState, sessionId);
  return toState;
}

// Full reset: clear cart + conversation + reset state to CART_BUILDING
function resetSession(sessionId) {
  db.prepare('DELETE FROM CartItem WHERE session_id = ?').run(sessionId);
  db.prepare('DELETE FROM ConversationMessage WHERE session_id = ?').run(sessionId);
  db.prepare('UPDATE Session SET state = ? WHERE id = ?').run('CART_BUILDING', sessionId);
}

module.exports = {
  getState,
  transition,
  resetSession
};
