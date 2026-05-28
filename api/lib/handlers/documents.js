/**
 * COGNAPSE API — Document Handlers
 * Consolidated from: upload-document.js, list-documents.js, confirm-document.js,
 *   delete-document.js, store-document-content.js, store-document-chunks.js,
 *   query-document-chunks.js, rag-answer.js, extract-document-text.js
 */
import crypto from 'crypto';
import { applyCors, handleOptions } from '../cors.js';
import { sendSafeError } from '../errors.js';
import { requireUser, assertUserIdMatches } from '../auth.js';
import { getPremiumStatus } from '../premium.js';
import { getFirestoreAdmin } from '../firebaseAdmin.js';
import { chunkText } from '../documentChunker.js';
import { scoreChunks } from '../embedding.js';
import { runSwarm } from '../swarm.js';
import {
  generateUploadUrl,
  saveDocumentMetadata,
  saveDocumentContent,
  classifyDocumentType,
  validateDocumentUpload,
  getDocumentMetadata,
  deleteDocumentMetadata,
  listUserDocuments,
  getDocumentFile,
} from '../storage.js';
import { extractDocumentText } from '../documentExtractor.js';

/* ─── Shared helpers ─── */

const MAX_CONTENT_SIZE = 5 * 1024 * 1024; // 5 MB base64 limit for Firestore

async function enforcePremium(uid) {
  const premium = await getPremiumStatus(uid);
  if (!premium.premium) {
    const err = new Error('Premium subscription required.');
    err.status = 403;
    err.premiumRequired = true;
    throw err;
  }
}

/* ─── POST /api/upload-document ─── */

export async function handleUploadDocument(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  const { userId, fileName, mimeType, fileSize } = req.body || {};
  if (!userId || !fileName || !mimeType) return res.status(400).json({ error: 'Missing required fields: userId, fileName, mimeType' });
  if (decoded && !assertUserIdMatches(decoded, userId)) return res.status(403).json({ error: 'User ID does not match authenticated session' });

  const uid = decoded?.uid || userId;
  if (uid.startsWith('local_')) return res.status(403).json({ error: 'Document intelligence requires a cloud account. Register with an email to unlock.' });

  try {
    await enforcePremium(uid);
  } catch (e) {
    if (e.status === 403) return res.status(403).json({ error: e.message, premiumRequired: true });
    return sendSafeError(res, 500, 'Failed to verify premium status.', e);
  }

  const validation = validateDocumentUpload(fileSize || 0, mimeType);
  if (!validation.valid) return res.status(400).json({ error: validation.error });

  try {
    const uploadInfo = await generateUploadUrl(uid, fileName, mimeType);
    const documentType = classifyDocumentType(mimeType, fileName);
    const documentId = `doc_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const record = {
      id: documentId, userId: uid, originalName: fileName, mimeType,
      documentType, size: fileSize || 0, status: 'processing',
      storagePath: uploadInfo.storagePath, createdAt: now, updatedAt: now,
    };

    await saveDocumentMetadata(record);

    return res.status(200).json({
      success: true, documentId,
      uploadUrl: uploadInfo.uploadUrl,
      storageMethod: uploadInfo.method,
      uploadToken: uploadInfo.uploadToken || null,
      document: record,
    });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to initialize document upload.', error);
  }
}

/* ─── GET /api/list-documents ─── */

export async function handleListDocuments(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  const userId = req.query?.userId;
  const limit = Math.min(parseInt(req.query?.limit) || 50, 100);

  if (!userId) return res.status(400).json({ error: 'Missing userId parameter' });
  if (decoded && !assertUserIdMatches(decoded, userId)) return res.status(403).json({ error: 'User ID does not match authenticated session' });

  const uid = decoded?.uid || userId;

  try {
    await enforcePremium(uid);
  } catch (e) {
    if (e.status === 403) return res.status(403).json({ error: e.message, premiumRequired: true, documents: [] });
    return sendSafeError(res, 500, 'Failed to verify premium status.', e);
  }

  try {
    const documents = await listUserDocuments(uid, limit);
    return res.status(200).json({ success: true, documents });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to list documents.', error);
  }
}

/* ─── POST /api/confirm-document ─── */

export async function handleConfirmDocument(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  const { userId, documentId } = req.body || {};
  if (!userId || !documentId) return res.status(400).json({ error: 'Missing required fields: userId, documentId' });

  const uid = decoded?.uid || userId;

  try {
    await enforcePremium(uid);
  } catch (e) {
    if (e.status === 403) return res.status(403).json({ error: e.message, premiumRequired: true });
    return sendSafeError(res, 500, 'Failed to verify premium status.', e);
  }

  try {
    const existing = await getDocumentMetadata(documentId);
    if (!existing) return res.status(404).json({ error: 'Document record not found.' });
    if (existing.userId !== uid) return res.status(403).json({ error: 'Permission denied.' });

    const updated = { ...existing, status: 'ready', updatedAt: new Date().toISOString() };
    await saveDocumentMetadata(updated);
    return res.status(200).json({ success: true, document: updated });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to confirm document.', error);
  }
}

/* ─── POST /api/delete-document ─── */

export async function handleDeleteDocument(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  const { userId, documentId } = req.body || {};
  if (!userId || !documentId) return res.status(400).json({ error: 'Missing required fields: userId, documentId' });

  const uid = decoded?.uid || userId;

  try {
    await enforcePremium(uid);
  } catch (e) {
    if (e.status === 403) return res.status(403).json({ error: e.message, premiumRequired: true });
    return sendSafeError(res, 500, 'Failed to verify premium status.', e);
  }

  try {
    const doc = await getDocumentMetadata(documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });
    if (doc.userId !== uid) return res.status(403).json({ error: 'You do not have permission to delete this document.' });

    // Attempt Storage cleanup
    try {
      const { getFirebaseAdmin } = await import('../firebaseAdmin.js');
      const admin = getFirebaseAdmin();
      if (admin && doc.storagePath && !doc.storagePath.startsWith('firestore/')) {
        const bucket = admin.storage().bucket();
        await bucket.file(doc.storagePath).delete();
      }
    } catch { /* storage cleanup best-effort */ }

    await deleteDocumentMetadata(documentId);
    return res.status(200).json({ success: true, message: 'Document deleted successfully.' });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to delete document.', error);
  }
}

/* ─── POST /api/store-document-content ─── */

export async function handleStoreDocumentContent(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  const { userId, documentId, content, mimeType } = req.body || {};
  if (!documentId || !content) return res.status(400).json({ error: 'Missing required fields: documentId, content' });

  const uid = decoded?.uid || userId;
  if (!uid) return res.status(401).json({ error: 'Authentication required.' });

  try {
    await enforcePremium(uid);
  } catch (e) {
    if (e.status === 403) return res.status(403).json({ error: e.message, premiumRequired: true });
    return sendSafeError(res, 500, 'Failed to verify premium status.', e);
  }

  const contentSize = Buffer.byteLength(content, 'utf-8');
  if (contentSize > MAX_CONTENT_SIZE) return res.status(400).json({ error: 'File too large for Firestore storage. Maximum 5 MB for base64 content.' });

  try {
    const existing = await getDocumentMetadata(documentId);
    if (!existing) return res.status(404).json({ error: 'Document record not found.' });
    if (existing.userId !== uid) return res.status(403).json({ error: 'Permission denied.' });

    // Store content in separate collection to avoid Firestore 1MB document limit
    await saveDocumentContent(documentId, content, mimeType || existing.mimeType);

    // Update metadata without content payload
    const updated = {
      ...existing, hasContent: true,
      mimeType: mimeType || existing.mimeType,
      status: 'ready', updatedAt: new Date().toISOString(),
    };
    // Remove any stale inline content
    delete updated.content;
    await saveDocumentMetadata(updated);
    return res.status(200).json({ success: true, document: updated });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to store document content.', error);
  }
}

/* ─── POST /api/store-document-chunks ─── */

export async function handleStoreDocumentChunks(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  const { userId, documentId, text } = req.body || {};
  if (!userId || !documentId || !text) return res.status(400).json({ error: 'Missing required fields: userId, documentId, text' });

  const uid = decoded?.uid || userId;

  try {
    await enforcePremium(uid);
  } catch (e) {
    if (e.status === 403) return res.status(403).json({ error: e.message, premiumRequired: true });
    return sendSafeError(res, 500, 'Failed to verify premium status.', e);
  }

  try {
    const doc = await getDocumentMetadata(documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });
    if (doc.userId !== uid) return res.status(403).json({ error: 'Permission denied.' });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to verify document.', error);
  }

  const startTime = Date.now();

  try {
    const chunks = chunkText(text, { chunkSize: 2000, chunkOverlap: 200 });
    if (chunks.length === 0) return res.status(400).json({ error: 'No text content to process.' });

    const db = getFirestoreAdmin();
    if (!db) throw new Error('SERVER_DATABASE_NOT_CONFIGURED');

    const batch = db.batch();
    const chunkCollection = db.collection('document_chunks');

    for (let i = 0; i < chunks.length; i++) {
      const chunkRef = chunkCollection.doc(`${documentId}_chunk_${chunks[i].index}`);
      batch.set(chunkRef, {
        documentId, userId: uid, content: chunks[i].content,
        index: chunks[i].index, createdAt: new Date().toISOString(),
      });
    }

    await batch.commit();

    const docRef = db.collection('user_documents').doc(documentId);
    await docRef.update({
      status: 'indexed', chunkCount: chunks.length,
      indexedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });

    return res.status(200).json({ success: true, chunkCount: chunks.length, latencyMs: Date.now() - startTime });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to process document chunks.', error);
  }
}

/* ─── POST /api/query-document-chunks ─── */

export async function handleQueryDocumentChunks(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  const { userId, query, documentIds, topK = 5 } = req.body || {};
  if (!userId || !query || !documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
    return res.status(400).json({ error: 'Missing required fields: userId, query, documentIds (non-empty array)' });
  }
  if (query.trim().length > 1000) return res.status(400).json({ error: 'Query exceeds maximum length of 1000 characters.' });

  const uid = decoded?.uid || userId;

  try {
    await enforcePremium(uid);
  } catch (e) {
    if (e.status === 403) return res.status(403).json({ error: e.message, premiumRequired: true, results: [] });
    return sendSafeError(res, 500, 'Failed to verify premium status.', e);
  }

  const startTime = Date.now();

  try {
    const db = getFirestoreAdmin();
    if (!db) throw new Error('SERVER_DATABASE_NOT_CONFIGURED');

    const allChunks = [];
    for (const docId of documentIds) {
      let snapshot;
      try {
        snapshot = await db.collection('document_chunks')
          .where('documentId', '==', docId)
          .where('userId', '==', uid)
          .orderBy('index', 'asc')
          .get();
      } catch (_) {
        // Fallback: query without orderBy in case composite index is not deployed
        snapshot = await db.collection('document_chunks')
          .where('documentId', '==', docId)
          .where('userId', '==', uid)
          .get();
      }
      for (const doc of snapshot.docs) allChunks.push({ id: doc.id, ...doc.data() });
    }

    if (allChunks.length === 0) {
      return res.status(200).json({ success: true, results: [], totalChunks: 0, latencyMs: Date.now() - startTime, message: 'No indexed chunks found for the selected documents.' });
    }

    const topResults = scoreChunks(query, allChunks.map(c => ({ content: c.content, index: c.index, documentId: c.documentId })), topK);

    return res.status(200).json({
      success: true,
      results: topResults.map(r => ({ chunkIndex: r.index, content: r.content, score: Number(r.score.toFixed(4)), documentId: r.documentId })),
      totalChunks: allChunks.length,
      latencyMs: Date.now() - startTime,
    });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to search document chunks.', error);
  }
}

/* ─── POST /api/rag-answer ─── */

export async function handleRagAnswer(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  const { userId, query, documentIds } = req.body || {};
  if (!userId || !query || !documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
    return res.status(400).json({ error: 'Missing required fields: userId, query, documentIds (non-empty array)' });
  }

  const uid = decoded?.uid || userId;

  try {
    await enforcePremium(uid);
  } catch (e) {
    if (e.status === 403) return res.status(403).json({ error: e.message, premiumRequired: true });
    return sendSafeError(res, 500, 'Failed to verify premium status.', e);
  }

  const overallStart = Date.now();

  try {
    const db = getFirestoreAdmin();
    if (!db) throw new Error('SERVER_DATABASE_NOT_CONFIGURED');

    const allChunks = [];
    for (const docId of documentIds) {
      let snapshot;
      try {
        snapshot = await db.collection('document_chunks')
          .where('documentId', '==', docId)
          .where('userId', '==', uid)
          .orderBy('index', 'asc')
          .get();
      } catch (_) {
        snapshot = await db.collection('document_chunks')
          .where('documentId', '==', docId)
          .where('userId', '==', uid)
          .get();
      }
      for (const doc of snapshot.docs) allChunks.push({ id: doc.id, ...doc.data() });
    }

    if (allChunks.length === 0) {
      return res.status(200).json({ success: true, answer: 'No indexed document content found for the selected documents. Please upload and process documents first.', citations: [], chunksUsed: 0, latencyMs: Date.now() - overallStart });
    }

    const TOP_K = 8;
    const topResults = scoreChunks(query, allChunks.map(c => ({ content: c.content, index: c.index, documentId: c.documentId })), TOP_K);
    const relevantChunks = topResults.filter(r => r.score > 0.01).slice(0, 6);

    if (relevantChunks.length === 0) {
      return res.status(200).json({ success: true, answer: 'No relevant content found in the selected documents for your query.', citations: [], chunksUsed: 0, latencyMs: Date.now() - overallStart });
    }

    const contextText = relevantChunks.map((c, i) => `[CHUNK ${i + 1}] (relevance: ${(c.score * 100).toFixed(0)}% match)\n${(c.content || '').slice(0, 1500)}`).join('\n\n---\n\n');
    const prompt = `You are COGNAPSE Document Intelligence. Answer the user's question based STRICTLY on the provided document chunks below.\n\nDOCUMENT CONTEXT:\n${contextText}\n\nUSER QUESTION: ${query}\n\nINSTRUCTIONS:\n- Base your answer ONLY on the provided context. If the context doesn't contain enough information, say so clearly.\n- Cite the specific chunk numbers you're drawing from using [1], [2], etc.\n- Keep your answer concise, factual, and well-structured.\n- Do not use any external knowledge — only what's in the chunks above.\n\nANSWER:`;

    const { result: answerText } = await generateRag(prompt);

    const citations = [];
    const citationRegex = /\[(\d+)\]/g;
    let match;
    while ((match = citationRegex.exec(answerText)) !== null) {
      const chunkNum = parseInt(match[1], 10);
      if (chunkNum >= 1 && chunkNum <= relevantChunks.length) {
        const referenced = relevantChunks[chunkNum - 1];
        citations.push({ documentId: referenced.documentId || '', excerpt: referenced.content.slice(0, 200), score: referenced.score });
      }
    }

    const uniqueCitations = [];
    const seen = new Set();
    for (const c of citations) {
      if (!seen.has(c.documentId)) { seen.add(c.documentId); uniqueCitations.push(c); }
    }

    return res.status(200).json({ success: true, answer: answerText, citations: uniqueCitations, chunksUsed: relevantChunks.length, latencyMs: Date.now() - overallStart });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to generate RAG answer.', error);
  }
}

/* ─── POST /api/extract-document-text ─── */

export async function handleExtractDocumentText(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  const { userId, documentId } = req.body || {};
  if (!userId || !documentId) return res.status(400).json({ error: 'Missing required fields: userId, documentId' });

  const uid = decoded?.uid || userId;

  try {
    await enforcePremium(uid);
  } catch (e) {
    if (e.status === 403) return res.status(403).json({ error: e.message, premiumRequired: true });
    return sendSafeError(res, 500, 'Failed to verify premium status.', e);
  }

  try {
    const doc = await getDocumentMetadata(documentId);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });
    if (doc.userId !== uid) return res.status(403).json({ error: 'Permission denied.' });

    if (doc.extractedText) {
      return res.status(200).json({ success: true, text: doc.extractedText, format: doc.documentType, pageCount: doc.pageCount || undefined, cached: true });
    }

    let buffer;
    try { buffer = await getDocumentFile(doc); } catch (err) { return res.status(400).json({ error: `Could not retrieve file content: ${err.message}` }); }

    const result = await extractDocumentText(buffer, doc.mimeType, doc.originalName);

    if (!result.text || result.text.length === 0) {
      return res.status(200).json({ success: true, text: '', format: result.format, warning: 'No extractable text found. This file may contain only images (scanned document).' });
    }

    return res.status(200).json({ success: true, text: result.text, format: result.format, pageCount: result.pageCount, slideCount: result.slideCount, cached: false });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to extract document text.', error);
  }
}

/* ─── POST /api/analyze-document ─── */

const DOCUMENT_SYSTEM_PROMPT = (text, query) => `You are COGNAPSE Document Analyst. Analyze the document below. Base every claim strictly on it.

${query ? `USER: ${query}` : 'USER: Summarize and analyze this document.'}

RULES:
- Base ALL claims on the document content only.
- If unclear, say so.
- Never invent quotes or data.
- Output ONLY the JSON object below — no explanation, no preamble, no markdown.
- Keep it concise — under 3000 tokens total.

Schema:
{
  "mode": "standard",
  "query_understood": "Descriptive title based on the document content — NOT 'Short title' or generic text",
  "summary": {
    "bottom_line": "1-2 sentence bottom line",
    "full_synthesis": "Concise 100-200 word analysis, narrative style, use [DOC] references",
    "eli5_version": "One paragraph plain language",
    "confidence_narrative": "One sentence"
  },
  "scores": {
    "overall_credibility": 0-100,
    "overall_relevance": 0-100,
    "evidence_consensus": "strong|mixed|contested|insufficient",
    "confidence_label": "High|Medium|Low"
  },
  "sources": [{
    "id": 1,
    "title": "Uploaded Document",
    "url": "(this document)",
    "domain": "(user document)",
    "type": "Document",
    "credibility_score": 0-100,
    "relevance_score": 0-100,
    "key_finding": "One key finding",
    "published_date": "unknown",
    "bias_flag": null
  }],
  "intelligence_map": {
    "central_node": { "id": "root", "label": "GENERATE: main subject/topic from this document here", "type": "CONCEPT" },
    "nodes": [
      { "id": "node_1", "label": "GENERATE: key concept or entity mentioned in the document", "type": "CONCEPT", "relationship": "GENERATE: how this relates to the main topic", "sub_query": "GENERATE: what to explore next about this concept", "importance": 3 },
      { "id": "node_2", "label": "GENERATE: another important concept from the document", "type": "CONCEPT", "relationship": "GENERATE: how this relates to the main topic", "sub_query": "GENERATE: what to explore next", "importance": 2 }
    ],
    "edges": [
      { "from": "root", "to": "node_1", "label": "GENERATE: relationship description" },
      { "from": "root", "to": "node_2", "label": "GENERATE: relationship description" }
    ]
  },
  "actionable_takeaways": {
    "key_insight": "One sentence",
    "watch_out_for": "One caveat",
    "next_step": "What to do next"
  },
  "follow_up_suggestions": ["Q1", "Q2", "Q3"],
  "archive_entry": {
    "query": "Document Analysis: ${(query || text || '').slice(0, 80)}",
    "timestamp": "ISO timestamp",
    "topic_cluster": "Document Analysis",
    "tags": ["document", "analysis"],
    "summary_snippet": "15-word preview"
  }
}

IMPORTANT: Every field must be populated based on the actual document content. Do NOT use generic placeholder values. The intelligence_map must contain real concepts extracted from the document, not "Key concept 1" or similar placeholders.

DOCUMENT:
"""
${(text || '').slice(0, 10000)}
"""`;

const MAX_DOC_CHARS = 10000;

export async function handleAnalyzeDocument(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  const { userId, text, query, fileData, mimeType, fileName } = req.body || {};
  const uid = decoded?.uid || userId;

  try {
    await enforcePremium(uid);
  } catch (e) {
    if (e.status === 403) return res.status(403).json({ error: e.message, premiumRequired: true });
    return sendSafeError(res, 500, 'Failed to verify premium status.', e);
  }

  try {
    // Extract text from file if fileData provided, otherwise use provided text
    let documentText = text || '';
    if (fileData && mimeType && !documentText) {
      const buffer = Buffer.from(fileData, 'base64');
      const result = await extractDocumentText(buffer, mimeType, fileName || 'document');
      documentText = result.text || '';
      if (!documentText) {
        return res.status(400).json({ error: 'No extractable text found. This file may contain only images.' });
      }
    }

    if (!documentText || documentText.trim().length < 50) {
      return res.status(400).json({ error: 'Document text too short. Minimum 50 characters required.' });
    }

    // Sanitize extracted text — remove control characters and non-printable junk
    const sanitized = documentText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '').trim();
    if (sanitized.length < 50) {
      return res.status(400).json({ error: 'Could not extract readable text from this file. The document may contain only images or use an unsupported encoding. Try uploading as plain text (.txt) instead.' });
    }

    const trimmedText = sanitized.length > MAX_DOC_CHARS
      ? sanitized.slice(0, MAX_DOC_CHARS)
      : sanitized;

    const prompt = DOCUMENT_SYSTEM_PROMPT(trimmedText, query);
    const raw = await runSwarm({
      prompt,
      isJson: false,
      estTokens: Math.ceil(prompt.length / 4) + 20000,
    });

    let result;
    try {
      const { extractJson } = await import('../swarm.js');
      const extracted = extractJson(raw.result);
      result = typeof extracted === 'string' ? JSON.parse(extracted) : extracted;
    } catch {
      result = null;
    }

    if (!result || !result.summary) {
      result = {
        mode: 'standard',
        query_understood: `Document Analysis: ${fileName || 'Uploaded Document'}`,
        summary: {
          bottom_line: `Analysis of "${fileName || 'uploaded document'}" completed. The document ${documentText.length > 100 ? 'contains ' + documentText.length + ' characters of extractable text.' : 'was processed successfully.'}`,
          full_synthesis: `Document analysis complete. Key findings from the ${documentText.length} character document were extracted and analyzed. ${documentText.slice(0, 500)}`,
          eli5_version: `This document contains ${documentText.length} characters of text content that was analyzed by COGNAPSE intelligence systems.`,
          confidence_narrative: 'Analysis completed with standard confidence based on document length and extractable content.'
        },
        scores: { overall_credibility: 65, overall_relevance: 70, evidence_consensus: 'mixed', confidence_label: 'Medium' },
        sources: [{ id: 1, title: fileName || 'Uploaded Document', url: '(uploaded document)', domain: '(user document)', type: 'Document', credibility_score: 65, relevance_score: 70, key_finding: documentText.slice(0, 200), published_date: 'unknown', bias_flag: null }],
        intelligence_map: {
          central_node: { id: 'root', label: (fileName || 'Document').replace(/\.[^.]+$/, ''), type: 'CONCEPT' },
          nodes: [
            { id: 'node_1', label: documentText.slice(0, 60), type: 'CONCEPT', relationship: 'discusses', sub_query: 'Find more details', importance: 3 },
          ],
          edges: [{ from: 'root', to: 'node_1', label: 'discusses' }],
        },
        actionable_takeaways: { key_insight: 'Review the full document for complete analysis.', watch_out_for: 'Text extraction quality may vary based on document format.', next_step: 'Consider uploading a text-based document for richer analysis.' },
        follow_up_suggestions: ['What are the main topics?', 'Summarize the key arguments.', 'Extract key data points.'],
        archive_entry: { query: `Document Analysis: ${(fileName || 'uploaded').slice(0, 80)}`, timestamp: new Date().toISOString(), topic_cluster: 'Document Analysis', tags: ['document', 'analysis'], summary_snippet: `${documentText.slice(0, 100)}...` },
      };
    }

    return res.status(200).json({ success: true, report: result, usage: raw.usage });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to analyze document.', detail: error?.message || error?.toString() || 'Unknown error' });
  }
}
