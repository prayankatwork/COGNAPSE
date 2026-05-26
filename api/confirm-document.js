import { applyCors, handleOptions } from './lib/cors.js';
import { sendSafeError } from './lib/errors.js';
import { requireUser } from './lib/auth.js';
import { getPremiumStatus } from './lib/premium.js';
import { getDocumentMetadata, saveDocumentMetadata } from './lib/storage.js';

export default async function handler(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  const { userId, documentId } = req.body || {};

  if (!userId || !documentId) {
    return res.status(400).json({ error: 'Missing required fields: userId, documentId' });
  }

  const uid = decoded?.uid || userId;

  // Check premium
  try {
    const premium = await getPremiumStatus(uid);
    if (!premium.premium) {
      return res.status(403).json({ error: 'Premium subscription required.', premiumRequired: true });
    }
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to verify premium status.', error);
  }

  try {
    const existing = await getDocumentMetadata(documentId);
    if (!existing) {
      return res.status(404).json({ error: 'Document record not found.' });
    }
    if (existing.userId !== uid) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    const updated = {
      ...existing,
      status: 'ready',
      updatedAt: new Date().toISOString(),
    };
    await saveDocumentMetadata(updated);

    return res.status(200).json({ success: true, document: updated });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to confirm document.', error);
  }
}
