import { applyCors, handleOptions } from './lib/cors.js';
import { sendSafeError } from './lib/errors.js';
import { rateLimit } from './lib/rateLimit.js';
import { requireUser } from './lib/auth.js';
import { requireAuth } from './lib/env.js';
import { runSwarm } from './lib/swarm.js';

export default async function handler(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  if (requireAuth && !decoded) {
    return res.status(401).json({
      error: 'Sign in required to use cloud intelligence. Local Ollama is available on desktop at localhost.',
    });
  }

  const limit = decoded ? 40 : 8;
  const rl = rateLimit(req, { key: 'research', limit, windowMs: 60_000 });
  if (!rl.allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded. Please try again shortly.' });
  }

  const { prompt, isJson, estTokens } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Missing prompt parameter' });
  }
  if (prompt.length > 120_000) {
    return res.status(400).json({ error: 'Prompt exceeds maximum length' });
  }

  try {
    const result = await runSwarm({
      prompt,
      isJson: !!isJson,
      estTokens: estTokens || Math.ceil(prompt.length / 4),
    });
    return res.status(200).json({ result });
  } catch (error) {
    return sendSafeError(res, 500, error.message || 'Failed to process AI research.', error);
  }
}
