// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  ensureIntelligenceMap,
  ensureGeoPoints,
  ensureTimelineEvents,
} from '../geminiService';
import type { COGNAPSE_Output } from '../../types';

/* ===================================================================
 * HELPERS
 * =================================================================== */

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
 * ensureIntelligenceMap
 * =================================================================== */

describe('ensureIntelligenceMap', () => {
  it('generates map from sources when intelligence_map is missing', () => {
    const report = createReport({
      query_understood: 'Smartphone bans in schools',
      sources: [
        { id: 1, title: 'Study on phone bans', url: '', domain: 'edu.org', type: 'academic', credibility_score: 85, relevance_score: 80, key_finding: 'Bans improve focus', published_date: '2024-01', bias_flag: null },
        { id: 2, title: 'Mental health effects', url: '', domain: 'health.org', type: 'industry', credibility_score: 65, relevance_score: 70, key_finding: 'Mixed mental health results', published_date: '2023-06', bias_flag: null },
      ],
    });

    ensureIntelligenceMap(report);

    expect(report.intelligence_map).toBeDefined();
    expect(report.intelligence_map!.central_node.label).toBe('Smartphone bans in schools');
    expect(report.intelligence_map!.central_node.type).toBe('CONCEPT');
    expect(report.intelligence_map!.nodes).toHaveLength(2);
    expect(report.intelligence_map!.edges).toHaveLength(2);
    // Source nodes are ENTITY type
    expect(report.intelligence_map!.nodes[0].type).toBe('ENTITY');
    expect(report.intelligence_map!.nodes[0].relationship).toBe('source');
    // Edges connect sources to center
    expect(report.intelligence_map!.edges[0].from).toBe('topic');
    expect(report.intelligence_map!.edges[0].label).toBe('evidence');
  });

  it('does nothing when intelligence_map is already populated', () => {
    const existingMap = {
      central_node: { id: 'root', label: 'Existing', type: 'CONCEPT' },
      nodes: [{ id: 'n1', label: 'Existing Node', type: 'ENTITY', relationship: 'related', sub_query: 'q', importance: 3 }],
      edges: [{ from: 'root', to: 'n1', label: 'link' }],
    };

    const report = createReport({
      intelligence_map: existingMap,
      sources: [
        { id: 1, title: 'New Source', url: '', domain: 'x.com', type: 'industry', credibility_score: 70, relevance_score: 60, key_finding: 'New data', published_date: '2024', bias_flag: null },
      ],
    });

    ensureIntelligenceMap(report);

    // Should NOT be overwritten with new sources
    expect(report.intelligence_map).toBe(existingMap);
    expect(report.intelligence_map!.nodes).toHaveLength(1);
    expect(report.intelligence_map!.nodes[0].label).toBe('Existing Node');
  });

  it('uses query_understood for central node label', () => {
    const report = createReport({
      query_understood: 'Climate change effects',
      sources: [
        { id: 1, title: 'Climate Study', url: '', domain: 'edu.org', type: 'academic', credibility_score: 90, relevance_score: 85, key_finding: 'Rising temperatures', published_date: '2024', bias_flag: null },
      ],
    });

    ensureIntelligenceMap(report);

    expect(report.intelligence_map!.central_node.label).toBe('Climate change effects');
  });

  it('falls back to "Research Topic" when query_understood is empty', () => {
    const report = createReport({
      query_understood: '',
      sources: [
        { id: 1, title: 'Sample Study', url: '', domain: 'x.com', type: 'industry', credibility_score: 50, relevance_score: 50, key_finding: 'Data', published_date: '2024', bias_flag: null },
      ],
    });

    ensureIntelligenceMap(report);

    expect(report.intelligence_map!.central_node.label).toBe('Research Topic');
  });

  it('caps source nodes at 8', () => {
    const sources = Array.from({ length: 12 }, (_, i) => ({
      id: i + 1,
      title: `Source #${i + 1} unique title`,
      url: '',
      domain: 'example.com',
      type: 'industry' as const,
      credibility_score: 50 + i,
      relevance_score: 50,
      key_finding: `Finding ${i + 1}`,
      published_date: '2024',
      bias_flag: null,
    }));

    const report = createReport({ sources });

    ensureIntelligenceMap(report);

    // 8 source nodes, no concept nodes (no synthesis)
    expect(report.intelligence_map!.nodes.length).toBeLessThanOrEqual(8);
    expect(report.intelligence_map!.edges.length).toBeLessThanOrEqual(8);
  });

  it('deduplicates sources with the same title (first 60 chars)', () => {
    const report = createReport({
      sources: [
        { id: 1, title: 'Study on phone bans', url: '', domain: 'a.com', type: 'academic', credibility_score: 85, relevance_score: 80, key_finding: 'Finding A', published_date: '2024', bias_flag: null },
        { id: 2, title: 'Study on phone bans', url: '', domain: 'b.com', type: 'academic', credibility_score: 80, relevance_score: 75, key_finding: 'Finding B', published_date: '2024', bias_flag: null },
        { id: 3, title: 'Mental health study', url: '', domain: 'c.com', type: 'industry', credibility_score: 65, relevance_score: 60, key_finding: 'Finding C', published_date: '2024', bias_flag: null },
      ],
    });

    ensureIntelligenceMap(report);

    // 2 unique labels (first two are the same title, only one kept)
    expect(report.intelligence_map!.nodes).toHaveLength(2);
  });

  it('skips sources with very short titles (< 3 chars)', () => {
    const report = createReport({
      sources: [
        { id: 1, title: 'AB', url: '', domain: 'x.com', type: 'industry', credibility_score: 50, relevance_score: 50, key_finding: 'Short', published_date: '2024', bias_flag: null },
        { id: 2, title: 'Valid Study Title', url: '', domain: 'y.com', type: 'academic', credibility_score: 80, relevance_score: 75, key_finding: 'Valid', published_date: '2024', bias_flag: null },
      ],
    });

    ensureIntelligenceMap(report);

    // Only the valid title should be a node
    expect(report.intelligence_map!.nodes).toHaveLength(1);
    expect(report.intelligence_map!.nodes[0].label).toBe('Valid Study Title');
  });

  it('extracts concept nodes from synthesis when few sources and synthesis is long enough', () => {
    const report = createReport({
      query_understood: 'Quantum Computing',
      sources: [
        { id: 1, title: 'IBM Quantum Research', url: '', domain: 'ibm.com', type: 'industry', credibility_score: 80, relevance_score: 85, key_finding: 'Quantum advantage', published_date: '2024', bias_flag: null },
      ],
      summary: {
        bottom_line: 'Quantum computing advances rapidly.',
        full_synthesis: 'Quantum Computing represents a fundamental shift in computational capability. IBM Quantum Research has demonstrated quantum advantage in specific chemical simulations. Error Correction remains the biggest challenge. Superconducting Qubits are the leading approach. Fault Tolerance will unlock practical applications. This field is evolving rapidly with significant investment.',
      },
    });

    ensureIntelligenceMap(report);

    // 1 source node + up to 3 concept nodes
    expect(report.intelligence_map!.nodes.length).toBeGreaterThanOrEqual(2);
    // At least one concept should have been extracted from Title Case phrases
    const conceptNodes = report.intelligence_map!.nodes.filter(n => n.type === 'CONCEPT');
    expect(conceptNodes.length).toBeGreaterThanOrEqual(1);
    // Concept nodes should have 'relates' edge label
    const conceptEdges = report.intelligence_map!.edges.filter(e => e.label === 'relates');
    expect(conceptEdges.length).toBe(conceptNodes.length);
  });

  it('does not extract concepts when synthesis is too short (< 50 chars)', () => {
    const report = createReport({
      summary: {
        bottom_line: 'Short.',
        full_synthesis: 'Too short to extract any concepts from.',
      },
    });

    ensureIntelligenceMap(report);
    // If no sources either, nodes will be empty
    expect(report.intelligence_map!.nodes).toEqual([]);
    expect(report.intelligence_map!.edges).toEqual([]);
  });

  it('assigns importance proportionally to credibility_score', () => {
    const report = createReport({
      sources: [
        { id: 1, title: 'High Cred Source', url: '', domain: 'academic.edu', type: 'academic', credibility_score: 95, relevance_score: 90, key_finding: 'Top finding', published_date: '2024', bias_flag: null },
        { id: 2, title: 'Low Cred Source', url: '', domain: 'blog.com', type: 'industry', credibility_score: 25, relevance_score: 30, key_finding: 'Weak finding', published_date: '2024', bias_flag: null },
      ],
    });

    ensureIntelligenceMap(report);

    const nodes = report.intelligence_map!.nodes;
    const highCredNode = nodes.find(n => n.label === 'High Cred Source');
    const lowCredNode = nodes.find(n => n.label === 'Low Cred Source');
    expect(highCredNode).toBeDefined();
    expect(lowCredNode).toBeDefined();
    // High credibility (95/20=4.75→ceil=5) should have higher importance than low (25/20=1.25→ceil=2)
    expect(highCredNode!.importance).toBeGreaterThan(lowCredNode!.importance);
    // Min importance is 1, max is 5
    expect(highCredNode!.importance).toBeLessThanOrEqual(5);
    expect(lowCredNode!.importance).toBeGreaterThanOrEqual(1);
  });

  it('generates sub_query combining query_understood with source title prefix (truncated to 30 chars)', () => {
    const report = createReport({
      query_understood: 'Social media effects on teens',
      sources: [
        { id: 1, title: 'Instagram and Teen Mental Health: A Longitudinal Study', url: '', domain: 'edu.org', type: 'academic', credibility_score: 85, relevance_score: 80, key_finding: 'Finding', published_date: '2024', bias_flag: null },
      ],
    });

    ensureIntelligenceMap(report);

    const node = report.intelligence_map!.nodes[0];
    expect(node.sub_query).toContain('Social media effects on teens');
    // Title is truncated to 30 chars in sub_query
    expect(node.sub_query).toContain('Instagram and Teen Mental Heal');
    expect(node.sub_query.length).toBeLessThan(90);
  });

  it('handles report with no sources and no synthesis gracefully', () => {
    const report = createReport({ sources: [], summary: { bottom_line: 'Empty.' } });

    ensureIntelligenceMap(report);

    expect(report.intelligence_map).toBeDefined();
    expect(report.intelligence_map!.central_node).toBeDefined();
    expect(report.intelligence_map!.nodes).toEqual([]);
    expect(report.intelligence_map!.edges).toEqual([]);
  });
});

/* ===================================================================
 * ensureGeoPoints
 * =================================================================== */

describe('ensureGeoPoints', () => {
  it('returns early when geo_triggered is false', () => {
    const report = createReport({ geo_triggered: false });
    const before = report.geo_points;

    ensureGeoPoints(report);

    // Should not change — the function returns before setting
    expect(report.geo_points).toBe(before);
  });

  it('does nothing when geo_points is already populated', () => {
    const existingPoints = [
      { label: 'United States', country: 'US', lat: 37.09, lng: -95.71, relevance_note: 'Pre-populated', zoom_level: 4 },
    ];

    const report = createReport({
      geo_triggered: true,
      geo_points: existingPoints,
      sources: [
        { id: 1, title: 'Study about Europe', url: '', domain: 'eu.org', type: 'academic', credibility_score: 80, relevance_score: 70, key_finding: 'European data shows...', published_date: '2024', bias_flag: null },
      ],
    });

    ensureGeoPoints(report);

    // Should NOT be overwritten with new geo points
    expect(report.geo_points).toBe(existingPoints);
    expect(report.geo_points).toHaveLength(1);
    expect(report.geo_points![0].country).toBe('US');
  });

  it('extracts US geo point from source title mentioning "United States"', () => {
    const report = createReport({
      geo_triggered: true,
      sources: [
        { id: 1, title: 'Smartphone bans in the United States', url: '', domain: 'edu.org', type: 'academic', credibility_score: 80, relevance_score: 70, key_finding: 'US data shows mixed results', published_date: '2024', bias_flag: null },
      ],
    });

    ensureGeoPoints(report);

    expect(report.geo_points).toHaveLength(1);
    expect(report.geo_points![0].label).toBe('United States');
    expect(report.geo_points![0].country).toBe('US');
    expect(report.geo_points![0].lat).toBeCloseTo(37.09, 1);
    expect(report.geo_points![0].lng).toBeCloseTo(-95.71, 1);
  });

  it('extracts Europe geo point from key_finding mentioning "europe"', () => {
    const report = createReport({
      geo_triggered: true,
      sources: [
        { id: 1, title: 'Study', url: '', domain: 'x.com', type: 'industry', credibility_score: 60, relevance_score: 50, key_finding: 'Policy differences across Europe are significant', published_date: '2024', bias_flag: null },
      ],
    });

    ensureGeoPoints(report);

    expect(report.geo_points).toHaveLength(1);
    expect(report.geo_points![0].label).toBe('European Union');
    expect(report.geo_points![0].country).toBe('EU');
  });

  it('extracts multiple countries when sources mention different locations', () => {
    const report = createReport({
      geo_triggered: true,
      sources: [
        { id: 1, title: 'Australian school policy', url: '', domain: 'edu.au', type: 'academic', credibility_score: 80, relevance_score: 70, key_finding: 'Australian schools implement bans', published_date: '2024', bias_flag: null },
        { id: 2, title: 'UK approach to phones', url: '', domain: 'ac.uk', type: 'academic', credibility_score: 75, relevance_score: 70, key_finding: 'British schools see improvement', published_date: '2024', bias_flag: null },
        { id: 3, title: 'Canadian education trends', url: '', domain: 'ca.gov', type: 'government', credibility_score: 85, relevance_score: 75, key_finding: 'Canadian provinces differ', published_date: '2024', bias_flag: null },
      ],
    });

    ensureGeoPoints(report);

    expect(report.geo_points!.length).toBeGreaterThanOrEqual(2);
    const countries = report.geo_points!.map(p => p.country);
    expect(countries).toContain('AU');
    expect(countries).toContain('UK');
    expect(countries).toContain('CA');
  });

  it('deduplicates by country — only adds each country once', () => {
    const report = createReport({
      geo_triggered: true,
      sources: [
        { id: 1, title: 'US study 1', url: '', domain: 'edu.org', type: 'academic', credibility_score: 80, relevance_score: 70, key_finding: 'American data shows...', published_date: '2024', bias_flag: null },
        { id: 2, title: 'US study 2', url: '', domain: 'gov.us', type: 'government', credibility_score: 85, relevance_score: 75, key_finding: 'USA policy analysis...', published_date: '2024', bias_flag: null },
        { id: 3, title: 'Canada study', url: '', domain: 'ca.gov', type: 'academic', credibility_score: 80, relevance_score: 70, key_finding: 'Canadian approach...', published_date: '2024', bias_flag: null },
      ],
    });

    ensureGeoPoints(report);

    // Should have US and Canada (2 items), not US twice
    expect(report.geo_points).toHaveLength(2);
    const countries = report.geo_points!.map(p => p.country);
    expect(countries).toContain('US');
    expect(countries).toContain('CA');
  });

  it('sets empty array when no location keywords match', () => {
    const report = createReport({
      geo_triggered: true,
      sources: [
        { id: 1, title: 'General physics research', url: '', domain: 'physics.org', type: 'academic', credibility_score: 90, relevance_score: 60, key_finding: 'Quantum mechanics advances', published_date: '2024', bias_flag: null },
      ],
    });

    ensureGeoPoints(report);

    expect(report.geo_points).toEqual([]);
  });

  it('scans domain field for location mentions', () => {
    const report = createReport({
      geo_triggered: true,
      sources: [
        { id: 1, title: 'Research Paper', url: '', domain: 'australia.edu', type: 'academic', credibility_score: 80, relevance_score: 70, key_finding: 'Key finding here', published_date: '2024', bias_flag: null },
      ],
    });

    ensureGeoPoints(report);

    expect(report.geo_points).toHaveLength(1);
    expect(report.geo_points![0].country).toBe('AU');
  });

  it('sets zoom_level to 3 for region type, 4 for countries', () => {
    const report = createReport({
      geo_triggered: true,
      sources: [
        { id: 1, title: 'Middle East peace process', url: '', domain: 'org.me', type: 'industry', credibility_score: 60, relevance_score: 50, key_finding: 'Middle East analysis', published_date: '2024', bias_flag: null },
        { id: 2, title: 'French education system', url: '', domain: 'fr', type: 'government', credibility_score: 80, relevance_score: 70, key_finding: 'France education policy', published_date: '2024', bias_flag: null },
      ],
    });

    ensureGeoPoints(report);

    const middleEast = report.geo_points!.find(p => p.country === 'region');
    const france = report.geo_points!.find(p => p.country === 'FR');
    expect(middleEast!.zoom_level).toBe(3);
    expect(france!.zoom_level).toBe(4);
  });

  it('handles geo_triggered true with no sources gracefully', () => {
    const report = createReport({ geo_triggered: true, sources: [] });

    ensureGeoPoints(report);

    expect(report.geo_points).toEqual([]);
  });
});

/* ===================================================================
 * ensureTimelineEvents
 * =================================================================== */

describe('ensureTimelineEvents', () => {
  it('returns early when timeline_triggered is false', () => {
    const report = createReport({ timeline_triggered: false });

    ensureTimelineEvents(report);

    expect(report.timeline_events).toBeUndefined();
  });

  it('does nothing when timeline_events is already populated', () => {
    const existingTimeline = [
      { date: '2023', title: 'Existing Event', description: 'Desc', significance: 3 },
    ];

    const report = createReport({
      timeline_triggered: true,
      timeline_events: existingTimeline,
      sources: [
        { id: 1, title: 'New Study', url: '', domain: 'x.com', type: 'industry', credibility_score: 70, relevance_score: 60, key_finding: 'New findings', published_date: '2025', bias_flag: null },
      ],
    });

    ensureTimelineEvents(report);

    expect(report.timeline_events).toBe(existingTimeline);
    expect(report.timeline_events).toHaveLength(1);
    expect(report.timeline_events![0].date).toBe('2023');
  });

  it('extracts events from source published_date years', () => {
    const report = createReport({
      timeline_triggered: true,
      sources: [
        { id: 1, title: '2023 Study on Bans', url: '', domain: 'edu.org', type: 'academic', credibility_score: 85, relevance_score: 80, key_finding: 'Found positive effects', published_date: '2023-06', bias_flag: null },
        { id: 2, title: '2024 Follow-up Analysis', url: '', domain: 'gov.us', type: 'government', credibility_score: 90, relevance_score: 85, key_finding: 'Confirmed earlier findings with larger sample', published_date: '2024-01', bias_flag: null },
      ],
    });

    ensureTimelineEvents(report);

    expect(report.timeline_events).toHaveLength(2);
    // Should be sorted chronologically: 2023 first, then 2024
    expect(report.timeline_events![0].date).toBe('2023');
    expect(report.timeline_events![1].date).toBe('2024');
    // Titles should match
    expect(report.timeline_events![0].title).toBe('2023 Study on Bans');
    expect(report.timeline_events![1].title).toBe('2024 Follow-up Analysis');
  });

  it('skips sources without a valid published_date', () => {
    const report = createReport({
      timeline_triggered: true,
      sources: [
        { id: 1, title: 'Study with Date', url: '', domain: 'edu.org', type: 'academic', credibility_score: 85, relevance_score: 80, key_finding: 'Finding 1', published_date: '2023', bias_flag: null },
        { id: 2, title: 'Study Without Date', url: '', domain: 'x.com', type: 'industry', credibility_score: 60, relevance_score: 50, key_finding: 'Finding 2', published_date: 'unknown', bias_flag: null },
        { id: 3, title: 'Another No Date', url: '', domain: 'y.com', type: 'industry', credibility_score: 50, relevance_score: 50, key_finding: 'Finding 3', published_date: '', bias_flag: null },
      ],
    });

    ensureTimelineEvents(report);

    expect(report.timeline_events).toHaveLength(1);
    expect(report.timeline_events![0].title).toBe('Study with Date');
  });

  it('sets significance proportionally to credibility_score (capped 1-5)', () => {
    const report = createReport({
      timeline_triggered: true,
      sources: [
        { id: 1, title: 'High Cred Study', url: '', domain: 'academic.edu', type: 'academic', credibility_score: 95, relevance_score: 90, key_finding: 'Important finding', published_date: '2023', bias_flag: null },
        { id: 2, title: 'Low Cred Source', url: '', domain: 'blog.com', type: 'industry', credibility_score: 10, relevance_score: 20, key_finding: 'Minor finding', published_date: '2024', bias_flag: null },
      ],
    });

    ensureTimelineEvents(report);

    const highCredEvent = report.timeline_events!.find(e => e.title === 'High Cred Study');
    const lowCredEvent = report.timeline_events!.find(e => e.title === 'Low Cred Source');
    expect(highCredEvent!.significance).toBeGreaterThan(lowCredEvent!.significance);
    expect(highCredEvent!.significance).toBeLessThanOrEqual(5);
    expect(lowCredEvent!.significance).toBeGreaterThanOrEqual(1);
  });

  it('deduplicates events with same year and same title prefix (20 chars)', () => {
    const report = createReport({
      timeline_triggered: true,
      sources: [
        { id: 1, title: 'Impact of Smartphone Bans in Schools — Study A', url: '', domain: 'a.com', type: 'academic', credibility_score: 85, relevance_score: 80, key_finding: 'Finding A', published_date: '2023-06', bias_flag: null },
        { id: 2, title: 'Impact of Smartphone Bans in Schools — Study B', url: '', domain: 'b.com', type: 'academic', credibility_score: 80, relevance_score: 75, key_finding: 'Finding B', published_date: '2023-01', bias_flag: null },
        { id: 3, title: 'Different Study 2024', url: '', domain: 'c.com', type: 'industry', credibility_score: 70, relevance_score: 65, key_finding: 'Finding C', published_date: '2024', bias_flag: null },
      ],
    });

    ensureTimelineEvents(report);

    // First two have same first 20 chars ("Impact of Smartpho") + same year "2023" → deduped
    expect(report.timeline_events).toHaveLength(2);
  });

  it('limits to 10 events', () => {
    const sources = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      title: `Study ${String.fromCharCode(65 + i)} unique title`,
      url: '',
      domain: 'x.com',
      type: 'industry' as const,
      credibility_score: 60,
      relevance_score: 50,
      key_finding: `Finding ${i + 1}`,
      published_date: `${2010 + i}`,
      bias_flag: null,
    }));

    const report = createReport({ timeline_triggered: true, sources });

    ensureTimelineEvents(report);

    expect(report.timeline_events!.length).toBeLessThanOrEqual(10);
  });

  it('handles timeline_triggered true with no sources gracefully', () => {
    const report = createReport({ timeline_triggered: true, sources: [] });

    ensureTimelineEvents(report);

    expect(report.timeline_events).toEqual([]);
  });

  it('skips sources with titles shorter than 5 chars', () => {
    const report = createReport({
      timeline_triggered: true,
      sources: [
        { id: 1, title: 'Long enough title', url: '', domain: 'edu.org', type: 'academic', credibility_score: 80, relevance_score: 70, key_finding: 'Finding', published_date: '2023', bias_flag: null },
        { id: 2, title: 'ABC', url: '', domain: 'x.com', type: 'industry', credibility_score: 60, relevance_score: 50, key_finding: 'Short', published_date: '2024', bias_flag: null },
      ],
    });

    ensureTimelineEvents(report);

    expect(report.timeline_events).toHaveLength(1);
    expect(report.timeline_events![0].title).toBe('Long enough title');
  });

  it('uses the year portion only from published_date strings', () => {
    const report = createReport({
      timeline_triggered: true,
      sources: [
        { id: 1, title: 'Full Date Source', url: '', domain: 'edu.org', type: 'academic', credibility_score: 80, relevance_score: 70, key_finding: 'Detailed date', published_date: '2024-03-15', bias_flag: null },
        { id: 2, title: 'Year Only Source', url: '', domain: 'gov.us', type: 'government', credibility_score: 85, relevance_score: 75, key_finding: 'Year only', published_date: '2022', bias_flag: null },
      ],
    });

    ensureTimelineEvents(report);

    // Sort by date: 2022 first, then 2024
    expect(report.timeline_events![0].date).toBe('2022');
    expect(report.timeline_events![1].date).toBe('2024');
  });
});

/* ===================================================================
 * INTEGRATION: All three run together (simulating the post-processing chain)
 * =================================================================== */

describe('visual fields post-processing chain', () => {
  it('runs all three without errors on a realistic report', () => {
    const report = createReport({
      query_understood: 'Effectiveness of remote work on productivity',
      geo_triggered: true,
      timeline_triggered: true,
      sources: [
        { id: 1, title: 'Remote Work Productivity Study 2021', url: '', domain: 'harvard.edu', type: 'academic', credibility_score: 90, relevance_score: 85, key_finding: '40% productivity increase in remote settings', published_date: '2021-06', bias_flag: null },
        { id: 2, title: 'Stanford Remote Work Analysis', url: '', domain: 'stanford.edu', type: 'academic', credibility_score: 88, relevance_score: 82, key_finding: 'US companies lead remote adoption', published_date: '2022-03', bias_flag: null },
        { id: 3, title: 'European Remote Work Policies', url: '', domain: 'europa.eu', type: 'government', credibility_score: 85, relevance_score: 80, key_finding: 'EU directives on remote work', published_date: '2023-01', bias_flag: null },
        { id: 4, title: 'Australian Remote Work Data', url: '', domain: 'gov.au', type: 'government', credibility_score: 82, relevance_score: 78, key_finding: 'Australian firms adopt hybrid models', published_date: '2024', bias_flag: null },
      ],
      summary: {
        bottom_line: 'Remote work shows overall positive productivity impact.',
        full_synthesis: 'Remote Work has transformed workplace dynamics. Productivity gains are well-documented across multiple studies. Stanford Research demonstrated a 13% productivity improvement. Hybrid Models emerged as the dominant approach. European Union policies have shaped workplace regulations. This represents a fundamental shift in how organizations operate.',
      },
    });

    // Run all three
    ensureIntelligenceMap(report);
    ensureGeoPoints(report);
    ensureTimelineEvents(report);

    // Intelligence map: 4 source nodes + concept nodes from synthesis
    expect(report.intelligence_map).toBeDefined();
    expect(report.intelligence_map!.central_node.label).toBe('Effectiveness of remote work on productivity');
    expect(report.intelligence_map!.nodes.length).toBeGreaterThanOrEqual(4);
    expect(report.intelligence_map!.edges.length).toBeGreaterThanOrEqual(4);

    // Geo points: US (from stanford.edu domain mention), Europe (from europa.eu), Australia (from gov.au)
    expect(report.geo_points).toBeDefined();
    expect(report.geo_points!.length).toBeGreaterThanOrEqual(2);
    const geoCountries = report.geo_points!.map(p => p.country);
    expect(geoCountries).toContain('EU');
    expect(geoCountries).toContain('AU');

    // Timeline: 4 events sorted chronologically
    expect(report.timeline_events).toBeDefined();
    expect(report.timeline_events!.length).toBe(4);
    expect(report.timeline_events![0].date).toBe('2021');
    expect(report.timeline_events![3].date).toBe('2024');
  });

  it('handles empty report gracefully — all three produce valid defaults', () => {
    const report = createReport({
      geo_triggered: true,
      timeline_triggered: true,
      sources: [],
      summary: { bottom_line: 'Empty report.' },
    });

    ensureIntelligenceMap(report);
    ensureGeoPoints(report);
    ensureTimelineEvents(report);

    expect(report.intelligence_map).toBeDefined();
    expect(report.intelligence_map!.nodes).toEqual([]);
    expect(report.geo_points).toEqual([]);
    expect(report.timeline_events).toEqual([]);
  });
});
