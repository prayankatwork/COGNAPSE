/**
 * MASTER HEALTH REGISTRY
 */
const healthRegistry: Record<string, { status: 'stable' | 'unstable', lastFailure: number }> = {
  "ollama": { status: 'stable', lastFailure: 0 },
  "cloud-swarm": { status: 'stable', lastFailure: 0 }
};

const COOLDOWN_PERIOD = 1000 * 60 * 2;

const markUnstable = (node: string) => {
  healthRegistry[node] = { status: 'unstable', lastFailure: Date.now() };
};

const isStable = (node: string) => {
  const entry = healthRegistry[node];
  if (entry && entry.status === 'stable') return true;
  if (entry && Date.now() - entry.lastFailure > COOLDOWN_PERIOD) {
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

import { apiFetch } from './apiClient';
import { auth } from './firebase';

/**
 * PRODUCTION-READY INTELLIGENCE SWARM
 * Relies on Vercel Serverless Endpoint (/api/research) to hide API Keys
 */
export const callCloudAI = async (prompt: string, isJson = false, requestedModel = "gemini-1.5-flash") => {
  const estTokens = Math.ceil(prompt.length / 4);

  // Auto-revive unstable nodes
  Object.keys(healthRegistry).forEach(node => {
     if (healthRegistry[node].status === 'unstable' && Date.now() - healthRegistry[node].lastFailure > 45000) {
        healthRegistry[node].status = 'stable';
     }
  });

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const canUseLocal = !isMobile && isLocalHost;

  // 1. Try Local Acceleration First (if available and stable)
  if (canUseLocal && isStable("ollama")) {
    try {
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
    } catch (e: any) {
      console.warn("Local Ollama node failed, falling back to secure Cloud Swarm.");
      markUnstable("ollama");
    }
  }

  // 2. Call Vercel Serverless Backend (Secure API Keys)
  if (isStable("cloud-swarm")) {
    try {
      if (import.meta.env.PROD && !auth.currentUser) {
        throw new Error(
          'Sign in required to use cloud intelligence. Create a free account, or run COGNAPSE locally with Ollama for private offline research.'
        );
      }

      const response = await apiFetch('/api/research', {
        method: 'POST',
        body: JSON.stringify({ prompt, isJson, estTokens }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Serverless backend failed');
      }

      return data.result;
    } catch (e: any) {
      console.warn('Secure Cloud Swarm failed:', e);
      markUnstable('cloud-swarm');
      if (e?.message?.includes('Sign in required')) throw e;
    }
  }

  throw new Error(
    'INTELLIGENCE OVERLOAD: Cloud nodes are unavailable. Sign in for cloud research, or enable Local Acceleration via Ollama on your machine.'
  );
};

export const getSwarmHealth = () => healthRegistry;
export const resetSwarmHealth = () => {
  Object.keys(healthRegistry).forEach(node => {
    healthRegistry[node] = { status: 'stable', lastFailure: 0 };
  });
};
