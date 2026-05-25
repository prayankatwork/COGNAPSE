import { useStore } from '../store';
import { callCloudAI } from './aiService';
import type { DeepResearchThesis, ResearchScore } from '../types';

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

const THESIS_PROMPT = (query: string) => `
Create a massive, professional-grade, academic-style thesis on: "${query}"

You are analyzing this external topic, not yourself. Write about the subject matter only — never about COGNAPSE, the research system, query interpretation, or the platform itself.

Structure your response as a valid JSON object with the following fields:
1. title: Professional title focused on the actual topic
2. abstract: High-level summary (150 words)
3. introduction: Context and background (300 words)
4. problemStatement: What critical gap are we investigating?
5. literatureReview: Synthesize current knowledge (400 words) - DO NOT include citations or source references.
6. methodology: How this intelligence was structured.
7. findings: Detailed analysis and data points (600 words)
8. comparativeInsights: How this compares to existing paradigms.
9. limitations: What we still don't know.
10. futureOutlook: Where this topic is headed.
11. conclusion: Final synthesis (200 words)

CRITICAL REQUIREMENTS:
- Total word count should exceed 1500 words.
- ABSOLUTELY NO CITATIONS, URLs, OR SOURCE REFERENCES. 
- REMOVE all bibliographies or reference sections.
- Focus purely on the synthesis and analysis of the intelligence.
`;

export async function executeDeepResearch(query: string) {
  const { setDeepResearch, clearCognition, addReasoningStep, clearReasoningTimeline } = useStore.getState();

  try {
    setDeepResearch({ status: 'running', stage: 1, progress: 'Expanding research objective...' });
    clearCognition();
    clearReasoningTimeline();

    addReasoningStep({
      stage: 'Objective Expansion',
      action: 'Decomposing query',
      insight: `Expanding "${query}" into multi-dimensional investigation vectors.`,
      status: 'confirmed'
    });

    setDeepResearch({ stage: 2, progress: 'Synthesizing verified intelligence...' });
    
    const rawThesis = await callCloudAI(THESIS_PROMPT(query), true, RESEARCH_MODEL);
    
    let thesis: DeepResearchThesis;
    try {
      // callCloudAI already returns JSON.stringify output — parse once
      thesis = typeof rawThesis === 'string' ? JSON.parse(rawThesis) : rawThesis;
    } catch (e) {
      throw new Error("Deep Research synthesis returned malformed intelligence. Please retry.");
    }
    
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
