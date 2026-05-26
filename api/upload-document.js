import { applyCors, handleOptions } from './lib/cors.js';
import { sendSafeError } from './lib/errors.js';
import { requireUser, assertUserIdMatches } from './lib/auth.js';
import { getPremiumStatus } from './lib/premium.js';
import {
  generateUploadUrl,
  saveDocumentMetadata,
  classifyDocumentType,
  validateDocumentUpload,
} from './lib/storage.js';

export default async function handler(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  const { userId, fileName, mimeType, fileSize } = req.body || {};

  if (!userId || !fileName || !mimeType) {
    return res
      .status(400)
      .json({ error: 'Missing required fields: userId, fileName, mimeType' });
  }

  if (decoded && !assertUserIdMatches(decoded, userId)) {
    return res
      .status(403)
      .json({ error: 'User ID does not match authenticated session' });
  }

  const uid = decoded?.uid || userId;
  if (uid.startsWith('local_')) {
    return res.status(403).json({
      error: 'Document intelligence requires a cloud account. Register with an email to unlock.',
    });
  }

  // Premium gate: only premium users can upload documents
  try {
    const premium = await getPremiumStatus(uid);
    if (!premium.premium) {
      return res.status(403).json({
        error: 'Premium subscription required for Document Intelligence. Activate premium to upload and analyze documents.',
        premiumRequired: true,
      });
    }
  } catch (error) {
    if (error.message === 'SERVER_DATABASE_NOT_CONFIGURED') {
      return res.status(503).json({
        error: 'Premium verification is temporarily unavailable. Document uploads require premium.',
      });
    }
    return sendSafeError(res, 500, 'Failed to verify premium status.', error);
  }

  // Validate file
  const validation = validateDocumentUpload(fileSize || 0, mimeType);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  try {
    // Generate signed upload URL
    const uploadInfo = await generateUploadUrl(uid, fileName, mimeType);
    const documentType = classifyDocumentType(mimeType, fileName);

    const documentId = `doc_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    // Create metadata record
    const record = {
      id: documentId,
      userId: uid,
      originalName: fileName,
      mimeType,
      documentType,
      size: fileSize || 0,
      status: 'processing',
      storagePath: uploadInfo.storagePath,
      createdAt: now,
      updatedAt: now,
    };

    await saveDocumentMetadata(record);

    return res.status(200).json({
      success: true,
      documentId,
      uploadUrl: uploadInfo.uploadUrl,
      storageMethod: uploadInfo.method,
      uploadToken: uploadInfo.uploadToken || null,
      document: record,
    });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to initialize document upload.', error);
  }
}
