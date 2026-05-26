import { applyCors, handleOptions } from './lib/cors.js';
import { sendSafeError } from './lib/errors.js';
import { requireUser } from './lib/auth.js';
import { getPremiumStatus } from './lib/premium.js';
import { getFirestoreAdmin } from './lib/firebaseAdmin.js';
import { scoreChunks } from './lib/embedding.js';
import { generateRag } from './lib/swarm.js';

/**
 * POST /api/rag-answer
 *
 * Premium-gated RAG answer generation:
 * 1. Fetches all chunks for selected documents from Firestore
 * 2. Scores chunks against query using keyword similarity
 * 3. Constructs a RAG prompt with top-K chunks as context
 * 4. Calls Groq (llama-3.1-8b-instant) to generate a grounded answer
 *
 * Zero-cost: 0 embedding API calls + 1 Groq generation (free tier, 30 req/min).
 */
export default async function handler(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  const { userId, query, documentIds } = req.body || {};

  if (!userId || !query || !documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
    return res.status(400).json({
      error: 'Missing required fields: userId, query, documentIds (non-empty array)',
    });
  }

  const uid = decoded?.uid || userId;

  // Premium gate
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

  const overallStart = Date.now();

  try {
    // Step 1: Fetch all chunks for specified documents
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
        answer: 'No indexed document content found for the selected documents. Please upload and process documents first.',
        citations: [],
        chunksUsed: 0,
        latencyMs: Date.now() - overallStart,
      });
    }

    // Step 2: Score chunks against query using keyword similarity (no embedding API)
    const TOP_K = 8;
    const topResults = scoreChunks(
      query,
      allChunks.map((c) => ({
        content: c.content,
        index: c.index,
        documentId: c.documentId,
      })),
      TOP_K
    );

    // Filter to only meaningful matches
    const relevantChunks = topResults.filter((r) => r.score > 0.01);

    if (relevantChunks.length === 0) {
      return res.status(200).json({
        success: true,
        answer: 'No relevant content found in the selected documents for your query.',
        citations: [],
        chunksUsed: 0,
        latencyMs: Date.now() - overallStart,
      });
    }

    // Step 3: Build RAG prompt for Groq
    const contextText = relevantChunks
      .map(
        (c, i) =>
          `[CHUNK ${i + 1}] (relevance: ${(c.score * 100).toFixed(0)}% match)\n${c.content}`
      )
      .join('\n\n---\n\n');

    const prompt = `You are COGNAPSE Document Intelligence. Answer the user's question based STRICTLY on the provided document chunks below.

DOCUMENT CONTEXT:
${contextText}

USER QUESTION: ${query}

INSTRUCTIONS:
- Base your answer ONLY on the provided context. If the context doesn't contain enough information, say so clearly.
- Cite the specific chunk numbers you're drawing from using [1], [2], etc.
- Keep your answer concise, factual, and well-structured.
- Do not use any external knowledge — only what's in the chunks above.

ANSWER:`;

    // Step 4: Generate answer via Groq
    const { result: answerText } = await generateRag(prompt);

    // Step 5: Extract citations from chunk references
    const citations = [];
    const citationRegex = /\[(\d+)\]/g;
    let match;
    while ((match = citationRegex.exec(answerText)) !== null) {
      const chunkNum = parseInt(match[1], 10);
      if (chunkNum >= 1 && chunkNum <= relevantChunks.length) {
        const referenced = relevantChunks[chunkNum - 1];
        citations.push({
          documentId: referenced.documentId || '',
          excerpt: referenced.content.slice(0, 200),
          score: referenced.score,
        });
      }
    }

    // Deduplicate citations by documentId
    const uniqueCitations = [];
    const seen = new Set();
    for (const c of citations) {
      const key = c.documentId;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCitations.push(c);
      }
    }

    return res.status(200).json({
      success: true,
      answer: answerText,
      citations: uniqueCitations,
      chunksUsed: relevantChunks.length,
      latencyMs: Date.now() - overallStart,
    });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to generate RAG answer.', error);
  }
}
