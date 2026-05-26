import { apiFetch } from './apiClient';
import type { RagAnswer, ChunkSearchResult, COGNAPSE_Output } from '../types';

/**
 * Analyze a document and return a full COGNAPSE research report.
 * Supports direct text or base64-encoded file data (PDF/DOCX/PPTX/TXT).
 *
 * @param userId - User's UID
 * @param params - Either { text } for plain text, or { fileData, mimeType, fileName } for file upload
 * @param query - Optional analysis focus question
 * @returns COGNAPSE_Output research report
 */
export async function analyzeDocument(
  userId: string,
  params: { text?: string; fileData?: string; mimeType?: string; fileName?: string },
  query?: string
): Promise<{ report: COGNAPSE_Output; usage: any }> {
  if (!params.text && !params.fileData) {
    throw new Error('Either text or fileData is required.');
  }

  const response = await apiFetch('/api/analyze-document', {
    method: 'POST',
    body: JSON.stringify({ userId, ...params, query }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Analysis failed' }));
    if (err.premiumRequired) throw new Error('Premium subscription required.');
    throw new Error(err.detail || err.error || 'Failed to analyze document');
  }

  const data = await response.json();
  return { report: data.report, usage: data.usage };
}

/**
 * Process a document: chunk text and store in Firestore.
 * No embeddings — uses Groq-based keyword scoring + LLM at query time.
 *
 * @param userId - User's UID
 * @param documentId - Document ID to process
 * @param text - Raw text content to chunk and embed
 * @returns Processing result with chunk count
 */
export async function processDocument(
  userId: string,
  documentId: string,
  text: string
): Promise<{ chunkCount: number; latencyMs: number }> {
  if (!text || text.trim().length === 0) {
    throw new Error('No text content to process.');
  }

  const response = await apiFetch('/api/store-document-chunks', {
    method: 'POST',
    body: JSON.stringify({ userId, documentId, text }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Processing failed' }));
    if (err.premiumRequired) throw new Error('Premium subscription required.');
    throw new Error(err.error || 'Failed to process document');
  }

  const data = await response.json();
  return { chunkCount: data.chunkCount || 0, latencyMs: data.latencyMs || 0 };
}

/**
 * Search document chunks by semantic similarity to a query.
 *
 * @param userId - User's UID
 * @param query - Natural language query
 * @param documentIds - Array of document IDs to search within
 * @param topK - Number of top results (default 5)
 * @returns Array of chunk search results
 */
export async function queryDocuments(
  userId: string,
  query: string,
  documentIds: string[],
  topK: number = 5
): Promise<ChunkSearchResult[]> {
  if (!query.trim()) throw new Error('Query cannot be empty.');
  if (documentIds.length === 0) throw new Error('Select at least one document.');

  const response = await apiFetch('/api/query-document-chunks', {
    method: 'POST',
    body: JSON.stringify({ userId, query, documentIds, topK }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Query failed' }));
    if (err.premiumRequired) throw new Error('Premium subscription required.');
    throw new Error(err.error || 'Failed to search documents');
  }

  const data = await response.json();
  if (!data.results) return [];

  // Map API results to ChunkSearchResult interface
  return data.results.map(
    (r: { chunkIndex: number; content: string; score: number; documentId: string }) => ({
      chunk: {
        id: `${r.documentId}_chunk_${r.chunkIndex}`,
        documentId: r.documentId,
        content: r.content,
        index: r.chunkIndex,
        createdAt: new Date().toISOString(),
      },
      score: r.score,
      documentName: '', // Will be populated by the caller using document mapping
    })
  );
}

/**
 * Get a RAG-powered answer grounded in document content.
 *
 * @param userId - User's UID
 * @param query - Natural language question
 * @param documentIds - Array of document IDs to search within
 * @returns RagAnswer with answer text and citations
 */
export async function getRagAnswer(
  userId: string,
  query: string,
  documentIds: string[]
): Promise<RagAnswer> {
  if (!query.trim()) throw new Error('Query cannot be empty.');
  if (documentIds.length === 0) throw new Error('Select at least one document.');

  const response = await apiFetch('/api/rag-answer', {
    method: 'POST',
    body: JSON.stringify({ userId, query, documentIds }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Answer generation failed' }));
    if (err.premiumRequired) throw new Error('Premium subscription required.');
    throw new Error(err.error || 'Failed to generate answer');
  }

  const data = await response.json();
  return {
    answer: data.answer || 'No answer generated.',
    citations: data.citations || [],
    chunksUsed: data.chunksUsed || 0,
    latencyMs: data.latencyMs || 0,
  };
}

/**
 * Estimate token count for a text string (rough approximation for cost awareness).
 */
export function estimateTokens(text: string): number {
  return Math.ceil((text || '').length / 4);
}
