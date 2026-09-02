const tools = require('./tools');
const { executeTool } = require('./toolExecutor');
const systemPrompt = require('./systemPrompt');
const { emitEvent } = require('../streaming/sseManager');
const { chat } = require('./llmClient');
const db = require('../db/database');

function saveMessage(sessionId, msg) {
  db.prepare(`
    INSERT INTO ConversationMessage (session_id, role, content, tool_calls, tool_call_id, name)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    sessionId,
    msg.role,
    msg.content || null,
    msg.tool_calls ? JSON.stringify(msg.tool_calls) : null,
    msg.tool_call_id || null,
    msg.name || null
  );
}

function loadHistory(sessionId) {
  const rows = db.prepare(
    'SELECT * FROM ConversationMessage WHERE session_id = ? ORDER BY id ASC'
  ).all(sessionId);

  if (rows.length === 0) return null;

  return rows.map(r => {
    const msg = { role: r.role };
    if (r.content) msg.content = r.content;
    if (r.tool_calls) msg.tool_calls = JSON.parse(r.tool_calls);
    if (r.tool_call_id) msg.tool_call_id = r.tool_call_id;
    if (r.name) msg.name = r.name;
    return msg;
  });
}

// Keep system prompt + last N messages to stay within TPM limits
function trimHistory(history, maxMessages = 10) {
  const system = history.filter(m => m.role === 'system');
  const rest = history.filter(m => m.role !== 'system');
  const trimmed = rest.slice(-maxMessages);
  return [...system, ...trimmed];
}

async function runAgent(sessionId, userMessage) {
  // Load persisted history or start fresh
  let history = loadHistory(sessionId);

  if (!history) {
    history = [{ role: 'system', content: systemPrompt }];
    saveMessage(sessionId, { role: 'system', content: systemPrompt });
  }

  // Add new user message
  if (userMessage) {
    const userMsg = { role: 'user', content: userMessage };
    history.push(userMsg);
    saveMessage(sessionId, userMsg);
  }

  let continueLoop = true;

  while (continueLoop) {
    try {
      // Trim to last 10 messages to stay within 8K TPM limit
      const response = await chat(trimHistory(history), tools);

      if (response.metrics) {
        emitEvent(sessionId, 'metrics', response.metrics);
      }

      // Push assistant response to history and persist
      history.push(response.rawMessage);
      saveMessage(sessionId, response.rawMessage);

      if (response.finishReason === 'tool_calls' && response.toolCalls.length > 0) {
        for (const toolCall of response.toolCalls) {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            
            // Emit tool start
            emitEvent(sessionId, 'tool_event', {
              id: toolCall.id,
              toolName: toolCall.function.name,
              input: args,
              status: 'active'
            });

            const result = await executeTool(sessionId, toolCall.function.name, args);
            
            // Emit tool end with result
            emitEvent(sessionId, 'tool_event', {
              id: toolCall.id,
              toolName: toolCall.function.name,
              output: result,
              status: 'done'
            });

            const toolResultMsg = {
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify(result)
            };
            history.push(toolResultMsg);
            saveMessage(sessionId, toolResultMsg);
          } catch (error) {
            emitEvent(sessionId, 'tool_event', {
              id: toolCall.id,
              toolName: toolCall.function.name,
              output: { error: error.message },
              status: 'error'
            });
            const errMsg = {
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify({ error: error.message })
            };
            history.push(errMsg);
            saveMessage(sessionId, errMsg);
          }
        }
      } else {
        continueLoop = false;
        if (response.text) {
          emitEvent(sessionId, 'text', { text: response.text });
        }
      }
    } catch (error) {
      console.error('Agent error:', error);
      emitEvent(sessionId, 'text', { text: `System Error: ${error.message}` });
      continueLoop = false;
    }
  }
}

module.exports = { runAgent };
