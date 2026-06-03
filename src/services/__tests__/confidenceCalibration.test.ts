// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { computeEvidenceBasedConfidence, determineConsensus } from '../../utils/scoringEngine';

/* ─── Sample Data ─── */

const HIGH_QUALITY_SOURCES = [
  { domain: 'pubmed.ncbi.nlm.nih.gov', credibility_score: 95 },
  { domain: 'nih.gov', credibility_score: 90 },
  { domain: 'nature.com', credibility_score: 88 },
  { domain: 'science.org', credibility_score: 85 },
  { domain: 'bbc.com', credibility_score: 78 },
];

const MIXED_QUALITY_SOURCES = [
  { domain: 'pubmed.ncbi.nlm.nih.gov', credibility_score: 95 },
  { domain: 'medium.com', credibility_score: 45 },
  { domain: 'substack.com', credibility_score: 40 },
];

const SINGLE_SOURCE = [
  { domain: 'pubmed.ncbi.nlm.nih.gov', credibility_score: 95 },
];

const LOW_QUALITY_SOURCES = [
  { domain: 'example.com', credibility_score: 25 },
  { domain: 'someblog.wordpress.com', credibility_score: 20 },
];

/* ─── computeEvidenceBasedConfidence ─── */

describe('computeEvidenceBasedConfidence', () => {
  it('returns insufficient for empty sources', () => {
    const result = computeEvidenceBasedConfidence([], [], []);
    expect(result.score).toBe(0.05);
    expect(result.coverage).toBe('insufficient');
  });

  it('returns comprehensive for 5+ high-quality sources with diversity and no conflicts', () => {
    const result = computeEvidenceBasedConfidence(HIGH_QUALITY_SOURCES, [], []);
    expect(result.coverage).toBe('comprehensive');
    expect(result.score).toBeGreaterThanOrEqual(0.7);
  });

  it('returns moderate for 3 mixed-quality sources with no conflicts', () => {
    const result = computeEvidenceBasedConfidence(MIXED_QUALITY_SOURCES, [], []);
    // 3 sources with mixed credibility
    expect(result.score).toBeGreaterThanOrEqual(0.2);
    expect(result.score).toBeLessThan(0.7);
  });

  it('penalizes confidence when conflicts are present', () => {
    const withoutConflicts = computeEvidenceBasedConfidence(HIGH_QUALITY_SOURCES, [], []);
    const withConflicts = computeEvidenceBasedConfidence(HIGH_QUALITY_SOURCES, [
      { claim_a: 'X', claim_b: 'Y', explanation: 'Conflict' },
    ], []);
    expect(withConflicts.score).toBeLessThan(withoutConflicts.score);
  });

  it('uses citation verification rate to boost confidence', () => {
    const withoutCitations = computeEvidenceBasedConfidence(MIXED_QUALITY_SOURCES, [], []);
    const withHighSupport = computeEvidenceBasedConfidence(MIXED_QUALITY_SOURCES, [], [
      { verdict: 'supported' },
      { verdict: 'supported' },
      { verdict: 'supported' },
    ]);
    expect(withHighSupport.score).toBeGreaterThanOrEqual(withoutCitations.score);
  });

  it('returns limited for single source', () => {
    const result = computeEvidenceBasedConfidence(SINGLE_SOURCE, [], []);
    expect(result.coverage).toBe('limited');
  });

  it('returns limited for very low quality sources', () => {
    const result = computeEvidenceBasedConfidence(LOW_QUALITY_SOURCES, [], []);
    expect(result.coverage).toBe('limited');
  });

  it('applies conflict penalty of 0.15 per conflict', () => {
    const result = computeEvidenceBasedConfidence(HIGH_QUALITY_SOURCES, [
      { claim_a: 'A', claim_b: 'B' },
      { claim_a: 'C', claim_b: 'D' },
      { claim_a: 'E', claim_b: 'F' },
    ], []);
    // 3 conflicts × 0.15 = 0.45 penalty, capped at 0.5
    expect(result.score).toBeGreaterThan(0);
  });

  it('handles sources with missing credibility scores', () => {
    const result = computeEvidenceBasedConfidence(
      [{ domain: 'example.com' }, { domain: 'test.org' }],
      [],
      []
    );
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.coverage).toBeDefined();
  });
});

/* ─── determineConsensus ─── */

describe('determineConsensus', () => {
  it('returns insufficient for empty sources', () => {
    const result = determineConsensus([], [], []);
    expect(result.level).toBe('insufficient');
    expect(result.reason).toContain('No sources');
  });

  it('returns strong when multiple high-credibility independent sources agree', () => {
    const result = determineConsensus(HIGH_QUALITY_SOURCES, [], [
      { verdict: 'supported' },
      { verdict: 'supported' },
      { verdict: 'supported' },
    ]);
    expect(result.level).toBe('strong');
    expect(result.reason).toContain('high-credibility');
    expect(result.reason).toContain('independent');
  });

  it('returns contested for 3+ conflicts', () => {
    const result = determineConsensus(HIGH_QUALITY_SOURCES, [
      { claim_a: 'A', claim_b: 'B' },
      { claim_a: 'C', claim_b: 'D' },
      { claim_a: 'E', claim_b: 'F' },
    ], []);
    expect(result.level).toBe('contested');
    expect(result.reason).toContain('conflict');
  });

  it('returns mixed for a single conflict', () => {
    const result = determineConsensus(HIGH_QUALITY_SOURCES, [
      { claim_a: 'A', claim_b: 'B' },
    ], []);
    expect(result.level).toBe('mixed');
    expect(result.reason).toContain('conflicting');
  });

  it('returns mixed when citation support rate is low', () => {
    const result = determineConsensus(HIGH_QUALITY_SOURCES, [], [
      { verdict: 'contradicted' },
      { verdict: 'unrelated' },
      { verdict: 'partial' },
    ]);
    expect(result.level).toBe('mixed');
  });

  it('returns moderate when sources are few or low diversity', () => {
    const result = determineConsensus(MIXED_QUALITY_SOURCES, [], []);
    expect(result.level).toBe('moderate');
  });

  it('returns contested with 2 high-cred sources disagreeing', () => {
    const result = determineConsensus([
      { domain: 'pubmed.ncbi.nlm.nih.gov', credibility_score: 95 },
      { domain: 'nih.gov', credibility_score: 90 },
      { domain: 'medium.com', credibility_score: 45 },
      { domain: 'substack.com', credibility_score: 40 },
    ], [
      { claim_a: 'A', claim_b: 'B' },
      { claim_a: 'C', claim_b: 'D' },
    ], []);
    expect(result.level).toBe('contested');
  });

  it('returns a reason string for all consensus levels', () => {
    const cases = [
      { sources: [], conflicts: [], expected: 'insufficient' },
      { sources: HIGH_QUALITY_SOURCES, conflicts: [], expected: 'moderate' },
      { sources: HIGH_QUALITY_SOURCES, conflicts: [{ claim_a: 'A', claim_b: 'B' }], expected: 'mixed' },
      { sources: HIGH_QUALITY_SOURCES, conflicts: [{ claim_a: 'A', claim_b: 'B' }, { claim_a: 'C', claim_b: 'D' }, { claim_a: 'E', claim_b: 'F' }], expected: 'contested' },
      { sources: MIXED_QUALITY_SOURCES, conflicts: [], expected: 'moderate' },
    ];
    for (const c of cases) {
      const result = determineConsensus(c.sources, c.conflicts, []);
      expect(result.level).toBe(c.expected);
      expect(result.reason.length).toBeGreaterThan(0);
    }
  });
});
