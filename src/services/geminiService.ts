import { COGNAPSE_SYSTEM_PROMPT } from '../systemPrompt';
import type { COGNAPSE_Output, GroundedSource, RetrievalTrace } from '../types';
import { callCloudAI } from './aiService';
import { searchWeb, compressSourcesForLLM } from './searchService';
import { useStore } from '../store';

const RESEARCH_MODEL = "groq-llama-3.3-70b-versatile"; // Deep research — 70b for quality
const UTILITY_MODEL = "groq-llama-3.1-8b-instant";    // Standard ops — 8b for speed

export async function executeCognapseChat(
  query: string,
  reportContext: COGNAPSE_Output,
  chatHistory: { role: 'user' | 'model', content: string }[]
): Promise<string> {
  const formattedHistory = chatHistory.map(msg => `${msg.role.toUpperCase()}: ${msg.content}`).join('\n\n');

  const prompt = `You are COGNAPSE. The user just received the following structured research report.
Answer their follow-up question concisely, accurately, and naturally based on the report.
DO NOT re-run full research or output the JSON schema. Output pure plain text.

--- PREVIOUS REPORT CONTEXT ---
Title: ${reportContext.query_understood}
Bottom Line: ${reportContext.summary.bottom_line}
Full Synthesis: ${reportContext.summary.full_synthesis}
${reportContext.actionable_takeaways ? `Key Insight: ${reportContext.actionable_takeaways.key_insight}` : ''}

--- CHAT HISTORY ---
${formattedHistory}

USER: ${query}`;

  return await callCloudAI(prompt, false, UTILITY_MODEL);
}

export async function executeCognapseResearch(
  query: string,
  userStats: { xp: number; count: number; rank: string },
  abortSignal?: AbortSignal
): Promise<COGNAPSE_Output> {
  // ─── PHASE 1: REAL SOURCE RETRIEVAL ───
  const addReasoningStep = useStore.getState().addReasoningStep;
  addReasoningStep('Retrieving real-time sources from web...');

  let groundedSources: GroundedSource[] = [];
  let retrievalTrace: RetrievalTrace | null = null;

  try {
    const searchResult = await searchWeb(query, 10);
    groundedSources = searchResult.sources;
    retrievalTrace = searchResult.trace;
    addReasoningStep(`Collected ${groundedSources.length} relevant sources`);
  } catch (e) {
    console.warn('Web search failed, proceeding without real sources:', e);
    addReasoningStep('Web search unavailable, using synthetic generation');
  }

  // ─── PHASE 2: COMPRESS SOURCES FOR LLM ───
  // Compress sources into token-efficient context
  const sourcesContext = groundedSources.length > 0
    ? `
---PROVIDED SOURCES---
Below are REAL search results retrieved from the live web. You MUST base your analysis on these sources.
Each source has an ID. You MUST cite sources inline using [ID] format for every claim.

${compressSourcesForLLM(groundedSources)}

---END OF PROVIDED SOURCES---

`
    : '';

  const prompt = `${COGNAPSE_SYSTEM_PROMPT}
${sourcesContext}
USER QUERY: ${query}

--- USER CONTEXT ---
XP: ${userStats.xp}
Rank: ${userStats.rank}
Missions Completed: ${userStats.count}

CRITICAL REMINDER: Your output must be VALID JSON matching the provided schema.
Structure your intelligence perfectly. Base ALL claims on the PROVIDED SOURCES above.
If a source citation is needed, use the format [1], [2], etc. matching the source IDs above.
If you cannot find supporting evidence in the provided sources, state uncertainty explicitly.`;

  addReasoningStep('Synthesizing intelligence report from sources...');
  const rawResponse = await callCloudAI(prompt, true, RESEARCH_MODEL, abortSignal);
  
  try {
    // callCloudAI already returns JSON.stringify output — parse once
    const parsed = typeof rawResponse === 'string' ? JSON.parse(rawResponse) : rawResponse;

    // Strip verbose wrappers from query_understood (safety net for AI non-compliance)
    if (typeof parsed.query_understood === 'string') {
      const match = parsed.query_understood.match(/is: '(.+)'$/);
      if (match) {
        parsed.query_understood = match[1];
      }
    }

    // Attach real sources and retrieval trace to the output
    if (groundedSources.length > 0) {
      // Replace any AI-hallucinated sources with our real ones
      parsed.sources = groundedSources.map(s => ({
        id: s.id,
        title: s.title,
        url: s.url,
        domain: s.domain,
        type: s.type,
        credibility_score: s.credibility_score,
        relevance_score: s.relevance_score,
        key_finding: s.key_finding || s.snippet?.substring(0, 200) || '',
        published_date: s.published_date,
        bias_flag: null,
      }));
    }

    // Attach retrieval metadata
    if (retrievalTrace) {
      (parsed as COGNAPSE_Output)._retrieval_trace = retrievalTrace;
    }

    addReasoningStep('Finalizing report structure...');
    return parsed;
  } catch (error) {
    throw new Error("Intelligence synthesis format error. Please retry — cloud nodes may have returned partial data.");
  }
}

export interface SessionSynthesisResult {
  overarchingTheme: string;
  researchMomentum: 'converging' | 'diverging' | 'expanding';
  unifiedInsight: string;
  keyPatterns: string[];
  contradictions: string[];
  forwardHypothesis: string;
  knowledgeGaps: string[];
}

export async function executeSessionSynthesis(
  reports: { query: string; bottomLine: string; topicCluster: string; credibility: number }[],
  crossLinks: any[]
): Promise<SessionSynthesisResult> {
  const reportsContext = reports.map((r, i) => 
    `REPORT ${i+1}:\nQuery: ${r.query}\nBottom Line: ${r.bottomLine}\nCluster: ${r.topicCluster}\nCredibility: ${r.credibility}%`
  ).join('\n\n');

  const prompt = `You are the COGNAPSE Session Intelligence Synthesis Engine.
You have been provided with ${reports.length} related research reports from the current session.
Your task is to synthesize them into a single, high-level intelligence brief.

--- SESSION REPORTS ---
${reportsContext}

--- CROSS-QUERY LINKS ---
${JSON.stringify(crossLinks)}

Return a VALID JSON object with:
1. overarchingTheme: A brilliant, short phrase describing the core thread.
2. researchMomentum: One of "converging" (finding a single answer), "diverging" (growing complexity), or "expanding" (opening new fields).
3. unifiedInsight: A 3-paragraph synthesis of how these reports connect.
4. keyPatterns: String array of 3-5 recurring themes.
5. contradictions: String array of any conflicting data points found.
6. forwardHypothesis: A bold "what if" prediction based on this data.
7. knowledgeGaps: String array of 3 specific questions we still haven't answered.

Output ONLY the JSON object.`;

  const raw = await callCloudAI(prompt, true, UTILITY_MODEL);
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) {
    throw new Error("Session synthesis failed. Analysis engine returned malformed results.");
  }
}

export async function executeQuickInfo(nodeName: string): Promise<string> {
  const prompt = `You are COGNAPSE. Provide a brilliant, one-sentence tactical summary of the following topic for a quick forensic snapshot: "${nodeName}"
Output pure plain text. No more than 30 words. Be sharp and professional.`;

  return await callCloudAI(prompt, false, UTILITY_MODEL);
}
