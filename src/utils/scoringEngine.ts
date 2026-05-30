import nlp from 'compromise';
import { lookupDomain, factualToScore, biasToBiasScore } from './domainCredibility';

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

// ─── Sentiment Model (replaces AFINN-111 word-list) ───

let sentimentModel: any = null;
let sentimentLoading = false;
let sentimentReady = false;

async function getSentimentModel(): Promise<any> {
  if (sentimentReady) return sentimentModel;
  if (sentimentLoading) {
    while (sentimentLoading) await new Promise(r => setTimeout(r, 100));
    return sentimentModel;
  }
  sentimentLoading = true;
  // Patch fetch so model file requests use /raw/ instead of /resolve/
  patchHuggingFaceFetch();
  try {
    // @ts-expect-error - CDN module has no type declarations
    const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js');
    env.allowLocalModels = false;
    // Disable browser cache to avoid stale HTML error responses
    env.useBrowserCache = false;
    sentimentModel = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english', {
      quantized: true,
    });
    sentimentReady = true;
    return sentimentModel;
  } catch (e) {
    console.warn('[ScoringEngine] Sentiment model unavailable, using neutral fallback:', e);
    return null;
  } finally {
    sentimentLoading = false;
  }
}

async function analyzeSentiment(text: string): Promise<{ comparative: number }> {
  const pipe = await getSentimentModel();
  if (!pipe || !text.trim()) return { comparative: 0 };

  try {
    const result = await pipe(text.slice(0, 500));
    const output = result[0] as { label: string; score: number };
    // Convert POSITIVE(0.95) → 0.95, NEGATIVE(0.95) → -0.95
    const comparative = output.label === 'POSITIVE' ? output.score : -output.score;
    return { comparative };
  } catch {
    return { comparative: 0 };
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

export async function computeBiasFromSentiment(
  sources: { domain?: string; key_finding?: string; title?: string }[]
): Promise<{
  averageSentiment: number;
  emotionalIntensity: number;
  biasScore: number;
  hasDomainOverride: boolean;
}> {
  if (sources.length === 0) return { averageSentiment: 0, emotionalIntensity: 0, biasScore: 0.1, hasDomainOverride: false };

  let totalComparative = 0;
  let totalIntensity = 0;
  let hasDomainOverride = false;
  let domainBiasSum = 0;
  let domainCount = 0;

  // Batch sentiment analysis in parallel for performance
  const results = await Promise.all(
    sources.map(async (s) => {
      const text = `${s.title || ''} ${s.key_finding || ''}`;
      if (!text.trim()) return null;
      const result = await analyzeSentiment(text);
      const domainInfo = lookupDomain(s.domain || '');
      return { comparative: result.comparative, domainInfo };
    })
  );

  for (const r of results) {
    if (!r) continue;
    totalComparative += r.comparative;
    totalIntensity += Math.abs(r.comparative);
    if (r.domainInfo) {
      domainBiasSum += biasToBiasScore(r.domainInfo.bias);
      domainCount++;
      hasDomainOverride = true;
    }
  }

  const avgSentiment = sources.length > 0 ? totalComparative / sources.length : 0;
  const emotionalIntensity = sources.length > 0 ? totalIntensity / sources.length : 0;

  const sentimentBias = Math.max(0, Math.min(1, Math.abs(avgSentiment) * 0.7 + emotionalIntensity * 0.3));
  const domainBias = domainCount > 0 ? domainBiasSum / domainCount : 0.3;

  const biasScore = hasDomainOverride
    ? domainBias * 0.7 + sentimentBias * 0.3
    : sentimentBias;

  return {
    averageSentiment: avgSentiment,
    emotionalIntensity,
    biasScore: Math.round(biasScore * 100) / 100,
    hasDomainOverride,
  };
}

export function normalizeCredScore(raw?: number): number | null {
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
  const sentimentResult = await computeBiasFromSentiment(sources);
  const credibility = computeEnhancedSourceCredibility(sources);

  const consensusBase = ({ strong: 1, mixed: 0.7, contested: 0.4, insufficient: 0.2 } as Record<string, number>)[evidenceConsensus || ''] ?? 0.5;

  const avgCredibility = credibility.average;
  const stdDev = sources.length > 1
    ? Math.sqrt(credibility.perSource.reduce((sum, s) => sum + (s - avgCredibility) ** 2, 0) / credibility.perSource.length)
    : 0;

  const useEmbeddings = relevance.average !== 0.5 || consensus.score > 0;

  const accuracy = Math.round(Math.min(avgCredibility, 10) * 10) / 10;

  const finalBias = sentimentResult.hasDomainOverride
    ? sentimentResult.biasScore
    : existingScores.bias;

  const sourceDiversity = Math.round(
    (entityDiversity.diversityScore * 0.4 + existingScores.sourceDiversity * 0.6) * 100
  ) / 100;

  const confidenceInterval = Math.round(
    Math.min(
      (consensus.score * 0.3 + consensusBase * 0.4 + (1 - conflictPenalty) * 0.3),
      0.99
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
  };
}
