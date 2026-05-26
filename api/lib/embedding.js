/**
 * COGNAPSE Document Intelligence — Zero-Cost Keyword Scorer
 *
 * Replaces Gemini text-embedding-004 with a lightweight BM25-like keyword
 * scoring approach. No external API calls, no rate limits, no costs.
 *
 * For each query, we tokenize, remove stopwords, and score each stored chunk
 * by: term-frequency overlap × log-boost for match density.
 *
 * This is deployed alongside a Groq-based answer generator (see rag-answer.js)
 * so the full RAG pipeline costs 0 embedding API calls + 1 Groq generation.
 */

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
  'from','up','about','into','over','after','is','are','was','were','be','been',
  'being','have','has','had','do','does','did','will','would','can','could',
  'should','may','might','shall','it','its','it\'s','that','this','these','those',
  'i','me','my','we','our','you','your','he','him','his','she','her','they',
  'them','their','what','which','who','whom','when','where','why','how',
  'all','each','every','both','few','more','most','other','some','such','no',
  'nor','not','only','own','same','so','than','too','very','just','because',
  'as','if','then','else','also','here','there','not','no'
]);

/**
 * Tokenize text into lowercase keywords (≥3 chars, non-stopwords).
 */
function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')    // strip punctuation
    .split(/\s+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));
}

/**
 * Score all chunks against a query using TF × frequency boost.
 *
 * Score formula: (matchedTerms / chunkWordCount) × log2(1 + matchedTerms)
 * This rewards both relevance density AND absolute match count.
 *
 * @param {string} query - User query
 * @param {Array<{ content: string, index: number, documentId?: string }>} chunks
 * @param {number} topK - Number of results to return
 * @returns {Array<{ content: string, index: number, score: number, documentId?: string }>}
 */
export function scoreChunks(query, chunks, topK = 5) {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    // Fallback: return first K chunks with score 0
    return chunks.slice(0, topK).map(c => ({
      content: c.content,
      index: c.index,
      documentId: c.documentId,
      score: 0,
    }));
  }

  const scored = chunks
    .map((chunk) => {
      const chunkTokens = tokenize(chunk.content);
      if (chunkTokens.length === 0) {
        return { ...chunk, score: 0 };
      }

      let matchCount = 0;
      for (const qt of queryTokens) {
        // Count how many times this query token appears in the chunk
        for (const ct of chunkTokens) {
          if (ct === qt || ct.includes(qt) || qt.includes(ct)) {
            matchCount++;
          }
        }
      }

      // BM25-inspired: TF density × frequency boost
      const density = matchCount / Math.max(chunkTokens.length, 1);
      const boost = Math.log2(1 + matchCount);
      const score = density * (1 + boost);

      return {
        content: chunk.content,
        index: chunk.index,
        documentId: chunk.documentId,
        score: Math.min(score, 1.0), // clamp to [0, 1] for consistency
      };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, topK);
}

/**
 * Score chunks and return only those above a given threshold.
 * @param {string} query
 * @param {Array} chunks
 * @param {number} minScore
 * @param {number} maxResults
 */
export function scoreChunksFiltered(query, chunks, minScore = 0.01, maxResults = 8) {
  const results = scoreChunks(query, chunks, maxResults);
  return results.filter(r => r.score >= minScore);
}

// ============================================================
// Legacy compatibility exports — these are no-ops now but keep
// existing imports from store-document-chunks from crashing.
// ============================================================

export async function embedText(_text) {
  throw new Error(
    'Gemini embeddings are disabled. Use scoreChunks() for keyword-based retrieval, ' +
    'or rag-answer.js for Groq-based RAG generation.'
  );
}

export async function embedTexts(_texts, _options) {
  throw new Error('Gemini embeddings are disabled. Use scoreChunks() instead.');
}

export function cosineSimilarity(_a, _b) {
  return 0;
}

export function findTopK(_queryEmbedding, _chunks, _topK) {
  return [];
}
