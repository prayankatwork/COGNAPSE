import { useStore } from '../store';
import { callCloudAI } from './aiService';
import { searchWeb, compressSourcesForLLM } from './searchService';
import type { DeepResearchThesis, ResearchScore, GroundedSource, RetrievalTrace } from '../types';

function classifyDomain(domain: string): string {
  const d = (domain || '').toLowerCase();
  if (d.endsWith('.edu')) return 'edu';
  if (d.endsWith('.gov')) return 'gov';
  if (d.endsWith('.mil')) return 'mil';
  if (d.endsWith('.org')) return 'org';
  return 'other';
}

function computeScoresFromReport(): ResearchScore {
  const { currentReport } = useStore.getState();
  const sources = currentReport?.sources || [];
  const reportScores = currentReport?.scores;

  // accuracy: map overall_credibility (0-100) to 0-10
  const overallCred = reportScores?.overall_credibility ?? 50;
  const accuracy = Math.round((Math.min(Math.max(overallCred, 0), 100) / 10) * 10) / 10;

  // sourceDiversity: unique domain type categories out of 5
  const domainTypes = sources.map(s => classifyDomain(s.domain || ''));
  const uniqueTypes = new Set(domainTypes).size;
  const sourceDiversity = sources.length > 0
    ? Math.round(Math.min(uniqueTypes / 5, 1) * 100) / 100
    : 0.5;

  // bias: from bias_alert or domain homogeneity as proxy
  let bias: number;
  if (currentReport?.bias_alert) {
    const dirLen = currentReport.bias_alert.direction?.length || 0;
    const severity = Math.min(dirLen / 200, 0.6);
    bias = Math.round((0.2 + severity) * 100) / 100;
  } else {
    bias = uniqueTypes <= 1 ? 0.3 : uniqueTypes <= 2 ? 0.2 : 0.1;
  }
  bias = Math.round(Math.min(Math.max(bias, 0.05), 0.95) * 100) / 100;

  // confidenceInterval: evidence_consensus base + source count bonus
  const consensusMap: Record<string, number> = {
    strong: 0.85,
    mixed: 0.6,
    contested: 0.4,
    insufficient: 0.2
  };
  const baseConfidence = consensusMap[reportScores?.evidence_consensus || ''] ?? 0.5;
  const sourceBonus = Math.min((sources.length || 0) * 0.03, 0.15);
  const confidenceInterval = Math.round(Math.min(baseConfidence + sourceBonus, 0.99) * 100) / 100;

  return { accuracy, bias, sourceDiversity, confidenceInterval };
}

const RESEARCH_MODEL = "ollama";

/**
 * Build a THESIS_PROMPT that includes real search results as context.
 */
const THESIS_PROMPT = (query: string, sourcesContext: string) => `
Create a massive, professional-grade, academic-style thesis on: "${query}"

You are analyzing this external topic, not yourself. Write about the subject matter only — never about COGNAPSE, the research system, query interpretation, or the platform itself.

${sourcesContext}

The above are REAL search results from the live web. You MUST base your entire thesis on these provided sources.
Cite sources inline using the format [1], [2], etc. corresponding to the SOURCE IDs above.

Structure your response as a valid JSON object with the following fields:
1. title: Professional title focused on the actual topic
2. abstract: High-level summary (150 words)
3. introduction: Context and background (300 words)
4. problemStatement: What critical gap are we investigating?
5. literatureReview: Synthesize current knowledge (400 words) - MUST include inline citations like [1], [2]
6. methodology: How this intelligence was structured.
7. findings: Detailed analysis and data points (600 words) - MUST include inline citations
8. comparativeInsights: How this compares to existing paradigms.
9. limitations: What we still don't know.
10. futureOutlook: Where this topic is headed.
11. conclusion: Final synthesis (200 words)

CRITICAL REQUIREMENTS:
- Total word count should exceed 1500 words.
- You MUST cite the PROVIDED SOURCES using inline [SOURCE_ID] format throughout.
- Base ALL factual claims on the provided sources.
- Focus purely on the synthesis and analysis of the intelligence.
- If the provided sources don't cover an aspect, state "Limited source coverage on this aspect" rather than inventing.
`;

export async function executeDeepResearch(query: string) {
  const { setDeepResearch, clearCognition, addReasoningStep, clearReasoningTimeline } = useStore.getState();

  try {
    setDeepResearch({ status: 'running', stage: 1, progress: 'Expanding research objective...' });
    clearCognition();
    clearReasoningTimeline();

    const stepTime = Date.now();

    addReasoningStep({
      stage: 'Objective Expansion',
      action: 'Decomposing query into search vectors',
      insight: `Expanding "${query}" into multi-dimensional investigation vectors for web retrieval.`,
      status: 'confirmed'
    });

    setDeepResearch({ stage: 2, progress: 'Retrieving real-time sources from web...' });

    addReasoningStep({
      stage: 'Source Retrieval',
      action: 'Querying web search API',
      insight: `Performing real-time web search to gather authoritative sources on: "${query}"`,
      status: 'confirmed'
    });

    // ─── REAL SOURCE RETRIEVAL ───
    let groundedSources: GroundedSource[] = [];
    let retrievalTrace: RetrievalTrace | null = null;

    try {
      const searchResult = await searchWeb(query, 12);
      groundedSources = searchResult.sources;
      retrievalTrace = searchResult.trace;

      addReasoningStep({
        stage: 'Source Retrieval',
        action: 'Filtering and ranking results',
        insight: `Retrieved ${retrievalTrace.sources_retrieved} sources from ${retrievalTrace.search_provider}. After dedup (${retrievalTrace.dedup_removed} removed) & filtering (${retrievalTrace.low_quality_filtered} removed), using ${retrievalTrace.sources_used} sources in ${retrievalTrace.latency_ms}ms.`,
        status: 'confirmed'
      });
    } catch (e: any) {
      addReasoningStep({
        stage: 'Source Retrieval',
        action: 'Web search unavailable',
        insight: `Could not retrieve real-time sources: ${e.message}. Proceeding with deep analysis using model knowledge.`,
        status: 'pivoted'
      });
    }

    setDeepResearch({ stage: 3, progress: 'Synthesizing evidence-backed intelligence...' });

    addReasoningStep({
      stage: 'Synthesis',
      action: 'Generating evidence-backed thesis',
      insight: `Synthesizing ${groundedSources.length > 0 ? `${groundedSources.length} real sources into` : 'model knowledge into'} an academic-grade thesis with inline source citations.`,
      status: 'confirmed'
    });

    // Compress sources for LLM context
    const sourcesContext = groundedSources.length > 0
      ? `---PROVIDED SOURCES (REAL WEB SEARCH RESULTS)---
Below are REAL search results. You MUST base your analysis on these sources and cite them using [SOURCE_ID].

${compressSourcesForLLM(groundedSources, 3000)}

---END OF PROVIDED SOURCES---

`
      : 'Note: Real-time web search was unavailable for this query. Base your thesis on your training knowledge, but mark areas of uncertainty.';

    const rawThesis = await callCloudAI(THESIS_PROMPT(query, sourcesContext), true, RESEARCH_MODEL);

    let thesis: DeepResearchThesis;
    try {
      thesis = typeof rawThesis === 'string' ? JSON.parse(rawThesis) : rawThesis;
    } catch (e) {
      throw new Error("Deep Research synthesis returned malformed intelligence. Please retry.");
    }

    addReasoningStep({
      stage: 'Finalization',
      action: 'Computing quality metrics',
      insight: `Thesis generated with ${groundedSources.length} real sources. Computing credibility, diversity, bias, and confidence scores.`,
      status: 'confirmed'
    });

    // Compute scores using real source data
    const scores: ResearchScore = computeScoresFromReport();

    setDeepResearch({ 
      status: 'completed', 
      stage: 4, 
      progress: 'Intelligence Synthesis Finalized',
      thesis,
      scores
    });

    return { thesis, scores };

  } catch (error: any) {
    console.error("Deep Research Failure:", error);
    setDeepResearch({ 
      status: 'error', 
      error: error.message || "Deep analysis protocol failed due to connection instability." 
    });
  }
}
