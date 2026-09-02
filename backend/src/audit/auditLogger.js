const db = require('../db/database');

function logEvent(sessionId, eventType, data) {
  const stmt = db.prepare('INSERT INTO AuditLog (session_id, event_type, payload) VALUES (?, ?, ?)');
  stmt.run(sessionId, eventType, JSON.stringify(data));
  console.log(`[AUDIT] ${eventType} for session ${sessionId}`);
}

function getLogs(sessionId) {
  let stmt;
  let results;
  
  if (sessionId) {
    stmt = db.prepare('SELECT * FROM AuditLog WHERE session_id = ? ORDER BY timestamp ASC');
    results = stmt.all(sessionId);
  } else {
    stmt = db.prepare('SELECT * FROM AuditLog ORDER BY timestamp ASC');
    results = stmt.all();
  }
  
  return results.map(row => ({
    ...row,
    payload: (() => {
      try {
        return JSON.stringify(JSON.parse(row.payload), null, 2);
      } catch {
        return row.payload;
      }
    })()
  }));
}

module.exports = {
  logEvent,
  getLogs
};
