const clients = {}; // session_id -> response object

function addClient(sessionId, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  clients[sessionId] = res;
  
  // Send initial connected message
  emitEvent(sessionId, 'status', { label: 'Connected', done: true });
}

function removeClient(sessionId) {
  if (clients[sessionId]) {
    clients[sessionId].end();
    delete clients[sessionId];
  }
}

function emitEvent(sessionId, type, data) {
  const res = clients[sessionId];
  if (res) {
    const payload = { type, ...data };
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }
}

module.exports = {
  addClient,
  removeClient,
  emitEvent
};
