import { applyCors, handleOptions } from './lib/cors.js';
import { sendSafeError } from './lib/errors.js';
import { requireUser, assertUserIdMatches } from './lib/auth.js';
import { getPremiumStatus } from './lib/premium.js';

export default async function handler(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  const userId =
    req.method === 'POST' ? req.body?.userId : req.query?.userId;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (decoded && !assertUserIdMatches(decoded, userId)) {
    return res.status(403).json({ error: 'User ID does not match authenticated session' });
  }

  const uid = decoded?.uid || userId;

  try {
    const status = await getPremiumStatus(uid);
    return res.status(200).json(status);
  } catch (error) {
    if (error.message === 'SERVER_DATABASE_NOT_CONFIGURED') {
      return res.status(503).json({ error: 'Premium verification is temporarily unavailable.' });
    }
    return sendSafeError(res, 500, 'Failed to validate premium status.', error);
  }
}
