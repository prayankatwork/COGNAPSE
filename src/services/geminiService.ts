import { COGNAPSE_SYSTEM_PROMPT } from '../systemPrompt';
import type { COGNAPSE_Output, GroundedSource, RetrievalTrace, MultiModelConsensus, CitationVerification } from '../types';
import { callCloudAI } from './aiService';
import { getEmbedder, cosineSimilarity } from '../utils/scoringEngine';
import { searchWeb, compressSourcesForLLM } from './searchService';
import { audioSystem } from './audioService';
import { useStore } from '../store';
import { listDocuments } from './documentService';
import { queryDocuments } from './documentRagService';
const RESEARCH_MODEL = "groq-llama-3.3-70b-versatile"; // Deep research — 70b for quality
const UTILITY_MODEL = "groq-llama-3.1-8b-instant";    // Standard ops — 8b for speed
const CONSENSUS_MODEL = "llama-3.1-8b-instant";          // Second model for consensus — 8B vs 70B gives different perspective

/* ─── Multi-Model Consensus ─── */


/**
 * Semantic sentence-level similarity using Transformers.js Embeddings.
 * Falls back to Jaccard if embedder is unavailable.
 */
async function semanticSimilarity(a: string, b: string): Promise<number> {
  const pipe = await getEmbedder();
  if (!pipe) {
    const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    if (wordsA.size === 0 || wordsB.size === 0) return 0;
    let intersection = 0;
    for (const w of wordsA) if (wordsB.has(w)) intersection++;
    return intersection / Math.min(wordsA.size, wordsB.size);
  }
  try {
    const embA = await pipe(a, { pooling: 'mean', normalize: true });
    const embB = await pipe(b, { pooling: 'mean', normalize: true });
    return cosineSimilarity(embA.data as number[], embB.data as number[]);
  } catch {
    return 0;
  }
}


/**
 * Split text into sentences.
 */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);
}

/**
 * Diff two COGNAPSE_Output reports and produce a consensus summary.
 * Compares:
 *   - bottom_line & full_synthesis (sentence overlap)
 *   - scores
 *   - conflicts
 *   - actionable_takeaways
 */
async function diffReports(
  primary: COGNAPSE_Output,
  secondary: COGNAPSE_Output
): Promise<MultiModelConsensus> {
  const agreementPoints: string[] = [];
  const divergentPoints: { from: 'unique_to_a' | 'unique_to_b'; claim: string }[] = [];

  // ─── Compare bottom_line ───
  const blA = (primary.summary?.bottom_line || '').trim();
  const blB = (secondary.summary?.bottom_line || '').trim();
  if (blA && blB) {
    const sim = await semanticSimilarity(blA, blB);
    if (sim > 0.35) {
      agreementPoints.push(blA.length > blB.length ? blB : blA);
    } else {
      divergentPoints.push({ from: 'unique_to_a', claim: blA });
      divergentPoints.push({ from: 'unique_to_b', claim: blB });
    }
  }

  // ─── Compare full_synthesis (sentence by sentence) ───
  const synA = splitSentences(primary.summary?.full_synthesis || '');
  const synB = splitSentences(secondary.summary?.full_synthesis || '');
  const matchedB = new Set<number>();

  for (const sA of synA) {
    let bestMatchIdx = -1;
    let bestScore = 0;
    for (let i = 0; i < synB.length; i++) {
      if (matchedB.has(i)) continue;
      const score = await semanticSimilarity(sA, synB[i]);
      if (score > bestScore) {
        bestScore = score;
        bestMatchIdx = i;
      }
    }
    if (bestScore > 0.35 && bestMatchIdx >= 0) {
      matchedB.add(bestMatchIdx);
      // Only add as agreement point if substantial
      if (sA.length > 30) agreementPoints.push(sA);
    } else {
      divergentPoints.push({ from: 'unique_to_a', claim: sA });
    }
  }

  // Remaining unmatched B sentences
  for (let i = 0; i < synB.length; i++) {
    if (!matchedB.has(i) && synB[i].length > 30) {
      divergentPoints.push({ from: 'unique_to_b', claim: synB[i] });
    }
  }

  // ─── Compare scores ───
  const scoreComparison: { metric: string; model_a: number | string; model_b: number | string }[] = [];
  if (primary.scores && secondary.scores) {
    scoreComparison.push({
      metric: 'Overall Credibility',
      model_a: primary.scores.overall_credibility ?? 'N/A',
      model_b: secondary.scores.overall_credibility ?? 'N/A',
    });
    scoreComparison.push({
      metric: 'Overall Relevance',
      model_a: primary.scores.overall_relevance ?? 'N/A',
      model_b: secondary.scores.overall_relevance ?? 'N/A',
    });
    scoreComparison.push({
      metric: 'Evidence Consensus',
      model_a: primary.scores.evidence_consensus ?? 'N/A',
      model_b: secondary.scores.evidence_consensus ?? 'N/A',
    });
    scoreComparison.push({
      metric: 'Confidence Label',
      model_a: primary.scores.confidence_label ?? 'N/A',
      model_b: secondary.scores.confidence_label ?? 'N/A',
    });
  }

  // ─── Calculate overall agreement ───
  const totalSentences = synA.length + synB.length;
  const totalDivergent = divergentPoints.length;
  const agreementPercent = totalSentences > 0
    ? Math.round(((totalSentences - totalDivergent) / totalSentences) * 100)
    : 50;

  return {
    overall_agreement: Math.min(100, Math.max(0, agreementPercent)),
    model_a: { provider: 'Groq', model: 'llama-3.3-70b-versatile' },
    model_b: { provider: 'Groq', model: CONSENSUS_MODEL },
    agreement_points: agreementPoints.slice(0, 8), // cap at 8 for readability
    divergent_points: divergentPoints.slice(0, 10), // cap at 10
    score_comparison: scoreComparison,
  };
}

/* ─── Citation Verification ─── */

/**
 * Extract (citation → claim) pairs from synthesis text.
 * Each `[N]` marker is paired with the text immediately before it
 * (up to the previous sentence boundary or 200 chars max).
 */
function extractCitations(synthesis: string): { sourceId: number; claimText: string }[] {
  const pairs: { sourceId: number; claimText: string }[] = [];
  // Matches [N], [N, M], [N,M] patterns
  const regex = /\[(\d+(?:\s*,\s*\d+)*)\]/g;
  let match: RegExpExecArray | null;
  let lastCitationEnd = 0;

  while ((match = regex.exec(synthesis)) !== null) {
    const ids = match[1].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;

    // Extract claim: text from last sentence boundary before the citation
    const searchStart = Math.max(lastCitationEnd, matchStart - 200);
    const preText = synthesis.slice(searchStart, matchStart).trim();
    // Try to start from the last sentence boundary
    const sentenceBoundary = preText.lastIndexOf('. ');
    const claimText = sentenceBoundary >= 0
      ? preText.slice(sentenceBoundary + 2).trim()
      : preText.slice(-150).trim(); // fallback: last 150 chars

    if (claimText.length > 5) {
      for (const id of ids) {
        pairs.push({ sourceId: id, claimText });
      }
    }

    lastCitationEnd = matchEnd;
  }

  return pairs;
}

/**
 * Batch-verify citations via Groq (secondary account).
 * Sends all (claim, source_snippet) pairs in one prompt and returns verdicts.
 * Falls back gracefully on failure.
 */
async function verifyCitations(
  citations: { sourceId: number; claimText: string }[],
  sources: { id: number; snippet: string; title: string; domain: string; key_finding?: string }[],
  abortSignal?: AbortSignal
): Promise<CitationVerification[]> {
  if (citations.length === 0 || sources.length === 0) return [];

  // Build a lookup of sourceId → snippet
  const sourceMap = new Map<number, string>();
  for (const s of sources) {
    sourceMap.set(s.id, s.snippet || s.key_finding || '');
  }

  // Only verify citations where we actually have the source
  const verifiable = citations.filter(c => sourceMap.has(c.sourceId) && sourceMap.get(c.sourceId)!.length > 10);
  if (verifiable.length === 0) return [];

  // Build the batch prompt
  const pairsText = verifiable.map((c, i) => {
    const snippet = sourceMap.get(c.sourceId)!.substring(0, 500); // trim to 500 chars
    return `PAIR ${i + 1}:\nCLAIM: "${c.claimText}"\nSOURCE SNIPPET: "${snippet}"\n`;
  }).join('\n');

  const verifierPrompt = `You are a citation verifier. Given a list of CLAIMS and their cited SOURCE SNIPPETS, determine for each pair whether the source supports the claim.

For each pair, return:
- verdict: "supported" (source clearly supports the claim) | "partial" (source partially supports but missing key details) | "contradicted" (source contradicts the claim) | "unrelated" (source doesn't address the claim)
- confidence: 0.0 to 1.0
- explanation: One brief sentence explaining why

Respond with ONLY a valid JSON array of objects (no markdown, no backticks). Each object must have: "verdict", "confidence", "explanation"

${pairsText}`;

  try {
    const raw = await callCloudAI(verifierPrompt, true, CONSENSUS_MODEL, abortSignal, 'secondary', CONSENSUS_MODEL);
    const results = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const arr = Array.isArray(results) ? results : (results.verifications || results.results || []);

    return arr.map((r: any, i: number) => ({
      source_id: verifiable[i]?.sourceId ?? 0,
      claim: verifiable[i]?.claimText ?? '',
      verdict: ['supported', 'partial', 'contradicted', 'unrelated'].includes(r.verdict)
        ? r.verdict
        : 'unrelated',
      confidence: typeof r.confidence === 'number' ? Math.max(0, Math.min(1, r.confidence)) : 0,
      explanation: r.explanation || 'No explanation provided',
    }));
  } catch (e) {
    console.warn('Citation verification failed:', e);
    return [];
  }
}

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

  const { user } = useStore.getState();

  const webSearchPromise = searchWeb(query, 10).catch(e => {
    console.warn('Web search failed, proceeding without real sources:', e);
    return null;
  });

  const docSearchPromise = (async () => {
    if (user?.id && user?.premium) {
      try {
        const docs = await listDocuments(user.id, 50);
        const indexedDocs = docs.filter(d =>
          d.status === 'indexed' &&
          !d.originalName?.startsWith('cognapse_report_')
        );

        if (indexedDocs.length > 0) {
          addReasoningStep(`Searching ${indexedDocs.length} indexed documents for relevant content...`);

          const docSearchResults = await queryDocuments(
            user.id,
            query,
            indexedDocs.map(d => d.id),
            5 // top K chunks
          );

          if (docSearchResults.length > 0) {
            const docNameMap = new Map<string, string>();
            for (const d of indexedDocs) { docNameMap.set(d.id, d.originalName); }
            return docSearchResults.map((r, i) => ({
              id: 0, // Will be updated during merge
              title: docNameMap.get(r.chunk.documentId) || 'Uploaded Document',
              url: '',
              domain: 'document',
              type: 'Document',
              snippet: r.chunk.content.substring(0, 400),
              credibility_score: Math.round(r.score * 100),
              relevance_score: Math.round(r.score * 100),
              key_finding: r.chunk.content.substring(0, 200),
              published_date: '',
              bias_flag: null,
              retrieval_timestamp: new Date().toISOString(),
            }));
          } else {
            return [];
          }
        }
      } catch (e) {
        console.warn('Document search unavailable:', e);
      }
    }
    return null;
  })();

  const [searchResult, rawDocSources] = await Promise.all([webSearchPromise, docSearchPromise]);

  if (searchResult) {
    groundedSources = searchResult.sources;
    retrievalTrace = searchResult.trace;
    addReasoningStep(`Collected ${groundedSources.length} relevant sources`);
  } else {
    addReasoningStep('Web search unavailable, using synthetic generation');
  }

  if (rawDocSources !== null) {
    if (rawDocSources.length > 0) {
      addReasoningStep(`Found ${rawDocSources.length} relevant excerpts from your documents`);
      let nextId = 0;
      for (const s of groundedSources) {
        if (s.id > nextId) nextId = s.id;
      }
      const finalDocSources = rawDocSources.map((s, i) => ({ ...s, id: nextId + i + 1 }));
      groundedSources.push(...finalDocSources as GroundedSource[]);
    } else {
      addReasoningStep('No relevant content found in your uploaded documents for this query');
    }
  }

  // Micro-sound: retrieval complete (sources collected from web and/or docs)
  if (groundedSources.length > 0) {
    audioSystem.play('retrieval-complete');
  }

  // ─── PHASE 2: COMPRESS SOURCES FOR LLM ───
  // Compress sources into token-efficient context
  const sourcesContext = groundedSources.length > 0
    ? `
---PROVIDED SOURCES---
Below are REAL search results retrieved from the live web, plus relevant content from your uploaded documents.
You MUST base your analysis on these sources. Each source has an ID. You MUST cite sources inline using [ID] format for every claim.

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
  
  // Fire both models concurrently
  const primaryResponsePromise = callCloudAI(prompt, true, RESEARCH_MODEL, abortSignal);
  
  const secondaryResponsePromise = callCloudAI(
    prompt,
    true,
    CONSENSUS_MODEL,
    abortSignal,
    'secondary',
    CONSENSUS_MODEL
  ).catch(e => {
    console.warn('Multi-model consensus unavailable (secondary model failed):', e);
    return null;
  });

  const rawResponse = await primaryResponsePromise;
  
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

    // Ensure conflicts field always exists (AI often skips optional fields)
    if (!parsed.conflicts) {
      parsed.conflicts = [];
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

    // ─── PHASE 3: SECOND MODEL SYNTHESIS (Multi-Model Consensus) ───
    addReasoningStep('Running multi-model consensus validation...');
    audioSystem.play('consensus-complete');
    const secondaryResponse = await secondaryResponsePromise;
    if (secondaryResponse) {
      try {
        const secondaryParsed = typeof secondaryResponse === 'string'
          ? JSON.parse(secondaryResponse)
          : secondaryResponse;

        // Diff the two reports
        const consensus = await diffReports(parsed, secondaryParsed);
        (parsed as COGNAPSE_Output).multi_model_consensus = consensus;

        addReasoningStep(`Consensus: ${consensus.overall_agreement}% agreement across two AI models`);
      } catch (e) {
        console.warn('Multi-model consensus parse failed:', e);
        addReasoningStep('Multi-model consensus unavailable — proceeding with single-model report');
      }
    } else {
      addReasoningStep('Multi-model consensus unavailable — proceeding with single-model report');
    }

    addReasoningStep('Verifying citations against source material...');
    audioSystem.play('verification-start');

    // ─── PHASE 4: CITATION VERIFICATION ───
    if (groundedSources.length > 0 && parsed.summary?.full_synthesis) {
      try {
        const citationPairs = extractCitations(parsed.summary.full_synthesis);

        if (citationPairs.length > 0) {
          const verifications = await verifyCitations(
            citationPairs,
            groundedSources.map(s => ({
              id: s.id,
              snippet: s.snippet || '',
              key_finding: s.key_finding || '',
              title: s.title,
              domain: s.domain,
            })),
            abortSignal
          );

          if (verifications.length > 0) {
            (parsed as COGNAPSE_Output).citation_verifications = verifications;
            audioSystem.play('verification-complete');
            const supported = verifications.filter(v => v.verdict === 'supported').length;
            const partial = verifications.filter(v => v.verdict === 'partial').length;
            const failed = verifications.filter(v => v.verdict === 'contradicted' || v.verdict === 'unrelated').length;
            addReasoningStep(`Citations: ${supported} verified, ${partial} partial, ${failed} unsupported`);
          }
        }
      } catch (e) {
        console.warn('Citation verification unavailable:', e);
        addReasoningStep('Citation verification unavailable — proceeding without claim-level checks');
      }
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
