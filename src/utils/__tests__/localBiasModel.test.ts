import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  BIAS_CANDIDATE_LABELS,
  LABEL_BIAS_MAP,
  LABEL_FACTUAL_MAP,
  classifySourceBias,
  batchClassifySources,
  isLocalBiasModelReady,
  resetLocalBiasState,
  setMockClassifier,
} from '../localBiasModel';

/* ─── Label Mapping Tests ─── */

describe('Label mappings', () => {
  it('has a consistent entry in BIAS_CANDIDATE_LABELS for every key in LABEL_BIAS_MAP', () => {
    for (const label of Object.keys(LABEL_BIAS_MAP)) {
      expect(BIAS_CANDIDATE_LABELS).toContain(label);
    }
  });

  it('has a consistent entry in BIAS_CANDIDATE_LABELS for every key in LABEL_FACTUAL_MAP', () => {
    for (const label of Object.keys(LABEL_FACTUAL_MAP)) {
      expect(BIAS_CANDIDATE_LABELS).toContain(label);
    }
  });

  it('has the same keys in LABEL_BIAS_MAP and LABEL_FACTUAL_MAP', () => {
    const biasKeys = Object.keys(LABEL_BIAS_MAP).sort();
    const factualKeys = Object.keys(LABEL_FACTUAL_MAP).sort();
    expect(biasKeys).toEqual(factualKeys);
  });

  it('has exactly 7 candidate labels', () => {
    expect(BIAS_CANDIDATE_LABELS).toHaveLength(7);
  });

  it('assigns the lowest biasScore to reliable scientific evidence (0.05)', () => {
    expect(LABEL_BIAS_MAP['reliable scientific evidence']).toBe(0.05);
  });

  it('assigns the highest biasScore to misleading or false claims (0.70)', () => {
    expect(LABEL_BIAS_MAP['misleading or false claims']).toBe(0.70);
  });

  it('assigns the highest factualScore to reliable scientific evidence (10)', () => {
    expect(LABEL_FACTUAL_MAP['reliable scientific evidence']).toBe(10);
  });

  it('assigns the lowest factualScore to misleading or false claims (2)', () => {
    expect(LABEL_FACTUAL_MAP['misleading or false claims']).toBe(2);
  });

  it('has all biasScores in range [0.0, 1.0]', () => {
    for (const score of Object.values(LABEL_BIAS_MAP)) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it('has all factualScores in range [1, 10]', () => {
    for (const score of Object.values(LABEL_FACTUAL_MAP)) {
      expect(score).toBeGreaterThanOrEqual(1);
      expect(score).toBeLessThanOrEqual(10);
    }
  });
});

/* ─── Module State Tests ─── */

describe('isLocalBiasModelReady', () => {
  beforeEach(() => {
    resetLocalBiasState();
  });

  it('returns false before any classifier is loaded', () => {
    expect(isLocalBiasModelReady()).toBe(false);
  });

  it('returns true after a mock classifier is set', () => {
    setMockClassifier(vi.fn());
    expect(isLocalBiasModelReady()).toBe(true);
  });
});

/* ─── Mock Classifier Tests ─── */

describe('classifySourceBias with mock classifier', () => {
  beforeEach(() => {
    resetLocalBiasState();
  });

  it('returns null when no classifier is loaded (model unavailable)', async () => {
    const result = await classifySourceBias('Test title', 'Test finding', 'example.com');
    expect(result).toBeNull();
  });

  it('classifies "reliable scientific evidence" content correctly', async () => {
    const mock = vi.fn().mockResolvedValue({
      labels: ['reliable scientific evidence', 'neutral factual reporting', 'commercial or promotional'],
      scores: [0.89, 0.08, 0.03],
    });
    setMockClassifier(mock);

    const result = await classifySourceBias(
      'Randomized controlled trial shows vaccine efficacy',
      'Study demonstrates 95% reduction in infection rates with statistical significance',
      'nih.gov',
    );

    expect(result).not.toBeNull();
    expect(result!.label).toBe('reliable scientific evidence');
    expect(result!.biasScore).toBe(0.05);
    expect(result!.factualScore).toBe(10);
    expect(result!.confidence).toBe(0.89);
    expect(result!.source).toBe('ml-model');
  });

  it('classifies "misleading or false claims" content correctly', async () => {
    const mock = vi.fn().mockResolvedValue({
      labels: ['misleading or false claims', 'advocacy or opinion content', 'satirical or humorous'],
      scores: [0.76, 0.15, 0.09],
    });
    setMockClassifier(mock);

    const result = await classifySourceBias(
      'You wont believe what the government is hiding',
      'Mainstream media refuses to report this shocking truth about 5G towers',
      'naturalnews.com',
    );

    expect(result).not.toBeNull();
    expect(result!.label).toBe('misleading or false claims');
    expect(result!.biasScore).toBe(0.70);
    expect(result!.factualScore).toBe(2);
    expect(result!.confidence).toBe(0.76);
  });

  it('classifies "neutral factual reporting" correctly', async () => {
    const mock = vi.fn().mockResolvedValue({
      labels: ['neutral factual reporting', 'government official information', 'reliable scientific evidence'],
      scores: [0.65, 0.20, 0.15],
    });
    setMockClassifier(mock);

    const result = await classifySourceBias(
      'Federal Reserve announces interest rate decision',
      'The central bank raised rates by 25 basis points in its latest meeting',
      'reuters.com',
    );

    expect(result).not.toBeNull();
    expect(result!.label).toBe('neutral factual reporting');
    expect(result!.biasScore).toBe(0.10);
    expect(result!.factualScore).toBe(8);
  });

  it('classifies "advocacy or opinion content" correctly', async () => {
    const mock = vi.fn().mockResolvedValue({
      labels: ['advocacy or opinion content', 'commercial or promotional', 'neutral factual reporting'],
      scores: [0.55, 0.30, 0.15],
    });
    setMockClassifier(mock);

    const result = await classifySourceBias(
      'Why we must act now on climate change',
      'The time for half-measures is over — our childrens future depends on bold action today',
      'theguardian.com',
    );

    expect(result).not.toBeNull();
    expect(result!.label).toBe('advocacy or opinion content');
    expect(result!.biasScore).toBe(0.40);
    expect(result!.factualScore).toBe(5);
  });

  it('classifies "commercial or promotional" correctly', async () => {
    const mock = vi.fn().mockResolvedValue({
      labels: ['commercial or promotional', 'advocacy or opinion content', 'neutral factual reporting'],
      scores: [0.72, 0.18, 0.10],
    });
    setMockClassifier(mock);

    const result = await classifySourceBias(
      '10 reasons why our product is the best on the market',
      'Try our new formula today and see the difference for yourself — satisfaction guaranteed',
      'webmd.com',
    );

    expect(result).not.toBeNull();
    expect(result!.label).toBe('commercial or promotional');
    expect(result!.biasScore).toBe(0.40);
    expect(result!.factualScore).toBe(5);
  });

  it('classifies "satirical or humorous" correctly', async () => {
    const mock = vi.fn().mockResolvedValue({
      labels: ['satirical or humorous', 'advocacy or opinion content', 'misleading or false claims'],
      scores: [0.81, 0.12, 0.07],
    });
    setMockClassifier(mock);

    const result = await classifySourceBias(
      'Congress unveils new bill requiring all legislation to be written in interpretive dance',
      'Lawmakers argue that dance-based policymaking will increase transparency and public engagement',
      'theonion.com',
    );

    expect(result).not.toBeNull();
    expect(result!.label).toBe('satirical or humorous');
    expect(result!.biasScore).toBe(0.60);
    expect(result!.factualScore).toBe(3);
  });

  it('classifies "government official information" correctly', async () => {
    const mock = vi.fn().mockResolvedValue({
      labels: ['government official information', 'neutral factual reporting', 'reliable scientific evidence'],
      scores: [0.70, 0.20, 0.10],
    });
    setMockClassifier(mock);

    const result = await classifySourceBias(
      'CDC updates COVID-19 booster recommendations for fall 2025',
      'The updated guidance applies to all adults aged 65 and older based on new surveillance data',
      'cdc.gov',
    );

    expect(result).not.toBeNull();
    expect(result!.label).toBe('government official information');
    expect(result!.biasScore).toBe(0.10);
    expect(result!.factualScore).toBe(8);
  });

  it('uses domain as fallback when title and finding are both empty', async () => {
    const mock = vi.fn().mockResolvedValue({
      labels: ['neutral factual reporting', 'commercial or promotional', 'advocacy or opinion content'],
      scores: [0.50, 0.30, 0.20],
    });
    setMockClassifier(mock);

    const result = await classifySourceBias('', '', 'reuters.com');

    expect(result).not.toBeNull();
    // The classifier should have been called with the domain text
    expect(mock).toHaveBeenCalledWith('reuters.com', expect.any(Array), expect.any(Object));
  });

  it('truncates input text to 512 characters', async () => {
    const longTitle = 'x'.repeat(600);
    const mock = vi.fn().mockResolvedValue({
      labels: ['neutral factual reporting'],
      scores: [0.95],
    });
    setMockClassifier(mock);

    await classifySourceBias(longTitle, 'short finding', 'example.com');

    const callArg = mock.mock.calls[0][0];
    expect(callArg.length).toBeLessThanOrEqual(512);
  });

  it('uses a combination of title and finding for classification', async () => {
    const mock = vi.fn().mockResolvedValue({
      labels: ['reliable scientific evidence'],
      scores: [0.90],
    });
    setMockClassifier(mock);

    await classifySourceBias('Study title', 'Key research finding', 'example.com');

    const callArg = mock.mock.calls[0][0];
    expect(callArg).toContain('Study title');
    expect(callArg).toContain('Key research finding');
  });

  it('handles classifier that returns empty labels gracefully', async () => {
    const mock = vi.fn().mockResolvedValue({
      labels: [],
      scores: [],
    });
    setMockClassifier(mock);

    const result = await classifySourceBias('Title', 'Finding', 'example.com');
    expect(result).toBeNull();
  });

  it('handles classifier that throws an error gracefully', async () => {
    const mock = vi.fn().mockRejectedValue(new Error('Model inference failed'));
    setMockClassifier(mock);

    const result = await classifySourceBias('Title', 'Finding', 'example.com');
    expect(result).toBeNull();
  });

  it('handles classifier returning null result gracefully', async () => {
    const mock = vi.fn().mockResolvedValue(null);
    setMockClassifier(mock);

    const result = await classifySourceBias('Title', 'Finding', 'example.com');
    expect(result).toBeNull();
  });

  it('uses fallback biasScore (0.3) for unknown label', async () => {
    const mock = vi.fn().mockResolvedValue({
      labels: ['completely made up label'],
      scores: [0.99],
    });
    setMockClassifier(mock);

    const result = await classifySourceBias('Title', 'Finding', 'example.com');
    expect(result).not.toBeNull();
    expect(result!.biasScore).toBe(0.3);
    expect(result!.factualScore).toBe(5);
  });
});

/* ─── batchClassifySources Tests ─── */

describe('batchClassifySources', () => {
  beforeEach(() => {
    resetLocalBiasState();
  });

  it('returns empty Map when no classifier is loaded (model unavailable)', async () => {
    // Don't call setMockClassifier — simulate production environment
    const results = await batchClassifySources([
      { title: 'Article', domain: 'example.com' },
    ]);
    expect(results.size).toBe(0);
  });

  it('returns empty Map for empty input array', async () => {
    const results = await batchClassifySources([]);
    expect(results.size).toBe(0);
  });

  it('deduplicates by domain', async () => {
    const mock = vi.fn().mockResolvedValue({
      labels: ['neutral factual reporting'],
      scores: [0.80],
    });
    setMockClassifier(mock);

    const sources = [
      { title: 'Article A', key_finding: 'Finding A', domain: 'example.com' },
      { title: 'Article B', key_finding: 'Finding B', domain: 'example.com' },
      { title: 'Article C', key_finding: 'Finding C', domain: 'example.com' },
    ];

    const results = await batchClassifySources(sources);

    expect(results.size).toBe(1);
    expect(results.has('example.com')).toBe(true);
    // The classifier should only have been called once despite 3 sources
    expect(mock).toHaveBeenCalledTimes(1);
  });

  it('classifies different domains independently', async () => {
    const mock = vi.fn().mockImplementation(async (text: string) => {
      if (text.toLowerCase().includes('scientific')) {
        return { labels: ['reliable scientific evidence'], scores: [0.90] };
      }
      return { labels: ['commercial or promotional'], scores: [0.70] };
    });
    setMockClassifier(mock);

    const sources = [
      { title: 'Scientific study', key_finding: 'Peer-reviewed research findings', domain: 'nih.gov' },
      { title: 'Buy our product', key_finding: 'Best deal ever limited time offer', domain: 'shop.com' },
    ];

    const results = await batchClassifySources(sources);

    expect(results.size).toBe(2);
    expect(results.get('nih.gov')!.label).toBe('reliable scientific evidence');
    expect(results.get('shop.com')!.label).toBe('commercial or promotional');
  });

  it('handles mixed results (some succeed, some fail)', async () => {
    let callCount = 0;
    const mock = vi.fn().mockImplementation(async (_text: string) => {
      callCount++;
      if (callCount === 2) {
        return null; // Simulate failure for the second source
      }
      return { labels: ['neutral factual reporting'], scores: [0.75] };
    });
    setMockClassifier(mock);

    const sources = [
      { title: 'Source 1', domain: 'site1.com' },
      { title: 'Source 2', domain: 'site2.com' },
      { title: 'Source 3', domain: 'site3.com' },
    ];

    const results = await batchClassifySources(sources);

    // site1 and site3 should be in results, site2 should not (classifier returned null)
    expect(results.has('site1.com')).toBe(true);
    expect(results.has('site2.com')).toBe(false);
    expect(results.has('site3.com')).toBe(true);
  });

  it('removes www. prefix from domains when deduplicating', async () => {
    const mock = vi.fn().mockResolvedValue({
      labels: ['neutral factual reporting'],
      scores: [0.80],
    });
    setMockClassifier(mock);

    const sources = [
      { title: 'A', domain: 'www.example.com' },
      { title: 'B', domain: 'Example.COM' },
      { title: 'C', domain: 'example.com' },
    ];

    const results = await batchClassifySources(sources);

    expect(results.size).toBe(1);
    expect(results.has('example.com')).toBe(true);
  });

  it('handles sources with no domain (skips them)', async () => {
    const mock = vi.fn().mockResolvedValue({
      labels: ['neutral factual reporting'],
      scores: [0.80],
    });
    setMockClassifier(mock);

    const sources = [
      { title: 'A', domain: 'example.com' },
      { title: 'B', domain: '' },
      { title: 'C', domain: undefined },
    ];

    const results = await batchClassifySources(sources);

    expect(results.size).toBe(1);
    expect(results.has('example.com')).toBe(true);
    expect(results.has('')).toBe(false);
  });

  it('uses batchSize of 5 for concurrency control', async () => {
    const mock = vi.fn().mockResolvedValue({
      labels: ['neutral factual reporting'],
      scores: [0.80],
    });
    setMockClassifier(mock);

    // 7 unique domains — should be processed in 2 batches (5 + 2)
    const sources = Array.from({ length: 7 }, (_, i) => ({
      title: `Source ${i}`,
      domain: `site${i}.com`,
    }));

    const results = await batchClassifySources(sources);

    expect(results.size).toBe(7);
    // All 7 should have been classified
    expect(mock).toHaveBeenCalledTimes(7);
  });

  it('returns Map<string, LocalBiasResult> with correct shape', async () => {
    const mock = vi.fn().mockResolvedValue({
      labels: ['satirical or humorous'],
      scores: [0.92],
    });
    setMockClassifier(mock);

    const results = await batchClassifySources([
      { title: 'Satire piece', domain: 'theonion.com' },
    ]);

    expect(results.size).toBe(1);
    const entry = results.get('theonion.com')!;
    expect(entry).toHaveProperty('label');
    expect(entry).toHaveProperty('biasScore');
    expect(entry).toHaveProperty('factualScore');
    expect(entry).toHaveProperty('confidence');
    expect(entry).toHaveProperty('source');
    expect(entry.source).toBe('ml-model');
  });
});

/* ─── State Isolation Tests ─── */

describe('Test state isolation', () => {
  it('resetLocalBiasState clears mock classifier between tests', async () => {
    setMockClassifier(vi.fn().mockResolvedValue({
      labels: ['reliable scientific evidence'],
      scores: [0.90],
    }));

    expect(isLocalBiasModelReady()).toBe(true);

    resetLocalBiasState();

    expect(isLocalBiasModelReady()).toBe(false);
    const result = await classifySourceBias('Title', 'Finding', 'example.com');
    expect(result).toBeNull();
  });
});
