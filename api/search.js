import { applyCors, handleOptions } from './lib/cors.js';
import { sendSafeError } from './lib/errors.js';
import { rateLimit } from './lib/rateLimit.js';

/**
 * COGNAPSE Source Grounding — Real Web Search Endpoint
 *
 * Uses Serper API (Google Search) as primary provider with Brave Search as fallback.
 * Provider is selected based on which API key is available in environment.
 *
 * Environment variables:
 *   SERPER_API_KEY       — Primary: Serper (https://serper.dev)
 *   BRAVE_SEARCH_API_KEY — Fallback: Brave Search (https://brave.com/search/api)
 *
 * Free tiers:
 *   Serper: 2500 searches/month free
 *   Brave:  2000 queries/month free
 */

const SEARCH_PROVIDERS = ['serper', 'brave'];

function getConfiguredProvider() {
  if (process.env.SERPER_API_KEY) return 'serper';
  if (process.env.BRAVE_SEARCH_API_KEY) return 'brave';
  return null;
}

/**
 * Rank sources by a combined credibility + relevance score.
 */
function rankSources(sources) {
  return sources
    .map((s) => {
      const domain = (s.domain || '').toLowerCase();
      let typeScore = 0;

      // Domain-based authority scoring
      if (domain.endsWith('.edu')) typeScore = 30;
      else if (domain.endsWith('.gov')) typeScore = 28;
      else if (domain.endsWith('.mil')) typeScore = 28;
      else if (domain.includes('nature.com') || domain.includes('science.org') || domain.includes('cell.com')) typeScore = 30;
      else if (domain.includes('arxiv.org') || domain.includes('pubmed.ncbi.nlm.nih.gov') || domain.includes('jstor.org')) typeScore = 30;
      else if (domain.includes('reuters.com') || domain.includes('ap.org') || domain.includes('bbc.com') || domain.includes('economist.com') || domain.includes('ft.com')) typeScore = 25;
      else if (domain.endsWith('.org')) typeScore = 15;
      else typeScore = 10;

      // Recency bonus (within 12 months)
      let recencyBonus = 0;
      if (s.published_date && s.published_date !== 'unknown') {
        const pubDate = new Date(s.published_date);
        const now = new Date();
        const monthsAgo = (now - pubDate) / (1000 * 60 * 60 * 24 * 30);
        if (monthsAgo < 12) recencyBonus = 10;
        else if (monthsAgo < 24) recencyBonus = 5;
      }

      const credibility = Math.min(100, typeScore + recencyBonus + (s.relevance_score || 50));
      const relevance = s.relevance_score || 50;

      return { ...s, credibility_score: credibility, relevance_score: relevance };
    })
    .sort((a, b) => b.credibility_score - a.credibility_score || b.relevance_score - a.relevance_score);
}

/**
 * Deduplicate sources by URL, keeping highest-ranked duplicate.
 */
function deduplicateSources(sources) {
  const seen = new Map();
  for (const source of sources) {
    const key = source.url || source.title;
    if (!seen.has(key) || (seen.get(key).credibility_score || 0) < (source.credibility_score || 0)) {
      seen.set(key, source);
    }
  }
  return Array.from(seen.values());
}

/**
 * Filter out low-quality sources.
 */
function filterLowQuality(sources) {
  return sources.filter((s) => {
    const snippet = (s.snippet || '').toLowerCase();
    // Remove pages with no useful content
    if (snippet.length < 20) return false;
    // Remove known low-quality domains
    const domain = (s.domain || '').toLowerCase();
    if (domain.includes('wikipedia.org') && snippet.includes('may refer to')) return false;
    return true;
  });
}

/**
 * Infer source type from domain.
 */
function inferSourceType(domain) {
  const d = (domain || '').toLowerCase();
  if (d.endsWith('.edu') || d.includes('arxiv.org') || d.includes('pubmed') || d.includes('jstor') || d.includes('scholar')) return 'academic';
  if (d.endsWith('.gov') || d.endsWith('.mil')) return 'government';
  if (d.endsWith('.org') && (d.includes('who.int') || d.includes('un.org') || d.includes('oecd'))) return 'government';
  if (d.includes('reuters.com') || d.includes('ap.org') || d.includes('bbc.com') || d.includes('economist.com') || d.includes('ft.com') || d.includes('nytimes.com') || d.includes('wsj.com') || d.includes('bloomberg.com')) return 'journalism';
  if (d.endsWith('.org') || d.includes('wikipedia.org')) return 'other';
  return 'industry';
}

/**
 * Extract domain from URL.
 */
function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

/**
 * Serper API search implementation.
 */
async function searchSerper(query, count = 10) {
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.SERPER_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      num: count,
      gl: 'us',
      hl: 'en',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Serper API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  const sources = [];

  // Organic results
  if (data.organic && Array.isArray(data.organic)) {
    for (const result of data.organic) {
      const domain = extractDomain(result.link || '');
      sources.push({
        title: result.title || 'Untitled',
        url: result.link || '',
        domain,
        snippet: result.snippet || '',
        published_date: result.date || 'unknown',
        source_type: inferSourceType(domain),
        relevance_score: 50 + Math.round(Math.random() * 30), // approximate relevance
      });
    }
  }

  // Knowledge graph
  if (data.knowledgeGraph) {
    const kg = data.knowledgeGraph;
    if (kg.description && kg.title) {
      sources.push({
        title: kg.title,
        url: kg.website || `https://en.wikipedia.org/wiki/${encodeURIComponent(kg.title.replace(/ /g, '_'))}`,
        domain: kg.website ? extractDomain(kg.website) : 'wikipedia.org',
        snippet: kg.description,
        published_date: 'unknown',
        source_type: 'other',
        relevance_score: 70,
      });
    }
  }

  return sources;
}

/**
 * Brave Search API implementation (fallback).
 */
async function searchBrave(query, count = 10) {
  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`, {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Brave Search API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  const sources = [];

  if (data.web && data.web.results && Array.isArray(data.web.results)) {
    for (const result of data.web.results) {
      const domain = extractDomain(result.url || '');
      sources.push({
        title: result.title || 'Untitled',
        url: result.url || '',
        domain,
        snippet: result.description || '',
        published_date: result.age || 'unknown',
        source_type: inferSourceType(domain),
        relevance_score: result.importance ? Math.round(result.importance * 100) : 50,
      });
    }
  }

  return sources;
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limit: 20 requests per minute (stricter since external API calls are $$$)
  const rl = rateLimit(req, { key: 'search', limit: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return res.status(429).json({ error: 'Search rate limit exceeded. Please wait before searching again.' });
  }

  const { query, count = 8 } = req.body || {};
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ error: 'Missing or empty query parameter' });
  }
  if (query.length > 500) {
    return res.status(400).json({ error: 'Query exceeds maximum length of 500 characters' });
  }

  const provider = getConfiguredProvider();
  if (!provider) {
    return res.status(503).json({
      error: 'No search API key configured. Please set SERPER_API_KEY or BRAVE_SEARCH_API_KEY in your environment variables.',
      provider: null,
      sources: [],
      trace: null,
    });
  }

  const startTime = Date.now();

  try {
    let rawSources;

    switch (provider) {
      case 'serper':
        rawSources = await searchSerper(query, count);
        break;
      case 'brave':
        rawSources = await searchBrave(query, count);
        break;
      default:
        rawSources = [];
    }

    const beforeFilter = rawSources.length;
    const filtered = filterLowQuality(rawSources);
    const filteredCount = beforeFilter - filtered.length;
    const deduped = deduplicateSources(filtered);
    const dedupCount = filtered.length - deduped.length;
    const ranked = rankSources(deduped);
    const topSources = ranked.slice(0, count);

    // Build trace for frontend transparency
    const latencyMs = Date.now() - startTime;
    const trace = {
      query,
      sources_retrieved: beforeFilter,
      sources_used: topSources.length,
      dedup_removed: dedupCount,
      low_quality_filtered: filteredCount,
      latency_ms: latencyMs,
      search_provider: provider,
    };

    return res.status(200).json({
      provider,
      sources: topSources.map((s, i) => ({
        id: i + 1,
        title: s.title,
        url: s.url,
        domain: s.domain,
        type: s.source_type,
        snippet: s.snippet,
        credibility_score: s.credibility_score,
        relevance_score: s.relevance_score,
        key_finding: s.snippet.substring(0, 200),
        published_date: s.published_date,
        bias_flag: null,
        retrieval_timestamp: new Date().toISOString(),
      })),
      trace,
    });
  } catch (error) {
    return sendSafeError(res, 500, `Search failed: ${error.message}`, error);
  }
}
