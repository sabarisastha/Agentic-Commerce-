const db = require('../db/database');
const { getProductDetails } = require('../catalog/catalogService');

function getCart(sessionId) {
  const stmt = db.prepare(`
    SELECT c.product_id, c.quantity, 
           COALESCE(c.price_at_add, p.price) as price, 
           p.price as current_price,
           p.name 
    FROM CartItem c
    JOIN Product p ON c.product_id = p.id
    WHERE c.session_id = ?
  `);
  return stmt.all(sessionId).map(item => ({
    productId: item.product_id,
    quantity: item.quantity,
    price: item.price,           // price when added
    current_price: item.current_price, // live price for comparison
    name: item.name
  }));
}

function addToCart(sessionId, productId, quantity) {
  const product = getProductDetails(productId);
  if (!product) throw new Error("Product not found");
  
  if (product.stock < quantity) throw new Error("Not enough stock available");

  const existingStmt = db.prepare('SELECT quantity FROM CartItem WHERE session_id = ? AND product_id = ?');
  const existing = existingStmt.get(sessionId, productId);

  if (existing) {
    const updateStmt = db.prepare('UPDATE CartItem SET quantity = quantity + ? WHERE session_id = ? AND product_id = ?');
    updateStmt.run(quantity, sessionId, productId);
  } else {
    const insertStmt = db.prepare('INSERT INTO CartItem (session_id, product_id, quantity, price_at_add) VALUES (?, ?, ?, ?)');
    insertStmt.run(sessionId, productId, quantity, product.price);
  }
  return getCart(sessionId);
}

function removeFromCart(sessionId, productId) {
  const deleteStmt = db.prepare('DELETE FROM CartItem WHERE session_id = ? AND product_id = ?');
  deleteStmt.run(sessionId, productId);
  return getCart(sessionId);
}

function calculateTotal(sessionId) {
  const stmt = db.prepare(`
    SELECT SUM(p.price * c.quantity) as total, SUM(c.quantity) as itemCount
    FROM CartItem c
    JOIN Product p ON c.product_id = p.id
    WHERE c.session_id = ?
  `);
  const result = stmt.get(sessionId);
  let total = result.total || 0;
  
  // Feature: Multi-item bundle awareness (10% off for 3+ items)
  if (result.itemCount >= 3) {
    total = Math.floor(total * 0.9);
  }
  
  return total;
}

function clearCart(sessionId) {
  db.prepare('DELETE FROM CartItem WHERE session_id = ?').run(sessionId);
}

module.exports = {
  getCart,
  addToCart,
  removeFromCart,
  calculateTotal,
  clearCart
};
