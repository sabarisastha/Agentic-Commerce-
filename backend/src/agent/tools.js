const tools = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Search the product catalog by category, price, and specs.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string" },
          max_price: { type: "number" },
          min_ram: { type: "number" },
          keywords: { type: "array", items: { type: "string" } }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "display_products",
      description: "Render a visual carousel of specific products in the chat UI. Call this AFTER searching to show the user exactly what you've decided are the best matches.",
      parameters: {
        type: "object",
        properties: {
          product_ids: { type: "array", items: { type: "string" }, description: "Array of product IDs to display" }
        },
        required: ["product_ids"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_product_details",
      description: "Get detailed information about a specific product by its ID.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string" }
        },
        required: ["product_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_to_cart",
      description: "Add a product to the user's cart.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string" },
          quantity: { type: "number" }
        },
        required: ["product_id", "quantity"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "view_cart",
      description: "View the contents of the user's cart.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "remove_from_cart",
      description: "Remove a product from the user's cart.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string" }
        },
        required: ["product_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "request_payment_authorization",
      description: "Request user authorization for payment based on the current cart. Does not charge anything.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_payment",
      description: "Create a payment for the authorized amount.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_payment_status",
      description: "Check the status of a payment by order ID.",
      parameters: {
        type: "object",
        properties: {
          order_id: { type: "string" }
        },
        required: ["order_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_cross_sell",
      description: "Given a product just added to cart, return one relevant accessory or complementary product suggestion from the catalog. Call this immediately after a successful add_to_cart.",
      parameters: {
        type: "object",
        properties: {
          product_id: { type: "string", description: "The product_id that was just added to cart" }
        },
        required: ["product_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "retry_payment",
      description: "Retry the payment after a failure. Only call this if the payment_result showed a failure AND the user has explicitly asked to retry. This will re-run payment authorization.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_order_history",
      description: "Look up all past orders made by the user in this session. Useful when the user asks 'what did I order' or wants a receipt for a past order.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  }
];

module.exports = tools;
