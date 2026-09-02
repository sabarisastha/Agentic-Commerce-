const express = require('express');
const router = express.Router();
const { getMerchantAnalytics } = require('../merchant/analyticsService');

router.get('/analytics', (req, res) => {
  try {
    const data = getMerchantAnalytics();
    res.json(data);
  } catch (error) {
    console.error('Merchant analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
