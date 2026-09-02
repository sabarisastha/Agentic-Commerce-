const Groq = require("groq-sdk");
require("dotenv").config({ path: require('path').resolve(__dirname, '../../.env') });

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || 'dummy_key_to_allow_boot',
});

// qwen/qwen3.8-27b: only reliable tool-calling model on this Groq account
// Rate limits handled by auto-retry backoff below
const MODEL = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function chat(messages, tools, retries = 3) {
  try {
    const startTime = Date.now();
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages,
      tools,
      tool_choice: "auto",
    });
    const latencyMs = Date.now() - startTime;

    const choice = response.choices[0];
    const message = choice.message;
    
    let text = message.content || "";
    let toolCalls = message.tool_calls || [];
    let finishReason = choice.finish_reason;

    return {
      text,
      toolCalls,
      finishReason,
      rawMessage: message,
      metrics: {
        latencyMs,
        totalTokens: response.usage?.total_tokens || 0
      }
    };
  } catch (error) {
    // Auto-retry on rate limit (429) with exponential backoff
    if (error?.status === 429 && retries > 0) {
      const waitMs = error?.headers?.['retry-after']
        ? parseFloat(error.headers['retry-after']) * 1000
        : 10000 * (4 - retries); // 10s, 20s, 30s
      console.warn(`[LLM] Rate limited. Retrying in ${waitMs}ms... (${retries} retries left)`);
      await sleep(waitMs);
      return chat(messages, tools, retries - 1);
    }
    console.error("LLM Client Error:", error);
    throw error;
  }
}

module.exports = {
  chat
};
