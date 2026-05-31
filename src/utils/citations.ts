import type { GroundedSource, CitationFormat } from '../types';
export type { CitationFormat };

/**
 * Strip inline citation markers like [1], [2], [1, 3] from display text.
 * Used to clean up AI-generated synthesis text for UI rendering.
 * Citations are preserved in the raw data for PDF/Markdown export.
 */
export function stripCitationMarkers(text: string): string {
  return text.replace(/\[\d+(?:\s*,\s*\d+)*\]/g, '').replace(/\s+/g, ' ').trim();
}

/** Format a single source as a citation string in the requested format */
export function formatCitation(source: Partial<GroundedSource>, format: CitationFormat = 'apa'): string {
  const domain = source.domain || '';
  const title = source.title || 'Untitled';
  const url = source.url || '';
  const date = source.published_date || 'n.d.';
  const author = (source as Record<string, unknown>).author as string || domain || 'Unknown';

  switch (format) {
    case 'mla':
      return `${author}. "${title}." ${domain}, ${date}, ${url}.`;
    case 'chicago':
      return `${author}, "${title}," ${domain} (${date}), ${url}.`;
    case 'apa':
    default:
      return `${author} (${date}). ${title}. ${domain}. ${url}`;
  }
}

/** Format all sources as a block of citations */
export function formatAllCitations(sources: Partial<GroundedSource>[], format: CitationFormat = 'apa'): string {
  return sources
    .map((s, i) => `[${i + 1}] ${formatCitation(s, format)}`)
    .join('\n\n');
}

/** Get a domain badge for display */
export function getDomainBadge(domain: string): string {
  if (!domain) return 'web';
  if (domain.endsWith('.edu')) return 'academic';
  if (domain.endsWith('.gov')) return 'government';
  if (domain.endsWith('.mil')) return 'military';
  if (domain.endsWith('.org')) return 'organization';
  return 'web';
}

/** Calculate days since published */
export function getDaysSincePublished(dateStr: string): number | null {
  if (!dateStr || dateStr === 'unknown') return null;
  const published = new Date(dateStr);
  if (isNaN(published.getTime())) return null;
  const now = new Date();
  return Math.floor((now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24));
}

/** Get a human-readable label for days */
export function getDaysLabel(days: number | null): string {
  if (days === null) return 'Unknown age';
  if (days < 1) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

/**
 * Split text into sentences at sentence-ending punctuation.
 * Uses the match offset (3rd arg in replace callback) to extract preceding
 * text — avoids text.indexOf() always finding the first match.
 * Handles common abbreviations (Dr., Mr., etc.) to avoid false splits.
 */
function splitSentences(text: string): string[] {
  const abbreviations = /^(Dr|Mr|Ms|Mrs|Prof|Sr|Jr|St|vs|etc|approx|dept|est|govt)\.?$/i;
  const raw = text.replace(/([.!?])(\s+|$)/g, (_m: string, punc: string, _space: string, offset: number) => {
    // Check if preceded by a known abbreviation
    const preText = text.substring(Math.max(0, offset - 5), offset).trim();
    if (abbreviations.test(preText)) {
      return _m; // leave as-is, no split
    }
    return `${punc}|SPLIT|`;
  });
  return raw.split('|SPLIT|').map(s => s.trim()).filter(Boolean);
}

/**
 * Detect and fix batch-citation pattern where the LLM stacks all citation
 * markers at the end of the last sentence instead of placing them inline
 * after each claim.
 *
 * Example transformation:
 *   Before: "MKUltra was a CIA program. It used drugs and hypnosis. [1] [2] [3] [4]"
 *   After:  "MKUltra was a CIA program [1]. It used drugs and hypnosis [2][3][4]."
 *
 * Algorithm:
 *   1. Split into paragraphs, then sentences
 *   2. Detect "batched" pattern: last sentence contains ≥ 60% of citation markers
 *   3. Extract all markers in order, clean sentences of all markers
 *   4. Redistribute: one marker per sentence (round-robin), remainder on last
 *   5. Reconstruct text
 */
export function redistributeBatchCitations(text: string): string {
  if (!text || text.trim().length === 0) return text;

  // Citation marker regex: [1], [1, 3], [1,3]
  const citationRegex = /\[\d+(?:\s*,\s*\d+)*\]/g;

  const paragraphs = text.split(/\n{2,}/);

  return paragraphs.map(para => {
    if (!para.trim()) return para;

    // Collect ALL citation markers from the paragraph
    const allMarkers: string[] = [];
    let match: RegExpExecArray | null;
    const markerRegex = new RegExp(citationRegex.source, 'g');
    while ((match = markerRegex.exec(para)) !== null) {
      allMarkers.push(match[0]);
    }

    if (allMarkers.length < 2) return para; // nothing to redistribute

    // Split into sentences
    const sentences = splitSentences(para);
    if (sentences.length < 2) return para;

    // Count citations per sentence
    const perSentence = sentences.map(s => {
      const ms = s.match(citationRegex);
      return ms ? ms.length : 0;
    });

    // Detection: is the last sentence carrying ≥ 60% of citations?
    const lastSentenceCount = perSentence[perSentence.length - 1];
    const totalCount = allMarkers.length;
    const batchedRatio = lastSentenceCount / totalCount;

    if (batchedRatio < 0.6) return para; // not batched enough

    // ─── Redistribute ───
    // Remove all citation markers from all sentences
    const cleanSentences = sentences.map(s => s.replace(citationRegex, '').trim()).filter(Boolean);
    if (cleanSentences.length === 0) return para;

    // Distribute citations: one per sentence first, then remainder on last
    const redistributed: string[] = [];
    let markerIdx = 0;

    for (let i = 0; i < cleanSentences.length && markerIdx < allMarkers.length; i++) {
      const s = cleanSentences[i];
      if (s.length < 10) {
        // Very short sentences (likely a heading or fragment) — skip citation assignment
        redistributed.push(s);
        continue;
      }
      // Give this sentence one citation
      redistributed.push(`${s} ${allMarkers[markerIdx++]}`);
    }

    // Any remaining citations go on the last sentence
    while (markerIdx < allMarkers.length) {
      const lastIdx = redistributed.length - 1;
      redistributed[lastIdx] += ` ${allMarkers[markerIdx++]}`;
    }

    return redistributed.join(' ');
  }).join('\n\n');
}
