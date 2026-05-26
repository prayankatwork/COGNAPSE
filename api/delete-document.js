import { applyCors, handleOptions } from './lib/cors.js';
import { sendSafeError } from './lib/errors.js';
import { requireUser } from './lib/auth.js';
import { getPremiumStatus } from './lib/premium.js';
import {
  getDocumentMetadata,
  deleteDocumentMetadata,
} from './lib/storage.js';
import { getFirebaseAdmin } from './lib/firebaseAdmin.js';

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
    return res
      .status(400)
      .json({ error: 'Missing required fields: userId, documentId' });
  }

  const uid = decoded?.uid || userId;

  // Check premium
  try {
    const premium = await getPremiumStatus(uid);
    if (!premium.premium) {
      return res.status(403).json({
        error: 'Premium subscription required.',
        premiumRequired: true,
      });
    }
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to verify premium status.', error);
  }

  try {
    const doc = await getDocumentMetadata(documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    if (doc.userId !== uid) {
      return res
        .status(403)
        .json({ error: 'You do not have permission to delete this document.' });
    }

    // Attempt to delete from Firebase Storage if applicable
    try {
      const admin = getFirebaseAdmin();
      if (admin && doc.storagePath && !doc.storagePath.startsWith('firestore/')) {
        const bucket = admin.storage().bucket();
        await bucket.file(doc.storagePath).delete();
      }
    } catch (storageErr) {
      // Storage may not be configured — proceed with metadata cleanup
      console.warn('[Delete Document] Storage cleanup skipped:', storageErr?.message);
    }

    await deleteDocumentMetadata(documentId);

    return res.status(200).json({
      success: true,
      message: 'Document deleted successfully.',
    });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to delete document.', error);
  }
}
