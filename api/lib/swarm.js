import { GoogleGenerativeAI } from '@google/generative-ai';
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

export function getSwarmClients() {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  return {
    genAI: geminiKey ? new GoogleGenerativeAI(geminiKey) : null,
    groq: groqKey ? new Groq({ apiKey: groqKey }) : null,
  };
}

export async function runSwarm({ prompt, isJson, estTokens = 0 }) {
  const { genAI, groq } = getSwarmClients();
  const swarmNodes =
    estTokens > 15000
      ? [
          { name: 'gemini-flash', type: 'gemini', model: 'gemini-1.5-flash' },
          { name: 'gemini-pro', type: 'gemini', model: 'gemini-1.5-pro' },
          { name: 'groq-llama-3.1', type: 'groq', model: 'llama-3.1-8b-instant' },
        ]
      : [
          { name: 'gemini-flash', type: 'gemini', model: 'gemini-1.5-flash' },
          { name: 'groq-llama-3.3', type: 'groq', model: 'llama-3.3-70b-versatile' },
          { name: 'gemini-pro', type: 'gemini', model: 'gemini-1.5-pro' },
          { name: 'groq-llama-3.1', type: 'groq', model: 'llama-3.1-8b-instant' },
        ];

  let lastError = null;

  for (const node of swarmNodes) {
    try {
      if (node.type === 'gemini' && genAI) {
        const genModel = genAI.getGenerativeModel({ model: node.model });
        const result = await genModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: isJson ? { responseMimeType: 'application/json' } : {},
        });
        const textResponse = (await result.response).text();
        if (textResponse) {
          return isJson ? JSON.stringify(extractJson(textResponse)) : textResponse;
        }
      }

      if (node.type === 'groq' && groq) {
        let finalPrompt = prompt;
        if (node.model.includes('8b') && estTokens > 5500) {
          finalPrompt = `${prompt.substring(0, 20000)}\n[System: Content Pruned for Stability]`;
        }
        const response = await groq.chat.completions.create({
          messages: [{ role: 'user', content: finalPrompt }],
          model: node.model,
          temperature: 0.1,
          response_format: isJson ? { type: 'json_object' } : undefined,
        });
        const content = response.choices[0]?.message?.content || '';
        if (content) {
          return isJson ? JSON.stringify(extractJson(content)) : content;
        }
      }
    } catch (e) {
      lastError = e;
    }
  }

  throw new Error(
    `INTELLIGENCE OVERLOAD: All cloud nodes are saturated. Last error: ${lastError?.message || 'Unknown'}`
  );
}
