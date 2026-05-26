import { applyCors, handleOptions } from './lib/cors.js';
import { sendSafeError } from './lib/errors.js';
import { requireUser } from './lib/auth.js';
import { getPremiumStatus } from './lib/premium.js';
import { getFirestoreAdmin } from './lib/firebaseAdmin.js';
import { scoreChunks } from './lib/embedding.js';

/**
 * POST /api/query-document-chunks
 *
 * Premium-gated semantic search endpoint:
 * 1. Fetches all chunks for selected documents from Firestore
 * 2. Scores each chunk against the query using BM25-like keyword similarity
 * 3. Returns top-K most relevant chunks
 *
 * Zero-cost: no embedding API calls, uses lightweight text-only scoring.
 */
export default async function handler(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  const { userId, query, documentIds, topK = 5 } = req.body || {};

  if (!userId || !query || !documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
    return res.status(400).json({
      error: 'Missing required fields: userId, query, documentIds (non-empty array)',
    });
  }

  if (query.trim().length > 1000) {
    return res.status(400).json({ error: 'Query exceeds maximum length of 1000 characters.' });
  }

  const uid = decoded?.uid || userId;

  // Premium gate
  try {
    const premium = await getPremiumStatus(uid);
    if (!premium.premium) {
      return res.status(403).json({
        error: 'Premium subscription required.',
        premiumRequired: true,
        results: [],
      });
    }
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to verify premium status.', error);
  }

  const startTime = Date.now();

  try {
    // Step 1: Fetch all chunks for the specified documents
    const db = getFirestoreAdmin();
    if (!db) throw new Error('SERVER_DATABASE_NOT_CONFIGURED');

    const allChunks = [];
    for (const docId of documentIds) {
      const snapshot = await db
        .collection('document_chunks')
        .where('documentId', '==', docId)
        .where('userId', '==', uid)
        .orderBy('index', 'asc')
        .get();

      for (const doc of snapshot.docs) {
        allChunks.push({ id: doc.id, ...doc.data() });
      }
    }

    if (allChunks.length === 0) {
      return res.status(200).json({
        success: true,
        results: [],
        totalChunks: 0,
        latencyMs: Date.now() - startTime,
        message: 'No indexed chunks found for the selected documents.',
      });
    }

    // Step 2: Score chunks against query using keyword similarity (no embedding API)
    const topResults = scoreChunks(
      query,
      allChunks.map((c) => ({
        content: c.content,
        index: c.index,
        documentId: c.documentId,
      })),
      topK
    );

    const latencyMs = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      results: topResults.map((r) => ({
        chunkIndex: r.index,
        content: r.content,
        score: Number(r.score.toFixed(4)),
        documentId: r.documentId,
      })),
      totalChunks: allChunks.length,
      latencyMs,
    });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to search document chunks.', error);
  }
}
