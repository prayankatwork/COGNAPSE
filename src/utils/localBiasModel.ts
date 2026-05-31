/**
 * Local ML Bias Classifier
 *
 * Uses Transformers.js zero-shot classification to classify source content
 * (title + key_finding) against bias-relevant labels — no API key needed.
 *
 * Runs entirely in-browser via the CDN-loaded Transformers.js pipeline.
 * Falls back gracefully (returns null) if the model fails to load.
 *
 * Labels and their bias scores:
 *   - reliable scientific evidence    → 0.05  (pro-science)
 *   - neutral factual reporting       → 0.10  (center)
 *   - government official information  → 0.10  (center)
 *   - advocacy or opinion content      → 0.40  (left/right advocacy)
 *   - commercial or promotional        → 0.40  (commercial bias)
 *   - misleading or false claims       → 0.70  (conspiracy/pseudoscience)
 *   - satirical or humorous            → 0.60  (satire)
 */

/* ─── Constants ─── */

export const BIAS_CANDIDATE_LABELS = [
  'reliable scientific evidence',
  'neutral factual reporting',
  'government official information',
  'advocacy or opinion content',
  'commercial or promotional',
  'misleading or false claims',
  'satirical or humorous',
] as const;

export const LABEL_BIAS_MAP: Record<string, number> = {
  'reliable scientific evidence': 0.05,
  'neutral factual reporting': 0.10,
  'government official information': 0.10,
  'advocacy or opinion content': 0.40,
  'commercial or promotional': 0.40,
  'misleading or false claims': 0.70,
  'satirical or humorous': 0.60,
};

export const LABEL_FACTUAL_MAP: Record<string, number> = {
  'reliable scientific evidence': 10,
  'neutral factual reporting': 8,
  'government official information': 8,
  'advocacy or opinion content': 5,
  'commercial or promotional': 5,
  'misleading or false claims': 2,
  'satirical or humorous': 3,
};

/* ─── Type ─── */

export interface LocalBiasResult {
  label: string;
  biasScore: number;
  factualScore: number;
  confidence: number;
  source: 'ml-model';
}

/* ─── Pipeline Singleton ─── */

let hfFetchPatched = false;
let classifierPromise: Promise<any> | null = null;
let classifierReady = false;
let classifierLoading = false;

/**
 * Test-only hook: inject a mock classifier function.
 * When set, getClassifier() returns this instead of loading the real model.
 * Only available in test environment.
 */
let mockClassifier: any = undefined;

/**
 * Reset all module state (for test isolation between tests).
 */
export function resetLocalBiasState(): void {
  hfFetchPatched = false;
  classifierPromise = null;
  classifierReady = false;
  classifierLoading = false;
  mockClassifier = undefined;
}

/**
 * Inject a mock classifier for testing.
 * The mock should be an async function accepting (text, labels, options) and
 * returning { labels: string[], scores: number[] }.
 */
export function setMockClassifier(mock: any): void {
  mockClassifier = mock;
  classifierReady = true;
  classifierPromise = Promise.resolve(mock);
}

async function getClassifier(): Promise<any> {
  // Test hook: return mock classifier if set
  if (mockClassifier !== undefined && classifierReady) return classifierPromise;
  if (classifierLoading) {
    // Wait for loading to complete
    while (classifierLoading) await new Promise(r => setTimeout(r, 100));
    return classifierPromise;
  }    classifierLoading = true;
  try {
    // Patch global fetch to rewrite /resolve/ → /raw/ for Hugging Face model files.
    // Required because /resolve/ issues a 307 redirect that breaks CORS in the browser.
    // ONNX model files (.onnx) are excluded because they use Git LFS and /raw/ returns
    // pointer files (text) instead of binary — breaking ONNX Runtime.
    // Same patch used by getEmbedder() and getSentimentModel() in scoringEngine.ts.
    if (!hfFetchPatched) {
      hfFetchPatched = true;
      const origFetch = globalThis.fetch.bind(globalThis);
      globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = typeof input === 'string'
          ? input
          : input instanceof Request
            ? (input as Request).url
            : String(input);
        if (urlStr.includes('huggingface.co/') && urlStr.includes('/resolve/') && !urlStr.includes('.onnx')) {
          const rewritten = urlStr.replace('/resolve/', '/raw/');
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

    console.log('[LocalBias] Downloading zero-shot model (~90MB quantized) from CDN...');
    // Same CDN import pattern used by scoringEngine.ts
    // @ts-expect-error - CDN module has no type declarations
    const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js');
    env.allowLocalModels = false;
    env.useBrowserCache = false;
    classifierPromise = pipeline('zero-shot-classification', 'Xenova/nli-deberta-v3-small', {
      quantized: true,
    });
    const classifier = await classifierPromise;
    classifierReady = true;
    return classifier;
  } catch (e) {
    console.warn('[LocalBias] Zero-shot classifier unavailable, using fallback:', e);
    classifierPromise = null;
    return null;
  } finally {
    classifierLoading = false;
  }
}

/* ─── Public API ─── */

/**
 * Classify a single source's bias using the local ML model.
 *
 * @param title   - Source title
 * @param finding - Source key finding / snippet
 * @param domain  - Source domain (used as fallback if content is empty)
 * @returns LocalBiasResult or null if the model is unavailable
 */
export async function classifySourceBias(
  title: string,
  finding: string,
  domain: string,
): Promise<LocalBiasResult | null> {
  const classifier = await getClassifier();
  if (!classifier) return null;

  // Build input text from the richest available content
  const text = [title, finding].filter(Boolean).join('. ').trim();
  // If no meaningful content, use domain as last resort
  const inputText = text.length > 10 ? text.slice(0, 512) : domain;

  try {
    const result = await classifier(inputText, BIAS_CANDIDATE_LABELS, {
      multi_label: false,
    });

    if (!result || !result.labels || result.labels.length === 0) return null;

    const bestLabel: string = result.labels[0];
    const confidence: number = result.scores[0];

    return {
      label: bestLabel,
      biasScore: LABEL_BIAS_MAP[bestLabel] ?? 0.3,
      factualScore: LABEL_FACTUAL_MAP[bestLabel] ?? 5,
      confidence,
      source: 'ml-model',
    };
  } catch (e) {
    console.warn(`[LocalBias] Classification failed for "${domain}":`, e);
    return null;
  }
}

/**
 * Batch-classify multiple sources in parallel.
 * Returns a Map<domain, LocalBiasResult>.
 */
export async function batchClassifySources(
  sources: { title?: string; key_finding?: string; domain?: string }[],
): Promise<Map<string, LocalBiasResult>> {
  const results = new Map<string, LocalBiasResult>();

  // Group by domain to avoid classifying the same domain multiple times
  const seen = new Set<string>();
  const unique: { title?: string; key_finding?: string; domain?: string }[] = [];

  for (const s of sources) {
    const domain = (s.domain || '').replace(/^www\./, '').toLowerCase().trim();
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    unique.push(s);
  }

  // Classify in parallel with a modest concurrency limit
  const batchSize = 5;
  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(s => classifySourceBias(s.title || '', s.key_finding || '', s.domain || ''))
    );
    for (let j = 0; j < batch.length; j++) {
      const source = batch[j];
      const domain = (source.domain || '').replace(/^www\./, '').toLowerCase().trim();
      const r = batchResults[j];
      if (r.status === 'fulfilled' && r.value) {
        results.set(domain, r.value);
      }
    }
  }

  return results;
}

/**
 * Check whether the local ML model is available (has been loaded successfully).
 */
export function isLocalBiasModelReady(): boolean {
  return classifierReady;
}
