export type CitationFormat = 'apa' | 'mla' | 'chicago';

function extractYear(dateStr: string): string {
  if (!dateStr || dateStr === 'unknown') return 'n.d.';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 'n.d.' : d.getFullYear().toString();
}

function extractDate(dateStr: string): string {
  if (!dateStr || dateStr === 'unknown') return 'n.d.';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'n.d.';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatCitation(
  source: { title: string; url: string; domain: string; type?: string; published_date?: string },
  format: CitationFormat
): string {
  const title = source.title?.trim() || 'Untitled';
  const domain = source.domain?.trim() || '';
  const url = source.url?.trim() || '';
  const year = extractYear(source.published_date || '');
  const fullDate = extractDate(source.published_date || '');
  const siteName = domain.replace(/^www\./, '') || 'Website';

  switch (format) {
    case 'apa':
      return `${title}. (${year}). ${siteName}. ${url}`;
    case 'mla':
      return `"${title}." ${siteName}, ${fullDate}, ${url}.`;
    case 'chicago':
      return `"${title}." ${siteName}. ${fullDate}. ${url}.`;
  }
}

export function formatAllCitations(
  sources: { title: string; url: string; domain: string; type?: string; published_date?: string }[],
  format: CitationFormat
): string {
  return sources
    .map((s, i) => `[${i + 1}] ${formatCitation(s, format)}`)
    .join('\n');
}

export function getDomainBadge(domain: string): { label: string; color: string } | null {
  if (!domain) return null;
  const d = domain.toLowerCase();
  if (d.endsWith('.edu')) return { label: '.edu', color: 'bg-emerald-600' };
  if (d.endsWith('.gov')) return { label: '.gov', color: 'bg-blue-700' };
  if (d.endsWith('.mil')) return { label: '.mil', color: 'bg-red-700' };
  if (d.endsWith('.org')) return { label: '.org', color: 'bg-orange-600' };
  return null;
}

export function getDaysSincePublished(dateStr: string): number | null {
  if (!dateStr || dateStr === 'unknown') return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function getDaysLabel(days: number | null): string {
  if (days === null) return 'Unknown date';
  const abs = Math.abs(days);
  let label: string;
  if (abs < 30) label = `${abs}d`;
  else if (abs < 365) label = `${Math.floor(abs / 30)}mo`;
  else label = `${Math.floor(abs / 365)}yr`;
  return days >= 0 ? `${label} ago` : `in ${label}`;
}
