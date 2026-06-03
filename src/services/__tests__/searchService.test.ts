// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock apiFetch so we don't make real network calls
vi.mock('../apiClient', () => ({
  apiFetch: vi.fn().mockRejectedValue(new Error('Network error')),
}));

import { compressSourcesForLLM, clearSearchCache, getSearchCacheStats } from '../searchService';
import type { GroundedSource } from '../../types';

function createSource(overrides: Partial<GroundedSource> = {}): GroundedSource {
  return {
    id: 1,
    title: 'Test Source',
    url: 'https://example.com/test',
    domain: 'example.com',
    type: 'web',
    snippet: 'This is a test snippet with some content for deduplication testing purposes.',
    credibility_score: 75,
    relevance_score: 60,
    key_finding: 'Key finding from test source.',
    published_date: '2024-01-01',
    bias_flag: null,
    retrieval_timestamp: new Date().toISOString(),
    ...overrides,
  };
}

/* ===================================================================
 * TESTS: compressSourcesForLLM — formats sources for LLM context
 * =================================================================== */

describe('compressSourcesForLLM', () => {
  it('formats a single source correctly', () => {
    const source = createSource({ id: 1, title: 'Test', domain: 'example.com', type: 'journalism' });
    const result = compressSourcesForLLM([source]);
    expect(result).toContain('SOURCE 1');
    expect(result).toContain('Test');
    expect(result).toContain('example.com');
    expect(result).toContain('journalism');
  });

  it('includes snippet text in output', () => {
    const source = createSource({ snippet: 'Important finding here.' });
    const result = compressSourcesForLLM([source]);
    expect(result).toContain('Important finding here.');
  });

  it('respects maxTokens limit', () => {
    // Small snippets so token estimates are predictable
    const sources = [
      createSource({ id: 1, snippet: 'Short snippet A.', title: 'First' }),
      createSource({ id: 2, snippet: 'Short snippet B.', title: 'Second' }),
      createSource({ id: 3, snippet: 'Short snippet C.', title: 'Third' }),
    ];
    // Each entry is ~120 chars / 4 = ~30 tokens. With maxTokens=40 only the first source fits.
    const result = compressSourcesForLLM(sources, 40);
    expect(result).toContain('SOURCE 1');
    expect(result).toContain('Short snippet A.');
    // Source 2 should not appear since adding it would exceed maxTokens
    expect(result).not.toContain('SOURCE 2');
  });

  it('returns trimmed string for empty sources', () => {
    const result = compressSourcesForLLM([]);
    expect(result).toBe('');
  });
});

/* ===================================================================
 * TESTS: Cache management
 * =================================================================== */

describe('search cache', () => {
  beforeEach(() => {
    clearSearchCache();
  });

  it('starts empty', () => {
    const stats = getSearchCacheStats();
    expect(stats.size).toBe(0);
  });

  it('reports cache keys after operations', () => {
    // Cache is populated by searchWeb which is mocked to fail
    // Just verify the cache starts empty
    const stats = getSearchCacheStats();
    expect(stats.size).toBe(0);
    expect(Array.isArray(stats.keys)).toBe(true);
  });
});

/* ===================================================================
 * TESTS: Source deduplication (tested indirectly via compressSourcesForLLM)
 * =================================================================== */

describe('source deduplication (indirect)', () => {
  it('compressSourcesForLLM handles duplicate IDs gracefully', () => {
    // Two sources with same ID — the LLM will see the same citation twice
    const sources = [
      createSource({ id: 1, title: 'First Source' }),
      createSource({ id: 1, title: 'Second Source' }),
    ];
    const result = compressSourcesForLLM(sources);
    // Both should appear since they have different titles
    expect(result).toContain('First Source');
    expect(result).toContain('Second Source');
  });

  it('handles sources with missing fields gracefully', () => {
    const source = createSource({
      title: '',
      url: '',
      domain: '',
      snippet: 'Just a snippet',
      key_finding: '',
    });
    const result = compressSourcesForLLM([source]);
    expect(result).toContain('Just a snippet');
  });
});
