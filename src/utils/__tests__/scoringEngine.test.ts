// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ===================================================================
 * MOCKS
 *
 * 1. compromise — controlled entity extraction (no real NLP needed)
 * 2. domainCredibility — controlled domain lookups (no real DB needed)
 * 3. globalThis.fetch — prevents CDN model imports, exercising fallback paths
 * =================================================================== */

vi.mock('compromise', () => ({
  default: vi.fn(() => ({
    organizations: () => ({ out: () => ['NASA', 'CERN'] }),
    places: () => ({ out: () => ['Geneva', 'Moon'] }),
    people: () => ({ out: () => ['Einstein'] }),
    nouns: () => ({ out: () => ['physics', 'space', 'research'] }),
  })),
}));

vi.mock('../domainCredibility', () => ({
  lookupDomain: vi.fn(),
  factualToScore: vi.fn(),
  biasToBiasScore: vi.fn(),
}));

// Mock fetch so the dynamic CDN import in getEmbedder() / getSentimentModel() fails,
// exercising the fallback paths (returns null → uses fallback scores).
vi.hoisted(() => {
  globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error')) as unknown as typeof fetch;
});

/* ===================================================================
 * MODULE UNDER TEST
 * =================================================================== */

import {
  cosineSimilarity,
  normalizeCredScore,
  computeEntityDiversity,
  computeEnhancedSourceCredibility,
  computeSemanticRelevance,
  computeConsensusScore,
  computeBiasFromSentiment,
  computeAllScores,
} from '../scoringEngine';

import { lookupDomain, factualToScore, biasToBiasScore } from '../domainCredibility';
import nlp from 'compromise';

const mockNlp = vi.mocked(nlp);

/* ===================================================================
 * SHARED TEST DATA
 * =================================================================== */

const defaultBaseScores = {
  accuracy: 8,
  bias: 0.3,
  sourceDiversity: 0.7,
  confidenceInterval: 0.8,
};

function createSource(overrides: Partial<{
  domain: string;
  title: string;
  key_finding: string;
  credibility_score: number;
  url: string;
  type: string;
  id: number;
}> = {}) {
  return {
    domain: 'example.com',
    title: 'Test Title',
    key_finding: 'Test finding content.',
    credibility_score: 7.5,
    ...overrides,
  };
}

function resetMocks() {
  vi.clearAllMocks();
}

/* ===================================================================
 * TESTS: cosineSimilarity — pure function, no mocking needed
 * =================================================================== */

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1, 10);
    expect(cosineSimilarity([0.5, 0.5], [0.5, 0.5])).toBeCloseTo(1, 10);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10);
    expect(cosineSimilarity([5, 0], [0, 3])).toBeCloseTo(0, 10);
  });

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 10);
    expect(cosineSimilarity([3, 4], [-3, -4])).toBeCloseTo(-1, 10);
  });

  it('returns 1 for vectors with same direction but different magnitude', () => {
    const result = cosineSimilarity([1, 2, 3], [2, 4, 6]);
    expect(result).toBeCloseTo(1, 10);
  });

  it('returns a value between -1 and 1 for non-parallel vectors', () => {
    const result = cosineSimilarity([1, 2, 3], [4, 5, 6]);
    expect(result).toBeGreaterThan(-1.01);
    expect(result).toBeLessThan(1.01);
    expect(result).toBeGreaterThan(0);
  });

  it('handles zero-magnitude vectors gracefully', () => {
    expect(cosineSimilarity([0, 0], [1, 0])).toBe(0);
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
    expect(cosineSimilarity([1, 0], [0, 0])).toBe(0);
  });

  it('orders scores consistently: similar > neutral > dissimilar', () => {
    const query = [1, 1, 1];
    const similar = cosineSimilarity(query, [0.9, 1.1, 0.95]);
    const neutral = cosineSimilarity(query, [1, -1, 1]);
    const opposite = cosineSimilarity(query, [-1, -1, -1]);

    expect(similar).toBeGreaterThan(neutral);
    expect(neutral).toBeGreaterThan(opposite);
  });

  it('handles vectors of different lengths without throwing', () => {
    expect(() => cosineSimilarity([1, 2, 3], [1, 2])).not.toThrow();
  });

  it('handles negative values correctly', () => {
    const result = cosineSimilarity([1, -1, 1], [1, -1, 1]);
    expect(result).toBeCloseTo(1, 10);

    const negResult = cosineSimilarity([1, -1, 1], [-1, 1, -1]);
    expect(negResult).toBeCloseTo(-1, 10);
  });

  it('is commutative', () => {
    const a = [0.3, 0.8, 0.2, 0.6];
    const b = [0.9, 0.1, 0.7, 0.4];
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a), 10);
  });
});

/* ===================================================================
 * TESTS: normalizeCredScore — pure function
 * =================================================================== */

describe('normalizeCredScore', () => {
  it('returns null for null input', () => {
    expect(normalizeCredScore(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(normalizeCredScore(undefined)).toBeNull();
  });

  it('divides by 10 for scores greater than 10', () => {
    expect(normalizeCredScore(55)).toBeCloseTo(5.5, 5);
    expect(normalizeCredScore(100)).toBe(10);
    expect(normalizeCredScore(27)).toBeCloseTo(2.7, 5);
  });

  it('returns the score as-is when <= 10', () => {
    expect(normalizeCredScore(8)).toBe(8);
    expect(normalizeCredScore(0)).toBe(0);
    expect(normalizeCredScore(10)).toBe(10);
    expect(normalizeCredScore(3.5)).toBe(3.5);
  });

  it('handles the boundary value of 10', () => {
    expect(normalizeCredScore(10)).toBe(10);
    expect(normalizeCredScore(10.1)).toBeCloseTo(1.01, 5);
  });

  it('handles negative values', () => {
    expect(normalizeCredScore(-5)).toBe(-5);
  });
});

/* ===================================================================
 * TESTS: computeEntityDiversity — synchronous, uses mocked compromise
 * =================================================================== */

describe('computeEntityDiversity', () => {
  beforeEach(() => {
    resetMocks();
    mockNlp.mockImplementation(() => ({
      organizations: () => ({ out: () => ['NASA', 'CERN'] }),
      places: () => ({ out: () => ['Geneva', 'Moon'] }),
      people: () => ({ out: () => ['Einstein'] }),
      nouns: () => ({ out: () => ['physics', 'space', 'research'] }),
    }));
  });

  it('returns zeros for empty sources', () => {
    const result = computeEntityDiversity([]);
    expect(result).toEqual({
      entityCount: 0,
      orgCount: 0,
      placeCount: 0,
      personCount: 0,
      topicCount: 0,
      diversityScore: 0,
    });
  });

  it('counts organizations, places, and people from sources', () => {
    const result = computeEntityDiversity([createSource()]);

    expect(result.entityCount).toBe(5);
    expect(result.orgCount).toBe(2);
    expect(result.placeCount).toBe(2);
    expect(result.personCount).toBe(1);
    expect(result.topicCount).toBe(3);
  });

  it('deduplicates entities across multiple sources', () => {
    const sources = [createSource(), createSource()];
    const result = computeEntityDiversity(sources);

    expect(result.entityCount).toBe(5);
    expect(result.orgCount).toBe(2);
    expect(result.topicCount).toBe(3);
    expect(mockNlp).toHaveBeenCalledTimes(2);
  });

  it('aggregates unique entities from sources with different content', () => {
    mockNlp
      .mockImplementationOnce(() => ({
        organizations: () => ({ out: () => ['NASA'] }),
        places: () => ({ out: () => ['Mars'] }),
        people: () => ({ out: () => ['Einstein'] }),
        nouns: () => ({ out: () => ['physics'] }),
      }))
      .mockImplementationOnce(() => ({
        organizations: () => ({ out: () => ['ESA', 'NASA'] }),
        places: () => ({ out: () => ['Mars', 'Venus'] }),
        people: () => ({ out: () => ['Einstein', 'Newton'] }),
        nouns: () => ({ out: () => ['physics', 'astronomy'] }),
      }));

    const sources = [
      createSource({ title: 'Source A', key_finding: 'First source' }),
      createSource({ title: 'Source B', key_finding: 'Second source' }),
    ];

    const result = computeEntityDiversity(sources);

    expect(result.entityCount).toBe(6); // orgs: {NASA, ESA}=2, places: {Mars, Venus}=2, people: {Einstein, Newton}=2
    expect(result.orgCount).toBe(2);
    expect(result.placeCount).toBe(2);
    expect(result.personCount).toBe(2);
    expect(result.topicCount).toBe(2); // physics, astronomy
  });

  it('incorporates domain diversity into the score', () => {
    mockNlp.mockImplementation(() => ({
      organizations: () => ({ out: () => ['NASA'] }),
      places: () => ({ out: () => ['Mars'] }),
      people: () => ({ out: () => ['Einstein'] }),
      nouns: () => ({ out: () => ['physics'] }),
    }));

    const sources = [
      createSource({ domain: 'reuters.com', title: 'A' }),
      createSource({ domain: 'bbc.com', title: 'B' }),
    ];

    const result = computeEntityDiversity(sources);
    expect(result.diversityScore).toBeGreaterThan(0);
    expect(result.diversityScore).toBeLessThanOrEqual(1);
  });

  it('rewards higher domain variety', () => {
    mockNlp.mockImplementation(() => ({
      organizations: () => ({ out: () => ['NASA'] }),
      places: () => ({ out: () => ['Mars'] }),
      people: () => ({ out: () => ['Einstein'] }),
      nouns: () => ({ out: () => ['physics'] }),
    }));

    const singleDomain = computeEntityDiversity([
      createSource({ domain: 'reuters.com', title: 'A' }),
      createSource({ domain: 'reuters.com', title: 'B' }),
    ]);

    const multiDomain = computeEntityDiversity([
      createSource({ domain: 'reuters.com', title: 'A' }),
      createSource({ domain: 'nature.com', title: 'B' }),
    ]);

    expect(multiDomain.diversityScore).toBeGreaterThan(singleDomain.diversityScore);
  });

  it('handles sources with empty text gracefully', () => {
    mockNlp.mockImplementation(() => ({
      organizations: () => ({ out: () => [] }),
      places: () => ({ out: () => [] }),
      people: () => ({ out: () => [] }),
      nouns: () => ({ out: () => [] }),
    }));

    const result = computeEntityDiversity([createSource({ title: '', key_finding: '' })]);
    expect(result.entityCount).toBe(0);
    expect(result.diversityScore).toBeGreaterThanOrEqual(0);
  });
});

/* ===================================================================
 * TESTS: computeEnhancedSourceCredibility — synchronous, uses mocked domainCredibility
 * =================================================================== */

describe('computeEnhancedSourceCredibility', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('uses domain credibility data when domain is known', () => {
    vi.mocked(lookupDomain).mockReturnValue({ bias: 'center', factual: 'very-high' });
    vi.mocked(factualToScore).mockReturnValue(10);

    const result = computeEnhancedSourceCredibility([createSource({ credibility_score: undefined })]);

    // factualToScore(10) * 0.7 + 5 * 0.3 = 7 + 1.5 = 8.5
    expect(result.perSource[0]).toBeCloseTo(8.5, 5);
    expect(result.average).toBeCloseTo(8.5, 5);
  });

  it('blends domain data with credibility score when both are available', () => {
    vi.mocked(lookupDomain).mockReturnValue({ bias: 'center', factual: 'high' });
    vi.mocked(factualToScore).mockReturnValue(8);

    const result = computeEnhancedSourceCredibility([createSource({ credibility_score: 7 })]);

    // factualToScore(8) * 0.5 + cred(7) * 0.3 + 2 = 4 + 2.1 + 2 = 8.1
    expect(result.perSource[0]).toBeCloseTo(8.1, 5);
  });

  it('returns baseline score for .edu domains not in lookup table', () => {
    vi.mocked(lookupDomain).mockReturnValue(null);

    const result = computeEnhancedSourceCredibility([
      createSource({ domain: 'harvard.edu', credibility_score: undefined }),
    ]);

    expect(result.perSource[0]).toBeCloseTo(8.5, 5); // .edu → 8.5
  });

  it('returns baseline score for .gov domains not in lookup table', () => {
    vi.mocked(lookupDomain).mockReturnValue(null);

    const result = computeEnhancedSourceCredibility([
      createSource({ domain: 'whitehouse.gov', credibility_score: undefined }),
    ]);

    expect(result.perSource[0]).toBeCloseTo(8, 5); // .gov → 8
  });

  it('returns baseline score for .mil domains not in lookup table', () => {
    vi.mocked(lookupDomain).mockReturnValue(null);

    const result = computeEnhancedSourceCredibility([
      createSource({ domain: 'army.mil', credibility_score: undefined }),
    ]);

    expect(result.perSource[0]).toBeCloseTo(8, 5); // .mil → 8
  });

  it('falls back to raw credibility score for unknown domains', () => {
    vi.mocked(lookupDomain).mockReturnValue(null);

    const result = computeEnhancedSourceCredibility([
      createSource({ domain: 'unknown-site.com', credibility_score: 6 }),
    ]);

    expect(result.perSource[0]).toBeCloseTo(6, 5);
  });

  it('falls back to default 5 when nothing is known', () => {
    vi.mocked(lookupDomain).mockReturnValue(null);

    const result = computeEnhancedSourceCredibility([
      createSource({ domain: 'unknown-site.com', credibility_score: undefined }),
    ]);

    expect(result.perSource[0]).toBeCloseTo(5, 5);
  });

  it('computes the average across multiple sources', () => {
    vi.mocked(lookupDomain).mockReturnValue(null);

    const sources = [
      createSource({ domain: 'reuters.com', credibility_score: 8 }),
      createSource({ domain: 'unknown.com', credibility_score: 4 }),
      createSource({ domain: 'harvard.edu', credibility_score: undefined }),
    ];

    const result = computeEnhancedSourceCredibility(sources);

    expect(result.perSource).toHaveLength(3);
    // Source 1: unknown domain, cred=8 → 8
    // Source 2: unknown domain, cred=4 → 4
    // Source 3: .edu → 8.5
    // Average: (8 + 4 + 8.5) / 3 ≈ 6.83
    expect(result.average).toBeCloseTo(6.83, 1);
  });

  it('returns average 5 for empty sources', () => {
    const result = computeEnhancedSourceCredibility([]);
    expect(result.average).toBe(5);
    expect(result.perSource).toEqual([]);
  });
});

/* ===================================================================
 * TESTS: computeSemanticRelevance — fallback path (CDN models unavailable)
 * =================================================================== */

describe('computeSemanticRelevance (fallback)', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('returns fallback score of 0.5 for each source when models unavailable', async () => {
    const result = await computeSemanticRelevance('test query', ['source text 1', 'source text 2']);

    expect(result.scores).toHaveLength(2);
    expect(result.scores[0]).toBe(0.5);
    expect(result.scores[1]).toBe(0.5);
    expect(result.average).toBe(0.5);
  });

  it('returns empty scores and fallback average for empty source texts', async () => {
    const result = await computeSemanticRelevance('test query', []);
    expect(result.scores).toEqual([]);
    expect(result.average).toBe(0.5);
  });
});

/* ===================================================================
 * TESTS: computeConsensusScore — fallback path (CDN models unavailable)
 * =================================================================== */

describe('computeConsensusScore (fallback)', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('returns fallback 0.5 when models unavailable', async () => {
    const result = await computeConsensusScore(['text a', 'text b']);
    expect(result.score).toBe(0.5);
    expect(result.agreementRate).toBe(1);
  });

  it('returns fallback for a single source', async () => {
    const result = await computeConsensusScore(['only one source']);
    expect(result.score).toBe(0.5);
    expect(result.agreementRate).toBe(1);
  });

  it('handles empty source texts', async () => {
    const result = await computeConsensusScore([]);
    expect(result.score).toBe(0.5);
    expect(result.agreementRate).toBe(1);
  });
});

/* ===================================================================
 * TESTS: computeBiasFromSentiment — fallback path (CDN models unavailable)
 * =================================================================== */

describe('computeBiasFromSentiment (fallback)', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('returns neutral fallback when sentiment model unavailable', async () => {
    const result = await computeBiasFromSentiment([createSource()]);

    expect(result.averageSentiment).toBeCloseTo(0, 1);
    expect(result.biasScore).toBeGreaterThanOrEqual(0);
    expect(result.biasScore).toBeLessThanOrEqual(1);
  });

  it('returns bias 0.1 for empty sources', async () => {
    const result = await computeBiasFromSentiment([]);
    expect(result.biasScore).toBe(0.1);
    expect(result.averageSentiment).toBe(0);
    expect(result.emotionalIntensity).toBe(0);
    expect(result.hasDomainOverride).toBe(false);
  });

  it('uses domain bias override when domain data is available', async () => {
    vi.mocked(lookupDomain).mockReturnValue({ bias: 'right', factual: 'low' });
    vi.mocked(biasToBiasScore).mockReturnValue(0.4);

    const result = await computeBiasFromSentiment([createSource({ domain: 'breitbart.com' })]);

    expect(result.hasDomainOverride).toBe(true);
    // domainBias = 0.4, sentimentBias ≈ 0 (model unavailable → neutral)
    // biasScore = 0.4 * 0.7 + 0 * 0.3 = 0.28
    expect(result.biasScore).toBeCloseTo(0.28, 2);
  });

  it('aggregates bias from multiple domain sources', async () => {
    vi.mocked(lookupDomain)
      .mockReturnValueOnce({ bias: 'left', factual: 'mixed' })
      .mockReturnValueOnce({ bias: 'right', factual: 'mixed' });
    vi.mocked(biasToBiasScore)
      .mockReturnValueOnce(0.4)
      .mockReturnValueOnce(0.4);

    const sources = [
      createSource({ domain: 'huffpost.com', title: 'Source 1' }),
      createSource({ domain: 'breitbart.com', title: 'Source 2' }),
    ];

    const result = await computeBiasFromSentiment(sources);

    expect(result.hasDomainOverride).toBe(true);
    // domainBiasSum = 0.4 + 0.4 = 0.8, domainCount = 2
    // domainBias = 0.8 / 2 = 0.4
    // sentimentBias ≈ 0 (neutral)
    // biasScore = 0.4 * 0.7 + 0 * 0.3 = 0.28
    expect(result.biasScore).toBeCloseTo(0.28, 2);
    expect(lookupDomain).toHaveBeenCalledTimes(2);
  });
});

/* ===================================================================
 * TESTS: computeAllScores — integration with all mocked components
 * =================================================================== */

describe('computeAllScores (integration)', () => {
  const baseScores = { ...defaultBaseScores };
  const baseSources = [
    createSource({ domain: 'reuters.com' }),
    createSource({ domain: 'nature.com' }),
  ];

  beforeEach(() => {
    resetMocks();

    // Default: no domain lookup matches (exercises domain-agnostic paths)
    vi.mocked(lookupDomain).mockReturnValue(null);

    // Default compromise mock
    mockNlp.mockImplementation(() => ({
      organizations: () => ({ out: () => ['NASA'] }),
      places: () => ({ out: () => ['Mars'] }),
      people: () => ({ out: () => ['Einstein'] }),
      nouns: () => ({ out: () => ['physics'] }),
    }));
  });

  it('produces a complete score object with all fields', async () => {
    const result = await computeAllScores(
      'test query',
      baseScores,
      baseSources,
      [],
      undefined
    );

    const expectedKeys = [
      'accuracy', 'bias', 'sourceDiversity', 'confidenceInterval',
      'consensusScore', 'relevanceScore', 'entityDiversity',
      'sentimentBias', 'enhancedCredibility', 'credibilityStdDev',
      'overallQuality', 'usingEmbeddings',
    ];
    for (const key of expectedKeys) {
      expect(result).toHaveProperty(key);
    }

    expect(typeof result.accuracy).toBe('number');
    expect(typeof result.overallQuality).toBe('number');
    expect(result.overallQuality).toBeGreaterThanOrEqual(0);
  });

  it('penalizes confidence when conflicts are present', async () => {
    const noConflicts = await computeAllScores('test', baseScores, baseSources, [], undefined);
    const withConflicts = await computeAllScores(
      'test',
      baseScores,
      baseSources,
      [{ type: 'contradiction', sources: [1, 2] }],
      undefined
    );

    expect(withConflicts.confidenceInterval).toBeLessThanOrEqual(noConflicts.confidenceInterval);
  });

  it('uses evidenceConsensus string to influence the score', async () => {
    const strong = await computeAllScores('test', baseScores, baseSources, [], 'strong');
    const contested = await computeAllScores('test', baseScores, baseSources, [], 'contested');

    expect(strong.confidenceInterval).toBeGreaterThan(contested.confidenceInterval);
  });

  it('runs the full pipeline end-to-end without throwing', async () => {
    const result = await computeAllScores(
      'What is quantum computing?',
      { accuracy: 7, bias: 0.2, sourceDiversity: 0.6, confidenceInterval: 0.75 },
      [
        { domain: 'nature.com', title: 'Quantum Overview', key_finding: 'Quantum computing is fast.', credibility_score: 9 },
        { domain: 'mit.edu', title: 'MIT Research', key_finding: 'New quantum algorithms developed.', credibility_score: 8.5 },
        { domain: 'arxiv.org', title: 'ArXiv Paper', key_finding: 'Error correction improves.', credibility_score: 7 },
      ],
      [{ type: 'methodology_diff', sources: [1, 2] }],
      'mixed'
    );

    expect(result.accuracy).toBeGreaterThan(0);
    expect(result.bias).toBeGreaterThanOrEqual(0);
    expect(result.sourceDiversity).toBeGreaterThan(0);
    expect(result.confidenceInterval).toBeGreaterThan(0);
    expect(result.consensusScore).toBeGreaterThanOrEqual(0);
    expect(result.relevanceScore).toBeGreaterThanOrEqual(0);
    expect(result.entityDiversity).toBeGreaterThanOrEqual(0);
    expect(result.enhancedCredibility).toBeGreaterThan(0);
    expect(result.overallQuality).toBeGreaterThan(0);
    expect(typeof result.usingEmbeddings).toBe('boolean');
  });

  it('computes credibilityStdDev correctly for multiple sources', async () => {
    const result = await computeAllScores(
      'test',
      baseScores,
      [
        createSource({ domain: 'reuters.com', credibility_score: 9 }),
        createSource({ domain: 'unknown.com', credibility_score: 5 }),
        createSource({ domain: 'harvard.edu', credibility_score: undefined }),
      ],
      [],
      undefined
    );

    // Source 1: unknown domain, cred=9 → 9
    // Source 2: unknown domain, cred=5 → 5
    // Source 3: .edu → 8.5
    // Mean ≈ 7.5, StdDev ≈ 1.78
    expect(result.credibilityStdDev).toBeGreaterThan(0);
    expect(result.credibilityStdDev).toBeLessThanOrEqual(3);
  });

  it('reports usingEmbeddings=true even in fallback path (consensus.score is 0.5 > 0)', async () => {
    const result = await computeAllScores('test', baseScores, baseSources, [], undefined);
    // Note: the fallback consensus score is 0.5, and the condition is `consensus.score > 0`,
    // so usingEmbeddings is true even when models are unavailable.
    expect(result.usingEmbeddings).toBe(true);
  });
});

/* ===================================================================
 * EDGE CASES
 * =================================================================== */

describe('edge cases', () => {
  beforeEach(() => {
    resetMocks();
    mockNlp.mockImplementation(() => ({
      organizations: () => ({ out: () => [] }),
      places: () => ({ out: () => [] }),
      people: () => ({ out: () => [] }),
      nouns: () => ({ out: () => [] }),
    }));
    vi.mocked(lookupDomain).mockReturnValue(null);
  });

  it('handles empty sources in computeAllScores', async () => {
    const result = await computeAllScores(
      'test',
      defaultBaseScores,
      [],
      [],
      undefined
    );

    expect(result.accuracy).toBeGreaterThanOrEqual(0);
    expect(result.enhancedCredibility).toBe(5); // default for empty
    expect(result.credibilityStdDev).toBe(0);
  });

  it('handles single source gracefully', async () => {
    const result = await computeAllScores(
      'test',
      defaultBaseScores,
      [createSource()],
      [],
      undefined
    );

    expect(result.credibilityStdDev).toBe(0); // single source → no deviation
    expect(result.sourceDiversity).toBeGreaterThanOrEqual(0);
  });

  it('handles sources with minimal fields', async () => {
    const result = await computeAllScores(
      'test',
      defaultBaseScores,
      [{ domain: 'example.com' }],
      [],
      undefined
    );

    expect(result.accuracy).toBeGreaterThanOrEqual(0);
    expect(result.enhancedCredibility).toBeGreaterThanOrEqual(0);
  });

  it('handles extremely long query strings without error', async () => {
    const longQuery = 'A'.repeat(10000);
    const result = await computeAllScores(
      longQuery,
      defaultBaseScores,
      [createSource(), createSource()],
      [],
      undefined
    );

    expect(result).toBeDefined();
    expect(result.relevanceScore).toBeGreaterThanOrEqual(0);
  });
});
