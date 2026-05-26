import { applyCors, handleOptions } from './lib/cors.js';
import { sendSafeError } from './lib/errors.js';
import { requireUser } from './lib/auth.js';
import { getPremiumStatus } from './lib/premium.js';
import { getDocumentMetadata, saveDocumentMetadata } from './lib/storage.js';

const MAX_CONTENT_SIZE = 5 * 1024 * 1024; // 5 MB base64 limit for Firestore

export default async function handler(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  const { userId, documentId, content, mimeType } = req.body || {};

  if (!userId || !documentId || !content) {
    return res.status(400).json({ error: 'Missing required fields: userId, documentId, content' });
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

  // Validate size
  const contentSize = Buffer.byteLength(content, 'utf-8');
  if (contentSize > MAX_CONTENT_SIZE) {
    return res.status(400).json({
      error: 'File too large for Firestore storage. Maximum 5 MB for base64 content.',
    });
  }

  try {
    const existing = await getDocumentMetadata(documentId);
    if (!existing) {
      return res.status(404).json({ error: 'Document record not found.' });
    }
    if (existing.userId !== uid) {
      return res.status(403).json({ error: 'Permission denied.' });
    }

    // Store content directly in the document metadata
    const updated = {
      ...existing,
      content, // base64 encoded content
      mimeType: mimeType || existing.mimeType,
      status: 'ready',
      updatedAt: new Date().toISOString(),
    };
    await saveDocumentMetadata(updated);

    // Return document without the content blob to keep response lean
    const { content: _, ...rest } = updated;
    return res.status(200).json({ success: true, document: rest });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to store document content.', error);
  }
}
