/**
 * COGNAPSE Document Intelligence — Text Chunker
 *
 * Recursive character text splitting for RAG pipeline.
 * Chunks text into semantically-aware segments with configurable size and overlap.
 * Optimized for LLM context windows — targets ~500-1000 token chunks (~2000-4000 chars).
 */

const DEFAULT_CHUNK_SIZE = 2000;   // characters
const DEFAULT_CHUNK_OVERLAP = 200; // characters

/**
 * Split text into chunks using recursive character splitting.
 * Preserves paragraph, sentence, and word boundaries when possible.
 *
 * @param {string} text - The document text to chunk
 * @param {object} options
 * @param {number} options.chunkSize - Target chunk size in characters (default 2000)
 * @param {number} options.chunkOverlap - Overlap between chunks in characters (default 200)
 * @returns {Array<{ content: string, index: number }>}
 */
export function chunkText(text, options = {}) {
  const chunkSize = options.chunkSize || DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options.chunkOverlap || DEFAULT_CHUNK_OVERLAP;

  if (!text || text.trim().length === 0) {
    return [];
  }

  // Normalize whitespace
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Try splitting by paragraph first (best semantic boundaries)
  const paragraphs = splitByParagraphs(cleaned);

  // If text is short enough, return as single chunk
  if (cleaned.length <= chunkSize) {
    return [{ content: cleaned.trim(), index: 0 }];
  }

  const chunks = [];
  let currentChunk = '';
  let chunkIndex = 0;

  for (const para of paragraphs) {
    // If adding this paragraph would exceed the chunk size, save current chunk and start new
    if (currentChunk.length + para.length + 1 > chunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex++,
      });

      // Start new chunk with overlap from end of previous chunk
      if (chunkOverlap > 0) {
        const overlapStart = Math.max(0, currentChunk.length - chunkOverlap);
        currentChunk = currentChunk.slice(overlapStart) + '\n' + para;
      } else {
        currentChunk = para;
      }
    } else {
      // Add paragraph to current chunk
      if (currentChunk.length > 0) {
        currentChunk += '\n\n' + para;
      } else {
        currentChunk = para;
      }
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex,
    });
  }

  // If we ended up with only one chunk, we're done
  if (chunks.length === 1) return chunks;

  // Post-process: ensure no chunk is too small (< 100 chars)
  const merged = mergeTinyChunks(chunks, chunkSize);

  return merged;
}

/**
 * Split text into paragraphs, respecting markdown headers and lists.
 */
function splitByParagraphs(text) {
  // Split on double newlines (paragraph breaks), but keep markdown headers intact
  const rawParagraphs = text.split(/\n\n+/);

  // Further split very long paragraphs at sentence boundaries
  const paragraphs = [];
  for (const para of rawParagraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // If paragraph is very long (> 1.5x chunk size), split by sentences
    if (trimmed.length > DEFAULT_CHUNK_SIZE * 1.5) {
      const sentences = splitBySentences(trimmed);
      // Group sentences back into reasonable chunks
      let group = '';
      for (const sentence of sentences) {
        if (group.length + sentence.length > DEFAULT_CHUNK_SIZE && group.length > 0) {
          paragraphs.push(group.trim());
          group = sentence;
        } else {
          group += (group ? ' ' : '') + sentence;
        }
      }
      if (group.trim()) paragraphs.push(group.trim());
    } else {
      paragraphs.push(trimmed);
    }
  }

  return paragraphs.filter(Boolean);
}

/**
 * Split text at sentence boundaries (., !, ?) while preserving abbreviations.
 */
function splitBySentences(text) {
  // Split on sentence-ending punctuation followed by space and capital letter
  const rawSplits = text.split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/);
  return rawSplits.filter(Boolean);
}

/**
 * Merge chunks that are too small into adjacent chunks.
 */
function mergeTinyChunks(chunks, maxSize) {
  const MIN_CHUNK_SIZE = 100;
  const result = [];

  for (let i = 0; i < chunks.length; i++) {
    if (result.length === 0) {
      result.push({ ...chunks[i] });
      continue;
    }

    const last = result[result.length - 1];
    const current = chunks[i];

    // If the last chunk is tiny, merge it with the current one
    if (last.content.length < MIN_CHUNK_SIZE) {
      last.content = last.content + '\n\n' + current.content;
      // Clamp to max size
      if (last.content.length > maxSize) {
        last.content = last.content.slice(0, maxSize);
      }
      continue;
    }

    // If the current chunk is tiny, merge it with the last chunk
    if (current.content.length < MIN_CHUNK_SIZE) {
      last.content = last.content + '\n\n' + current.content;
      if (last.content.length > maxSize) {
        last.content = last.content.slice(0, maxSize);
      }
      continue;
    }

    result.push({ ...current });
  }

  // Re-index
  return result.map((chunk, i) => ({ ...chunk, index: i }));
}

/**
 * Estimate token count for a string (rough approximation).
 * Used for Gemini API context window management.
 */
export function estimateTokens(text) {
  return Math.ceil((text || '').length / 4);
}
