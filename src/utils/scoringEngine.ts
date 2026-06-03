import nlp from 'compromise';
import { lookupDomain, factualToScore } from './domainCredibility';
import vader from 'vader-sentiment';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embedder: any = null;
let embedderLoading = false;
let embedderReady = false;

/**
 * Patch global fetch to rewrite Hugging Face /resolve/ URLs to /raw/.
 * This avoids 307 redirects that break CORS in the browser.
 * Transformers.js env.remotePathTemplate is unreliable, so we intercept at the network level.
 */
let hfFetchPatched = false;
function patchHuggingFaceFetch() {
  if (hfFetchPatched) return;
  hfFetchPatched = true;

  const origFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    // Extract URL string from Request object or string — Transformers.js hub.js
    // constructs Request objects internally, so typeof-input check is insufficient.
    const urlStr = typeof input === 'string'
      ? input
      : input instanceof Request
        ? (input as Request).url
        : String(input);
    // Only rewrite non-ONNX files to /raw/. ONNX model files are stored with Git LFS,
    // and /raw/ returns LFS pointer files (text) instead of actual binary, which causes
    // ONNX Runtime to fail with "protobuf parsing failed". ONNX files must use /resolve/
    // which redirects to a CDN with proper binary content and CORS headers.
    if (urlStr.includes('huggingface.co/') && urlStr.includes('/resolve/') && !urlStr.includes('.onnx')) {
      const rewritten = urlStr.replace('/resolve/', '/raw/');
      // Preserve original input type: reconstruct Request if input was a Request;
      // fall back to string for URL objects or unknown types.
      if (typeof input === 'string') {
        input = rewritten;
      } else if (input instanceof Request) {
        input = new Request(rewritten, input);
      } else {
        input = rewritten;
      }
    }
    return origFetch(input, init);
  };
}

/**
 * Eagerly preload the Transformers.js embedding model in the background.
 * Call this on app boot so the 23MB model is cached before the user runs research.
 * The singleton guard in getEmbedder() ensures only one download starts.
 */
export function preloadModels(): void {
  getEmbedder().catch(() => {});
}

export async function getEmbedder(): Promise<any> {
  if (embedderReady) return embedder;
  if (embedderLoading) {
    while (embedderLoading) await new Promise(r => setTimeout(r, 100));
    return embedder;
  }
  embedderLoading = true;
  // Patch fetch so model file requests use /raw/ instead of /resolve/
  patchHuggingFaceFetch();
  try {
    // @ts-expect-error - CDN module has no type declarations
    const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js');
    env.allowLocalModels = false;
    // Disable browser cache to avoid stale HTML error responses that may have been
    // cached by the Cache API from earlier failed /resolve/ requests.
    env.useBrowserCache = false;
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true,
    });
    embedderReady = true;
    return embedder;
  } catch (e) {
    console.warn('[ScoringEngine] Transformers.js unavailable, using fallback scoring:', e);
    return null;
  } finally {
    embedderLoading = false;
  }
}


export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const mag = Math.sqrt(na) * Math.sqrt(nb);
  return mag === 0 ? 0 : dot / mag;
}

function averageEmbedding(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const avg = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) avg[i] += v[i] / vectors.length;
  }
  return avg;
}

export async function computeSemanticRelevance(
  query: string,
  sourceTexts: string[]
): Promise<{ scores: number[]; average: number }> {
  const pipe = await getEmbedder();
  if (!pipe) return { scores: sourceTexts.map(() => 0.5), average: 0.5 };

  try {
    const qEmb = await pipe(query, { pooling: 'mean', normalize: true });
    const sEmbs = await Promise.all(
      sourceTexts.map(async (t) => {
        const emb = await pipe(t.slice(0, 500), { pooling: 'mean', normalize: true });
        return emb.data as number[];
      })
    );
    const qData = qEmb.data as number[];
    const scores = sEmbs.map((s) => cosineSimilarity(qData, s));
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return { scores, average: avg };
  } catch {
    return { scores: sourceTexts.map(() => 0.5), average: 0.5 };
  }
}

export async function computeConsensusScore(
  sourceTexts: string[]
): Promise<{ score: number; agreementRate: number }> {
  const pipe = await getEmbedder();
  if (!pipe || sourceTexts.length < 2) {
    return { score: 0, agreementRate: 1 };
  }

  try {
    const embs = await Promise.all(
      sourceTexts.map(async (t) => {
        const e = await pipe(t.slice(0, 300), { pooling: 'mean', normalize: true });
        return e.data as number[];
      })
    );

    let pairwiseSum = 0;
    let pairwiseCount = 0;
    for (let i = 0; i < embs.length; i++) {
      for (let j = i + 1; j < embs.length; j++) {
        pairwiseSum += cosineSimilarity(embs[i], embs[j]);
        pairwiseCount++;
      }
    }
    const avgSimilarity = pairwiseCount > 0 ? pairwiseSum / pairwiseCount : 0;
    const agreementRate = Math.max(0, Math.min(1, avgSimilarity));
    const score = Math.round(agreementRate * 100) / 100;
    return { score, agreementRate };
  } catch {
    return { score: 0, agreementRate: 0.5 };
  }
}

export function computeEntityDiversity(sources: { domain?: string; key_finding?: string; title?: string }[]): {
  entityCount: number;
  orgCount: number;
  placeCount: number;
  personCount: number;
  topicCount: number;
  diversityScore: number;
} {
  if (sources.length === 0) return { entityCount: 0, orgCount: 0, placeCount: 0, personCount: 0, topicCount: 0, diversityScore: 0 };

  const allOrgs = new Set<string>();
  const allPlaces = new Set<string>();
  const allPeople = new Set<string>();
  const allTopics = new Set<string>();
  const allDomains = new Set<string>();

  for (const s of sources) {
    const text = `${s.title || ''} ${s.key_finding || ''}`;
    const doc = nlp(text);

    const orgs = doc.organizations().out('array') as string[];
    orgs.forEach((o) => allOrgs.add(o.toLowerCase()));

    const places = doc.places().out('array') as string[];
    places.forEach((p) => allPlaces.add(p.toLowerCase()));

    const people = doc.people().out('array') as string[];
    people.forEach((p) => allPeople.add(p.toLowerCase()));

    const nouns = doc.nouns().out('array') as string[];
    nouns.forEach((n) => allTopics.add(n.toLowerCase()));

    if (s.domain) allDomains.add(s.domain);
  }

  const entityCount = allOrgs.size + allPlaces.size + allPeople.size;
  const maxPossible = sources.length * 3;
  const entityRatio = maxPossible > 0 ? Math.min(entityCount / maxPossible, 1) : 0;
  const domainRatio = Math.min(allDomains.size / sources.length, 1);

  const diversityScore = Math.round(
    (entityRatio * 0.5 + domainRatio * 0.3 + Math.min(allTopics.size / (sources.length * 2), 1) * 0.2) * 100
  ) / 100;

  return {
    entityCount,
    orgCount: allOrgs.size,
    placeCount: allPlaces.size,
    personCount: allPeople.size,
    topicCount: allTopics.size,
    diversityScore,
  };
}



/* ─── VADER Sentiment Analysis ─── */

/**
 * VADER (Valence Aware Dictionary and sEntiment Reasoner) is a lexicon +
 * rule-based sentiment analysis tool. It handles negation, intensity modifiers
 * ("very good" > "good"), ALL CAPS emphasis, punctuation emphasis ("good!!"),
 * and "but" conjunctions — all without any model download.
 *
 * Returns a compound score from -1 (most negative) to +1 (most positive).
 */
function analyzeSentiment(text: string): { comparative: number } {
  if (!text || !text.trim()) return { comparative: 0 };
  try {
    const scores = vader.SentimentIntensityAnalyzer.polarity_scores(text);
    return { comparative: scores.compound };
  } catch {
    return { comparative: 0 };
  }
}

export function computeBiasFromSentiment(
  sources: { domain?: string; key_finding?: string; title?: string }[]
): {
  averageSentiment: number;
  emotionalIntensity: number;
  biasScore: number;
  hasDomainOverride: boolean;
} {
  if (sources.length === 0) return { averageSentiment: 0, emotionalIntensity: 0, biasScore: 0.1, hasDomainOverride: false };

  let totalComparative = 0;
  let totalIntensity = 0;

  for (const s of sources) {
    const text = `${s.title || ''} ${s.key_finding || ''}`;
    if (!text.trim()) continue;
    const result = analyzeSentiment(text);
    totalComparative += result.comparative;
    totalIntensity += Math.abs(result.comparative);
  }

  const avgSentiment = sources.length > 0 ? totalComparative / sources.length : 0;
  const emotionalIntensity = sources.length > 0 ? totalIntensity / sources.length : 0;

  // Compute bias score from sentiment (0 = neutral, 1 = strongly biased)
  const sentimentBias = Math.max(0, Math.min(1, Math.abs(avgSentiment) * 0.7 + emotionalIntensity * 0.3));

  return {
    averageSentiment: avgSentiment,
    emotionalIntensity,
    biasScore: Math.round(sentimentBias * 100) / 100,
    hasDomainOverride: false,
  };
}

/**
 * Known conspiracy / pseudoscience keywords for adversarial query detection.
 * When a query matches these patterns, the scoring engine applies a topic-level
 * credibility penalty and confidence reduction to prevent debunking sources from
 * inflating the overall score for pseudoscientific claims.
 *
 * Matches full query text (lowercased) — no partial substring matches to avoid
 * false positives on legitimate scientific queries (e.g., "flat earth's orbit").
 */
const ADVERSARIAL_PATTERNS: { pattern: RegExp; label: string }[] = [
  // Classic conspiracy theories
  { pattern: /\bflat\s*earth\b/i, label: 'flat_earth' },
  { pattern: /\bchem(trails?|trail)\b/i, label: 'chemtrails' },
  { pattern: /\bmoon\s*landing\s*(was\s*)?(fake|hoax|staged)\.*?$/i, label: 'moon_landing_hoax' },
  { pattern: /\b(aliens?|extraterrestrial)\s*(built|made|constructed)\s*(the\s*)?pyramids?\b/i, label: 'ancient_aliens' },
  { pattern: /\b(earth\s+is|earth\s+be)\s+(round|sphere|globe)\b.*evidence.*against/i, label: 'flat_earth' },
  { pattern: /\bevolution\s*(is\s*)?(a\s*)?(lie|hoax|fake)\b/i, label: 'evolution_denial' },
  { pattern: /\bvaccines?\s*cause\s*(autism|infertility|diseases?)\b/i, label: 'anti_vax' },
  { pattern: /\b(9.?11|september\s*11)\s*(was\s*)?(an?\s*)?inside\s*(job|attack)\b/i, label: '911_inside_job' },
  // Pseudoscience triggers
  { pattern: /\bperpetual\s*motion\s*machine\b/i, label: 'perpetual_motion' },
  { pattern: /\b(psychic|telepathy|clairvoyance)\s*(is\s*)?real\b/i, label: 'psychic_claims' },
];

/**
 * Known "debate" / "uncertainty" keywords for medium-uncertainty detection.
 * When a query matches, the system knows to expect mixed evidence and should
 * avoid reporting "strong" consensus.
 */
const UNCERTAINTY_PATTERNS: RegExp[] = [
  /\b(will|will\s+we|will\s+there)\s+(ever\s+)?(achieve|reach|see|have|get|be)\b/i,
  /\b(is\s+(it\s+)?possible\b|can\s+we\b)/i,
  /\b(controvers(y|ies)|debate[dds]?|disputed|uncertain|unknowns?|unclear)\b/i,
  /\b(future\s+(of|outlook)|predictions?|forecast|prospects?)\b/i,
  // Future year references — inherently speculative ("in 2030", "by 2050")
  /\b(in|by|around)\s+(20[2-9]\d|2[1-9]\d{2})\b/i,
  /\b(risks?|benefits?|trade.off|pro\s*(v|v\s*s?|\.\s*v\s*\.)\s*con)\b/i,
  /\b(should|whether)\s+.*\s+(is|are|be)\b/i,
  // Effects/impact — only flag when combined with explicit debate or methodological language.
  // Removed the broad pattern from earlier which matched ANY "effects of" query (including
  // settled-science topics like "effects of gravity on light"). The patterns above
  // (controversy, debate, dispute, conflicting studies, etc.) already catch genuinely
  // uncertain topics without false-positives on well-understood phenomena.
  // Trend/scenario projections — future-oriented and inherently speculative
  /\b(trends?|outlook|projections?|scenarios?|trajectory)\b/i,
  // Academic disagreements across studies
  /\b(studies?\s+(differ|conflict|disagree|vary|contradict)|literature\s+(is\s+)?(mixed|divided|inconclusive))\b/i,
  // Productivity/performance/adoption impact — a common class of uncertain topics
  /\b(productivity|efficiency|adoption|performance)\s+(effects?|impact|outcomes?|rates?|levels?)\b/i,
];

export function detectAdversarialQuery(query: string): { isAdversarial: boolean; label: string | null } {
  if (!query) return { isAdversarial: false, label: null };
  for (const p of ADVERSARIAL_PATTERNS) {
    if (p.pattern.test(query)) {
      return { isAdversarial: true, label: p.label };
    }
  }
  return { isAdversarial: false, label: null };
}

export function detectUncertaintyQuery(query: string): boolean {
  if (!query) return false;
  return UNCERTAINTY_PATTERNS.some((p) => p.test(query));
}

export function normalizeCredScore(raw?: number | null): number | null {
  if (raw == null) return null;
  return raw > 10 ? raw / 10 : raw;
}

export function computeEnhancedSourceCredibility(
  sources: { domain?: string; credibility_score?: number; key_finding?: string; title?: string }[]
): { perSource: number[]; average: number } {
  const perSource = sources.map((s) => {
    const cred = normalizeCredScore(s.credibility_score);
    const domainInfo = lookupDomain(s.domain || '');

    if (domainInfo) {
      if (cred == null) return factualToScore(domainInfo.factual) * 0.7 + 5 * 0.3;
      return factualToScore(domainInfo.factual) * 0.5 + cred * 0.3 + 2;
    }

    if (s.domain?.endsWith('.edu')) return 8.5;
    if (s.domain?.endsWith('.gov')) return 8;
    if (s.domain?.endsWith('.mil')) return 8;

    return cred ?? 5;
  });

  const average = perSource.length > 0
    ? perSource.reduce((a, b) => a + b, 0) / perSource.length
    : 5;

  return { perSource, average };
}

/**
 * Compute evidence-based confidence from actual source metrics rather than model self-opinion.
 * Confidence is driven by:
 *   - source count (more = better, up to 10)
 *   - source diversity (unique domain types)
 *   - source quality (average credibility)
 *   - contradiction level (fewer = better)
 *   - citation verification rate (higher = better)
 *   - evidence completeness (how well the sources cover the topic)
 *
 * Returns a score 0-1 and a coverage label.
 */
export function computeEvidenceBasedConfidence(
  sources: { domain?: string; credibility_score?: number }[],
  conflicts: any[],
  citationVerifications?: { verdict: string }[]
): { score: number; coverage: 'comprehensive' | 'moderate' | 'limited' | 'insufficient' } {
  if (sources.length === 0) return { score: 0.05, coverage: 'insufficient' };

  // Source count score: 0 to 1, diminishing returns after 8
  const countScore = Math.min(sources.length / 8, 1);

  // Source diversity score: unique domain types
  const domainTypes = new Set(sources.map(s => {
    const d = (s.domain || '').toLowerCase();
    if (d.endsWith('.edu') || d.includes('pubmed') || d.includes('arxiv')) return 'academic';
    if (d.endsWith('.gov') || d.endsWith('.mil')) return 'government';
    if (d.includes('wikipedia.org') || d.includes('britannica.com')) return 'reference';
    return 'other';
  }));
  const diversityScore = Math.min(domainTypes.size / 4, 1);

  // Source quality score: average credibility normalized to 0-1
  const credScores = sources.map(s => s.credibility_score || 50);
  const avgCred = credScores.reduce((a, b) => a + b, 0) / credScores.length;
  const qualityScore = Math.min(avgCred / 100, 1);

  // Contradiction penalty: each contradiction reduces confidence
  const conflictCount = conflicts?.length || 0;
  const conflictPenalty = Math.min(conflictCount * 0.15, 0.5);

  // Citation verification rate
  let citationSupportRate = 0.5; // neutral default when no data
  if (citationVerifications && citationVerifications.length > 0) {
    const supported = citationVerifications.filter(v => v.verdict === 'supported').length;
    citationSupportRate = supported / citationVerifications.length;
  }

  // Weighted combination
  // Count and diversity together ensure thin reports don't get inflated scores
  const baseConfidence =
    countScore * 0.15 +
    diversityScore * 0.15 +
    qualityScore * 0.30 +
    citationSupportRate * 0.25 +
    (1 - conflictPenalty) * 0.15;

  // Coverage label based on the combined evidence
  let coverage: 'comprehensive' | 'moderate' | 'limited' | 'insufficient';
  if (baseConfidence >= 0.7 && sources.length >= 5 && diversityScore >= 0.5) {
    coverage = 'comprehensive';
  } else if (baseConfidence >= 0.4 && sources.length >= 3) {
    coverage = 'moderate';
  } else if (baseConfidence >= 0.2) {
    coverage = 'limited';
  } else {
    coverage = 'insufficient';
  }

  return { score: Math.round(baseConfidence * 100) / 100, coverage };
}

/**
 * Determine evidence consensus based on source independence, diversity, and contradictions.
 * Returns one of the four consensus states with a reason.
 *
 * Strong: multiple independent, high-quality sources agree
 * Moderate: general agreement but some caveats or lower-quality sources
 * Mixed: significant disagreement or conflicting evidence
 * Contested: active debate, highly contradictory evidence
 */
export function determineConsensus(
  sources: { domain?: string; credibility_score?: number }[],
  conflicts: any[],
  citationVerifications?: { verdict: string }[]
): {
  level: 'insufficient' | 'strong' | 'moderate' | 'mixed' | 'contested';
  reason: string;
} {
  if (sources.length === 0) {
    return { level: 'insufficient', reason: 'No sources available to determine consensus.' };
  }

  const credScores = sources.map(s => s.credibility_score || 50);
  const avgCred = credScores.reduce((a, b) => a + b, 0) / credScores.length;
  const highCredCount = sources.filter(s => (s.credibility_score || 0) >= 70).length;
  const conflictCount = conflicts?.length || 0;

  // Source independence: unique root domains
  const uniqueDomains = new Set(sources.map(s => (s.domain || '').split('.').slice(-2).join('.')));
  const independenceRatio = uniqueDomains.size / Math.max(sources.length, 1);

  // Citation verification rate
  let citationSupportRate = 0.5;
  if (citationVerifications && citationVerifications.length > 0) {
    const supported = citationVerifications.filter(v => v.verdict === 'supported').length;
    citationSupportRate = supported / citationVerifications.length;
  }

  // Determine level
  if (
    conflictCount >= 3 ||
    (conflictCount >= 2 && citationSupportRate < 0.4) ||
    (sources.length >= 4 && highCredCount >= 2 && conflictCount >= 2)
  ) {
    return {
      level: 'contested',
      reason: `${conflictCount} evidence conflict(s) detected across ${sources.length} sources, indicating active debate or contradictory findings.`,
    };
  }

  if (
    conflictCount >= 1 ||
    citationSupportRate < 0.5 ||
    (avgCred < 60 && sources.length >= 3) ||
    independenceRatio < 0.3
  ) {
    return {
      level: 'mixed',
      reason: conflictCount > 0
        ? `${conflictCount} conflicting claim(s) found — evidence is divided on some aspects.`
        : `Source quality is moderate (avg ${Math.round(avgCred)}/100) or sources are concentrated in few domains — evidence is not fully conclusive.`,
    };
  }

  if (
    sources.length >= 3 &&
    highCredCount >= 2 &&
    independenceRatio >= 0.5 &&
    citationSupportRate >= 0.6
  ) {
    return {
      level: 'strong',
      reason: `${highCredCount} high-credibility sources from ${uniqueDomains.size} independent domains consistently support the main findings.`,
    };
  }

  return {
    level: 'moderate',
    reason: `General agreement across ${sources.length} sources, but evidence is not independently corroborated by enough high-credibility domains.`,
  };
}

export async function computeAllScores(
  query: string,
  existingScores: { accuracy: number; bias: number; sourceDiversity: number; confidenceInterval: number },
  sources: { domain?: string; key_finding?: string; title?: string; credibility_score?: number }[],
  conflicts: any[],
  evidenceConsensus?: string
): Promise<{
  accuracy: number;
  bias: number;
  sourceDiversity: number;
  confidenceInterval: number;
  consensusScore: number;
  relevanceScore: number;
  entityDiversity: number;
  sentimentBias: number;
  enhancedCredibility: number;
  credibilityStdDev: number;
  overallQuality: number;
  usingEmbeddings: boolean;
  _adversarial?: { label: string | null; penalty: number };
  _uncertainty?: { penalty: number };
}> {
  const sourceTexts = sources.map((s) => `${s.title || ''} ${s.key_finding || ''}`).filter(Boolean);
  const conflictPenalty = Math.min((conflicts?.length || 0) * 0.15, 0.45);

  const [consensus, relevance] = await Promise.all([
    computeConsensusScore(sourceTexts),
    query && sourceTexts.length > 0
      ? computeSemanticRelevance(query, sourceTexts)
      : Promise.resolve({ scores: [], average: existingScores.confidenceInterval }),
  ]);

  const entityDiversity = computeEntityDiversity(sources);
  const sentimentResult = computeBiasFromSentiment(sources);
  const credibility = computeEnhancedSourceCredibility(sources);

  const consensusBase = ({ strong: 1, mixed: 0.7, contested: 0.4, insufficient: 0.2 } as Record<string, number>)[evidenceConsensus || ''] ?? 0.5;

  // ─── Adversarial / Uncertainty Detection ───
  // Detect if the query is about a known conspiracy/pseudoscience topic.
  // When detected, apply a topic-level credibility penalty and confidence reduction
  // so that debunking sources don't inflate the overall score.
  const adversarial = detectAdversarialQuery(query);
  const isUncertain = detectUncertaintyQuery(query);

  // For adversarial queries: reduce effective credibility by 40%,
  // increase bias substantially (the topic itself is unscientific),
  // and floor confidence to prevent false "strong" consensus.
  const adversarialPenalty = adversarial.isAdversarial ? 0.4 : 0;
  const uncertaintyPenalty = (!adversarial.isAdversarial && isUncertain) ? 0.15 : 0;

  const avgCredibility = credibility.average * (1 - adversarialPenalty);
  const stdDev = sources.length > 1
    ? Math.sqrt(credibility.perSource.reduce((sum, s) => sum + (s - avgCredibility) ** 2, 0) / credibility.perSource.length)
    : 0;

  const useEmbeddings = relevance.average !== 0.5 || consensus.score > 0;

  const accuracy = Math.round(Math.min(avgCredibility, 10) * 10) / 10;

  // Adversarial queries get a bias bump (topic itself is misleading)
  let finalBias = sentimentResult.hasDomainOverride
    ? sentimentResult.biasScore
    : existingScores.bias;
  if (adversarial.isAdversarial) {
    finalBias = Math.min(finalBias + 0.3, 0.9);
  } else if (isUncertain) {
    finalBias = Math.min(finalBias + 0.1, 0.8);
  }

  const sourceDiversity = Math.round(
    (entityDiversity.diversityScore * 0.4 + existingScores.sourceDiversity * 0.6) * 100
  ) / 100;

  // For adversarial queries, confidence is capped at 0.4 (prevents "strong" consensus)
  // For uncertainty queries, confidence is slightly reduced
  const maxConfidence = adversarial.isAdversarial ? 0.4 : isUncertain ? 0.75 : 0.99;
  const confidenceInterval = Math.round(
    Math.min(
      (consensus.score * 0.3 + consensusBase * 0.4 + (1 - conflictPenalty) * 0.3) * (1 - adversarialPenalty * 0.5),
      maxConfidence
    ) * 100
  ) / 100;

  const relevanceScore = relevance.average > 0
    ? Math.round(relevance.average * 100) / 100
    : existingScores.confidenceInterval;

  const overallQuality = Math.round((
    (avgCredibility / 10) * 0.35 +
    consensusBase * 0.20 +
    relevanceScore * 0.15 +
    entityDiversity.diversityScore * 0.10 +
    (1 - finalBias) * 0.10 +
    confidenceInterval * 0.10
  ) * 100);

  return {
    accuracy,
    bias: Math.round(finalBias * 100) / 100,
    sourceDiversity,
    confidenceInterval,
    consensusScore: consensus.score,
    relevanceScore,
    entityDiversity: entityDiversity.diversityScore,
    sentimentBias: sentimentResult.biasScore,
    enhancedCredibility: Math.round(avgCredibility * 10) / 10,
    credibilityStdDev: Math.round(stdDev * 100) / 100,
    overallQuality,
    usingEmbeddings: useEmbeddings,
    // Return detection metadata for downstream reporting
    _adversarial: adversarial.isAdversarial ? { label: adversarial.label, penalty: adversarialPenalty } : undefined,
    _uncertainty: isUncertain ? { penalty: uncertaintyPenalty } : undefined,
  };
}
