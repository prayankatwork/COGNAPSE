import { applyCors, handleOptions } from './lib/cors.js';
import { sendSafeError } from './lib/errors.js';
import { requireUser, assertUserIdMatches } from './lib/auth.js';
import { getPremiumStatus } from './lib/premium.js';
import { listUserDocuments } from './lib/storage.js';

export default async function handler(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  const userId = req.query?.userId;
  const limit = Math.min(parseInt(req.query?.limit) || 50, 100);

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  if (decoded && !assertUserIdMatches(decoded, userId)) {
    return res
      .status(403)
      .json({ error: 'User ID does not match authenticated session' });
  }

  const uid = decoded?.uid || userId;

  // Check premium status
  try {
    const premium = await getPremiumStatus(uid);
    if (!premium.premium) {
      return res.status(403).json({
        error: 'Premium subscription required.',
        premiumRequired: true,
        documents: [],
      });
    }
  } catch (error) {
    if (error.message === 'SERVER_DATABASE_NOT_CONFIGURED') {
      // Allow reading from cache if premium was previously verified
      return res.status(503).json({
        error: 'Document service is temporarily unavailable.',
        documents: [],
      });
    }
    return sendSafeError(res, 500, 'Failed to verify premium status.', error);
  }

  try {
    const documents = await listUserDocuments(uid, limit);
    return res.status(200).json({ success: true, documents });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to list documents.', error);
  }
}
