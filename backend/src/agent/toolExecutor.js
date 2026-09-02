const { searchProducts, getProductDetails } = require('../catalog/catalogService');
const { getCart, addToCart, removeFromCart, calculateTotal } = require('../orders/cartService');
const { getState, transition } = require('../orders/orderStateMachine');
const { createPaymentOrder, checkPaymentStatus } = require('../orders/paymentService');
const { logEvent } = require('../audit/auditLogger');
const { emitEvent } = require('../streaming/sseManager');

async function executeTool(sessionId, toolName, input) {
  logEvent(sessionId, "tool_call", { name: toolName, input });
  
  emitEvent(sessionId, "status", { label: `Executing ${toolName}`, done: false });

  try {
    let result;
    switch (toolName) {
      case "search_products": {
        const searchRes = searchProducts(input);
        result = searchRes;
        // Always auto-emit so cards always show. LLM can call display_products for filtered override.
        if (searchRes.items && searchRes.items.length > 0) {
          emitEvent(sessionId, "products", { products: searchRes.items });
          if (searchRes.meta?.filtered_by_constraints > 0) {
            emitEvent(sessionId, 'status', {
              label: `🛡 Backend filtered: ${searchRes.meta.filtered_by_constraints} result(s) excluded (price/spec constraint)`,
              done: true
            });
          }
        } else {
          emitEvent(sessionId, "status", { label: `No products matched these filters. Try broadening the search.`, done: true });
        }
        break;
      }
      
      case "display_products": {
        const { getProductDetails } = require('../catalog/catalogService');
        const displayItems = input.product_ids.map(id => getProductDetails(id)).filter(Boolean);
        if (displayItems.length > 0) {
          emitEvent(sessionId, "products", { products: displayItems });
          result = { status: "displayed", count: displayItems.length };
        } else {
          result = { status: "failed", reason: "no valid products found" };
        }
        break;
      }
      
      case "get_product_details":
        result = getProductDetails(input.product_id);
        break;
        
      case "add_to_cart": {
        const addCart = addToCart(sessionId, input.product_id, input.quantity);
        const addTotalCount = addCart.reduce((acc, item) => acc + item.quantity, 0);
        const addNote = addTotalCount >= 3 ? "A 10% bundle discount has been automatically applied to the total!" : "Add 3 or more items to get a 10% bundle discount.";
        result = { items: addCart, discount_status: addNote };
        emitEvent(sessionId, "cart_summary", { cart: addCart, total: calculateTotal(sessionId) });
        break;
      }
        
      case "view_cart": {
        const viewCart = getCart(sessionId);
        const viewTotalCount = viewCart.reduce((acc, item) => acc + item.quantity, 0);
        const viewNote = viewTotalCount >= 3 ? "A 10% bundle discount has been automatically applied to the total!" : "Add 3 or more items to get a 10% bundle discount.";
        result = { items: viewCart, discount_status: viewNote };
        emitEvent(sessionId, "cart_summary", { cart: viewCart, total: calculateTotal(sessionId) });
        break;
      }
        
      case "remove_from_cart": {
        const rmCart = removeFromCart(sessionId, input.product_id);
        const rmTotalCount = rmCart.reduce((acc, item) => acc + item.quantity, 0);
        const rmNote = rmTotalCount >= 3 ? "A 10% bundle discount has been automatically applied to the total!" : "Add 3 or more items to get a 10% bundle discount.";
        result = { items: rmCart, discount_status: rmNote };
        emitEvent(sessionId, "cart_summary", { cart: rmCart, total: calculateTotal(sessionId) });
        break;
      }

      case "get_cross_sell": {
        emitEvent(sessionId, "status", { label: "Checking for related items", done: false });
        const crossSellProduct = require('../catalog/catalogService').getCrossSell(input.product_id);
        if (crossSellProduct) {
          emitEvent(sessionId, "products", { variant: "cross_sell", products: [crossSellProduct] });
          // Return explicit instruction so LLM never auto-adds the cross-sell
          result = { 
            found: true, 
            product: crossSellProduct,
            instruction: "SHOW THIS AS A SUGGESTION ONLY. Do NOT call add_to_cart on this product. Wait for explicit user confirmation."
          };
        } else {
          result = { found: false, reason: "no relevant cross-sell available" };
        }
        emitEvent(sessionId, "status", { label: "Finished checking related items", done: true });
        break;
      }
        
      case "request_payment_authorization":
        const cart = getCart(sessionId);
        if (cart.length === 0) throw new Error("Cart is empty");
        
        // Feature: Proactive Stock/Price-change Awareness
        const db = require('../db/database');
        for (const item of cart) {
          const dbProduct = db.prepare('SELECT stock, price FROM Product WHERE id = ?').get(item.productId);
          if (!dbProduct) throw new Error(`Product ${item.name} no longer exists in our catalog.`);
          if (dbProduct.stock < item.quantity) {
            throw new Error(`STOCK_ERROR: "${item.name}" is out of stock (Only ${dbProduct.stock} left). Please remove it from the cart or adjust quantity before proceeding.`);
          }
          // Compare price stored AT ADD TIME vs current live price
          if (item.current_price !== undefined && dbProduct.price !== item.price) {
            throw new Error(`PRICE_ERROR: The price for "${item.name}" has changed from ₹${item.price.toLocaleString('en-IN')} to ₹${dbProduct.price.toLocaleString('en-IN')}. Please review the updated cart and try again.`);
          }
        }
        
        const total = calculateTotal(sessionId);
        const currentState = getState(sessionId);
        const newState = transition(sessionId, "AWAITING_USER_APPROVAL");
        
        logEvent(sessionId, "state_transition", { from: currentState, to: newState, reason: "Requested payment auth" });
        
        // Emit auth_request to frontend to trigger approval card
        emitEvent(sessionId, "auth_request", { items: cart, total, status: "pending" });
        
        result = { status: "AWAITING_USER_APPROVAL", total, message: "Waiting for user to approve or deny via frontend UI." };
        break;
        
      case "create_payment":
        result = await createPaymentOrder(sessionId);
        emitEvent(sessionId, "payment_result", { order: result });
        break;
        
      case "check_payment_status":
        result = checkPaymentStatus(input.order_id);
        break;
        
      case "retry_payment": {
        const retryState = getState(sessionId);
        if (retryState !== 'PAYMENT_FAILED') {
          throw new Error(`Cannot retry payment from state ${retryState}. Payment must have failed first.`);
        }
        transition(sessionId, 'AWAITING_USER_APPROVAL');
        const retryCart = getCart(sessionId);
        const retryTotal = calculateTotal(sessionId);
        emitEvent(sessionId, 'auth_request', { items: retryCart, total: retryTotal, status: 'pending' });
        result = { status: 'AWAITING_USER_APPROVAL', message: 'Ready for re-authorization. Waiting for user approval.' };
        break;
      }

      case "check_order_history": {
        const db = require('../db/database');
        const orders = db.prepare('SELECT razorpay_order_id, total_amount, status, created_at FROM Orders WHERE session_id = ? ORDER BY created_at DESC').all(sessionId);
        result = orders.map(o => ({
          order_id: o.razorpay_order_id,
          total_amount: (o.total_amount || 0) / 100, // convert back to INR from paise
          status: o.status,
          date: o.created_at,
          receipt_url: `http://localhost:3001/session/${sessionId}/receipt/${o.razorpay_order_id}`
        }));
        break;
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
    
    emitEvent(sessionId, "status", { label: `Completed ${toolName}`, done: true });
    logEvent(sessionId, "tool_result", { name: toolName, result });
    
    return result;
  } catch (error) {
    let trustBoundaryMsg = null;
    if (error.message.includes("Cannot create payment") || error.message.includes("AUTHORIZED") || error.message.includes("state")) {
      trustBoundaryMsg = `🛡 Backend blocked: ${toolName} attempted in invalid state. Biometric authorization gate enforced.`;
    } else if (error.message.includes("STOCK_ERROR")) {
      trustBoundaryMsg = `🛡 Backend blocked: Real-time stock validation failed (${error.message.replace('STOCK_ERROR: ', '')})`;
    } else if (error.message.includes("PRICE_ERROR")) {
      trustBoundaryMsg = `🛡 Backend blocked: Price integrity protection triggered (${error.message.replace('PRICE_ERROR: ', '')})`;
    } else if (error.message.includes("Cart is empty")) {
      trustBoundaryMsg = `🛡 Backend blocked: Payment authorization rejected because Cart is empty.`;
    } else if (error.message.includes("Cannot retry payment")) {
      trustBoundaryMsg = `🛡 Backend blocked: Payment retry rejected (state conflict).`;
    }

    if (trustBoundaryMsg) {
      logEvent(sessionId, "trust_boundary_enforced", { tool: toolName, reason: trustBoundaryMsg, rawError: error.message });
      emitEvent(sessionId, "trust_boundary", {
        toolName,
        label: trustBoundaryMsg,
        reason: error.message,
        timestamp: Date.now()
      });
    }

    emitEvent(sessionId, "status", { label: `Failed ${toolName}: ${error.message}`, done: true });
    logEvent(sessionId, "tool_error", { name: toolName, error: error.message });
    throw error;
  }
}

module.exports = {
  executeTool
};
