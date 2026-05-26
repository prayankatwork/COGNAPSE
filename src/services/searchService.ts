/**
 * COGNAPSE Source Grounding — Frontend Search Service
 *
 * Orchestrates real web search via the backend API with:
 * - Aggressive response caching (TTL-based)
 * - Deduplication by URL
 * - Source ranking by credibility + relevance
 * - Retrieval trace capture
 */

import { apiFetch } from './apiClient';
import type { GroundedSource, RetrievalTrace } from '../types';

/* ─── Cache ─── */

interface CacheEntry {
  sources: GroundedSource[];
  trace: RetrievalTrace;
  cachedAt: number;
}

const searchCache = new Map<string, CacheEntry>();

// Cache TTL: 5 minutes for same query (aggressive — research queries repeat often)
const CACHE_TTL_MS = 5 * 60 * 1000;

// Max cache size to prevent memory leaks
const MAX_CACHE_SIZE = 50;

function getCacheKey(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ');
}

function getFromCache(query: string): CacheEntry | null {
  const key = getCacheKey(query);
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  return entry;
}

function setCache(query: string, sources: GroundedSource[], trace: RetrievalTrace): void {
  const key = getCacheKey(query);

  // Evict oldest entry if cache is full
  if (searchCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }

  searchCache.set(key, { sources, trace, cachedAt: Date.now() });
}

/* ─── Source Ranking ─── */

/**
 * Rank sources by a combined credibility + relevance score.
 * Higher is better. Returns sorted copy.
 */
function rankSources(sources: GroundedSource[]): GroundedSource[] {
  return [...sources].sort((a, b) => {
    const scoreA = (a.credibility_score || 0) + (a.relevance_score || 0);
    const scoreB = (b.credibility_score || 0) + (b.relevance_score || 0);
    return scoreB - scoreA;
  });
}

/**
 * Deduplicate sources by URL, keeping the one with higher combined score.
 */
function deduplicateSources(sources: GroundedSource[]): GroundedSource[] {
  const seen = new Map<string, GroundedSource>();
  for (const source of sources) {
    const key = source.url || source.title;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, source);
    } else {
      const existingScore = (existing.credibility_score || 0) + (existing.relevance_score || 0);
      const newScore = (source.credibility_score || 0) + (source.relevance_score || 0);
      if (newScore > existingScore) {
        seen.set(key, source);
      }
    }
  }
  return Array.from(seen.values());
}

/* ─── Public API ─── */

export interface SearchResult {
  sources: GroundedSource[];
  trace: RetrievalTrace;
  fromCache: boolean;
}

/**
 * Perform a real web search for the given query.
 *
 * Steps:
 * 1. Check in-memory cache → return immediately if fresh
 * 2. Call /api/search backend endpoint
 * 3. Deduplicate and rank results
 * 4. Cache and return
 *
 * @param query - The search query
 * @param count - Max sources to return (default 8)
 */
export async function searchWeb(query: string, count = 8): Promise<SearchResult> {
  // Step 1: Check cache
  const cached = getFromCache(query);
  if (cached) {
    return {
      sources: cached.sources.slice(0, count),
      trace: cached.trace,
      fromCache: true,
    };
  }

  // Step 2: Call backend
  const response = await apiFetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: query.trim(), count }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Search failed' }));
    throw new Error(errorData.error || `Search request failed (${response.status})`);
  }

  const data = await response.json();

  if (!data.sources || !Array.isArray(data.sources)) {
    throw new Error('Search returned invalid response format');
  }

  // Step 3: Process results
  const deduped = deduplicateSources(data.sources);
  const ranked = rankSources(deduped);

  const trace: RetrievalTrace = data.trace || {
    query,
    sources_retrieved: data.sources.length,
    sources_used: ranked.length,
    dedup_removed: data.sources.length - deduped.length,
    low_quality_filtered: 0,
    latency_ms: 0,
    search_provider: data.provider || 'unknown',
  };

  // Step 4: Cache and return
  setCache(query, ranked, trace);

  return {
    sources: ranked.slice(0, count),
    trace,
    fromCache: false,
  };
}

/**
 * Clear the search result cache.
 * Useful after long periods of inactivity or when user explicitly requests refresh.
 */
export function clearSearchCache(): void {
  searchCache.clear();
}

/**
 * Get search cache stats.
 */
export function getSearchCacheStats(): { size: number; keys: string[] } {
  return {
    size: searchCache.size,
    keys: Array.from(searchCache.keys()),
  };
}

/**
 * Extract key findings from sources — the top insights for AI context building.
 * Compresses source content into a token-efficient format for LLM consumption.
 */
export function compressSourcesForLLM(sources: GroundedSource[], maxTokens = 2000): string {
  const estimatedTokens = (text: string) => Math.ceil(text.length / 4);
  let context = '';
  let totalTokens = 0;

  for (const source of sources) {
    const entry = `SOURCE ${source.id}: "${source.title}" (${source.domain})\nType: ${source.type}\nCredibility: ${source.credibility_score}/100\nSnippet: ${source.snippet}\nURL: ${source.url}\n\n`;
    const entryTokens = estimatedTokens(entry);

    if (totalTokens + entryTokens > maxTokens) break;

    context += entry;
    totalTokens += entryTokens;
  }

  return context.trim();
}
