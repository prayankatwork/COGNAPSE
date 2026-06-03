// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { generateMissingConflicts } from '../conflictDetector';
import type { COGNAPSE_Output, GroundedSource } from '../../types';

/* ===================================================================
 * HELPERS
 * =================================================================== */

function createSource(overrides: Partial<GroundedSource> = {}): GroundedSource {
  return {
    id: 1,
    title: 'Test Title',
    url: 'https://example.com/article',
    domain: 'example.com',
    type: 'industry',
    snippet: 'A snippet of text about the topic.',
    credibility_score: 80,
    relevance_score: 75,
    key_finding: 'A key finding from the source.',
    published_date: '2025-01-01',
    bias_flag: null,
    retrieval_timestamp: '2025-05-01T00:00:00Z',
    ...overrides,
  };
}

function createReport(overrides: Partial<COGNAPSE_Output> = {}): COGNAPSE_Output {
  return {
    query_understood: 'test query',
    mode: 'standard',
    geo_triggered: false,
    timeline_triggered: false,
    summary: {
      bottom_line: 'Test bottom line.',
    },
    sources: [],
    conflicts: [],
    ...overrides,
  };
}

/* ===================================================================
 * TESTS: generateMissingConflicts guard clauses
 * =================================================================== */

describe('generateMissingConflicts - guard clauses', () => {
  it('does nothing when sources array is empty', () => {
    const report = createReport({ sources: [], conflicts: [] });
    generateMissingConflicts(report);
    expect(report.conflicts).toEqual([]);
  });

  it('does nothing when sources is undefined', () => {
    const report = createReport({ sources: undefined, conflicts: [] });
    generateMissingConflicts(report);
    expect(report.conflicts).toEqual([]);
  });

  it('does nothing with a single source', () => {
    const report = createReport({
      sources: [createSource({ id: 1 })],
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toEqual([]);
  });

  it('preserves existing conflicts and does not overwrite', () => {
    const existingConflicts = [
      {
        claim_a: 'Existing claim A',
        source_a: 'domain-a.com',
        claim_b: 'Existing claim B',
        source_b: 'domain-b.com',
        explanation: 'Pre-existing conflict.',
      },
    ];

    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Increase in sales', key_finding: 'Growth boost progress sales' }),
        createSource({ id: 2, title: 'Decrease in profits', key_finding: 'Decline loss risk profits' }),
      ],
      conflicts: existingConflicts,
    });

    generateMissingConflicts(report);
    expect(report.conflicts).toEqual(existingConflicts);
  });

  it('proceeds to stance analysis when conflicts is empty array (length 0)', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Increase in sales', key_finding: 'Sales grew significantly' }),
        createSource({ id: 2, title: 'Decrease in profits', key_finding: 'Profits decline loss' }),
      ],
      conflicts: [],
    });
    generateMissingConflicts(report);
    // With threshold at 1, 'increase' triggers positive and 'decline'/'loss' triggers negative → conflict found
    expect(report.conflicts).toHaveLength(1);
  });
});

/* ===================================================================
 * TESTS: no conflict generated
 * =================================================================== */

describe('generateMissingConflicts - no conflict cases', () => {
  it('does not generate conflict when all sources are positive', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Improve in technology', key_finding: 'Growth accelerating rapid progress' }),
        createSource({ id: 2, title: 'Breakthrough innovation', key_finding: 'Progress advance boost strong' }),
      ],
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toEqual([]);
  });

  it('does not generate conflict when all sources are negative', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Decline in market', key_finding: 'Loss revenue threaten growth warning' }),
        createSource({ id: 2, title: 'Crisis in supply chain', key_finding: 'Risk concern downturn failure' }),
      ],
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toEqual([]);
  });

  it('does not generate conflict when sources have neutral/no matching keywords', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'The color of the sky', key_finding: 'The sky appears blue during daytime.' }),
        createSource({ id: 2, title: 'Water boiling point', key_finding: 'Water boils at 100 degrees Celsius.' }),
      ],
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toEqual([]);
  });

  it('does not generate conflict when both sources have positive keywords only', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Strong growth in economy', key_finding: 'Better than expected boost progress' }),
        createSource({ id: 2, title: 'Positive outlook for jobs', key_finding: 'Higher employment gain improvement' }),
      ],
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toEqual([]);
  });

  it('does not generate conflict when both sources have negative keywords only', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Decline in wages', key_finding: 'Risk recession threaten danger' }),
        createSource({ id: 2, title: 'Loss of market share', key_finding: 'Crisis warning failure issue' }),
      ],
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toEqual([]);
  });

  it('does not generate conflict when source has mixed keywords (both positive and negative)', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Growth and risk', key_finding: 'Improve and concern both present' }),
        createSource({ id: 2, title: 'Decline and improve', key_finding: 'Loss and growth are seen' }),
      ],
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toEqual([]);
  });
});

/* ===================================================================
 * TESTS: conflict generation
 * =================================================================== */

describe('generateMissingConflicts - conflict generated', () => {
  it('generates a conflict when sources have opposing stances', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Increase in economy', key_finding: 'Growth boost progress sector' }),
        createSource({ id: 2, title: 'Decline in employment', key_finding: 'Loss risk concern jobs' }),
      ],
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toHaveLength(1);
  });

  it('generates conflict with correct structure', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Increase in economy', key_finding: 'Growth boost progress sector', domain: 'source-a.com' }),
        createSource({ id: 2, title: 'Decline in employment', key_finding: 'Loss risk concern jobs', domain: 'source-b.com' }),
      ],
      conflicts: [],
    });
    generateMissingConflicts(report);

    const conflict = report.conflicts![0];
    expect(conflict).toHaveProperty('claim_a');
    expect(conflict).toHaveProperty('source_a');
    expect(conflict).toHaveProperty('claim_b');
    expect(conflict).toHaveProperty('source_b');
    expect(conflict).toHaveProperty('explanation');
    expect(conflict.claim_a).toContain('Increase');
    expect(conflict.source_a).toContain('source-a.com');
    expect(conflict.claim_b).toContain('Decline');
    expect(conflict.source_b).toContain('source-b.com');
    expect(conflict.explanation).toContain('divergent stances');
  });

  it('generates conflict when keywords are in key_finding only (neutral title)', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Research Report', key_finding: 'This breakthrough advance opportunity progress' }),
        createSource({ id: 2, title: 'Research Report', key_finding: 'The decline pose risk danger concern' }),
      ],
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toHaveLength(1);
  });

  it('generates conflict when keywords are in title only (neutral key_finding)', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Great Increase and Progress 2025', key_finding: 'The report covers various aspects.' }),
        createSource({ id: 2, title: 'Serious Decline and Loss Risk', key_finding: 'The report covers various aspects.' }),
      ],
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toHaveLength(1);
  });

  it('includes up to 3 sources per side in the conflict', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Increase sector A', key_finding: 'Growth boost progress improve', domain: 'a.com' }),
        createSource({ id: 2, title: 'Increase sector B', key_finding: 'Advance strong better gain', domain: 'b.com' }),
        createSource({ id: 3, title: 'Increase sector C', key_finding: 'Success opportunity innovation leader', domain: 'c.com' }),
        createSource({ id: 4, title: 'Increase sector D', key_finding: 'Effective proven support upward', domain: 'd.com' }),
        createSource({ id: 5, title: 'Decline sector X', key_finding: 'Loss risk concern warning', domain: 'x.com' }),
        createSource({ id: 6, title: 'Decline sector Y', key_finding: 'Crisis danger threat failure', domain: 'y.com' }),
        createSource({ id: 7, title: 'Decline sector Z', key_finding: 'Problem issue struggle difficulty', domain: 'z.com' }),
      ],
      conflicts: [],
    });
    generateMissingConflicts(report);

    expect(report.conflicts).toHaveLength(1);
    const conflict = report.conflicts![0];
    const sourceACount = conflict.source_a.split(', ').length;
    const sourceBCount = conflict.source_b.split(', ').length;
    expect(sourceACount).toBeLessThanOrEqual(3);
    expect(sourceBCount).toBeLessThanOrEqual(3);
  });
});

/* ===================================================================
 * TESTS: word boundary correctness
 * =================================================================== */

describe('generateMissingConflicts - word boundary correctness', () => {
  it('does not match "increase" as substring within "increased"', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'The increased revenue', key_finding: 'We observed an increased demand' }),
        createSource({ id: 2, title: 'The decreasing trend', key_finding: 'A decreasing pattern' }),
      ],
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toEqual([]);
  });

  it('matches keyword as a standalone word', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'We expect increase boost', key_finding: 'Growth strong progress' }),
        createSource({ id: 2, title: 'Markets risk decline', key_finding: 'Loss concern warning' }),
      ],
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toHaveLength(1);
  });

  it('matches keyword inside hyphenated compound (hyphen is word boundary)', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Anti-increase measures', key_finding: 'Breakthrough non-increase scenario' }),
        createSource({ id: 2, title: 'Post-decline risk', key_finding: 'The counter-decline danger scenario' }),
      ],
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toHaveLength(1);
  });

  it('matches single keyword appearing multiple times via hyphenated compounds', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Anti-innovation progress', key_finding: 'Pro-innovation growth advance' }),
        createSource({ id: 2, title: 'Post-crisis downturn', key_finding: 'Counter-crisis risk threat' }),
      ],
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toHaveLength(1);
  });

  it('is case insensitive - capitalized keywords match', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'INCREASE In Economy', key_finding: 'GROWTH Is Progress Accelerate' }),
        createSource({ id: 2, title: 'DECLINE In Jobs Market', key_finding: 'LOSS Risk Of CONCERN' }),
      ],
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toHaveLength(1);
  });
});

/* ===================================================================
 * TESTS: minimum keyword threshold
 * =================================================================== */

describe('generateMissingConflicts - keyword threshold', () => {
  it('generates conflict with minimum 1 keyword match in the dominant direction', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Growth in sector', key_finding: 'This is about the sector only.' }),
        createSource({ id: 2, title: 'Decline in sector', key_finding: 'This is about the sector only.' }),
      ],
      conflicts: [],
    });
    generateMissingConflicts(report);
    // With threshold lowered to 1, 'growth' matches positive and 'decline' matches negative → conflict
    expect(report.conflicts).toHaveLength(1);
  });

  it('generates conflict when a source has exactly 2 keyword matches', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Growth and progress expected', key_finding: 'This is about the sector.' }),
        createSource({ id: 2, title: 'Decline and loss expected', key_finding: 'This is about the sector.' }),
      ],
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toHaveLength(1);
  });

  it('requires dominant direction score to be strictly greater than the other', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Breakthrough advance progress', key_finding: 'Risk concern low' }),
        createSource({ id: 2, title: 'Decline loss risk', key_finding: 'Growth progress slowing now' }),
      ],
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toHaveLength(1);
  });
});

/* ===================================================================
 * TESTS: explanation text
 * =================================================================== */

describe('generateMissingConflicts - explanation', () => {
  it('includes correct source counts in explanation', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Great improve economy', key_finding: 'Strong growth gain progress' }),
        createSource({ id: 2, title: 'Great improve jobs', key_finding: 'Better boost increase success' }),
        createSource({ id: 3, title: 'Serious decline loss', key_finding: 'Risk crisis concern warning' }),
      ],
      conflicts: [],
    });
    generateMissingConflicts(report);

    const conflict = report.conflicts![0];
    expect(conflict.explanation).toContain('2 source(s) present supporting');
    expect(conflict.explanation).toContain('1 source(s) highlight concerns');
  });

  it('explanation mentions mixed or contested findings', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Improve growth sector', key_finding: 'Strong progress advance boost' }),
        createSource({ id: 2, title: 'Decline risk warning', key_finding: 'Loss concern danger threat' }),
      ],
      conflicts: [],
    });
    generateMissingConflicts(report);

    const conflict = report.conflicts![0];
    expect(conflict.explanation).toMatch(/mixed|contested/i);
  });
});

/* ===================================================================
 * TESTS: synthesis text analysis (no source stance conflict)
 * =================================================================== */

describe('generateMissingConflicts - synthesis text analysis', () => {
  it('generates conflict from hedging language in synthesis when sources are neutral', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Market Report', key_finding: 'This report discusses market conditions.' }),
        createSource({ id: 2, title: 'Industry Analysis', key_finding: 'This analysis covers industry trends.' }),
      ],
      summary: {
        bottom_line: 'The market shows mixed signals.',
        full_synthesis: 'Many experts believe the market will grow steadily in the coming years. However, some analysts warn that rising interest rates could slow this growth. Others argue that inflation remains a significant concern. On the other hand, innovation in technology may offset these risks. This presents a complex picture that requires careful consideration of divergent viewpoints.',
      },
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toHaveLength(1);
    expect(report.conflicts![0].source_a).toBe('synthesis text');
    expect(report.conflicts![0].source_b).toBe('synthesis text');
    expect(report.conflicts![0].explanation).toContain('hedging');
  });

  it('does not generate conflict from hedging when only weak signal (single label, < 3 matches)', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Market Report', key_finding: 'This report discusses the economy.' }),
        createSource({ id: 2, title: 'Industry Analysis', key_finding: 'This analysis covers the economy.' }),
      ],
      summary: {
        bottom_line: 'The market is growing.',
        full_synthesis: 'The market is growing steadily. However, there are some risks. But the outlook remains positive overall. This is based on current data and trends.',
      },
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toEqual([]);
  });

  it('does not generate conflict when synthesis has no hedging language', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Market Report', key_finding: 'A report about markets.' }),
        createSource({ id: 2, title: 'Industry Analysis', key_finding: 'An analysis of industry.' }),
      ],
      summary: {
        bottom_line: 'The sky is blue.',
        full_synthesis: 'The sky appears blue during daytime due to Rayleigh scattering. This is a well-understood phenomenon. Sunlight interacts with atmospheric particles. The blue wavelengths scatter more than others.',
      },
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toEqual([]);
  });

  it('does not generate conflict from hedging when synthesis is too short', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Market Report', key_finding: 'A report.' }),
        createSource({ id: 2, title: 'Industry Analysis', key_finding: 'An analysis.' }),
      ],
      summary: {
        bottom_line: 'Short.',
        full_synthesis: 'Short text.',
      },
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toEqual([]);
  });

  it('does not override existing source-stance conflicts with synthesis analysis', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Increase in economy', key_finding: 'Growth boost progress sector' }),
        createSource({ id: 2, title: 'Decline in employment', key_finding: 'Loss risk concern jobs' }),
      ],
      summary: {
        bottom_line: 'Mixed signals.',
        full_synthesis: 'The economy is growing. However, employment is declining. Others argue this is temporary. On the other hand, innovation may help.',
      },
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toHaveLength(1);
    expect(report.conflicts![0].source_a).not.toBe('synthesis text');
  });

  it('handles synthesis with mixed evidence language explicitly', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Study A', key_finding: 'This study examines the economy.' }),
        createSource({ id: 2, title: 'Study B', key_finding: 'This study examines the economy too.' }),
        createSource({ id: 3, title: 'Study C', key_finding: 'This study also examines the economy.' }),
      ],
      summary: {
        bottom_line: 'Mixed evidence.',
        full_synthesis: 'The evidence presents mixed findings on this topic. Some researchers argue that the effects are positive and beneficial for growth. However, others contend that the negative consequences outweigh any potential gains. There is debate about whether these trends will continue in the future. The conflicting results suggest further research is needed to reach definitive conclusions.',
      },
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toHaveLength(1);
  });

  it('detects data-divergence patterns (ranging from, estimates vary)', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Study A', key_finding: 'This study analyzes the data.' }),
        createSource({ id: 2, title: 'Study B', key_finding: 'This study analyzes different data.' }),
      ],
      summary: {
        bottom_line: 'Estimates diverge.',
        full_synthesis: 'Estimates range from 45% to 78% depending on methodology. The numbers vary across different studies and time periods. However, this dataset is among the largest available. This suggests that the true figure is still uncertain.',
      },
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toHaveLength(1);
    expect(report.conflicts![0].explanation).toContain('hedging');
  });

  it('detects comparison patterns (while some, by contrast)', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Analysis', key_finding: 'An analysis of recent data.' }),
        createSource({ id: 2, title: 'Review', key_finding: 'A review of current findings.' }),
      ],
      summary: {
        bottom_line: 'Mixed results.',
        full_synthesis: 'Optimists point to strong growth in key sectors. By contrast, skeptics highlight persistent risks and challenges. While some see opportunity, others caution against overconfidence. Conversely, a third group advocates for a balanced approach.',
      },
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toHaveLength(1);
  });
});

/* ===================================================================
 * TESTS: consensus-label fallback (Priority 3 was removed — no longer generates)
 * =================================================================== */

describe('generateMissingConflicts - consensus-label fallback (removed)', () => {
  it('does not generate conflict from consensus label alone (Priority 3 removed)', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Study Report', key_finding: 'A study of the topic.' }),
        createSource({ id: 2, title: 'Analysis Report', key_finding: 'An analysis of the topic.' }),
      ],
      scores: {
        overall_credibility: 75,
        overall_relevance: 80,
        evidence_consensus: 'mixed',
        confidence_label: '🟡 Medium',
      },
      summary: {
        bottom_line: 'The evidence is mixed on this topic.',
        full_synthesis: 'Recent studies have examined this topic thoroughly. A prominent 2024 study found significant benefits. Follow-up research in early 2025 examined additional data. The overall picture requires careful interpretation.',
      },
      conflicts: [],
    });
    generateMissingConflicts(report);
    // Priority 3 was removed — no conflict from consensus label alone
    expect(report.conflicts).toEqual([]);
  });

  it('does not generate conflict from contested consensus alone (Priority 3 removed)', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Research Paper', key_finding: 'Neutral research data.' }),
        createSource({ id: 2, title: 'Review Paper', key_finding: 'Neutral review data.' }),
      ],
      scores: {
        overall_credibility: 60,
        overall_relevance: 70,
        evidence_consensus: 'contested',
        confidence_label: '🔴 Low',
      },
      summary: {
        bottom_line: 'This topic is highly contested with no clear consensus.',
        full_synthesis: 'Researchers approach this topic from different perspectives. Proponents argue data supports conclusions. Critics point to methodological concerns. Discussion continues as new evidence emerges.',
      },
      conflicts: [],
    });
    generateMissingConflicts(report);
    // Priority 3 was removed
    expect(report.conflicts).toEqual([]);
  });

  it('does not generate conflict from consensus label when sources are neutral (Priority 3 removed)', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Study', key_finding: 'Data.' }),
        createSource({ id: 2, title: 'Analysis', key_finding: 'More data.' }),
      ],
      scores: {
        overall_credibility: 70,
        overall_relevance: 70,
        evidence_consensus: 'mixed',
        confidence_label: '🟡 Medium',
      },
      summary: {
        bottom_line: 'The bottom line shows mixed evidence on this topic.',
      },
      conflicts: [],
    });
    generateMissingConflicts(report);
    // Priority 3 was removed
    expect(report.conflicts).toEqual([]);
  });

  it('does not override existing conflicts (guard clause still active)', () => {
    const existingConflicts = [
      {
        claim_a: 'Existing conflict',
        source_a: 'domain-a.com',
        claim_b: 'Existing conflict B',
        source_b: 'domain-b.com',
        explanation: 'Already captured.',
      },
    ];
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Study Report', key_finding: 'Data about the topic.' }),
        createSource({ id: 2, title: 'Analysis Report', key_finding: 'More data about the topic.' }),
      ],
      scores: {
        overall_credibility: 75,
        overall_relevance: 80,
        evidence_consensus: 'mixed',
        confidence_label: '🟡 Medium',
      },
      summary: {
        bottom_line: 'Mixed evidence.',
        full_synthesis: 'There is mixed evidence on this topic with conflicting findings.',
      },
      conflicts: existingConflicts,
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toEqual(existingConflicts);
  });
});

/* ===================================================================
 * TESTS: multiple sources
 * =================================================================== */

describe('generateMissingConflicts - multiple sources', () => {
  it('handles 5+ sources with mixed stances correctly', () => {
    const report = createReport({
      sources: [
        createSource({ id: 1, title: 'Increase market A', key_finding: 'Growth boost demand improve' }),
        createSource({ id: 2, title: 'Decline market B', key_finding: 'Loss risk increase concern' }),
        createSource({ id: 3, title: 'Progress market C', key_finding: 'Better enhance technology boost' }),
        createSource({ id: 4, title: 'Neutral analysis', key_finding: 'The data shows average results.' }),
        createSource({ id: 5, title: 'Crisis market D', key_finding: 'Warning threat downturn loss' }),
      ],
      conflicts: [],
    });
    generateMissingConflicts(report);
    expect(report.conflicts).toHaveLength(1);
  });
});
