import { applyCors, handleOptions } from './lib/cors.js';
import { sendSafeError } from './lib/errors.js';
import { requireUser } from './lib/auth.js';
import { getPremiumStatus } from './lib/premium.js';
import { getDocumentMetadata } from './lib/storage.js';
import { getFirestoreAdmin } from './lib/firebaseAdmin.js';
import { chunkText } from './lib/documentChunker.js';

/**
 * POST /api/store-document-chunks
 *
 * Premium-gated endpoint that:
 * 1. Accepts raw document text
 * 2. Chunks the text server-side
 * 3. Stores chunks in Firestore document_chunks collection (no embeddings)
 *
 * Zero-cost operation — no external API calls.
 * Embeddings are NOT stored; keyword scoring happens at query time via scoreChunks().
 */
export default async function handler(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  const { userId, documentId, text } = req.body || {};

  if (!userId || !documentId || !text) {
    return res.status(400).json({
      error: 'Missing required fields: userId, documentId, text',
    });
  }

  const uid = decoded?.uid || userId;

  // Premium gate
  try {
    const premium = await getPremiumStatus(uid);
    if (!premium.premium) {
      return res.status(403).json({
        error: 'Premium subscription required for document intelligence.',
        premiumRequired: true,
      });
    }
  } catch (error) {
    if (error.message === 'SERVER_DATABASE_NOT_CONFIGURED') {
      return res.status(503).json({
        error: 'Document processing is temporarily unavailable.',
      });
    }
    return sendSafeError(res, 500, 'Failed to verify premium status.', error);
  }

  // Verify document ownership
  try {
    const doc = await getDocumentMetadata(documentId);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }
    if (doc.userId !== uid) {
      return res.status(403).json({ error: 'Permission denied.' });
    }
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to verify document.', error);
  }

  const startTime = Date.now();

  try {
    // Step 1: Chunk the text
    const chunks = chunkText(text, { chunkSize: 2000, chunkOverlap: 200 });

    if (chunks.length === 0) {
      return res.status(400).json({ error: 'No text content to process.' });
    }

    // Step 2: Store chunks in Firestore (no embeddings — keyword search at query time)
    const db = getFirestoreAdmin();
    if (!db) throw new Error('SERVER_DATABASE_NOT_CONFIGURED');

    const batch = db.batch();
    const chunkCollection = db.collection('document_chunks');

    for (let i = 0; i < chunks.length; i++) {
      const chunkRef = chunkCollection.doc(`${documentId}_chunk_${chunks[i].index}`);
      batch.set(chunkRef, {
        documentId,
        userId: uid,
        content: chunks[i].content,
        index: chunks[i].index,
        createdAt: new Date().toISOString(),
      });
    }

    await batch.commit();

    // Update document status to indexed
    const docRef = db.collection('user_documents').doc(documentId);
    await docRef.update({
      status: 'indexed',
      chunkCount: chunks.length,
      indexedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const latencyMs = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      chunkCount: chunks.length,
      latencyMs,
    });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to process document chunks.', error);
  }
}
