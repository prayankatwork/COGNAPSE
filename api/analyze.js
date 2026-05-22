import { applyCors, handleOptions } from './lib/cors.js';
import { sendSafeError } from './lib/errors.js';
import { rateLimit } from './lib/rateLimit.js';
import { requireUser, assertUserIdMatches } from './lib/auth.js';
import { getPremiumStatus } from './lib/premium.js';
import { runSwarm } from './lib/swarm.js';

const ANALYZE_PROMPT = (text) => `You are the COGNAPSE Strategic Intelligence Analyst OS. Provide an extremely concise, high-impact strategic summary and takeaway of the following webpage text.
To conserve operational credits, keep the output highly condensed, ultra-concise, and straight-to-the-point using direct, premium analytical terminology.

Text to Analyze:
"${text}"

Return a strictly valid JSON response with these exact keys:
{
  "summary": "A highly condensed strategic summary of exactly 20-30 words (strictly 2 sentences max). Be extremely direct, concise, and dense.",
  "insight": "A single premium, high-impact key takeaway of exactly 10-15 words (strictly 1 sentence).",
  "confidence": "HIGH, MEDIUM, or LOW",
  "recommendation": "An extremely brief research direction of exactly 8-12 words."
}`;

export default async function handler(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  const rl = rateLimit(req, { key: 'analyze', limit: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded. Please try again shortly.' });
  }

  const { userId, text } = req.body || {};
  if (!userId || !text) {
    return res.status(400).json({ error: 'Missing userId or text parameter' });
  }
  if (text.length > 24_000) {
    return res.status(400).json({ error: 'Text exceeds maximum length for analysis' });
  }

  if (decoded && !assertUserIdMatches(decoded, userId)) {
    return res.status(403).json({ error: 'User ID does not match authenticated session' });
  }

  const uid = decoded?.uid || userId;

  try {
    const premium = await getPremiumStatus(uid);
    if (!premium.premium) {
      return res.status(403).json({ error: 'COGNAPSE Premium required for extension analysis.' });
    }

    const raw = await runSwarm({
      prompt: ANALYZE_PROMPT(text),
      isJson: true,
      estTokens: Math.ceil(text.length / 4),
    });
    const parsed = JSON.parse(raw);
    return res.status(200).json(parsed);
  } catch (error) {
    if (error.message === 'SERVER_DATABASE_NOT_CONFIGURED') {
      return res.status(503).json({ error: 'Analysis service is temporarily unavailable.' });
    }
    return sendSafeError(res, 500, error.message || 'Failed to process analysis.', error);
  }
}
