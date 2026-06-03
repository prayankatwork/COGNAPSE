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
    organizations: () => ({ out: () => ['NASA', 'CERN'] }) as any,
    places: () => ({ out: () => ['Geneva', 'Moon'] }) as any,
    people: () => ({ out: () => ['Einstein'] }) as any,
    nouns: () => ({ out: () => ['physics', 'space', 'research'] }) as any,
  }) as any),
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
  computeAllScores,
} from '../scoringEngine';

import { lookupDomain, factualToScore } from '../domainCredibility';
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
      organizations: () => ({ out: () => ['NASA', 'CERN'] }) as any,
      places: () => ({ out: () => ['Geneva', 'Moon'] }) as any,
      people: () => ({ out: () => ['Einstein'] }) as any,
      nouns: () => ({ out: () => ['physics', 'space', 'research'] }) as any,
    }) as any);
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
        organizations: () => ({ out: () => ['NASA'] }) as any,
        places: () => ({ out: () => ['Mars'] }) as any,
        people: () => ({ out: () => ['Einstein'] }) as any,
        nouns: () => ({ out: () => ['physics'] }) as any,
      }) as any)
      .mockImplementationOnce(() => ({
        organizations: () => ({ out: () => ['ESA', 'NASA'] }) as any,
        places: () => ({ out: () => ['Mars', 'Venus'] }) as any,
        people: () => ({ out: () => ['Einstein', 'Newton'] }) as any,
        nouns: () => ({ out: () => ['physics', 'astronomy'] }) as any,
      }) as any);

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
      organizations: () => ({ out: () => ['NASA'] }) as any,
      places: () => ({ out: () => ['Mars'] }) as any,
      people: () => ({ out: () => ['Einstein'] }) as any,
      nouns: () => ({ out: () => ['physics'] }) as any,
    }) as any);

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
      organizations: () => ({ out: () => ['NASA'] }) as any,
      places: () => ({ out: () => ['Mars'] }) as any,
      people: () => ({ out: () => ['Einstein'] }) as any,
      nouns: () => ({ out: () => ['physics'] }) as any,
    }) as any);

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
      organizations: () => ({ out: () => [] }) as any,
      places: () => ({ out: () => [] }) as any,
      people: () => ({ out: () => [] }) as any,
      nouns: () => ({ out: () => [] }) as any,
    }) as any);

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

  it('returns fallback score 0 when models unavailable', async () => {
    const result = await computeConsensusScore(['text a', 'text b']);
    expect(result.score).toBe(0);
    expect(result.agreementRate).toBe(1);
  });

  it('returns fallback score 0 for a single source', async () => {
    const result = await computeConsensusScore(['only one source']);
    expect(result.score).toBe(0);
    expect(result.agreementRate).toBe(1);
  });

  it('handles empty source texts', async () => {
    const result = await computeConsensusScore([]);
    expect(result.score).toBe(0);
    expect(result.agreementRate).toBe(1);
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
      organizations: () => ({ out: () => ['NASA'] }) as any,
      places: () => ({ out: () => ['Mars'] }) as any,
      people: () => ({ out: () => ['Einstein'] }) as any,
      nouns: () => ({ out: () => ['physics'] }) as any,
    }) as any);
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

  it('reports usingEmbeddings=false when models are unavailable', async () => {
    const result = await computeAllScores('test', baseScores, baseSources, [], undefined);
    // Fix: consensus fallback now returns score 0, so `consensus.score > 0` is false,
    // and `relevance.average !== 0.5` is also false → usingEmbeddings = false.
    expect(result.usingEmbeddings).toBe(false);
  });
});

/* ===================================================================
 * TESTS: detectAdversarialQuery
 * =================================================================== */

describe('detectAdversarialQuery', () => {
  // Import needs to be at top, but we've already imported. Let's test inline.
  // Note: we import these at module level below

  it('detects flat earth queries', async () => {
    const { detectAdversarialQuery } = await import('../scoringEngine');
    expect(detectAdversarialQuery('flat earth theory evidence').isAdversarial).toBe(true);
    expect(detectAdversarialQuery('the flat earth myth').isAdversarial).toBe(true);
  });

  it('detects anti-vaccine queries', async () => {
    const { detectAdversarialQuery } = await import('../scoringEngine');
    expect(detectAdversarialQuery('Do vaccines cause autism?').isAdversarial).toBe(true);
    expect(detectAdversarialQuery('vaccines cause infertility').isAdversarial).toBe(true);
  });

  it('does not flag legitimate scientific queries', async () => {
    const { detectAdversarialQuery } = await import('../scoringEngine');
    expect(detectAdversarialQuery('What is vaccine efficacy against COVID-19?').isAdversarial).toBe(false);
    expect(detectAdversarialQuery('How does the Earth\'s orbit work?').isAdversarial).toBe(false);
    expect(detectAdversarialQuery('What causes autism spectrum disorder?').isAdversarial).toBe(false);
  });

  it('returns label for matched patterns', async () => {
    const { detectAdversarialQuery } = await import('../scoringEngine');
    const result = detectAdversarialQuery('do vaccines cause autism');
    expect(result.isAdversarial).toBe(true);
    expect(result.label).toBe('anti_vax');
  });

  it('returns false for empty string', async () => {
    const { detectAdversarialQuery } = await import('../scoringEngine');
    expect(detectAdversarialQuery('').isAdversarial).toBe(false);
    expect(detectAdversarialQuery(null as unknown as string).isAdversarial).toBe(false);
    expect(detectAdversarialQuery(undefined as unknown as string).isAdversarial).toBe(false);
  });

  it('does not flag normal queries', async () => {
    const { detectAdversarialQuery } = await import('../scoringEngine');
    expect(detectAdversarialQuery('What is the capital of France?').isAdversarial).toBe(false);
    expect(detectAdversarialQuery('How does photosynthesis work?').isAdversarial).toBe(false);
    expect(detectAdversarialQuery('Health benefits of exercise').isAdversarial).toBe(false);
  });
});

/* ===================================================================
 * TESTS: detectUncertaintyQuery — especially regression: should NOT flag settled science
 * =================================================================== */

describe('detectUncertaintyQuery', () => {
  it('flags queries with explicit debate keywords', async () => {
    const { detectUncertaintyQuery } = await import('../scoringEngine');
    expect(detectUncertaintyQuery('Is there a controversy about vaccine safety?')).toBe(true);
    expect(detectUncertaintyQuery('a debate in economics')).toBe(true);
    expect(detectUncertaintyQuery('a debated topic in economics')).toBe(true);
  });

  it('flags queries about future predictions', async () => {
    const { detectUncertaintyQuery } = await import('../scoringEngine');
    expect(detectUncertaintyQuery('What will AI look like in 2030?')).toBe(true);
    expect(detectUncertaintyQuery('Future outlook for renewable energy')).toBe(true);
    expect(detectUncertaintyQuery('AI predictions for 2025')).toBe(true);
  });

  it('flags queries with risk/benefit framing', async () => {
    const { detectUncertaintyQuery } = await import('../scoringEngine');
    expect(detectUncertaintyQuery('What are the risks and benefits of social media?')).toBe(true);
    expect(detectUncertaintyQuery('risk vs reward of investing')).toBe(true);
  });

  it('flags queries about mixed or conflicting studies', async () => {
    const { detectUncertaintyQuery } = await import('../scoringEngine');
    expect(detectUncertaintyQuery('Studies differ on the health effects of coffee')).toBe(true);
    expect(detectUncertaintyQuery('The literature is mixed on this topic')).toBe(true);
  });

  it('does NOT flag settled-science queries about effects/impact', async () => {
    const { detectUncertaintyQuery } = await import('../scoringEngine');
    // These were previously false positives from the broad "effects of" pattern
    expect(detectUncertaintyQuery('What are the effects of gravity on light?')).toBe(false);
    expect(detectUncertaintyQuery('How does photosynthesis work in plants?')).toBe(false);
    expect(detectUncertaintyQuery('What is the impact of gravity on time?')).toBe(false);
  });

  it('returns false for empty/undefined query', async () => {
    const { detectUncertaintyQuery } = await import('../scoringEngine');
    expect(detectUncertaintyQuery('')).toBe(false);
  });
});

/* ===================================================================
 * EDGE CASES
 * =================================================================== */

describe('edge cases', () => {
  beforeEach(() => {
    resetMocks();
    mockNlp.mockImplementation(() => ({
      organizations: () => ({ out: () => [] }) as any,
      places: () => ({ out: () => [] }) as any,
      people: () => ({ out: () => [] }) as any,
      nouns: () => ({ out: () => [] }) as any,
    }) as any);
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
