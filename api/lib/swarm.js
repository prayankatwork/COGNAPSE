import Groq from 'groq-sdk';

export const extractJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        const cleaned = match[0]
          .replace(/\\u\{[a-fA-F0-9]+\}/g, '')
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        return JSON.parse(cleaned);
      }
    }
    throw new Error('NO_JSON_FOUND');
  }
};

/**
 * Get a Groq client (free-tier friendly).
 * Falls back to null if GROQ_API_KEY is not set.
 */
export function getGroqClient() {
  const groqKey = process.env.GROQ_API_KEY;
  return groqKey ? new Groq({ apiKey: groqKey }) : null;
}

/**
 * Get a second Groq client for multi-model consensus.
 * Uses GROQ_API_KEY_2 — a separate Groq account for running a different model in parallel.
 */
export function getGroqClient2() {
  const groqKey = process.env.GROQ_API_KEY_2;
  return groqKey ? new Groq({ apiKey: groqKey }) : null;
}

/**
 * runSwarm — Groq-only intelligence swarm.
 *
 * Free-tier routing:
 * - Deep research (requestedModel === 'ollama'): 70b model for quality
 * - Everything else: 8b model for speed & capacity
 * - Token-heavy prompts (>15K): fall back to 8b to stay within context limits
 *
 * Gemini was removed to eliminate API key dependency and stay fully
 * within Groq's free tier (30 req/min, 14,400 req/day for open models).
 */
export function getCerebrasClient() {
  const cerebrasKey = process.env.CEREBRAS_API_KEY || 'csk-fhkrdjc9dcwtmp9trx9edf8e5f233yr45556m8pp628ptjcr';
  return new Groq({ 
    apiKey: cerebrasKey, 
    baseURL: 'https://api.cerebras.ai/v1' 
  });
}

export async function runSwarm({ prompt, isJson, estTokens = 0, requestedModel = 'groq-llama-3.1-8b-instant', groqKey = 'primary', modelOverride }) {
  const groq = groqKey === 'secondary' ? getGroqClient2() : getGroqClient();
  const cerebras = getCerebrasClient();

  if (!groq) {
    const keyName = groqKey === 'secondary' ? 'GROQ_API_KEY_2' : 'GROQ_API_KEY';
    throw new Error(`${keyName} not configured. Set ${keyName} in your environment variables.`);
  }

  // If modelOverride is provided, use it directly — no fallback chain
  // Used for multi-model consensus where we want a specific secondary model
  if (modelOverride) {
    const temperature = modelOverride.includes('8b') ? 0.4 : 0.1;

    const activeClient = node.provider === 'cerebras' ? cerebras : groq;
      const response = await activeClient.chat.completions.create({
        messages: [{ role: 'user', content: finalPrompt }],
        model: node.model,
        temperature,
        response_format: isJson ? { type: 'json_object' } : undefined,
      });

    const content = response.choices[0]?.message?.content || '';
    if (content) {
      return {
        result: isJson ? JSON.stringify(extractJson(content)) : content,
        usage: {
          prompt_tokens: response.usage?.prompt_tokens || 0,
          completion_tokens: response.usage?.completion_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0,
          model: modelOverride,
        },
      };
    }

    throw new Error(`Secondary model ${modelOverride} returned empty response.`);
  }

  // Model selection based on context size and research depth
  const isDeepResearch = requestedModel === 'ollama';

  const swarmNodes = isDeepResearch
    ? [
        { name: 'groq-llama-3.3', model: 'llama-3.3-70b-versatile', provider: 'groq' },
        { name: 'cerebras-llama-3.1', model: 'llama3.1-70b', provider: 'cerebras' },
        { name: 'groq-llama-3.1', model: 'llama-3.1-8b-instant', provider: 'groq' },
      ]
    : estTokens > 15000
      ? [{ name: 'groq-llama-3.1', model: 'llama-3.1-8b-instant', provider: 'groq' }]
      : [
          { name: 'groq-llama-3.1', model: 'llama-3.1-8b-instant', provider: 'groq' },
          { name: 'cerebras-llama-3.1', model: 'llama3.1-8b', provider: 'cerebras' },
          { name: 'groq-llama-3.3', model: 'llama-3.3-70b-versatile', provider: 'groq' },
        ];

  let lastError = null;

  for (const node of swarmNodes) {
    try {
      let finalPrompt = prompt;
      // Prune very long prompts for 8b model context limits
      if (node.model.includes('8b') && estTokens > 5500) {
        finalPrompt = `${prompt.substring(0, 20000)}\n[System: Content Pruned for Stability]`;
      }

      // Higher temperature for 8b model encourages more detailed output
      const temperature = node.model.includes('8b') ? 0.4 : 0.1;

      const response = await groq.chat.completions.create({
        messages: [{ role: 'user', content: finalPrompt }],
        model: node.model,
        temperature,
        response_format: isJson ? { type: 'json_object' } : undefined,
      });

      const content = response.choices[0]?.message?.content || '';
      if (content) {
        return {
          result: isJson ? JSON.stringify(extractJson(content)) : content,
          usage: {
            prompt_tokens: response.usage?.prompt_tokens || 0,
            completion_tokens: response.usage?.completion_tokens || 0,
            total_tokens: response.usage?.total_tokens || 0,
            model: node.model,
          },
        };
      }
    } catch (e) {
      lastError = e;
    }
  }

  throw new Error(
    `INTELLIGENCE OVERLOAD: All Groq nodes saturated. Last error: ${lastError?.message || 'Unknown'}`
  );
}

/**
 * generateRag — Simplified Groq call specifically for RAG answer generation.
 * Uses llama-3.1-8b-instant for fast, cost-free answer generation.
 */
export async function generateRag(prompt) {
  const groq = getGroqClient();
  if (!groq) {
    throw new Error('GROQ_API_KEY not configured.');
  }

  // Prune very long prompts for 8b model context limits
  let finalPrompt = prompt;
  if (prompt.length > 20000) {
    finalPrompt = `${prompt.substring(0, 20000)}\n\n[System: Content truncated to fit context window. Some document context was omitted.]`;
  }

  try {
    const response = await groq.chat.completions.create({
      messages: [{ role: 'user', content: finalPrompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
      max_tokens: 1024,
    });

    const content = response.choices[0]?.message?.content || '';
    if (!content) {
      throw new Error('Groq returned empty response for RAG generation.');
    }

    return {
      result: content,
      usage: {
        prompt_tokens: response.usage?.prompt_tokens || 0,
        completion_tokens: response.usage?.completion_tokens || 0,
        total_tokens: response.usage?.total_tokens || 0,
        model: 'llama-3.1-8b-instant',
      },
    };
  } catch (e) {
    throw new Error(`Groq RAG generation failed: ${e.message || 'Unknown error'}`);
  }
}
