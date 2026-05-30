import { describe, it, expect } from 'vitest';
import {
  stripCitationMarkers,
  formatCitation,
  formatAllCitations,
  getDomainBadge,
  getDaysSincePublished,
  getDaysLabel,
} from '../citations';
import type { GroundedSource } from '../../types';

/* ===================================================================
 * TESTS: stripCitationMarkers
 * =================================================================== */

describe('stripCitationMarkers', () => {
  it('removes single citation markers [1]', () => {
    expect(stripCitationMarkers('Some text [1] with citation.')).toBe('Some text with citation.');
  });

  it('removes multiple citation markers [1][2][3]', () => {
    expect(stripCitationMarkers('Claim [1][2][3] is supported.')).toBe('Claim is supported.');
  });

  it('removes comma-separated citation markers [1, 3]', () => {
    expect(stripCitationMarkers('Multiple sources [1, 3] support this.')).toBe('Multiple sources support this.');
  });

  it('removes spaced comma-separated markers [1,3]', () => {
    expect(stripCitationMarkers('Compact [1,3] markers.')).toBe('Compact markers.');
  });

  it('removes three-plus source markers [2, 5, 7]', () => {
    expect(stripCitationMarkers('Consensus [2, 5, 7] is clear.')).toBe('Consensus is clear.');
  });

  it('removes markers at the start of text', () => {
    expect(stripCitationMarkers('[1] Leading citation.')).toBe('Leading citation.');
  });

  it('removes markers at the end of text', () => {
    expect(stripCitationMarkers('Trailing citation [1]')).toBe('Trailing citation');
  });

  it('returns empty string for input with only markers', () => {
    expect(stripCitationMarkers('[1]')).toBe('');
    expect(stripCitationMarkers('[1][2][3]')).toBe('');
  });

  it('handles text with no citation markers', () => {
    expect(stripCitationMarkers('Plain text without citations.')).toBe('Plain text without citations.');
  });

  it('handles empty string', () => {
    expect(stripCitationMarkers('')).toBe('');
  });

  it('does not strip brackets around non-numeric content', () => {
    expect(stripCitationMarkers('[note] Keep this.')).toBe('[note] Keep this.');
    expect(stripCitationMarkers('[a, b] Keep this.')).toBe('[a, b] Keep this.');
  });

  it('does not strip single-digit text like [a]', () => {
    expect(stripCitationMarkers('[x] Keep this.')).toBe('[x] Keep this.');
  });
});

/* ===================================================================
 * TESTS: formatCitation
 * =================================================================== */

describe('formatCitation', () => {
  const source: Partial<GroundedSource> = {
    domain: 'example.com',
    title: 'Test Article',
    url: 'https://example.com/article',
    published_date: '2024-03-15',
  };

  it('formats in APA style by default', () => {
    const result = formatCitation(source);
    expect(result).toMatch(/example\.com/);
    expect(result).toMatch(/Test Article/);
    expect(result).toMatch(/https:\/\/example\.com\/article/);
    expect(result).toMatch(/2024/);
  });

  it('formats in MLA style', () => {
    const result = formatCitation(source, 'mla');
    expect(result).toContain('"Test Article."');
    expect(result).toMatch(/example\.com/);
  });

  it('formats in Chicago style', () => {
    const result = formatCitation(source, 'chicago');
    expect(result).toContain('"Test Article,"');
    expect(result).toMatch(/example\.com/);
  });

  it('uses "Untitled" when no title is provided', () => {
    const result = formatCitation({ domain: 'example.com', url: 'https://example.com' });
    expect(result).toContain('Untitled');
  });

  it('uses "n.d." when no published_date is provided', () => {
    const result = formatCitation({ domain: 'example.com', title: 'Test' });
    expect(result).toContain('n.d.');
  });

  it('uses domain as author when no author is on source', () => {
    // GroundedSource doesn't have an author field; fallback is domain
    const result = formatCitation({ domain: 'reuters.com', title: 'News' });
    expect(result).toContain('reuters.com');
  });
});

/* ===================================================================
 * TESTS: formatAllCitations
 * =================================================================== */

describe('formatAllCitations', () => {
  it('formats multiple sources as a numbered block', () => {
    const sources: Partial<GroundedSource>[] = [
      { domain: 'example.com', title: 'First', url: 'https://example.com/1' },
      { domain: 'test.org', title: 'Second', url: 'https://test.org/2' },
    ];

    const result = formatAllCitations(sources);
    expect(result).toContain('[1]');
    expect(result).toContain('[2]');
    expect(result).toContain('First');
    expect(result).toContain('Second');
    expect(result.split('\n\n').length).toBe(2);
  });

  it('returns empty string for empty sources', () => {
    expect(formatAllCitations([])).toBe('');
  });

  it('respects the citation format parameter', () => {
    const sources: Partial<GroundedSource>[] = [
      { domain: 'example.com', title: 'Test', url: 'https://example.com' },
    ];

    const mla = formatAllCitations(sources, 'mla');
    expect(mla).toContain('"Test."');
  });
});

/* ===================================================================
 * TESTS: getDomainBadge
 * =================================================================== */

describe('getDomainBadge', () => {
  it('returns "academic" for .edu domains', () => {
    expect(getDomainBadge('harvard.edu')).toBe('academic');
    expect(getDomainBadge('sub.mit.edu')).toBe('academic');
  });

  it('returns "government" for .gov domains', () => {
    expect(getDomainBadge('whitehouse.gov')).toBe('government');
    expect(getDomainBadge('sub.cdc.gov')).toBe('government');
  });

  it('returns "military" for .mil domains', () => {
    expect(getDomainBadge('army.mil')).toBe('military');
    expect(getDomainBadge('sub.af.mil')).toBe('military');
  });

  it('returns "organization" for .org domains', () => {
    expect(getDomainBadge('wikipedia.org')).toBe('organization');
    expect(getDomainBadge('sub.icrc.org')).toBe('organization');
  });

  it('returns "web" for .com domains', () => {
    expect(getDomainBadge('example.com')).toBe('web');
    expect(getDomainBadge('reuters.com')).toBe('web');
  });

  it('returns "web" for unknown TLDs', () => {
    expect(getDomainBadge('example.io')).toBe('web');
    expect(getDomainBadge('example.net')).toBe('web');
    expect(getDomainBadge('example.co')).toBe('web');
  });

  it('returns "web" for empty domain', () => {
    expect(getDomainBadge('')).toBe('web');
  });

  it('returns "web" for domains containing but not ending with a special TLD', () => {
    // e.g., "something.org.com" should NOT match .org
    expect(getDomainBadge('fake.org.com')).toBe('web');
    expect(getDomainBadge('fake-gov.com')).toBe('web');
  });
});

/* ===================================================================
 * TESTS: getDaysSincePublished
 * =================================================================== */

describe('getDaysSincePublished', () => {
  it('returns a positive number for a past date', () => {
    const days = getDaysSincePublished('2024-01-15');
    expect(days).toBeGreaterThan(0);
  });

  it('returns null for empty string', () => {
    expect(getDaysSincePublished('')).toBeNull();
  });

  it('returns null for "unknown"', () => {
    expect(getDaysSincePublished('unknown')).toBeNull();
  });

  it('returns null for invalid date strings', () => {
    expect(getDaysSincePublished('not-a-date')).toBeNull();
    expect(getDaysSincePublished('2024-13-01')).toBeNull(); // invalid month
  });

  it('returns 0 for today (within same calendar day)', () => {
    const today = new Date().toISOString().split('T')[0];
    const days = getDaysSincePublished(today);
    expect(days).toBe(0);
  });
});

/* ===================================================================
 * TESTS: getDaysLabel
 * =================================================================== */

describe('getDaysLabel', () => {
  it('returns "Unknown age" for null', () => {
    expect(getDaysLabel(null)).toBe('Unknown age');
  });

  it('returns "Today" for 0 days', () => {
    expect(getDaysLabel(0)).toBe('Today');
  });

  it('returns "Yesterday" for 1 day', () => {
    expect(getDaysLabel(1)).toBe('Yesterday');
  });

  it('returns plural "X days ago" for 2-6 days', () => {
    expect(getDaysLabel(2)).toBe('2 days ago');
    expect(getDaysLabel(6)).toBe('6 days ago');
  });

  it('returns "X weeks ago" for 7-29 days', () => {
    expect(getDaysLabel(7)).toBe('1 weeks ago');
    expect(getDaysLabel(14)).toBe('2 weeks ago');
    expect(getDaysLabel(29)).toBe('4 weeks ago');
  });

  it('returns "X months ago" for 30-364 days', () => {
    expect(getDaysLabel(30)).toBe('1 months ago');
    expect(getDaysLabel(60)).toBe('2 months ago');
    expect(getDaysLabel(364)).toBe('12 months ago');
  });

  it('returns "X years ago" for 365+ days', () => {
    expect(getDaysLabel(365)).toBe('1 years ago');
    expect(getDaysLabel(730)).toBe('2 years ago');
    expect(getDaysLabel(3650)).toBe('10 years ago');
  });
});
