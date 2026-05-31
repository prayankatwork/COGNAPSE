import { useStore } from '../store';
import { callCloudAI } from './aiService';
import { searchWeb, compressSourcesForLLM } from './searchService';
import { dbService } from './dbService';
import { benchmarkTracker } from './benchmarkTracker';
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
  const { setDeepResearch, clearCognition, addReasoningStep } = useStore.getState();

  try {
    const deepT0 = performance.now();
    console.log(`[BENCH:deep] START | query="${query.slice(0, 40)}..."`);

    addReasoningStep('Expanding research objective...');
    setDeepResearch({ status: 'running', stage: 1, progress: 'Expanding research objective...' });
    clearCognition();

    addReasoningStep('Retrieving real-time sources from web...');
    setDeepResearch({ stage: 2, progress: 'Retrieving real-time sources from web...' });

    // ─── REAL SOURCE RETRIEVAL ───
    let groundedSources: GroundedSource[] = [];
    let retrievalTrace: RetrievalTrace | null = null;
    let searchMs = 0;

    try {
      const searchT0 = performance.now();
      const searchResult = await searchWeb(query, 12);
      searchMs = Math.round(performance.now() - searchT0);
      groundedSources = searchResult.sources;
      retrievalTrace = searchResult.trace;
    } catch (e: any) {
    }

    addReasoningStep('Synthesizing evidence-backed intelligence...');
    setDeepResearch({ stage: 3, progress: 'Synthesizing evidence-backed intelligence...' });

    // Compress sources for LLM context
    const sourcesContext = groundedSources.length > 0
      ? `---PROVIDED SOURCES (REAL WEB SEARCH RESULTS)---
Below are REAL search results. You MUST base your analysis on these sources and cite them using [SOURCE_ID].

${compressSourcesForLLM(groundedSources, 3000)}

---END OF PROVIDED SOURCES---

`
      : 'Note: Real-time web search was unavailable for this query. Base your thesis on your training knowledge, but mark areas of uncertainty.';

    const llmT0 = performance.now();
    const rawThesis = await callCloudAI(THESIS_PROMPT(query, sourcesContext), true, RESEARCH_MODEL);
    const llmMs = Math.round(performance.now() - llmT0);

    let thesis: DeepResearchThesis;
    try {
      thesis = typeof rawThesis === 'string' ? JSON.parse(rawThesis) : rawThesis;
    } catch (e) {
      throw new Error("Deep Research synthesis returned malformed intelligence. Please retry.");
    }

    // Compute scores using real source data
    const scores: ResearchScore = computeScoresFromReport();
    const { user } = useStore.getState();
    if (user?.id) {
      const report = useStore.getState().currentReport;
      if (report) dbService.saveScoreHistory(user.id, report);
    }

    addReasoningStep('Finalizing intelligence report...');
    setDeepResearch({ 
      status: 'completed', 
      stage: 4, 
      progress: 'Intelligence Synthesis Finalized',
      thesis,
      scores
    });

    const deepTotalMs = Math.round(performance.now() - deepT0);
    console.log(`[BENCH:deep] DONE | round-trip=${deepTotalMs}ms search=${searchMs}ms llm=${llmMs}ms sources=${groundedSources.length} model=${RESEARCH_MODEL}`);

    // Track benchmark data
    benchmarkTracker.init();
    benchmarkTracker.track({
      category: 'deep_research',
      roundTripMs: deepTotalMs,
      swarmMs: 0,
      totalTokens: 0,
      model: RESEARCH_MODEL,
      isRetry: false,
      queryPreview: query.slice(0, 40),
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
