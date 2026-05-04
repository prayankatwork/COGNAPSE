import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";

// Initialize Gemini safely
const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
const groqKey = import.meta.env.VITE_GROQ_API_KEY;

const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

// Initialize Groq safely
const groq = groqKey ? new Groq({
  apiKey: groqKey,
  dangerouslyAllowBrowser: true 
}) : null;

/**
 * MASTER HEALTH REGISTRY
 */
const healthRegistry: Record<string, { status: 'stable' | 'unstable', lastFailure: number }> = {
  "gemini-1.5-flash": { status: 'stable', lastFailure: 0 },
  "gemini-1.5-pro": { status: 'stable', lastFailure: 0 },
  "llama-3.3-70b-versatile": { status: 'stable', lastFailure: 0 },
  "llama-3.1-8b-instant": { status: 'stable', lastFailure: 0 },
  "ollama": { status: 'stable', lastFailure: 0 }
};

const COOLDOWN_PERIOD = 1000 * 60 * 2;

const markUnstable = (node: string) => {
  healthRegistry[node] = { status: 'unstable', lastFailure: Date.now() };
};

const isStable = (node: string) => {
  const entry = healthRegistry[node];
  if (entry.status === 'stable') return true;
  if (Date.now() - entry.lastFailure > COOLDOWN_PERIOD) {
    entry.status = 'stable';
    return true;
  }
  return false;
};

const extractJson = (text: string) => {
  try { return JSON.parse(text); } 
  catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } 
      catch (inner) {
        let cleaned = match[0].replace(/\\u\{[a-fA-F0-9]+\}/g, '').replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
        try { return JSON.parse(cleaned); } catch (last) { throw new Error("JSON_EXTRACTION_FAILED"); }
      }
    }
    throw new Error("NO_JSON_FOUND");
  }
};

const getLocalOllamaModel = async () => {
  try {
    const res = await fetch("http://127.0.0.1:11434/api/tags");
    const data = await res.json();
    const models = data.models?.map((m: any) => m.name) || [];
    if (models.includes("llama3:latest") || models.includes("llama3")) return "llama3";
    const anyLlama = models.find((m: string) => m.includes("llama"));
    return anyLlama || models[0] || "llama3";
  } catch (e) {
    return "llama3";
  }
};

/**
 * PRODUCTION-READY INTELLIGENCE SWARM
 */
export const callCloudAI = async (prompt: string, isJson = false, requestedModel = "gemini-1.5-flash") => {
  const estTokens = Math.ceil(prompt.length / 4);

  // Auto-revive unstable nodes
  Object.keys(healthRegistry).forEach(node => {
     if (healthRegistry[node].status === 'unstable' && Date.now() - healthRegistry[node].lastFailure > 45000) {
        healthRegistry[node].status = 'stable';
     }
  });

  const swarmQueue: string[] = [];
  if (estTokens > 15000) {
    swarmQueue.push("gemini-1.5-flash", "gemini-1.5-pro", "ollama", "llama-3.1-8b-instant");
  } else {
    swarmQueue.push("gemini-1.5-flash", "llama-3.3-70b-versatile", "gemini-1.5-pro", "ollama", "llama-3.1-8b-instant");
  }

  for (const node of swarmQueue) {
    if (!isStable(node)) continue;

    try {
      // GEMINI Node
      if (node.startsWith("gemini") && genAI) {
        const genModel = genAI.getGenerativeModel({ model: node });
        const result = await genModel.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: isJson ? { responseMimeType: "application/json" } : {}
        });
        const text = (await result.response).text();
        if (text) return isJson ? JSON.stringify(extractJson(text)) : text;
      }

      // GROQ Node
      if (node.startsWith("llama") && groq) {
        let finalPrompt = prompt;
        if (node.includes("8b") && estTokens > 5500) {
           finalPrompt = prompt.substring(0, 20000) + "\n[System: Content Pruned for Stability]";
        }
        const response = await groq.chat.completions.create({
          messages: [{ role: "user", content: finalPrompt }],
          model: node,
          temperature: 0.1, 
        });
        const content = response.choices[0]?.message?.content || "";
        return isJson ? JSON.stringify(extractJson(content)) : content;
      }

      // OLLAMA Node
      if (node === "ollama") {
        const localModel = await getLocalOllamaModel();
        const ollamaRes = await fetch("http://127.0.0.1:11434/api/generate", {
          method: "POST",
          body: JSON.stringify({ model: localModel, prompt, stream: false, format: isJson ? "json" : undefined }),
          signal: AbortSignal.timeout(90000)
        });
        if (ollamaRes.ok) {
          const data = await ollamaRes.json();
          return isJson ? JSON.stringify(extractJson(data.response)) : data.response;
        }
      }

    } catch (e: any) {
      markUnstable(node);
      continue; 
    }
  }

  throw new Error("INTELLIGENCE OVERLOAD: All public cloud nodes are currently saturated. For unlimited research, we recommend enabling 'Local Acceleration' via Ollama on your machine.");
};
