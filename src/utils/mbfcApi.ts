/**
 * MBFC (Media Bias Fact Check) API Integration
 *
 * Uses the RapidAPI-hosted MBFC API to look up bias and factual ratings for news domains.
 * Falls back to the existing hardcoded domainData map when the API is unavailable.
 *
 * Environment variable: VITE_RAPIDAPI_KEY
 */

import { lookupDomain, biasToBiasScore } from './domainCredibility';

/* ─── Types ─── */

export interface MbfcResult {
  domain: string;
  bias: string;
  biasScore: number;
  factual: string;
  factualScore: number;
  source: 'cache' | 'api' | 'hardcoded' | 'inferred';
}

interface MbfcApiResponse {
  name?: string;
  url?: string;
  bias?: string;
  factual_reporting?: string;
  country?: string;
  [key: string]: unknown;
}

/* ─── Constants ─── */

const RAPIDAPI_HOST = 'media-bias-fact-check-ratings-api2.p.rapidapi.com';
const RAPIDAPI_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_RAPIDAPI_KEY) as string | undefined;

const BIAS_SCORE_MAP: Record<string, number> = {
  'pro-science': 0.05,
  center: 0.1,
  'left-center': 0.2,
  'right-center': 0.2,
  left: 0.4,
  right: 0.4,
  'extreme left': 0.5,
  'extreme right': 0.5,
  conspiracy: 0.7,
  pseudoscience: 0.7,
  satire: 0.6,
};

const FACTUAL_SCORE_MAP: Record<string, number> = {
  'very-high': 10,
  high: 8,
  mixed: 5,
  low: 3,
  'very-low': 1,
};

/* ─── In-Memory Cache ─── */

const cache = new Map<string, MbfcResult>();

/**
 * Global rate-limit flag.
 * Once set, ALL future API calls are skipped for the rest of the session
 * to avoid wasted requests on the (usually very low) free-tier quota.
 */
let rateLimited = false;

function normalizeBiasLabel(raw: string | undefined | null): string {
  if (!raw) return 'center';
  const s = raw.toLowerCase().trim();
  if (s === 'left') return 'left';
  if (s === 'left-center' || s === 'left center' || s === 'leans left') return 'left-center';
  if (s === 'right') return 'right';
  if (s === 'right-center' || s === 'right center' || s === 'leans right') return 'right-center';
  if (s === 'center' || s === 'least biased') return 'center';
  if (s.includes('conspiracy')) return 'conspiracy';
  if (s.includes('pseudo') || s.includes('junk')) return 'pseudoscience';
  if (s === 'satire') return 'satire';
  if (s === 'pro-science') return 'pro-science';
  return 'center';
}

function normalizeFactualLabel(raw: string | undefined | null): string {
  if (!raw) return 'mixed';
  const s = raw.toLowerCase().trim();
  if (s === 'very-high' || s === 'very high') return 'very-high';
  if (s === 'high') return 'high';
  if (s === 'mixed') return 'mixed';
  if (s === 'low') return 'low';
  if (s === 'very-low' || s === 'very low') return 'very-low';
  return 'mixed';
}

/**
 * Look up a domain via the MBFC RapidAPI.
 * Steps:
 *   1. Check in-memory cache.
 *   2. Fall back to the hardcoded domainData map (from domainCredibility.ts).
 *   3. Try the MBFC API (only if RAPIDAPI_KEY is configured and not rate-limited).
 *   4. Infer from TLD as a last resort.
 */
export async function lookupDomainMBFC(domain: string): Promise<MbfcResult> {
  const cleanDomain = domain.replace(/^www\./, '').toLowerCase().trim();

  // 1. Check cache
  const cached = cache.get(cleanDomain);
  if (cached) return cached;

  // 2. Check hardcoded map
  const hardcoded = lookupDomain(cleanDomain);
  if (hardcoded) {
    const result: MbfcResult = {
      domain: cleanDomain,
      bias: hardcoded.bias,
      biasScore: biasToBiasScore(hardcoded.bias),
      factual: hardcoded.factual,
      factualScore: factualScoreFromEntry(hardcoded.factual),
      source: 'hardcoded',
    };
    cache.set(cleanDomain, result);
    return result;
  }

  // 3. Try MBFC API (only if key is available and not rate-limited)
  if (RAPIDAPI_KEY && !rateLimited) {
    try {
      const apiResult = await fetchFromMbfcApi(cleanDomain);
      if (apiResult) {
        cache.set(cleanDomain, apiResult);
        return apiResult;
      }
    } catch (e) {
      console.warn(`[MBFC] API lookup failed for ${cleanDomain}:`, e);
    }
  }

  // 4. Infer from TLD
  const inferred = inferFromDomain(cleanDomain);
  cache.set(cleanDomain, inferred);
  return inferred;
}

/**
 * Fetch bias data from the MBFC RapidAPI for a specific domain.
 * Returns null if the API call fails or the domain is not found.
 * Sets the global rateLimited flag on 429 responses.
 */
async function fetchFromMbfcApi(domain: string): Promise<MbfcResult | null> {
  if (!RAPIDAPI_KEY) return null;
  if (rateLimited) return null;

  const url = `https://${RAPIDAPI_HOST}/source?domain=${encodeURIComponent(domain)}`;

  const response = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': RAPIDAPI_HOST,
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    if (response.status === 429) {
      rateLimited = true;
      console.warn('[MBFC] Rate limited by RapidAPI — falling back to cache + inference for rest of session');
    }
    return null;
  }

  const data: MbfcApiResponse = await response.json();
  if (!data) return null;

  const bias = normalizeBiasLabel(data.bias);
  const factual = normalizeFactualLabel(data.factual_reporting);

  return {
    domain,
    bias,
    biasScore: BIAS_SCORE_MAP[bias] ?? 0.3,
    factual,
    factualScore: FACTUAL_SCORE_MAP[factual] ?? 5,
    source: 'api',
  };
}

/**
 * Check whether a domain is likely to have an entry in the MBFC database.
 * MBFC primarily covers well-known news, political, and media outlets.
 * Niche domains (small orgs, personal blogs, academic repositories, etc.)
 * almost never have entries, so we skip the API call to avoid 404 noise.
 */
function isLikelyInMbfcDatabase(domain: string): boolean {
  // .gov, .mil, .edu domains are never in MBFC (they use inference)
  if (domain.endsWith('.gov') || domain.endsWith('.mil') || domain.endsWith('.edu')) return false;
  
  // Check if the domain contains known MBFC-tracked keywords
  const knownMbfcKeywords = [
    'news', 'times', 'post', 'tribune', 'herald', 'chronicle', 'mirror',
    'sun', 'daily', 'weekly', 'observer', 'reporter', 'journal', 'gazette',
    'telegraph', 'express', 'mail', 'star', 'watch', 'bee', 'bugle',
    'crier', 'dispatch', 'globe', 'monitor', 'sentinel', 'times', 'world',
    'press', 'radio', 'tv', 'channel', 'broadcast', 'pbs', 'npr', 'bbc',
    'cnn', 'fox', 'abc', 'cbs', 'nbc', 'msnbc', 'c-span', 'aljazeera',
  ];
  const domainLower = domain.toLowerCase();
  for (const kw of knownMbfcKeywords) {
    if (domainLower.includes(kw)) return true;
  }
  
  // Also check parent domain (last 2 parts)
  const parts = domain.split('.');
  if (parts.length >= 2) {
    const parent = parts.slice(-2).join('.');
    for (const kw of knownMbfcKeywords) {
      if (parent.includes(kw)) return true;
    }
  }
  
  // Known news publisher domains that are tracked
  const knownPublishers = [
    'reuters.com', 'ap.org', 'apnews.com', 'bloomberg.com', 'ft.com',
    'wsj.com', 'economist.com', 'nytimes.com', 'washingtonpost.com',
    'theguardian.com', 'usatoday.com', 'wsj.com', 'latimes.com',
    'chicagotribune.com', 'bostonglobe.com', 'sfchronicle.com',
    'politico.com', 'huffpost.com', 'buzzfeednews.com', 'vox.com',
    'vice.com', 'motherjones.com', 'newyorker.com', 'theatlantic.com',
    'slate.com', 'thedailybeast.com', 'theintercept.com', 'reason.com',
    'nationalreview.com', 'washingtonexaminer.com', 'dailymail.co.uk',
    'thehill.com', 'townhall.com', 'dailycaller.com', 'newsmax.com',
    'breitbart.com', 'theblaze.com', 'infowars.com', 'oann.com',
    'zerohedge.com', 'nypost.com', 'washingtontimes.com',
  ];
  if (knownPublishers.includes(domainLower) || knownPublishers.some(p => domainLower.endsWith('.' + p))) {
    return true;
  }
  
  return false;
}

/**
 * Infer bias/factual from domain TLD and common patterns.
 */
function inferFromDomain(domain: string): MbfcResult {
  if (domain.endsWith('.edu')) {
    return { domain, bias: 'pro-science', biasScore: 0.05, factual: 'very-high', factualScore: 10, source: 'inferred' };
  }
  if (domain.endsWith('.gov') || domain.endsWith('.mil')) {
    return { domain, bias: 'center', biasScore: 0.1, factual: 'high', factualScore: 8, source: 'inferred' };
  }
  if (domain.endsWith('.org')) {
    return { domain, bias: 'center', biasScore: 0.1, factual: 'mixed', factualScore: 5, source: 'inferred' };
  }
  // .net domains: neutral by default, higher factual than default
  if (domain.endsWith('.net')) {
    return { domain, bias: 'center', biasScore: 0.1, factual: 'mixed', factualScore: 5, source: 'inferred' };
  }
  if (domain.includes('academic') || domain.includes('research') || domain.includes('scien')) {
    return { domain, bias: 'pro-science', biasScore: 0.05, factual: 'high', factualScore: 8, source: 'inferred' };
  }
  if (domain.includes('news') || domain.includes('times') || domain.includes('post') || domain.includes('tribune')) {
    return { domain, bias: 'center', biasScore: 0.1, factual: 'high', factualScore: 8, source: 'inferred' };
  }
  if (domain.includes('blog') || domain.includes('wordpress') || domain.includes('medium') || domain.includes('substack')) {
    return { domain, bias: 'center', biasScore: 0.1, factual: 'mixed', factualScore: 5, source: 'inferred' };
  }
  return { domain, bias: 'center', biasScore: 0.1, factual: 'mixed', factualScore: 5, source: 'inferred' };
}

function factualScoreFromEntry(factual: string): number {
  return FACTUAL_SCORE_MAP[factual.toLowerCase()] ?? 5;
}

/**
 * Clear the in-memory cache (useful for testing or session reset).
 */
export function clearMbfcCache(): void {
  cache.clear();
}

/**
 * Get the current rate-limit state.
 */
export function isMbfcRateLimited(): boolean {
  return rateLimited;
}

/**
 * Reset the rate-limit flag (useful for testing or session reset).
 */
export function resetMbfcRateLimit(): void {
  rateLimited = false;
}

/**
/**
 * Batch-lookup multiple domains — runs them in parallel with a concurrency limit.
 * Uses a 3-tier lookup: cache → hardcoded map → MBFC API → TLD inference.
 *
 * @param domains - Array of domain strings to look up.
 * @returns Map<domain, MbfcResult>
 */
export async function batchLookupDomains(
  domains: string[],
): Promise<Map<string, MbfcResult>> {
  const results = new Map<string, MbfcResult>();
  const unique = [...new Set(domains.map(d => d.replace(/^www\./, '').toLowerCase().trim()))];

  // Pass 1: Check cache + hardcoded map (instant)
  const toFetch: string[] = [];

  for (const domain of unique) {
    const cached = cache.get(domain);
    if (cached) {
      results.set(domain, cached);
    } else {
      const hardcoded = lookupDomain(domain);
      if (hardcoded) {
        const result: MbfcResult = {
          domain,
          bias: hardcoded.bias,
          biasScore: biasToBiasScore(hardcoded.bias),
          factual: hardcoded.factual,
          factualScore: factualScoreFromEntry(hardcoded.factual),
          source: 'hardcoded',
        };
        cache.set(domain, result);
        results.set(domain, result);
      } else {
        // Not in cache or hardcoded map — try API or inference
        // Only call API if the domain is likely to be in MBFC's database
        // (prevents browser 404 console noise for niche domains)
        if (RAPIDAPI_KEY && !rateLimited && isLikelyInMbfcDatabase(domain)) {
          toFetch.push(domain);
        } else {
          const inferred = inferFromDomain(domain);
          cache.set(domain, inferred);
          results.set(domain, inferred);
        }
      }
    }
  }

  // Pass 2: MBFC API (concurrency: 3 at a time)
  if (toFetch.length > 0 && RAPIDAPI_KEY && !rateLimited) {
    const concurrency = 3;
    for (let i = 0; i < toFetch.length; i += concurrency) {
      const batch = toFetch.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(d => fetchFromMbfcApi(d))
      );
      for (let j = 0; j < batch.length; j++) {
        const domain = batch[j];
        const apiResult = batchResults[j];
        if (apiResult.status === 'fulfilled' && apiResult.value) {
          cache.set(domain, apiResult.value);
          results.set(domain, apiResult.value);
        } else {
          // If API failed and we already tried ML, fall back to inference
          if (!results.has(domain)) {
            const inferred = inferFromDomain(domain);
            cache.set(domain, inferred);
            results.set(domain, inferred);
          }
        }
      }
      // If we got rate-limited mid-batch, skip remaining batches
      if (rateLimited) break;
    }
  }

  return results;
}

/**
 * Check whether the MBFC API is configured (has a valid key).
 */
export function isMbfcConfigured(): boolean {
  return !!RAPIDAPI_KEY;
}
