import type { GroundedSource, CitationFormat } from '../types';
export type { CitationFormat };

/**
 * Strip inline citation markers like [1], [2], [1, 3] from display text.
 * Used to clean up AI-generated synthesis text for UI rendering.
 * Citations are preserved in the raw data for PDF/Markdown export.
 */
export function stripCitationMarkers(text: string): string {
  return text.replace(/\[\d+(?:\s*,\s*\d+)*\]/g, '').trim();
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
  if (domain.includes('.edu') || domain.endsWith('.edu')) return 'academic';
  if (domain.includes('.gov') || domain.endsWith('.gov')) return 'government';
  if (domain.includes('.mil') || domain.endsWith('.mil')) return 'military';
  if (domain.includes('.org') || domain.endsWith('.org')) return 'organization';
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
