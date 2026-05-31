// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock callCloudAI before importing the module under test
vi.mock('../aiService', () => ({
  callCloudAI: vi.fn(),
}));

import { callCloudAI } from '../aiService';
import { calibrateConfidence } from '../geminiService';

/* ─── Helpers ─── */

/** Sample synthesis that mimics a real research report */
const SAMPLE_SYNTHESIS = `
The impact of AI on software development is multifaceted. Studies from 2024 show that AI-assisted coding tools increase developer productivity by an average of 35-45% across surveyed teams (Smith et al., 2024). However, code quality metrics remain mixed, with some research indicating a 15% increase in bug density when AI-generated code is not properly reviewed (Johnson, 2024). The most significant gains appear in boilerplate code generation and test writing, while architectural decisions and security-critical code still require substantial human oversight. Open-source telemetry from GitHub Copilot indicates that 46% of AI code suggestions are accepted, suggesting both utility and limitations in current tooling.
`.trim();

describe('calibrateConfidence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ─── Happy Path ─── */

  it('returns "sure" when model expresses high confidence', async () => {
    vi.mocked(callCloudAI).mockResolvedValue(JSON.stringify({
      confidence_rating: 'sure',
      gaps_identified: [],
      narrative: 'The synthesis is well-supported by multiple credible sources with consistent findings.',
    }));

    const result = await calibrateConfidence(SAMPLE_SYNTHESIS, 'impact of AI on software development');

    expect(result).not.toBeNull();
    expect(result!.confidence_rating).toBe('sure');
    expect(result!.gaps_identified).toEqual([]);
    expect(result!.narrative).toContain('well-supported');
  });

  it('returns "partially_sure" when model expresses moderate confidence', async () => {
    vi.mocked(callCloudAI).mockResolvedValue(JSON.stringify({
      confidence_rating: 'partially_sure',
      gaps_identified: ['Long-term effects beyond 2025 are not well documented', 'Sample sizes in some studies are small'],
      narrative: 'While the core findings are consistent, some claims rely on limited data.',
    }));

    const result = await calibrateConfidence(SAMPLE_SYNTHESIS, 'impact of AI on software development');

    expect(result).not.toBeNull();
    expect(result!.confidence_rating).toBe('partially_sure');
    expect(result!.gaps_identified).toHaveLength(2);
    expect(result!.gaps_identified[0]).toContain('Long-term');
  });

  it('returns "uncertain" when model expresses low confidence', async () => {
    vi.mocked(callCloudAI).mockResolvedValue(JSON.stringify({
      confidence_rating: 'uncertain',
      gaps_identified: [
        'Conflicting evidence on long-term productivity impact',
        'Rapidly evolving tooling may invalidate current findings',
        'Geographic bias in surveyed populations',
      ],
      narrative: 'The evidence base is too fragmented for confident conclusions.',
    }));

    const result = await calibrateConfidence(SAMPLE_SYNTHESIS, 'impact of AI on software development');

    expect(result).not.toBeNull();
    expect(result!.confidence_rating).toBe('uncertain');
    expect(result!.gaps_identified).toHaveLength(3);
  });

  /* ─── Edge Cases ─── */

  it('returns null for empty synthesis', async () => {
    const result = await calibrateConfidence('', 'some query');
    expect(result).toBeNull();
  });

  it('returns null for very short synthesis (under 50 chars)', async () => {
    const result = await calibrateConfidence('Short text under fifty characters here', 'some query');
    expect(result).toBeNull();
  });

  it('handles malformed JSON from the model gracefully', async () => {
    vi.mocked(callCloudAI).mockResolvedValue('not valid json at all');

    const result = await calibrateConfidence(SAMPLE_SYNTHESIS, 'impact of AI');
    expect(result).toBeNull();
  });

  it('handles non-JSON string response', async () => {
    vi.mocked(callCloudAI).mockResolvedValue('Here is my assessment: I am sure about this');

    const result = await calibrateConfidence(SAMPLE_SYNTHESIS, 'impact of AI');
    expect(result).toBeNull();
  });

  it('handles when callCloudAI throws an exception', async () => {
    vi.mocked(callCloudAI).mockRejectedValue(new Error('API timeout'));

    const result = await calibrateConfidence(SAMPLE_SYNTHESIS, 'impact of AI');
    expect(result).toBeNull();
  });

  it('handles null response from callCloudAI', async () => {
    vi.mocked(callCloudAI).mockResolvedValue(null as unknown as string);

    const result = await calibrateConfidence(SAMPLE_SYNTHESIS, 'impact of AI');
    expect(result).toBeNull();
  });

  it('handles undefined response from callCloudAI', async () => {
    vi.mocked(callCloudAI).mockResolvedValue(undefined as unknown as string);

    const result = await calibrateConfidence(SAMPLE_SYNTHESIS, 'impact of AI');
    expect(result).toBeNull();
  });

  /* ─── Field Validation ─── */

  it('defaults to "partially_sure" when confidence_rating is missing', async () => {
    vi.mocked(callCloudAI).mockResolvedValue(JSON.stringify({
      gaps_identified: ['Some gaps'],
      narrative: 'Moderate confidence due to limited data.',
    }));

    const result = await calibrateConfidence(SAMPLE_SYNTHESIS, 'impact of AI');
    expect(result).not.toBeNull();
    expect(result!.confidence_rating).toBe('partially_sure');
  });

  it('defaults to "partially_sure" for invalid confidence_rating', async () => {
    vi.mocked(callCloudAI).mockResolvedValue(JSON.stringify({
      confidence_rating: 'very_confident',
      gaps_identified: [],
      narrative: 'I am very confident.',
    }));

    const result = await calibrateConfidence(SAMPLE_SYNTHESIS, 'impact of AI');
    expect(result).not.toBeNull();
    expect(result!.confidence_rating).toBe('partially_sure');
  });

  it('caps gaps_identified at 5 items', async () => {
    vi.mocked(callCloudAI).mockResolvedValue(JSON.stringify({
      confidence_rating: 'uncertain',
      gaps_identified: [
        'Gap 1', 'Gap 2', 'Gap 3', 'Gap 4', 'Gap 5', 'Gap 6', 'Gap 7',
      ],
      narrative: 'Many gaps identified.',
    }));

    const result = await calibrateConfidence(SAMPLE_SYNTHESIS, 'impact of AI');
    expect(result).not.toBeNull();
    expect(result!.gaps_identified).toHaveLength(5);
  });

  it('returns empty array when gaps_identified is not an array', async () => {
    vi.mocked(callCloudAI).mockResolvedValue(JSON.stringify({
      confidence_rating: 'sure',
      gaps_identified: 'not an array',
      narrative: 'Confident.',
    }));

    const result = await calibrateConfidence(SAMPLE_SYNTHESIS, 'impact of AI');
    expect(result).not.toBeNull();
    expect(result!.gaps_identified).toEqual([]);
  });

  it('uses fallback narrative when narrative is missing', async () => {
    vi.mocked(callCloudAI).mockResolvedValue(JSON.stringify({
      confidence_rating: 'sure',
      gaps_identified: [],
    }));

    const result = await calibrateConfidence(SAMPLE_SYNTHESIS, 'impact of AI');
    expect(result).not.toBeNull();
    expect(result!.narrative).toBe('Confidence assessment unavailable');
  });

  it('truncates synthesis to 2000 characters in the prompt', async () => {
    const longSynthesis = 'A'.repeat(3000);
    vi.mocked(callCloudAI).mockResolvedValue(JSON.stringify({
      confidence_rating: 'sure',
      gaps_identified: [],
      narrative: 'Confident.',
    }));

    await calibrateConfidence(longSynthesis, 'impact of AI');

    // Verify the prompt passed to callCloudAI contains truncated synthesis
    const promptArg = vi.mocked(callCloudAI).mock.calls[0][0];
    // The synthesis should be in the prompt but truncated
    expect(promptArg).toContain('A'.repeat(2000));
    // It should NOT contain the full 3000 chars
    expect(promptArg).not.toContain('A'.repeat(3000));
  });

  /* ─── Prompt Structure ─── */

  it('includes the query in the prompt', async () => {
    vi.mocked(callCloudAI).mockResolvedValue(JSON.stringify({
      confidence_rating: 'sure',
      gaps_identified: [],
      narrative: 'Confident.',
    }));

    await calibrateConfidence(SAMPLE_SYNTHESIS, 'custom query about AI');

    const promptArg = vi.mocked(callCloudAI).mock.calls[0][0];
    expect(promptArg).toContain('custom query about AI');
  });

  it('includes the confidence_rating schema in the prompt', async () => {
    vi.mocked(callCloudAI).mockResolvedValue(JSON.stringify({
      confidence_rating: 'sure',
      gaps_identified: [],
      narrative: 'Confident.',
    }));

    await calibrateConfidence(SAMPLE_SYNTHESIS, 'test query');

    const promptArg = vi.mocked(callCloudAI).mock.calls[0][0];
    expect(promptArg).toContain('"confidence_rating"');
    expect(promptArg).toContain('"partially_sure"');
  });

  it('includes self-assessment questions in the prompt', async () => {
    vi.mocked(callCloudAI).mockResolvedValue(JSON.stringify({
      confidence_rating: 'sure',
      gaps_identified: [],
      narrative: 'Confident.',
    }));

    await calibrateConfidence(SAMPLE_SYNTHESIS, 'test query');

    const promptArg = vi.mocked(callCloudAI).mock.calls[0][0];
    expect(promptArg).toContain('Are there claims');
    expect(promptArg).toContain('alternative interpretations');
  });
});
