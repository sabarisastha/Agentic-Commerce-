const express = require('express');
const { runAgent } = require('../agent/agentLoop');
const { addClient, removeClient } = require('../streaming/sseManager');

const router = express.Router();

router.get('/stream/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  addClient(sessionId, res);
  
  req.on('close', () => {
    removeClient(sessionId);
  });
});

router.post('/message/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  // Kick off the agent loop asynchronously
  // The SSE manager will handle sending events back to the client
  runAgent(sessionId, message).catch(console.error);
  
  res.status(202).json({ status: "processing" });
});

module.exports = router;
