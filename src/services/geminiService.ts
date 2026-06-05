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
import { batchLookupDomains, isMbfcConfigured } from '../utils/mbfcApi';
const RESEARCH_MODEL = "groq-llama-3.3-70b-versatile"; // Deep research — Llama 3.3 70b for speed + depth
const UTILITY_MODEL = "groq-llama-3.1-8b-instant";    // Standard ops — 8b for speed
const CONSENSUS_MODEL = "llama-3.1-8b-instant";          // Second model for consensus — 8B vs 70B gives different perspective

/* ─── Visual Fields Fallback (intelligence_map, geo_points, timeline_events) ─── */

/**
 * Known geo-locations for fast lookup — countries + major cities.
 * Used to extract location mentions from source content when
 * geo_triggered is true but the model didn't populate geo_points.
 * This is a fallback only; the model's own extraction is preferred.
 */
const KNOWN_LOCATIONS: { label: string; country: string; lat: number; lng: number; keywords: string[] }[] = [
  { label: 'United States', country: 'US', lat: 37.09, lng: -95.71, keywords: ['united states', 'usa', 'u.s.', 'america', 'american'] },
  { label: 'United Kingdom', country: 'UK', lat: 55.38, lng: -3.44, keywords: ['united kingdom', 'uk', 'britain', 'british', 'england', 'london'] },
  { label: 'Germany', country: 'DE', lat: 51.17, lng: 10.45, keywords: ['germany', 'german', 'berlin', 'munich'] },
  { label: 'France', country: 'FR', lat: 46.60, lng: 1.89, keywords: ['france', 'french', 'paris'] },
  { label: 'China', country: 'CN', lat: 35.86, lng: 104.20, keywords: ['china', 'chinese', 'beijing', 'shanghai'] },
  { label: 'India', country: 'IN', lat: 20.59, lng: 78.96, keywords: ['india', 'indian', 'mumbai', 'delhi', 'bangalore'] },
  { label: 'Japan', country: 'JP', lat: 36.20, lng: 138.25, keywords: ['japan', 'japanese', 'tokyo'] },
  { label: 'Australia', country: 'AU', lat: -25.27, lng: 133.78, keywords: ['australia', 'australian', 'sydney', 'melbourne'] },
  { label: 'Canada', country: 'CA', lat: 56.13, lng: -106.35, keywords: ['canada', 'canadian', 'toronto', 'vancouver'] },
  { label: 'Brazil', country: 'BR', lat: -14.24, lng: -51.93, keywords: ['brazil', 'brazilian', 'rio', 'sao paulo'] },
  { label: 'Russia', country: 'RU', lat: 61.52, lng: 105.32, keywords: ['russia', 'russian', 'moscow'] },
  { label: 'South Africa', country: 'ZA', lat: -30.56, lng: 22.94, keywords: ['south africa', 'african', 'cape town'] },
  { label: 'European Union', country: 'EU', lat: 50.85, lng: 4.35, keywords: ['europe', 'european', 'eu'] },
  { label: 'Ethiopia', country: 'ET', lat: 9.15, lng: 40.49, keywords: ['ethiopia', 'ethiopian', 'addis ababa'] },
  { label: 'Middle East', country: 'region', lat: 26.0, lng: 45.0, keywords: ['middle east', 'gulf', 'saudi', 'iran', 'iraq', 'israel', 'palestine'] },
];

/**
 * If the LLM skipped intelligence_map, generate a simple one from source titles
 * and synthesis text. This ensures the PhysicsMap always renders.
 * Enforces a minimum of 4 meaningful nodes by extracting entities, concepts,
 * and key terms from available source data.
 */
export function ensureIntelligenceMap(report: COGNAPSE_Output): void {
  if (report.intelligence_map && report.intelligence_map.nodes && report.intelligence_map.nodes.length >= 4) {
    return; // Already populated with enough nodes
  }

  // If the map exists but has fewer than 4 nodes, we'll rebuild it with more
  const queryLabel = report.query_understood || 'Research Topic';
  const sources = report.sources || [];
  const synthesis = report.summary?.full_synthesis || report.summary?.bottom_line || '';

  // Build nodes from unique source domains (as entity nodes)
  const nodes: { id: string; label: string; type: string; relationship: string; sub_query: string; importance: number }[] = [];
  const edges: { from: string; to: string; label: string }[] = [];
  const seenLabels = new Set<string>();

  // Add central node
  const centralId = 'topic';

  // Add source-based nodes (up to 8)
  let nodeIndex = 0;
  for (const s of sources.slice(0, 8)) {
    const label = s.title?.substring(0, 60) || `Source #${s.id}`;
    if (seenLabels.has(label) || label.length < 3) continue;
    seenLabels.add(label);
    const nodeId = `src_${nodeIndex}`;
    nodes.push({
      id: nodeId,
      label,
      type: 'ENTITY',
      relationship: 'source',
      sub_query: `${queryLabel} ${s.title?.substring(0, 30) || ''}`.trim(),
      importance: Math.min(5, Math.max(1, Math.ceil((s.credibility_score || 50) / 20))),
    });
    edges.push({ from: centralId, to: nodeId, label: 'evidence' });
    nodeIndex++;
  }

  // Extract key concepts from synthesis if we need more nodes
  // Try multiple extraction strategies to find meaningful concepts
  const extractConcepts = (text: string): string[] => {
    const concepts: string[] = [];
    if (!text || text.length < 30) return concepts;
    
    // Strategy 1: Title-case phrases (proper nouns, named entities)
    const titleCasePattern = text.match(/(?:[A-Z][a-z]+\s){1,4}[A-Z][a-z]+/g);
    if (titleCasePattern) {
      for (const c of titleCasePattern) {
        const trimmed = c.trim();
        if (trimmed.length > 5 && trimmed.length < 50 && !seenLabels.has(trimmed)) {
          concepts.push(trimmed);
        }
      }
    }
    
    // Strategy 2: Quoted phrases (key terminology emphasized by the AI)
    const quotedPattern = text.match(/"([^"]{8,60})"/g);
    if (quotedPattern) {
      for (const q of quotedPattern) {
        const cleaned = q.replace(/"/g, '').trim();
        if (cleaned.length > 8 && cleaned.length < 50 && !seenLabels.has(cleaned) && !concepts.includes(cleaned)) {
          concepts.push(cleaned);
        }
      }
    }
    
    // Strategy 3: Domain-relevant key terms from source metadata
    // (no-op here — we add source domain nodes separately)
    
    return concepts.filter(c => !c.includes(queryLabel)); // avoid central-node duplication
  };

  // Add concept nodes until we reach the minimum of 4
  if (nodeIndex < 4 && synthesis.length > 50) {
    const concepts = extractConcepts(synthesis);
    // Deduplicate while preserving order
    const uniqueConcepts = [...new Set(concepts)];
    for (const concept of uniqueConcepts.slice(0, 6)) {
      if (seenLabels.has(concept)) continue;
      seenLabels.add(concept);
      const nodeId = `concept_${nodeIndex}`;
      nodes.push({
        id: nodeId,
        label: concept,
        type: 'CONCEPT',
        relationship: 'related',
        sub_query: `${queryLabel} ${concept}`,
        importance: 3,
      });
      edges.push({ from: centralId, to: nodeId, label: 'relates' });
      nodeIndex++;
      if (nodeIndex >= 8) break; // cap total nodes at 8
    }
  }

  // If we still don't have 4 nodes, extract key entities from source titles
  // (e.g., Chernobyl, wildlife, radiation — meaningful topic keywords)
  if (nodeIndex < 4 && sources.length > 0) {
    const titleWords = new Map<string, number>();
    for (const s of sources) {
      const words = (s.title || '').toLowerCase().split(/\s+/);
      for (const w of words) {
        if (w.length > 4 && !['this','that','with','from','what','which','their','there','about','would','could','should','have','been','were','being','does','they','them','then','than','also','just','more','some','into','over','such','only','other','after','before','between','through','during','because','without','under','above','where','while','until','since','against','these','those','each','very','your','will'].includes(w)) {
          titleWords.set(w, (titleWords.get(w) || 0) + 1);
        }
      }
    }
    // Sort by frequency (most common meaningful words)
    const sortedWords = [...titleWords.entries()]
      .sort((a, b) => b[1] - a[1])
      .filter(([word]) => !seenLabels.has(word) && word.length > 4);
    
    for (const [word] of sortedWords.slice(0, 4)) {
      if (nodeIndex >= 4) break;
      const label = word.charAt(0).toUpperCase() + word.slice(1);
      seenLabels.add(label);
      const nodeId = `keyword_${nodeIndex}`;
      nodes.push({
        id: nodeId,
        label,
        type: 'CONCEPT',
        relationship: 'related',
        sub_query: `${queryLabel} ${label}`,
        importance: 2,
      });
      edges.push({ from: centralId, to: nodeId, label: 'relates' });
      nodeIndex++;
    }
  }

  // Preserve any existing nodes from the LLM that we didn't replace
  if (report.intelligence_map?.nodes && report.intelligence_map.nodes.length > 0 && report.intelligence_map.nodes.length < 4) {
    for (const existingNode of report.intelligence_map.nodes) {
      if (!seenLabels.has(existingNode.label)) {
        seenLabels.add(existingNode.label);
        nodes.push(existingNode);
        edges.push({ from: centralId, to: existingNode.id, label: existingNode.relationship || 'relates' });
      }
    }
  }

  report.intelligence_map = {
    central_node: { id: centralId, label: queryLabel, type: 'CONCEPT' },
    nodes,
    edges,
  };
}

/**
 * If geo_triggered is true but geo_points is empty/missing, extract
 * location mentions from source titles, snippets, and domains.
 */
export function ensureGeoPoints(report: COGNAPSE_Output): void {
  if (!report.geo_triggered) return;
  if (report.geo_points && report.geo_points.length > 0) return; // Already populated

  const sources = report.sources || [];
  const textsToCheck = sources.flatMap(s => [
    s.title || '',
    s.key_finding || '',
    s.domain || '',
  ]);
  const fullText = textsToCheck.join(' ').toLowerCase();

  const found: typeof report.geo_points = [];
  const seenCountries = new Set<string>();

  for (const loc of KNOWN_LOCATIONS) {
    if (seenCountries.has(loc.country)) continue;
    if (loc.keywords.some(kw => fullText.includes(kw))) {
      found.push({
        label: loc.label,
        country: loc.country,
        lat: loc.lat,
        lng: loc.lng,
        relevance_note: `Mentioned in source coverage`,
        zoom_level: loc.country === 'region' ? 3 : 4,
      });
      seenCountries.add(loc.country);
    }
  }

  report.geo_points = found.length > 0 ? found : [];
}

/**
 * If timeline_triggered is true but timeline_events is empty/missing,
 * construct a basic timeline from source publication dates + key dates
 * mentioned in the synthesis.
 */
export function ensureTimelineEvents(report: COGNAPSE_Output): void {
  if (!report.timeline_triggered) return;
  if (report.timeline_events && report.timeline_events.length > 0) return; // Already populated

  const sources = report.sources || [];
  const timeline: { date: string; title: string; description: string; significance: number }[] = [];

  // Extract dates from source published_date fields
  for (const s of sources) {
    if (!s.published_date || s.published_date === 'unknown') continue;
    // Try to extract a year
    const yearMatch = s.published_date.match(/(\d{4})/);
    if (!yearMatch) continue;
    const year = yearMatch[1];
    const title = (s.title || '').substring(0, 60);
    if (title.length < 5) continue;
    timeline.push({
      date: year,
      title,
      description: (s.key_finding || '').substring(0, 100),
      significance: Math.min(5, Math.max(1, Math.ceil((s.credibility_score || 50) / 20))),
    });
  }

  // Deduplicate by date+title
  const seen = new Set<string>();
  const deduped = timeline.filter(t => {
    const key = `${t.date}_${t.title.substring(0, 20)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort chronologically
  deduped.sort((a, b) => a.date.localeCompare(b.date));

  report.timeline_events = deduped.length > 0 ? deduped.slice(0, 10) : [];
}

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

    // Skip citations with very short surrounding text — these are usually
    // sentence fragments or transitional phrases, not actual claims.
    // Also skip sourceId 0 which is not a real source (document placeholder).
    if (claimText.length > 40) {
      for (const id of ids) {
        if (id === 0) continue; // Skip placeholder/document source IDs
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
    const content = (s.full_text || s.snippet || s.key_finding || '').substring(0, 4000);
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

CRITICAL RULES:
1. Base your verdict STRICTLY on the SOURCE CONTENT provided below. Do NOT infer, guess, or add information not present in the quoted source text.
2. If the source content does not discuss the claim topic at all, use "unrelated".
3. If you are unsure because the source content is too short or ambiguous, use "partial" with low confidence.
4. NEVER make up source content. If the source content field is empty, use "unrelated" with confidence 0.
5. You MUST include a specific explanation for EVERY pair. The explanation must reference exact words or phrases from the source text, or clearly state what the source covers instead. Do NOT leave any explanation empty.

Be precise: a claim is "supported" only if the source content explicitly supports the claim or directly discusses the same specific finding. Assign "partial" if the source covers the general topic but not the specific claim. Use "contradicted" only if the source explicitly says the opposite. Use "unrelated" only if the source is about a completely different subject or the content field is empty.

For each pair, return exactly this structure:
{
  "verdict": "supported" | "partial" | "contradicted" | "unrelated",
  "confidence": 0.0 to 1.0,
  "explanation": "Required — one brief sentence EXPLICITLY quoting or referencing specific words from the source, e.g. 'The source mentions [X] which supports [Y]' or 'The source discusses [Z] but does not mention [Y]'"
}

Return ONLY a valid JSON array. No markdown, no backticks, no extra text. Every object MUST include all three fields: verdict, confidence, and explanation. FAIL IF ANY explanation is missing or empty.

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

    return arr
      .filter((_: any, i: number) => i < verifiable.length)
      .map((r: any, i: number) => ({
        source_id: verifiable[i]?.sourceId ?? 0,
        claim: verifiable[i]?.claimText ?? '',
        verdict: ['supported', 'partial', 'contradicted', 'unrelated'].includes(r.verdict)
          ? r.verdict
          : 'unrelated',
        confidence: typeof r.confidence === 'number' ? Math.max(0, Math.min(1, r.confidence)) : 0,
        explanation: r.explanation || 'Verifier did not provide a detailed explanation for this verdict — source content may be insufficient or ambiguous',
      }));
  } catch (e) {
    console.warn('Citation verification failed:', e);
    return [];
  }
}

/* ─── Full-Text Source Fetcher ─── */

/**
 * Fetch full text of a source URL via the server-side /api/fetch-url endpoint.
 * Falls back gracefully on failure (returns null, downstream uses snippet).
 */
async function fetchSourceFullText(url: string, abortSignal?: AbortSignal): Promise<string | null> {
  if (!url || url.startsWith('document')) return null; // document sources have no external URL
  // Skip URLs that are known to be unfetchable (PDFs, binary, login walls)
  const skipPatterns = [/\.pdf$/i, /\.zip$/i, /\.docx?$/i, /\.xlsx?$/i, /\.pptx?$/i, /login/i, /signup/i, /register/i, /captcha/i];
  if (skipPatterns.some(p => p.test(url))) return null;
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

/**
 * Deferred report enrichment — runs citation verification
 * in the background after the report is already returned to the user.
 * Updates the report object + store when complete.
 */
async function deferredReportEnrichment(
  report: COGNAPSE_Output,
  sources: GroundedSource[],
  abortSignal?: AbortSignal
): Promise<void> {
  try {
    if (sources.length === 0 || !report.summary?.full_synthesis) return;

    const citationPairs = extractCitations(report.summary.full_synthesis);
    if (citationPairs.length === 0) return;

    // Fetch full text for up to 5 unique source URLs
    const uniqueUrls = new Map<number, string>();
    for (const s of sources) {
      if (s.url && !s.url.startsWith('document') && !uniqueUrls.has(s.id)) {
        uniqueUrls.set(s.id, s.url);
      }
    }
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

    // Build source context for verification
    const sourceContexts = sources.map(s => ({
      id: s.id,
      snippet: s.snippet || '',
      key_finding: s.key_finding || '',
      title: s.title,
      domain: s.domain,
      full_text: fullTextMap.get(s.id)?.substring(0, 5000) || '',
    }));

    const verifications = await verifyCitations(citationPairs, sourceContexts, abortSignal);

    // Attach results to the report object (mutates the already-returned reference)
    (report as COGNAPSE_Output).citation_verifications = verifications;
    (report as COGNAPSE_Output)._citation_verified_at = new Date().toISOString();

    // Recompute evidence_assessment.citation_support_rate from real verification data
    if (verifications.length > 0 && (report as COGNAPSE_Output).evidence_assessment) {
      const supported = verifications.filter(v => v.verdict === 'supported').length;
      (report as COGNAPSE_Output).evidence_assessment!.citation_support_rate = Math.round((supported / verifications.length) * 100) / 100;
    }
    audioSystem.play('verification-complete');

    // Log summary via reasoning steps
    const supported = verifications.filter(v => v.verdict === 'supported').length;
    const partial = verifications.filter(v => v.verdict === 'partial').length;
    const failed = verifications.filter(v => v.verdict === 'contradicted' || v.verdict === 'unrelated').length;
    const fullTextCount = fullTextMap.size;
    const addStep = useStore.getState().addReasoningStep;
    addStep(`Citations: ${supported} supported, ${partial} partial, ${failed} flagged${fullTextCount > 0 ? ` (${fullTextCount} sources full-text checked)` : ''}`);

    // Update the store to trigger re-render with enriched fields
    const state = useStore.getState();
    if (state.currentReport === report) {
      // Shallow copy to trigger React re-render
      state.setCurrentReport({ ...report });
    }
  } catch (e) {
    // Non-critical — enrichment is optional
    console.warn('[COGNAPSE] Deferred enrichment error:', e);
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
  // Filter off-topic academic results using SEMANTIC similarity (embedding-based)
  // instead of brittle keyword lists. This works for ANY query domain
  // (medicine, physics, economics, crypto, etc.) without maintaining context word lists.
  // Falls back to keyword matching if the embedder isn't ready yet.
  academicSources = await academicPromise;
  if (academicSources.length > 0) {
    // Try to use semantic similarity (embedding-based) for filtering
    // This is fully dynamic — it understands that "impact of renewable energy on
    // income inequality" is NOT about "cryptocurrency mining environmental impact"
    // even though both contain the word "energy".
    const pipe = await getEmbedder();
    let filtered: GroundedSource[];
    
    if (pipe) {
      // Dynamic semantic filter: embed the query once, compare each source's
      // title+snippet against it, reject below threshold
      try {
        const queryEmb = await pipe(query, { pooling: 'mean', normalize: true });
        const queryData = queryEmb.data as number[];
        
        const scored = await Promise.all(
          academicSources.map(async (s) => {
            const text = `${s.title || ''} ${s.snippet || ''}`.substring(0, 1000);
            if (text.length < 20) return { source: s, score: 0 };
            try {
              const srcEmb = await pipe(text, { pooling: 'mean', normalize: true });
              const score = cosineSimilarity(queryData, srcEmb.data as number[]);
              return { source: s, score };
            } catch {
              return { source: s, score: 0 };
            }
          })
        );
        
        // Threshold: 0.25 cosine similarity. Papers about income inequality
        // with "renewable energy" in the title score ~0.05-0.10 against
        // a crypto mining query. Relevant papers score 0.40+.
        filtered = scored
          .filter(({ score }) => score >= 0.25)
          .map(({ source }) => source);
        
        const filteredCount = academicSources.length - filtered.length;
        if (filteredCount > 0) {
          console.log(`[AcademicSearch] Semantic filter removed ${filteredCount} off-topic sources (${scored.filter(s => s.score > 0).map(s => `${(s.score * 100).toFixed(0)}%`).join(', ')})`);
        }
      } catch (e) {
        console.warn('[AcademicSearch] Embedding filter failed, falling back to keyword matching:', e);
        filtered = academicSources;
      }
    } else {
      // Embedder not ready yet — fall back to simple keyword pre-filter
      // Extract meaningful keywords from the query
      const queryWords = query.toLowerCase().split(/\s+/).filter(w =>
        w.length > 4 && !['this','that','with','from','what','which','their','there','about','would','could','should','have','been','were','being','does','they','them','then','than','also','just','more','some','into','over','such','only','other','after','before','between','through','during','because','without','under','above','where','while','until','since','against','these','those','each','very','your','will'].includes(w)
      );
      filtered = academicSources.filter(s => {
        const titleLower = (s.title || '').toLowerCase();
        const snippetLower = (s.snippet || '').toLowerCase();
        let matchCount = 0;
        for (const w of queryWords) {
          if (titleLower.includes(w) || snippetLower.includes(w)) {
            matchCount++;
            continue;
          }
          const stem = w.replace(/(?:e?s|ing|ed)$/, '');
          if (stem.length > 3 && (titleLower.includes(stem) || snippetLower.includes(stem))) {
            matchCount++;
          }
        }
        // At least 1 keyword must match (lenient fallback)
        return matchCount >= 1;
      });
      const filteredCount = academicSources.length - filtered.length;
      if (filteredCount > 0) {
        console.log(`[AcademicSearch] Keyword fallback filtered ${filteredCount} off-topic sources`);
      }
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

  // ─── Iterative Search ───
  // If the combined search returned fewer than 5 sources, do a broader search
  // with a simplified query to find additional relevant content.
  // This prevents thin reports when the initial query was too specific.
  if (groundedSources.length > 0 && groundedSources.length < 5) {
    // Extract key terms: words > 3 chars, excluding common stopwords
    const keyTerms = query.toLowerCase().split(/\s+/).filter(w =>
      w.length > 3 && !['this','that','with','from','what','which','their','there','about','would','could','should','have','been','were','being','does','they','them','then','than','also','just','more','some','into','over','such','only','other','after','before','between','through','during','because','without','under','above','where','while','until','since','against','these','those','each','very','your','will'].includes(w)
    );
    
    if (keyTerms.length > 0) {
      // Use first 2 key terms for a broader search
      const broaderQuery = keyTerms.slice(0, 2).join(' ');
      if (broaderQuery.length >= 5) {
        addReasoningStep(`Focused search returned only ${groundedSources.length} sources — broadening to cover more ground...`);
        try {
          const broaderResult = await searchWeb(broaderQuery, 5);
          if (broaderResult && broaderResult.sources.length > 0) {
            // Filter out sources we already have (by URL)
            const existingUrls = new Set(groundedSources.map(s => s.url));
            const newSources = broaderResult.sources.filter(s => !existingUrls.has(s.url));
            if (newSources.length > 0) {
              // Assign IDs after the last source
              let nextId = 0;
              for (const s of groundedSources) {
                if (s.id > nextId) nextId = s.id;
              }
              const merged = newSources.map((s, i) => ({ ...s, id: nextId + i + 1 }));
              groundedSources.push(...merged as GroundedSource[]);
              addReasoningStep(`Broadened search added ${merged.length} additional sources`);
            }
          }
        } catch (e) {
          // Non-critical — proceed with what we have
          console.warn('[COGNAPSE] Iterative search unavailable:', e);
        }
      }
    }
  }

  // ─── Total Source Cap ───
  // Cap combined web + academic sources at 10 to keep reports focused.
  // Sources are already sorted by credibility (academic first, then web).
  if (groundedSources.length > 10) {
    console.log(`[COGNAPSE] Capping sources from ${groundedSources.length} to 10`);
    groundedSources = groundedSources.slice(0, 10);
    groundedSources = groundedSources.map((s, i) => ({ ...s, id: i + 1 }));
  }

  // ─── Source Compression ───
  // Sources remain sorted by credibility + relevance from the server ranking.
  // The server already returns sources scored by Tavily's relevance + our credibility
  // heuristics, so LLM-based reranking is redundant. We proceed directly to compression.

  // ─── PHASE 2: COMPRESS SOURCES FOR LLM ───
  // Compress sources into token-efficient context
  // Limit sources to top 10 by credibility to stay within model token limits
  const topSources = groundedSources
    .sort((a, b) => (b.credibility_score || 0) - (a.credibility_score || 0))
    .slice(0, 10);

  const sourcesContext = topSources.length > 0
    ? `
---PROVIDED SOURCES---
Below are REAL search results retrieved from the live web, plus relevant content from your uploaded documents.
You MUST base your analysis on these sources. Each source has an ID. You MUST cite sources inline using [ID] format for every claim.

${compressSourcesForLLM(topSources)}

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
  const primaryT0 = performance.now();
  const promptTokens = Math.ceil(prompt.length / 4);
  const primaryResponsePromise = callCloudAI(prompt, true, RESEARCH_MODEL, abortSignal);
  
  const secondaryT0 = performance.now();
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
  const primaryMs = Math.round(performance.now() - primaryT0);
  console.log(`[BENCH] PRIMARY | round-trip=${primaryMs}ms tokens=${promptTokens}+~2500(model) model=${RESEARCH_MODEL}`);
  
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

    // ─── Evidence Assessment — computed from actual data, not LLM guesswork ───
    if (parsed.sources && parsed.sources.length > 0) {
      // Use actual unique parent domains for diversity (e.g. 'theguardian.com', 'nature.com')
      // instead of coarse 3-category bins. This gives a more accurate measure of
      // source variety (10 unique domains out of 12 sources = high diversity).
      const uniqueDomains = new Set(parsed.sources.map((s: any) => {
        const d = (s.domain || '').toLowerCase().replace(/^www\./, '');
        const parts = d.split('.');
        // Extract the registered domain (last 2 parts for .com/.org/.net,
        // last 3 for two-part TLDs like .co.uk)
        if (parts.length >= 3 && ['co', 'org', 'com', 'gov', 'edu', 'net'].includes(parts[parts.length - 2]) && parts[parts.length - 1].length <= 3) {
          return parts.slice(-3).join('.');
        }
        if (parts.length >= 2) {
          return parts.slice(-2).join('.');
        }
        return d;
      }));
      const sourceCount = parsed.sources.length;
      // Diversity = ratio of unique domains to total sources, scaled by 1.25 so
      // that 80%+ unique domains gets a perfect score. Capped at 1.0.
      const diversityScore = Math.min((uniqueDomains.size / Math.max(sourceCount, 1)) * 1.25, 1);
      const conflictCount = (parsed.conflicts || []).length;
      // Citation support rate from verifications (if available) or default
      let citationRate = 0.5;
      if (parsed.citation_verifications && parsed.citation_verifications.length > 0) {
        const supported = parsed.citation_verifications.filter((v: any) => v.verdict === 'supported').length;
        citationRate = supported / parsed.citation_verifications.length;
      }
      parsed.evidence_assessment = {
        source_count: sourceCount,
        source_diversity_score: diversityScore,
        contradiction_count: conflictCount,
        citation_support_rate: Math.round(citationRate * 100) / 100,
      };
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

    // ─── Auto Bias Alert from Source Analysis ───
    // Uses domain-level signals (MBFC, commercial health, structural imbalance,
    // credibility variance), query-level signals (conspiracy, uncertainty),
    // and AFINN word-list sentiment analysis (0KB, <0.1ms, no model download).
    if (!parsed.bias_alert && groundedSources.length > 0) {
      // AFINN word-list sentiment for emotional language detection
      const sentimentResult = computeBiasFromSentiment(groundedSources);
      const biasThreshold = 0.3;

      // Domain-level heuristic: check if any source is a commercial health site
      const highBiasHealthDomains = ['webmd.com', 'goodrx.com', 'healthline.com', 'verywellhealth.com', 'medscape.com', 'everydayhealth.com'];
      const hasCommercialHealthSource = groundedSources.some(s =>
        highBiasHealthDomains.some(d => s.domain?.toLowerCase().includes(d))
      );
      const commercialCount = groundedSources.filter(s =>
        s.type === 'industry' || s.type === 'web'
      ).length;
      const academicOrGovCount = groundedSources.filter(s =>
        s.type === 'academic' || s.type === 'government'
      ).length;
      const structuralImbalance = commercialCount > academicOrGovCount * 3 && commercialCount >= 3;

      // ─── MBFC Domain Bias Lookup ───
      let hasConspiracySource = false;
      let hasSkewedBias = false;
      let hasLowFactualSource = false;
      let mbfcAvgBiasScore = 0;
      let mbfcSourceLabel = 'unavailable';
      try {
        const mbfcResults = await batchLookupDomains(
          groundedSources.map(s => s.domain || '')
        );
        mbfcSourceLabel = isMbfcConfigured() ? 'api' : 'hardcoded';
        const results = Array.from(mbfcResults.values());
        hasConspiracySource = results.some(r =>
          (r.bias === 'conspiracy' || r.bias === 'pseudoscience') &&
          (r.source === 'hardcoded' || r.source === 'api')
        );
        hasLowFactualSource = results.some(r =>
          r.factual === 'low' || r.factual === 'very-low'
        );
        const biasScores = results.map(r => r.biasScore);
        const avgDomainBias = biasScores.reduce((a, b) => a + b, 0) / biasScores.length;
        hasSkewedBias = avgDomainBias > 0.25;
        mbfcAvgBiasScore = avgDomainBias;
      } catch (e) {
        // Non-critical
      }

      const queryIsAdversarial = detectAdversarialQuery(query);
      const queryIsUncertain = detectUncertaintyQuery(query);
      const hasControversialQuery = queryIsAdversarial.isAdversarial || queryIsUncertain;

      const credScores = groundedSources.map(s => s.credibility_score || 50);
      const avgCred = credScores.reduce((a, b) => a + b, 0) / credScores.length;
      const credVariance = Math.sqrt(credScores.reduce((sum, c) => sum + (c - avgCred) ** 2, 0) / credScores.length);
      const hasHighCredVariance = credScores.length >= 3 && credVariance > 20;

      if (sentimentResult.biasScore > biasThreshold || hasCommercialHealthSource || structuralImbalance || hasControversialQuery || hasHighCredVariance || hasConspiracySource || hasSkewedBias || hasLowFactualSource) {
        let direction = 'slight';
        // Build a specific direction label based on what triggered the alert
        let directionDetails: string[] = [];
        if (queryIsAdversarial.isAdversarial) {
          directionDetails.push('conspiracy/pseudoscience topic');
        }
        if (hasConspiracySource) {
          directionDetails.push('known conspiracy sources');
        }
        if (hasSkewedBias) {
          directionDetails.push('skewed domain bias');
        }
        if (hasLowFactualSource) {
          directionDetails.push('low-factual-reporting domains');
        }
        if (hasCommercialHealthSource) {
          directionDetails.push('commercial health sites');
        }
        if (structuralImbalance) {
          directionDetails.push('industry-heavy source mix');
        }
        if (hasHighCredVariance) {
          directionDetails.push('widely varying source quality');
        }
        if (sentimentResult.biasScore > biasThreshold && directionDetails.length === 0) {
          directionDetails.push('emotional language detected');
        }
        const directionSuffix = directionDetails.length > 0 ? ` (${directionDetails.join(', ')})` : '';
        let biasSeverity = 'slight';
        if (sentimentResult.biasScore > 0.6 || queryIsAdversarial.isAdversarial || hasConspiracySource) biasSeverity = 'moderate';
        let alertNarrative = '';
        if (queryIsAdversarial.isAdversarial) {
          alertNarrative = 'This query touches on a topic known to attract misinformation or pseudoscientific claims. Sources may include debunking content with strong rhetorical framing. Cross-reference with authoritative scientific bodies and peer-reviewed literature.';
        } else if (hasConspiracySource) {
          alertNarrative = 'Some sources are from domains known for conspiracy or pseudoscience content (per Media Bias Fact Check). Verify claims against authoritative scientific bodies and peer-reviewed research before relying on them.';
        } else if (queryIsUncertain) {
          alertNarrative = 'This topic involves genuine scientific debate or uncertainty. Sources may reflect differing methodologies or interpretations. Cross-reference findings across multiple perspectives and check for funding disclosures.';
        } else if (hasSkewedBias) {
          alertNarrative = 'The domain set leans toward a particular bias direction (per Media Bias Fact Check ratings). Consider seeking sources from the opposite perspective for a more balanced view.';
        } else if (hasLowFactualSource) {
          alertNarrative = 'Some sources have low factual reporting ratings (per Media Bias Fact Check). Prioritize findings from domains with high or very-high factual ratings.';
        } else if (hasCommercialHealthSource) {
          alertNarrative = 'Some sources are commercial health sites that may prioritize engagement over neutral reporting. Cross-reference findings with independent academic or government sources.';
        } else if (structuralImbalance) {
          alertNarrative = 'The source set is heavily weighted toward commercial/industry sources with limited academic or government representation. This may introduce a structural bias toward certain perspectives.';
        } else if (hasHighCredVariance) {
          alertNarrative = 'Source credibility varies significantly across the results, suggesting the topic attracts mixed-quality content. Prioritize findings from academic and government sources.';
        } else {
          alertNarrative = 'Our sentiment analysis detected above-average emotional language in the sources used for this report. These sources may lean toward advocacy over neutral reporting. Consider cross-referencing with more neutral sources.';
        }
        parsed.bias_alert = {
          direction: `${biasSeverity} potential bias detected${directionSuffix}`,
          recommendation: alertNarrative!,
        };
        addReasoningStep(`Bias alert: adversarial=${queryIsAdversarial.isAdversarial}, uncertainty=${queryIsUncertain}, sentiment=${sentimentResult.biasScore.toFixed(2)}, credVariance=${credVariance.toFixed(1)}, MBFC(avg=${mbfcAvgBiasScore.toFixed(2)}, conspiracy=${hasConspiracySource}, skewed=${hasSkewedBias}, lowFactual=${hasLowFactualSource})`);
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

    // Post-process: detect missing contradictions from source stance analysis
    // NOTE: runs AFTER real sources are attached so Priority 1 has access to
    // actual source titles/domains rather than the AI-hallucinated ones
    try {
      generateMissingConflicts(parsed);
    } catch (e) {
      // Non-critical — conflicts are optional
    }

    // ─── Visual Fields Fallback ───
    // If the LLM skipped intelligence_map, geo_points, or timeline_events,
    // generate them from the available source data. This ensures the UI always
    // renders the PhysicsMap, geo-globe, and timeline when the flags are triggered.
    try {
      ensureIntelligenceMap(parsed);
    } catch (e) {
      console.warn('[COGNAPSE] Intelligence map fallback failed:', e);
    }
    try {
      ensureGeoPoints(parsed);
    } catch (e) {
      console.warn('[COGNAPSE] Geo points fallback failed:', e);
    }
    try {
      ensureTimelineEvents(parsed);
    } catch (e) {
      console.warn('[COGNAPSE] Timeline events fallback failed:', e);
    }

    // ─── PHASE 3: SECOND MODEL SYNTHESIS (Multi-Model Consensus) ───
    addReasoningStep('Running multi-model consensus validation...');
    audioSystem.play('consensus-complete');
    const secondaryResponse = await secondaryResponsePromise;
    const secondaryMs = Math.round(performance.now() - secondaryT0);
    console.log(`[BENCH] CONSENSUS | round-trip=${secondaryMs}ms model=${CONSENSUS_MODEL}`);
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

    // ─── Deferred Enrichment (non-blocking) ───
    // Confidence calibration and citation verification kick off in the background
    // after the report object is returned. The user sees the report immediately;
    // these enrichments (confidence self-assessment + citation badge counts) populate
    // asynchronously via store update when complete.
    addReasoningStep('Verifying citations against source material...');
    audioSystem.play('verification-start');

    deferredReportEnrichment(
      parsed,
      groundedSources,
      abortSignal
    );

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
