const db = require('../db/database');

// Maps LLM-supplied category names → our actual DB category values
const CATEGORY_ALIASES = {
  // audio
  'headphone': 'audio', 'headphones': 'audio',
  'earphone': 'audio', 'earphones': 'audio',
  'earbuds': 'audio', 'earbud': 'audio',
  'speaker': 'audio', 'speakers': 'audio',
  'audio': 'audio', 'sound': 'audio',
  'noise': 'audio', 'noise-cancelling': 'audio',
  'in-ear': 'audio', 'over-ear': 'audio', 'wireless': 'audio',
  // laptops
  'laptop': 'laptop', 'laptops': 'laptop',
  'notebook': 'laptop', 'computer': 'laptop', 'computers': 'laptop',
  'pc': 'laptop', 'gaming laptop': 'laptop',
  // accessories
  'mouse': 'wireless-mouse', 'mice': 'wireless-mouse',
  'keyboard': 'accessory', 'keyboards': 'accessory',
  'monitor': 'accessory', 'monitors': 'accessory',
  'bag': 'laptop-bag', 'sleeve': 'laptop-bag', 'backpack': 'laptop-bag',
  'case': 'carrying-case',
  'accessory': 'accessory', 'accessories': 'accessory',
  'charger': 'accessory',
  // mobile & gadgets
  'mobile': 'mobile', 'phone': 'mobile', 'smartphone': 'mobile', 'iphone': 'mobile',
  'tablet': 'tablet', 'ipad': 'tablet',
  'smartwatch': 'smartwatch', 'watch': 'smartwatch', 'wearable': 'smartwatch', 'fitness band': 'smartwatch',
  'powerbank': 'powerbank', 'battery': 'powerbank', 'power bank': 'powerbank'
};

function normaliseCategory(category) {
  if (!category) return null;
  const lower = category.toLowerCase().trim();
  return CATEGORY_ALIASES[lower] || lower; // best-effort
}

const WEIGHTS = {
  w1_budgetFit: 0.25,
  w2_useCaseMatch: 0.25,
  w3_valueScore: 0.20,
  w4_featureMatch: 0.15,
  w5_avgRating: 0.15
};

function calculateMultiFactorScore(product, { max_price, keywords, min_ram }, categoryMaxSpecPerRupee) {
  // 1. budgetFit: proximity to stated max price without exceeding it
  let budgetFit = 1.0;
  if (max_price !== undefined && max_price > 0) {
    if (product.price <= max_price) {
      budgetFit = product.price / max_price;
    } else {
      budgetFit = 0.0;
    }
  }

  // 2. useCaseMatch: tag/keyword overlap with extracted user intent
  let useCaseMatch = 1.0;
  if (keywords && Array.isArray(keywords) && keywords.length > 0) {
    const searchStr = `${product.name} ${product.description || ''} ${(product.tags || []).join(' ')}`.toLowerCase();
    const matchedCount = keywords.filter(k => searchStr.includes(k.toLowerCase())).length;
    useCaseMatch = matchedCount / keywords.length;
  }

  // 3. valueScore: spec-per-rupee normalized against category max
  const specScore = (product.ram_gb || 4) * 4 + (product.storage_gb || 64) / 16 + ((product.rating || 4.3) * 5);
  const specPerRupee = specScore / (product.price || 1);
  const valueScore = categoryMaxSpecPerRupee > 0 
    ? Math.min(1.0, specPerRupee / categoryMaxSpecPerRupee) 
    : 0.8;

  // 4. featureMatch: count of requested hard specs met/exceeded
  let totalHardSpecs = 0;
  let metHardSpecs = 0;
  if (min_ram !== undefined) {
    totalHardSpecs++;
    if ((product.ram_gb || 0) >= min_ram) metHardSpecs++;
  }
  if (max_price !== undefined) {
    totalHardSpecs++;
    if (product.price <= max_price) metHardSpecs++;
  }
  const featureMatch = totalHardSpecs > 0 ? (metHardSpecs / totalHardSpecs) : 1.0;

  // 5. avgRating: normalized rating out of 5.0
  const ratingVal = product.rating !== undefined && product.rating !== null ? product.rating : 4.3;
  const avgRating = Math.min(1.0, Math.max(0.0, ratingVal / 5.0));

  const totalScore = Number((
    WEIGHTS.w1_budgetFit * budgetFit +
    WEIGHTS.w2_useCaseMatch * useCaseMatch +
    WEIGHTS.w3_valueScore * valueScore +
    WEIGHTS.w4_featureMatch * featureMatch +
    WEIGHTS.w5_avgRating * avgRating
  ).toFixed(3));

  return {
    totalScore,
    breakdown: {
      totalPercent: Math.round(totalScore * 100),
      budgetFit: Math.round(budgetFit * 100),
      useCaseMatch: Math.round(useCaseMatch * 100),
      valueScore: Math.round(valueScore * 100),
      featureMatch: Math.round(featureMatch * 100),
      avgRating: Math.round(avgRating * 100),
      rating: ratingVal
    }
  };
}

function searchProducts({ category, max_price, keywords, min_ram }) {
  const normCat = normaliseCategory(category);

  // Build a broad SQL query — filter in JS for flexibility
  let query = 'SELECT * FROM Product WHERE 1=1';
  const params = {};

  if (normCat) {
    query += ' AND category = @category';
    params.category = normCat;
  }
  if (max_price !== undefined) {
    query += ' AND price <= @max_price';
    params.max_price = max_price;
  }
  if (min_ram !== undefined) {
    query += ' AND ram_gb >= @min_ram';
    params.min_ram = min_ram;
  }

  const stmt = db.prepare(query);
  let results = stmt.all(params);

  // Parse JSON tags
  results = results.map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') }));

  // If exact category found nothing, try a LIKE fallback across name+description+tags, BUT KEEP CONSTRAINTS
  if (results.length === 0 && category) {
    let fallbackQuery = "SELECT * FROM Product WHERE (name LIKE @kw OR description LIKE @kw OR tags LIKE @kw)";
    const fallbackParams = { kw: `%${category}%` };
    
    if (max_price !== undefined) {
      fallbackQuery += " AND price <= @max_price";
      fallbackParams.max_price = max_price;
    }
    if (min_ram !== undefined) {
      fallbackQuery += " AND ram_gb >= @min_ram";
      fallbackParams.min_ram = min_ram;
    }

    const fallback = db.prepare(fallbackQuery).all(fallbackParams);
    results = fallback.map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') }));
  }

  let filteredByKeywords = 0;
  // Keyword ranking/filter
  if (keywords && keywords.length > 0) {
    const originalLen = results.length;
    const filtered = results.filter(p => {
      const searchStr = `${p.name} ${p.description || ''} ${p.tags.join(' ')}`.toLowerCase();
      return keywords.some(k => searchStr.includes(k.toLowerCase()));
    });
    // Only apply filter if it keeps some results; otherwise keep all for scoring
    if (filtered.length > 0) {
      results = filtered;
      filteredByKeywords = originalLen - filtered.length;
    }
  }

  // Calculate category max spec-per-rupee for normalization
  let maxSpecPerRupee = 0;
  for (const p of results) {
    const specScore = (p.ram_gb || 4) * 4 + (p.storage_gb || 64) / 16 + ((p.rating || 4.3) * 5);
    const spr = specScore / (p.price || 1);
    if (spr > maxSpecPerRupee) maxSpecPerRupee = spr;
  }

  // Multi-Factor Recommendation Scoring
  results.forEach(p => {
    const { totalScore, breakdown } = calculateMultiFactorScore(
      p,
      { max_price, keywords, min_ram },
      maxSpecPerRupee
    );
    p.score = totalScore;
    p.scoreBreakdown = breakdown;
  });

  // Deterministic pre-sorting by score DESC, then id ASC (tie-breaker)
  results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.id.localeCompare(b.id);
  });

  const finalResults = results.slice(0, 8); // cap at 8 for UI
  
  return {
    items: finalResults,
    meta: {
      filtered_by_constraints: results.length - finalResults.length + filteredByKeywords,
      scoring_model: "w1(0.25)*budgetFit + w2(0.25)*useCaseMatch + w3(0.20)*valueScore + w4(0.15)*featureMatch + w5(0.15)*avgRating",
      top_scoring_breakdown: finalResults.slice(0, 3).map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        score: item.score,
        breakdown: item.scoreBreakdown
      }))
    }
  };
}


function getProductDetails(product_id) {
  const stmt = db.prepare('SELECT * FROM Product WHERE id = ?');
  const result = stmt.get(product_id);
  if (result) {
    result.tags = JSON.parse(result.tags);
  }
  return result;
}

const CROSS_SELL_MAP = {
  "laptop": ["laptop-bag", "wireless-mouse"],
  "audio": ["powerbank", "accessory"],
  "mobile": ["smartwatch", "powerbank"],
  "tablet": ["accessory", "powerbank"]
};

function getCrossSell(productId) {
  const product = getProductDetails(productId);
  if (!product) return null;
  
  const candidateCategories = CROSS_SELL_MAP[product.category] || [];
  if (candidateCategories.length === 0) return null;

  // Use parameterized IN clause
  const placeholders = candidateCategories.map(() => '?').join(',');
  const stmt = db.prepare(`SELECT * FROM Product WHERE category IN (${placeholders}) AND stock > 0 LIMIT 1`);
  const match = stmt.get(...candidateCategories);
  
  if (match) {
    match.tags = JSON.parse(match.tags);
  }
  return match || null;
}

module.exports = {
  searchProducts,
  getProductDetails,
  getCrossSell
};
