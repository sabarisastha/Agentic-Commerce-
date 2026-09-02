const express = require('express');
const router = express.Router();
const {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  generateFallbackToken
} = require('../auth/webauthnService');

// Registration — first time passkey setup
router.get('/:sessionId/register-options', async (req, res) => {
  try {
    const opts = await getRegistrationOptions(req.params.sessionId);
    res.json(opts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:sessionId/register-verify', async (req, res) => {
  try {
    const result = await verifyRegistration(req.params.sessionId, req.body);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Authentication — before each payment
router.get('/:sessionId/auth-options', async (req, res) => {
  try {
    const opts = await getAuthenticationOptions(req.params.sessionId);
    res.json(opts);
  } catch (e) {
    // 404 means no passkey registered yet
    res.status(404).json({ error: e.message });
  }
});

router.post('/:sessionId/auth-verify', async (req, res) => {
  try {
    const result = await verifyAuthentication(req.params.sessionId, req.body);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/:sessionId/fallback-verify', (req, res) => {
  try {
    const { confirmed } = req.body;
    if (!confirmed) throw new Error("Explicit confirmation required");
    
    const token = generateFallbackToken(req.params.sessionId);
    res.json({ verified: true, token });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
