import { COGNAPSE_SYSTEM_PROMPT } from '../systemPrompt';
import type { COGNAPSE_Output, GroundedSource, RetrievalTrace, MultiModelConsensus, CitationVerification } from '../types';
import { callCloudAI } from './aiService';
import { getEmbedder, cosineSimilarity } from '../utils/scoringEngine';
import { searchWeb, compressSourcesForLLM } from './searchService';
import { audioSystem } from './audioService';
import { useStore } from '../store';
import { listDocuments } from './documentService';
import { queryDocuments } from './documentRagService';
import { generateMissingConflicts } from '../utils/conflictDetector';
import { detectUncertaintyQuery, detectAdversarialQuery, computeBiasFromSentiment } from '../utils/scoringEngine';
import { redistributeBatchCitations } from '../utils/citations';
import { apiFetch } from './apiClient';
const RESEARCH_MODEL = "groq-llama-3.3-70b-versatile"; // Deep research — 70b for quality
const UTILITY_MODEL = "groq-llama-3.1-8b-instant";    // Standard ops — 8b for speed
const CONSENSUS_MODEL = "llama-3.1-8b-instant";          // Second model for consensus — 8B vs 70B gives different perspective

/* ─── Strategic Fields Fallback ─── */


/**
 * If the LLM skipped SWOT or actionable_takeaways, generate them from the synthesis text
 * using the fast utility model. This ensures every report has strategic analysis even when
 * the primary model cuts corners.
 */
async function fillMissingStrategicFields(
  report: COGNAPSE_Output,
  abortSignal?: AbortSignal
): Promise<void> {
  const synthesis = report.summary?.full_synthesis || report.summary?.bottom_line;
  if (!synthesis || synthesis.length < 50) return;

  const needsSwot = !report.swot;
  const needsTakeaways = !report.actionable_takeaways;
  if (!needsSwot && !needsTakeaways) return;

  const taskDesc = needsSwot && needsTakeaways
    ? 'generate a SWOT analysis AND actionable takeaways'
    : needsSwot
      ? 'generate a SWOT analysis'
      : 'generate actionable takeaways';

  // Build a single combined JSON schema to avoid confusing the LLM with two top-level objects
  let jsonSchema = '{';
  if (needsSwot) {
    jsonSchema += `
  "perspective": "From whose perspective this SWOT is framed",
  "strengths": ["3-5 items, max 12 words each"],
  "weaknesses": ["3-5 items, max 12 words each"],
  "opportunities": ["3-5 items, max 12 words each"],
  "threats": ["3-5 items, max 12 words each"]`;
  }
  if (needsTakeaways) {
    if (needsSwot) jsonSchema += ',';
    jsonSchema += `
  "key_insight": "The single most important thing to understand",
  "watch_out_for": "The biggest risk or misconception to avoid",
  "next_step": "The most useful concrete action to take"`;
  }
  jsonSchema += '\n}';

  const prompt = `Given the following research synthesis, ${taskDesc}.

SYNTHESIS:
"${synthesis.substring(0, 2500)}"

Return ONLY valid JSON with NO markdown formatting, NO code blocks, NO backticks:
${jsonSchema}

Output raw JSON only. No wrapping. No explanation.`;

  try {
    const raw = await callCloudAI(prompt, true, UTILITY_MODEL, abortSignal);
    
    // Robust JSON extraction: strip markdown code fences, handle multiple JSON blocks
    let jsonStr = typeof raw === 'string' ? raw : JSON.stringify(raw);
    // Remove markdown code fences (```json ... ``` or ``` ... ```)
    jsonStr = jsonStr.replace(/```(?:json)?\s*/gi, '').replace(/\s*```/g, '').trim();
    // If there are multiple JSON objects, try to extract the first complete one
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }
    
    const parsed = JSON.parse(jsonStr);

    if (needsSwot && (parsed.strengths || parsed.swot?.strengths)) {
      const src = parsed.strengths ? parsed : (parsed.swot || {});
      report.swot = {
        perspective: src.perspective || "User's perspective",
        strengths: Array.isArray(src.strengths) ? src.strengths : [],
        weaknesses: Array.isArray(src.weaknesses) ? src.weaknesses : [],
        opportunities: Array.isArray(src.opportunities) ? src.opportunities : [],
        threats: Array.isArray(src.threats) ? src.threats : [],
      };
    }

    if (needsTakeaways && (parsed.key_insight || parsed.actionable_takeaways?.key_insight)) {
      const src = parsed.key_insight ? parsed : (parsed.actionable_takeaways || {});
      report.actionable_takeaways = {
        key_insight: src.key_insight,
        watch_out_for: src.watch_out_for || '',
        next_step: src.next_step || '',
        professional_referral: null,
      };
    }
  } catch (e) {
    console.warn('[COGNAPSE] Strategic fields fallback failed — LLM returned unparseable response:', e);
  }
}

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
 *   - SWOT analysis (perspective + quadrants)
 *   - actionable_takeaways (key_insight, watch_out_for, next_step)
 *   - conflicts
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

  // ─── Compare SWOT ───
  const swotA = primary.swot;
  const swotB = secondary.swot;
  if (swotA && swotB) {
    const perspectiveSim = await semanticSimilarity(
      swotA.perspective || '',
      swotB.perspective || ''
    );
    scoreComparison.push({
      metric: 'SWOT Perspective',
      model_a: perspectiveSim > 0.35 ? 'Aligned' : swotA.perspective || 'N/A',
      model_b: perspectiveSim > 0.35 ? 'Aligned' : swotB.perspective || 'N/A',
    });
    scoreComparison.push({
      metric: 'SWOT Quadrants (S/W/O/T)',
      model_a: [swotA.strengths.length, swotA.weaknesses.length, swotA.opportunities.length, swotA.threats.length].join('/'),
      model_b: [swotB.strengths.length, swotB.weaknesses.length, swotB.opportunities.length, swotB.threats.length].join('/'),
    });
    if (perspectiveSim > 0.35 && swotA.perspective) {
      agreementPoints.push(`SWOT perspective: ${swotA.perspective}`);
    } else if (swotA.perspective || swotB.perspective) {
      if (swotA.perspective) divergentPoints.push({ from: 'unique_to_a', claim: `SWOT perspective: ${swotA.perspective}` });
      if (swotB.perspective) divergentPoints.push({ from: 'unique_to_b', claim: `SWOT perspective: ${swotB.perspective}` });
    }
  } else {
    scoreComparison.push({
      metric: 'SWOT Analysis',
      model_a: swotA ? 'Generated' : 'Missing',
      model_b: swotB ? 'Generated' : 'Missing',
    });
  }

  // ─── Compare Actionable Takeaways ───
  const takeA = primary.actionable_takeaways;
  const takeB = secondary.actionable_takeaways;
  if (takeA && takeB) {
    const insightSim = await semanticSimilarity(
      takeA.key_insight || '',
      takeB.key_insight || ''
    );
    scoreComparison.push({
      metric: 'Key Insight',
      model_a: insightSim > 0.35 ? 'Aligned' : 'Different',
      model_b: insightSim > 0.35 ? 'Aligned' : 'Different',
    });
    if (insightSim > 0.35 && takeA.key_insight) {
      agreementPoints.push(`Key Insight: ${takeA.key_insight}`);
    } else if (takeA.key_insight || takeB.key_insight) {
      if (takeA.key_insight) divergentPoints.push({ from: 'unique_to_a', claim: `Key Insight: ${takeA.key_insight}` });
      if (takeB.key_insight) divergentPoints.push({ from: 'unique_to_b', claim: `Key Insight: ${takeB.key_insight}` });
    }

    if (takeA.watch_out_for && takeB.watch_out_for) {
      const watchSim = await semanticSimilarity(takeA.watch_out_for, takeB.watch_out_for);
      scoreComparison.push({
        metric: 'Watch Out For',
        model_a: watchSim > 0.35 ? 'Aligned' : 'Different',
        model_b: watchSim > 0.35 ? 'Aligned' : 'Different',
      });
    }
    if (takeA.next_step && takeB.next_step) {
      const nextSim = await semanticSimilarity(takeA.next_step, takeB.next_step);
      scoreComparison.push({
        metric: 'Next Step',
        model_a: nextSim > 0.35 ? 'Aligned' : 'Different',
        model_b: nextSim > 0.35 ? 'Aligned' : 'Different',
      });
    }
  } else {
    scoreComparison.push({
      metric: 'Key Takeaways',
      model_a: takeA ? 'Generated' : 'Missing',
      model_b: takeB ? 'Generated' : 'Missing',
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
  sources: { id: number; snippet: string; title: string; domain: string; key_finding?: string; full_text?: string }[],
  abortSignal?: AbortSignal
): Promise<CitationVerification[]> {
  if (citations.length === 0 || sources.length === 0) return [];

  // Build a lookup of sourceId → source content (prefer full text, fall back to snippet)
  const sourceMap = new Map<number, string>();
  for (const s of sources) {
    const content = (s.full_text || s.snippet || s.key_finding || '').substring(0, 2000);
    sourceMap.set(s.id, content);
  }

  // Only verify citations where we actually have the source
  const verifiable = citations.filter(c => sourceMap.has(c.sourceId) && sourceMap.get(c.sourceId)!.length > 10);
  if (verifiable.length === 0) return [];

  // Build the batch prompt — include full text label when available
  const pairsText = verifiable.map((c, i) => {
    const content = sourceMap.get(c.sourceId)!;
    const sourceInfo = sources.find(s => s.id === c.sourceId);
    const isFullText = sourceInfo?.full_text ? true : false;
    const label = isFullText ? 'FULL SOURCE TEXT' : 'SOURCE CONTENT';
    const titleInfo = sourceInfo?.title ? `[Source: ${sourceInfo.title}]` : '';
    return `PAIR ${i + 1}:\nCLAIM: "${c.claimText}"\n${titleInfo}\n${label}: "${content}"\n`;
  }).join('\n');

  const verifierPrompt = `You are a citation verifier. Given a list of CLAIMS and their cited SOURCE CONTENT, determine whether each source reasonably supports the claim made about it.

Be generous: a claim is "supported" if the source discusses the same general topic or finding, even if exact wording differs. Only use "contradicted" if the source explicitly says the opposite of the claim. Use "unrelated" only if the source is about a completely different subject.

For each pair, return:
- verdict: "supported" (source clearly supports the claim) | "partial" (source partially supports but missing key details) | "contradicted" (source contradicts the claim) | "unrelated" (source doesn't address the claim)
- confidence: 0.0 to 1.0
- explanation: One brief sentence explaining why

Respond with ONLY a valid JSON array of objects (no markdown, no backticks). Each object must have: "verdict", "confidence", "explanation"

${pairsText}`;

  try {
    const raw = await callCloudAI(verifierPrompt, true, CONSENSUS_MODEL, abortSignal, 'secondary', CONSENSUS_MODEL);
    // Robust JSON extraction: handle markdown-wrapped responses
    let rawStr = typeof raw === 'string' ? raw : JSON.stringify(raw);
    rawStr = rawStr.replace(/```(?:json)?\s*/gi, '').replace(/\s*```/g, '').trim();
    // Try to extract the first JSON array or object
    const firstBracket = rawStr.indexOf('[');
    const lastBracket = rawStr.lastIndexOf(']');
    const firstBrace = rawStr.indexOf('{');
    if (firstBracket >= 0 && lastBracket > firstBracket) {
      rawStr = rawStr.substring(firstBracket, lastBracket + 1);
    } else if (firstBrace >= 0) {
      rawStr = rawStr.substring(firstBrace);
    }
    const results = JSON.parse(rawStr);
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

/* ─── Source Reranking ─── */

/**
 * Rerank top sources by asking the verifier model to rate relevance to the query.
 * This improves on the heuristic (credibility + relevance) sort by using actual
 * semantic understanding of the query-source relationship.
 */
async function rerankSourcesByRelevance(
  sources: GroundedSource[],
  query: string,
  abortSignal?: AbortSignal
): Promise<GroundedSource[]> {
  if (sources.length < 3) return sources;

  // Only rerank the top candidates — beyond ~20 the model's attention degrades
  const candidates = sources.slice(0, 20);
  const rest = sources.slice(20);

  const prompt = `Rate each source's relevance to the research query on a scale of 0-100.
Return ONLY a valid JSON array of objects (no markdown, no backticks).
Each object must have: "id" (number), "relevance" (0-100), "reason" (max 10 words)

QUERY: "${query}"

SOURCES:
${candidates.map((s, i) => `${i + 1}. [${s.id}] ${s.title} (${s.domain})
   Snippet: ${s.snippet || s.key_finding || ''}`).join('\n')}`;

  try {
    const raw = await callCloudAI(prompt, true, CONSENSUS_MODEL, abortSignal);
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const ratings = Array.isArray(parsed) ? parsed : (parsed.ratings || []);

    // Build a lookup of source ID → model relevance score
    const modelScore = new Map<number, number>();
    for (const r of ratings) {
      if (r.id && typeof r.relevance === 'number') {
        modelScore.set(r.id, r.relevance);
      }
    }

    // Blend model relevance (60%) with existing credibility (40%)
    const blended = candidates.map(s => {
      const modelRel = modelScore.get(s.id) ?? 50;
      const credNorm = (s.credibility_score || 50) / 100 * 100;
      const blendedScore = modelRel * 0.6 + credNorm * 0.4;
      return { ...s, relevance_score: Math.round(blendedScore) };
    });

    // Sort by blended score descending
    blended.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));

    // Renumber IDs sequentially after reranking
    const renumbered = [...blended, ...rest].map((s, i) => ({ ...s, id: i + 1 }));

    return renumbered;
  } catch (e) {
    console.warn('[COGNAPSE] Source reranking failed — falling back to heuristic sort:', e);
    return sources;
  }
}

/* ─── Full-Text Source Fetcher ─── */

/**
 * Fetch full text of a source URL via the server-side /api/fetch-url endpoint.
 * Falls back gracefully on failure (returns null, downstream uses snippet).
 */
async function fetchSourceFullText(url: string, abortSignal?: AbortSignal): Promise<string | null> {
  if (!url || url.startsWith('document')) return null; // document sources have no external URL
  try {
    const response = await apiFetch('/api/fetch-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: abortSignal,
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.text || null;
  } catch (e) {
    console.warn('[COGNAPSE] Full-text fetch failed for', url, e);
    return null;
  }
}

export async function calibrateConfidence(
  synthesis: string,
  query: string,
  abortSignal?: AbortSignal
): Promise<{ confidence_rating: 'sure' | 'partially_sure' | 'uncertain'; gaps_identified: string[]; narrative: string } | null> {
  if (!synthesis || synthesis.length < 50) return null;

  const prompt = `You generated the following research synthesis for the query: "${query}"

SYNTHESIS:
"${synthesis.substring(0, 2000)}"

Now, honestly assess your confidence in this synthesis. Consider:
- Are there claims in your synthesis that you're not fully sure about?
- What specific information would you need to be more confident?
- Are there alternative interpretations you didn't explore?

Return ONLY valid JSON with NO markdown formatting:
{
  "confidence_rating": "sure" | "partially_sure" | "uncertain",
  "gaps_identified": ["list of specific knowledge gaps or uncertainties"],
  "narrative": "One sentence explaining your confidence level and why"
}`;

  try {
    const raw = await callCloudAI(prompt, true, CONSENSUS_MODEL, abortSignal);
    const result = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const rating = result.confidence_rating || 'partially_sure';
    return {
      confidence_rating: ['sure', 'partially_sure', 'uncertain'].includes(rating) ? rating as any : 'partially_sure',
      gaps_identified: Array.isArray(result.gaps_identified) ? result.gaps_identified.slice(0, 5) : [],
      narrative: result.narrative || 'Confidence assessment unavailable',
    };
  } catch (e) {
    console.warn('[COGNAPSE] Confidence calibration failed:', e);
    return null;
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

  // ─── PHASE 1b: ACADEMIC CROSS-REFERENCING (parallel) ───
  // Query PubMed, arXiv, and CrossRef for authoritative academic sources.
  // These results get merged with web sources at higher credibility.
  let academicSources: GroundedSource[] = [];
  const academicPromise = (async () => {
    try {
      const response = await apiFetch('/api/academic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, count: 5 }),
        signal: abortSignal,
      });
      if (response.ok) {
        const data = await response.json();
        if (data.sources && Array.isArray(data.sources)) {
          return data.sources as GroundedSource[];
        }
      }
      return [];
    } catch (e) {
      console.warn('[COGNAPSE] Academic search unavailable:', e);
      return [];
    }
  })();

  // Micro-sound: retrieval complete (sources collected from web and/or docs)
  if (groundedSources.length > 0) {
    audioSystem.play('retrieval-complete');
  }

  // ─── Merge Academic Sources ───
  // Await the parallel academic search and merge results at the front
  // with high credibility scores (PubMed=95, arXiv=88, DOI=92)
  // Apply a keyword relevance filter to catch off-topic academic results
  // (e.g. PCSK9 inhibitor studies returned for a statins query)
  academicSources = await academicPromise;
  if (academicSources.length > 0) {
    // Extract meaningful keywords from the query (words > 3 chars, excluding common stopwords)
    const queryWords = query.toLowerCase().split(/\s+/).filter(w =>
      w.length > 3 && !['this','that','with','from','what','which','their','there','about','would','could','should','have','been','were','being','does','they','them','then','than','also','just','more','some','into','over','such','only','other','after','before','between','through','during','because','without','under','above','where','while','until','since','against','these','those','each','very','your','will'].includes(w)
    );
    // Filter out academic sources that don't share enough keywords with the query
    // Dynamic threshold: single-word queries need 1 match, 2-3 word queries need 1 match,
    // 4+ word queries need 2 matches. This prevents off-topic results like PCSK9 inhibitor
    // studies from leaking into a statins query without being too strict for short queries.
    const requiredMatches = Math.min(2, Math.max(1, Math.floor(queryWords.length / 2)));
    const filtered = academicSources.filter(s => {
      const titleLower = (s.title || '').toLowerCase();
      const snippetLower = (s.snippet || '').toLowerCase();
      // Check for exact keyword match OR stem match (e.g. "vaccine" matches "vaccines")
      const matchCount = queryWords.filter(w => {
        if (titleLower.includes(w) || snippetLower.includes(w)) return true;
        // Also check if word without trailing 's'/'es' matches (basic stemming)
        const stem = w.replace(/(?:e?s|ing|ed)$/, '');
        return stem.length > 3 && (titleLower.includes(stem) || snippetLower.includes(stem));
      }).length;
      return matchCount >= requiredMatches;
    });
    const filteredCount = academicSources.length - filtered.length;
    if (filteredCount > 0) {
      console.log(`[AcademicSearch] Filtered ${filteredCount} off-topic academic sources`);
    }
    academicSources = filtered;
    
    if (academicSources.length > 0) {
      addReasoningStep(`Cross-referenced ${academicSources.length} authoritative academic sources (PubMed/arXiv/CrossRef)`);
      // Assign IDs after the last web source
      let nextId = 0;
      for (const s of groundedSources) {
        if (s.id > nextId) nextId = s.id;
      }
      const mergedAcademia = academicSources.map((s, i) => ({
        ...s,
        id: nextId + i + 1,
        // The credibility score already signals authority — no prefix needed
      }));
      // Insert academic sources at the front (they have highest credibility)
      groundedSources = [...mergedAcademia, ...groundedSources];
      // Re-number all sources sequentially
      groundedSources = groundedSources.map((s, i) => ({ ...s, id: i + 1 }));
    }
  }

  // ─── Source Reranking ───
  // Rerank top sources by model-assessed relevance to improve citation quality
  let sourceRerankingApplied = false;
  const originalSourceCount = groundedSources.length;
  if (groundedSources.length >= 3) {
    addReasoningStep('Reranking sources by semantic relevance to query...');
    groundedSources = await rerankSourcesByRelevance(groundedSources, query, abortSignal);
    sourceRerankingApplied = true;
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

    // ─── Fix Batched Citations ───
    // Post-process: redistribute citations that the LLM stacked at the end of paragraphs
    if (typeof parsed.summary?.full_synthesis === 'string') {
      parsed.summary.full_synthesis = redistributeBatchCitations(parsed.summary.full_synthesis);
    }
    if (typeof parsed.summary?.bottom_line === 'string') {
      parsed.summary.bottom_line = redistributeBatchCitations(parsed.summary.bottom_line);
    }
    if (typeof parsed.summary?.eli5_version === 'string') {
      parsed.summary.eli5_version = redistributeBatchCitations(parsed.summary.eli5_version);
    }

    // ─── Consensus Accuracy Override ───
    // Post-process: if the query is about an uncertain/debated topic or an adversarial
    // conspiracy theory, override the AI's self-reported consensus label.
    // The AI tends to report "strong" consensus even for inherently ambiguous topics.
    if (parsed.scores) {
      const isUncertain = detectUncertaintyQuery(query);
      const adversarial = detectAdversarialQuery(query);

      if (adversarial.isAdversarial && parsed.scores.evidence_consensus !== 'contested') {
        // Conspiracy/pseudoscience queries: the AI may frame debunking as "strong" consensus
        parsed.scores.evidence_consensus = 'contested';
        parsed.scores.confidence_label = '🔴 Low';
      } else if (isUncertain && parsed.scores.evidence_consensus === 'strong') {
        // Ambiguous/debated topics: downgrade "strong" → "mixed" to reflect genuine uncertainty
        parsed.scores.evidence_consensus = 'mixed';
        // Only lower confidence if it was high
        if (parsed.scores.confidence_label === '🟢 High') {
          parsed.scores.confidence_label = '🟡 Medium';
        }
      }
    }

    // Post-process: fill missing strategic fields (SWOT, takeaways) from synthesis
    // This ensures every model's output has SWOT and takeaways even if the LLM skipped them
    try {
      await fillMissingStrategicFields(parsed, abortSignal);
    } catch (e) {
      // Non-critical — strategic fields are optional
    }

    // Post-process: detect missing contradictions from source stance analysis
    try {
      generateMissingConflicts(parsed);
    } catch (e) {
      // Non-critical — conflicts are optional
    }

    // ─── Source Reranking Metadata ───
    if (sourceRerankingApplied) {
      (parsed as COGNAPSE_Output)._source_reranking = {
        applied: true,
        model: CONSENSUS_MODEL,
        original_count: originalSourceCount,
      };
    }

    // ─── Confidence Calibration ───
    // After synthesis, ask the LLM to honestly rate its own confidence
    // This surfaces knowledge gaps and uncertainty that the primary model may have glossed over
    addReasoningStep('Calibrating confidence assessment...');
    try {
      const calibration = await calibrateConfidence(
        parsed.summary?.full_synthesis || parsed.summary?.bottom_line || '',
        query,
        abortSignal
      );
      if (calibration) {
        (parsed as COGNAPSE_Output).confidence_calibration = calibration;
        // If calibration says uncertain, adjust the confidence_label accordingly
        if (parsed.scores && calibration.confidence_rating === 'uncertain' && parsed.scores.confidence_label === '🟢 High') {
          parsed.scores.confidence_label = '🟡 Medium';
        }
        addReasoningStep(`Confidence: ${calibration.confidence_rating} — ${calibration.narrative}`);
      }
    } catch (e) {
      // Non-critical — calibration is optional
    }

    // ─── Auto Bias Alert from Sentiment Analysis ───
    // If the AI didn't generate a bias_alert, but our sentiment analysis detects
    // above-average emotional language in sources, auto-generate one.
    // Also check for known high-bias commercial health domains that tend to have
    // promotional rather than neutral framing.
    if (!parsed.bias_alert && groundedSources.length > 0) {
      try {
        const sentimentResult = await computeBiasFromSentiment(groundedSources);
        // Lowered threshold from 0.4 to 0.3 to catch subtler emotional language
        const biasThreshold = 0.3;
        // Domain-level heuristic: check if any source is a commercial health site
        // that may prioritize engagement over accuracy
        const highBiasHealthDomains = ['webmd.com', 'goodrx.com', 'healthline.com', 'verywellhealth.com', 'medscape.com', 'everydayhealth.com'];
        const hasCommercialHealthSource = groundedSources.some(s =>
          highBiasHealthDomains.some(d => s.domain?.toLowerCase().includes(d))
        );
        // Also check for overall domain mix: if most sources are industry/commercial
        // and none are academic/government, add a structural source bias alert
        const commercialCount = groundedSources.filter(s =>
          s.type === 'industry' || s.type === 'web'
        ).length;
        const academicOrGovCount = groundedSources.filter(s =>
          s.type === 'academic' || s.type === 'government'
        ).length;
        const structuralImbalance = commercialCount > academicOrGovCount * 3 && commercialCount >= 3;

        // Topic-level bias heuristic: detect emotionally charged topics that tend to
        // attract advocacy-oriented framing even from credible sources.
        // Topics like teen mental health, social media effects, vaccine safety, etc.
        // trigger an auto-alert regardless of source sentiment.
        const emotionallyChargedTopics = [
          /\b(mental\s*health|depression|anxiety|suicide|self.\s*harm|eating\s*disorder)\b/i,
          /\b(addiction|substance\s*abuse|drug\s*overdose|alcoholism)\b/i,
          /\b(vaccine\s*safety|vaccines?\s*(cause|causes|caused|autism|link|risk|danger|injury|side.effect|harm)|vaccination\s*(cause|causes|autism|link|risk|danger)|mmr\s*(cause|causes|autism|link|risk)|thimerosal\s*autism|vaccinated\s*autism|mercury\s*in\s*vaccines|wakefield\s*study|vaccine.autism.\s*link|anti.\s*vacc)\b/i,
          /\b(teen\s*social\s*media|social\s*media\s*(effects?|impact|harm|danger|addiction))\b/i,
          /\b(racial\s*(bias|discrimination|inequality|injustice)|systemic\s*racism)\b/i,
          /\b(political\s*polarization|election\s*integrity|voter\s*suppression|gerrymandering)\b/i,
          /\b(climate\s*change\s*(denial|skeptic|hoax)|global\s*warming\s*(hoax|myth|lie))\b/i,
          /\b(gun\s*control|gun\s*violence|school\s*shooting|mass\s*shooting)\b/i,
          /\b(abortion|pro.\s*life|pro.\s*choice|reproductive\s*rights)\b/i,
          /\b(conspiracy|hoax|cover.up|psyop|deep\s*state|shadow\s*government)\b/i,
        ];
        // Also do a broader stem+keyword fallback for queries like 'do vaccines cause autism'
        // that may not match the specific phrase patterns above
        const queryLower = query.toLowerCase();
        const containsVaccineStem = /\b(vaccin|mmr|thimerosal|wakefield|anti.vax)/i.test(queryLower);
        const containsControversyKeyword = /\b(autism|cause|causes|caused|link|risk|danger|side effect|side\s*effect|injury|harm|unsafe|debate|controversy)/i.test(queryLower);
        const hasVaccineControversy = containsVaccineStem && containsControversyKeyword;
        const hasEmotionalTopic = emotionallyChargedTopics.some(p => p.test(query)) || hasVaccineControversy;

        if (sentimentResult.biasScore > biasThreshold || hasCommercialHealthSource || structuralImbalance || hasEmotionalTopic) {
          let direction = 'slight';
          if (sentimentResult.biasScore > 0.6) direction = 'moderate';
          if (sentimentResult.biasScore > 0.8) direction = 'strong';
          // Build specific alert narrative based on what triggered it
          let alertNarrative = '';
          if (hasEmotionalTopic) {
            alertNarrative = 'This topic often attracts advocacy-oriented content with strong emotional framing. Even sources from credible institutions may present selective evidence. Cross-reference findings across multiple perspectives and check for funding disclosures.';
          } else if (hasCommercialHealthSource) {
            alertNarrative = 'Some sources are commercial health sites that may prioritize engagement over neutral reporting. Cross-reference findings with independent academic or government sources.';
          } else if (structuralImbalance) {
            alertNarrative = 'The source set is heavily weighted toward commercial/industry sources with limited academic or government representation. This may introduce a structural bias toward certain perspectives.';
          } else {
            alertNarrative = 'Our sentiment analysis detected above-average emotional language in the sources used for this report. These sources may lean toward advocacy over neutral reporting. Consider cross-referencing with more neutral sources.';
          }
          parsed.bias_alert = {
            direction: `${direction} potential bias detected`,
            recommendation: alertNarrative,
          };
          addReasoningStep(`Bias alert generated: topic-based or sentiment-based signal detected (score: ${sentimentResult.biasScore})`);
        }
      } catch (e) {
        // Non-critical
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

    // ─── PHASE 3: SECOND MODEL SYNTHESIS (Multi-Model Consensus) ───
    addReasoningStep('Running multi-model consensus validation...');
    audioSystem.play('consensus-complete');
    const secondaryResponse = await secondaryResponsePromise;
    if (secondaryResponse) {
      try {
        const secondaryParsed = typeof secondaryResponse === 'string'
          ? JSON.parse(secondaryResponse)
          : secondaryResponse;

        // Ensure secondary model also has SWOT and takeaways before diffing
        try {
          await fillMissingStrategicFields(secondaryParsed, abortSignal);
        } catch (e) {
          // Non-critical
        }

        // Diff the two reports
        const consensus = await diffReports(parsed, secondaryParsed);
        (parsed as COGNAPSE_Output).multi_model_consensus = consensus;          // Compute variance signal: disagreement between models on key scores
          // Higher variance = less confidence in results
          // Thresholds widened: moderate at 0.15 (was 0.3), high at 0.4 (was 0.6)
          // This makes the signal more sensitive to genuine disagreement
          if (parsed.scores && secondaryParsed.scores) {
            const credDiff = Math.abs((parsed.scores.overall_credibility || 0) - (secondaryParsed.scores.overall_credibility || 0)) / 100;
            const relDiff = Math.abs((parsed.scores.overall_relevance || 0) - (secondaryParsed.scores.overall_relevance || 0)) / 100;
            const consensusDiff = parsed.scores.evidence_consensus !== secondaryParsed.scores.evidence_consensus ? 0.3 : 0;
            // Boost variance for uncertain/debated queries to reflect genuine topic complexity
            const queryIsDebated = detectUncertaintyQuery(query);
            // Increased from 0.1 to 0.2 to make consensus variance more sensitive
            // to genuinely debated topics like "health effects of social media on teens"
            const uncertaintyBoost = queryIsDebated ? 0.2 : 0;
            const variance = Math.min(1, (credDiff * 0.4 + relDiff * 0.3 + consensusDiff * 0.3) + uncertaintyBoost);
            let level: 'low' | 'moderate' | 'high' = 'low';
            let narrative = 'Models closely agree on credibility and relevance assessments';
            if (variance > 0.4) {
              level = 'high';
              narrative = 'Significant disagreement between models on core scores — exercise caution with results';
            } else if (variance > 0.15) {
              level = 'moderate';
              narrative = 'Models show moderate disagreement on some quality dimensions — cross-check critical claims';
            }
            // Align consensus_variance with evidence_consensus override:
            // If the query triggered the uncertainty detector and evidence_consensus
            // was overridden to 'mixed' or 'contested', the variance should reflect that.
            // This prevents the report from showing "evidence_consensus: mixed" at the top
            // but "Multi-Model Consensus: low" at the bottom — they should agree.
            if (parsed.scores) {
              const ec = parsed.scores.evidence_consensus;
              if (ec === 'contested' && level !== 'high') {
                level = 'high';
                narrative = 'Models disagree significantly on this controversial topic — exercise caution';
              } else if (ec === 'mixed' && level === 'low') {
                level = 'moderate';
                narrative = 'Models show moderate disagreement reflecting genuine topic complexity';
              }
            }
            (parsed as COGNAPSE_Output).consensus_variance = { level, narrative };
          }

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
          // Try to fetch full text for each unique source URL for deeper verification
          const uniqueUrls = new Map<number, string>();
          for (const s of groundedSources) {
            if (s.url && !s.url.startsWith('document') && !uniqueUrls.has(s.id)) {
              uniqueUrls.set(s.id, s.url);
            }
          }

          // Fetch full text for up to 5 sources (parallel, non-blocking)
          const fullTextPromises = Array.from(uniqueUrls.entries()).slice(0, 5).map(
            async ([id, url]) => {
              const text = await fetchSourceFullText(url, abortSignal);
              return { id, text };
            }
          );
          const fullTextResults = await Promise.all(fullTextPromises);
          const fullTextMap = new Map<number, string>();
          for (const r of fullTextResults) {
            if (r.text) fullTextMap.set(r.id, r.text);
          }

          // Build source context: use full text when available, fall back to snippet
          const sourceContexts = groundedSources.map(s => ({
            id: s.id,
            snippet: s.snippet || '',
            key_finding: s.key_finding || '',
            title: s.title,
            domain: s.domain,
            // If we fetched full text, append relevant portion for verification
            full_text: fullTextMap.get(s.id)?.substring(0, 3000) || '',
          }));

          const verifications = await verifyCitations(
            citationPairs,
            sourceContexts,
            abortSignal
          );

          // Always attach verification results + timestamp so the UI badge renders
          // even when verification returns empty (showing 0/0/0 instead of hiding)
          (parsed as COGNAPSE_Output).citation_verifications = verifications;
          (parsed as COGNAPSE_Output)._citation_verified_at = new Date().toISOString();
          audioSystem.play('verification-complete');
          const supported = verifications.filter(v => v.verdict === 'supported').length;
          const partial = verifications.filter(v => v.verdict === 'partial').length;
          const failed = verifications.filter(v => v.verdict === 'contradicted' || v.verdict === 'unrelated').length;
          const fullTextCount = fullTextMap.size;
          addReasoningStep(`Citations: ${supported} supported, ${partial} partial, ${failed} flagged${fullTextCount > 0 ? ` (${fullTextCount} sources full-text checked)` : ''}`);
        }
      } catch (e) {
        console.warn('Citation verification unavailable:', e);
        addReasoningStep('Citation verification unavailable — proceeding without claim-level checks');
      }
    }

    addReasoningStep('Finalizing report structure...');

    // ─── Consensus Variance Alignment (final pass) ───
    // Ensure consensus_variance aligns with evidence_consensus regardless of
    // whether the secondary model succeeded. This catches cases where:
    // - The secondary model failed (no variance computed)
    // - The variance was computed but alignment inside the handler didn't fire
    // - evidence_consensus was overridden after variance was already set
    //
    // IMPORTANT: Only promote, never demote. If the secondary model computed
    // a legitimate 'high' variance from genuine score disagreement, preserve it.
    if (parsed.scores) {
      const ec = parsed.scores.evidence_consensus;
      const current = (parsed as COGNAPSE_Output).consensus_variance;
      const currentLevel = current?.level;
      
      if (ec === 'contested' && currentLevel !== 'high') {
        // Topic-level mandation: contested queries always get high variance
        (parsed as COGNAPSE_Output).consensus_variance = {
          level: 'high',
          narrative: 'Models disagree significantly on this controversial topic — exercise caution',
        };
      } else if (ec === 'mixed' && (!current || currentLevel === 'low')) {
        // Only promote from low/undefined to moderate — don't downgrade high
        (parsed as COGNAPSE_Output).consensus_variance = {
          level: 'moderate',
          narrative: 'Models show moderate disagreement reflecting genuine topic complexity',
        };
      }
    }

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
