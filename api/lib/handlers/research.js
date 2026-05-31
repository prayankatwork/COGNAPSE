/**
 * COGNAPSE API — Research / Search Handlers
 * Consolidated from: research.js, analyze.js, search.js
 */
import { applyCors, handleOptions } from '../cors.js';
import { sendSafeError } from '../errors.js';
import { rateLimit } from '../rateLimit.js';
import { requireUser, assertUserIdMatches } from '../auth.js';
import { getPremiumStatus } from '../premium.js';
import { runSwarm } from '../swarm.js';

/* ─── Research prompt template ─── */

const ANALYZE_PROMPT = (text) => `You are the COGNAPSE Strategic Intelligence Analyst OS. Provide an extremely concise, high-impact strategic summary and takeaway of the following webpage text.
To conserve operational credits, keep the output highly condensed, ultra-concise, and straight-to-the-point using direct, premium analytical terminology.

Text to Analyze:
"${text}"

Return a strictly valid JSON response with these exact keys:
{
  "summary": "A highly condensed strategic summary of exactly 20-30 words (strictly 2 sentences max). Be extremely direct, concise, and dense.",
  "insight": "A single premium, high-impact key takeaway of exactly 10-15 words (strictly 1 sentence).",
  "confidence": "HIGH, MEDIUM, or LOW",
  "recommendation": "An extremely brief research direction of exactly 8-12 words."
}`;

/* ─── POST /api/research ─── */

export async function handleResearch(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  const rl = rateLimit(req, { key: 'research', limit: 60, windowMs: 60_000 });
  if (!rl.allowed) return res.status(429).json({ error: 'Research rate limit exceeded. Please wait before starting a new investigation.' });

  const { userId, prompt, mode, requestedModel, isJson, isDeep, reportId, targetLanguage, username, groqKey, modelOverride } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'Missing userId parameter' });
  if (!prompt) return res.status(400).json({ error: 'Missing prompt parameter' });

  if (decoded && !assertUserIdMatches(decoded, userId)) return res.status(403).json({ error: 'User ID does not match authenticated session' });

  const uid = decoded?.uid || userId;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const rlKey = `research_${uid}`;

  const benchId = `res_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const queryPreview = ((prompt || '').slice(0, 60) + '...').replace(/\n/g, ' ');
  console.log(`[BENCH:${benchId}] START research | query="${queryPreview}"`);

  try {
    const t0 = Date.now();
    const wantsJson = isJson === true || mode === 'json';
    const raw = await runSwarm({
      prompt, isJson: wantsJson,
      estTokens: Math.ceil((prompt?.length || 0) / 4),
      requestedModel: requestedModel || 'groq-llama-3.1-8b-instant',
      groqKey: groqKey || 'primary',
      modelOverride,
    });
    const swarmMs = Date.now() - t0;

    let result = raw.result;
    if (mode === 'research') {
      try { result = JSON.parse(result); } catch { }
    }

    const totalMs = Date.now() - t0;
    const tokenInfo = raw.usage ? `${raw.usage.total_tokens || '?'}t` : 'no-usage';

    console.log(
      `[BENCH:${benchId}] DONE | swarm=${swarmMs}ms total=${totalMs}ms tokens=${tokenInfo} model=${raw.usage?.model || requestedModel || '?'}`
    );

    return res.status(200).json({
      result,
      usage: raw.usage,
      model: raw.usage?.model || requestedModel || 'groq-llama-3.1-8b-instant',
      _bench: { benchId, swarmMs, totalMs },
    });
  } catch (error) {
    console.log(`[BENCH:${benchId}] ERROR | ${error.message || error}`);
    if (res.headersSent) {
      res.write(JSON.stringify({ error: error.message || 'Research service failed.' }));
      return res.end();
    }
    return sendSafeError(res, 500, error.message || 'Research service failed.', error);
  }
}

/* ─── POST /api/analyze ─── */

export async function handleAnalyze(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  const rl = rateLimit(req, { key: 'analyze', limit: 20, windowMs: 60_000 });
  if (!rl.allowed) return res.status(429).json({ error: 'Rate limit exceeded. Please try again shortly.' });

  const { userId, text } = req.body || {};
  if (!userId || !text) return res.status(400).json({ error: 'Missing userId or text parameter' });
  if (text.length > 24_000) return res.status(400).json({ error: 'Text exceeds maximum length for analysis' });

  if (decoded && !assertUserIdMatches(decoded, userId)) return res.status(403).json({ error: 'User ID does not match authenticated session' });

  const uid = decoded?.uid || userId;

  try {
    const premium = await getPremiumStatus(uid);
    if (!premium.premium) return res.status(403).json({ error: 'COGNAPSE Premium required for extension analysis.' });

    const raw = await runSwarm({ prompt: ANALYZE_PROMPT(text), isJson: true, estTokens: Math.ceil(text.length / 4) });
    const parsed = JSON.parse(raw);
    return res.status(200).json(parsed);
  } catch (error) {
    if (error.message === 'SERVER_DATABASE_NOT_CONFIGURED') return res.status(503).json({ error: 'Analysis service is temporarily unavailable.' });
    return sendSafeError(res, 500, error.message || 'Failed to process analysis.', error);
  }
}

/* ─── Search providers ─── */

function extractDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'unknown'; }
}

function inferSourceType(domain) {
  const d = (domain || '').toLowerCase();
  // Academic / reference
  if (d.endsWith('.edu') || d.includes('arxiv.org') || d.includes('pubmed') || d.includes('jstor') || d.includes('scholar') || d.includes('wikipedia.org') || d.includes('britannica.com') || d.includes('lpi.usra.edu') || d.includes('si.edu') || d.includes('nixonlibrary.gov') || d.includes('planetary.org')) return 'academic';
  // Government / military
  if (d.endsWith('.gov') || d.endsWith('.mil')) return 'government';
  if (d.includes('nasa.gov') || d.includes('nih.gov') || d.includes('cdc.gov') || d.includes('loc.gov') || d.includes('ebsco')) return 'government';
  // Journalism / news
  if (d.includes('reuters.com') || d.includes('ap.org') || d.includes('bbc.com') || d.includes('bbc.co.uk') || d.includes('economist.com') || d.includes('ft.com') || d.includes('nytimes.com') || d.includes('wsj.com') || d.includes('bloomberg.com') || d.includes('theguardian.com') || d.includes('washingtonpost.com') || d.includes('forbes.com') || d.includes('cnn.com') || d.includes('nbcnews.com') || d.includes('abcnews.go.com') || d.includes('cbsnews.com') || d.includes('theatlantic.com') || d.includes('space.com') || d.includes('popsci.com') || d.includes('scientificamerican.com') || d.includes('nationalgeographic.com') || d.includes('pursuit.unimelb.edu.au') || d.includes('npr.org') || d.includes('pbs.org') || d.includes('pursuit')) return 'journalism';
  // Social media / user-generated
  if (d.includes('reddit.com') || d.includes('quora.com') || d.includes('facebook.com') || d.includes('youtube.com') || d.includes('linkedin.com') || d.includes('medium.com') || d.includes('substack.com') || d.includes('wordpress.com')) return 'social';
  // Industry / commercial
  return 'industry';
}

function rankSources(sources) {
  return sources.map(s => {
    const domain = (s.domain || '').toLowerCase();
    const sourceType = inferSourceType(domain);
    let typeScore = 0;
    if (sourceType === 'academic') typeScore = 30;
    else if (sourceType === 'government') typeScore = 28;
    else if (sourceType === 'journalism') typeScore = 25;
    else if (sourceType === 'social') typeScore = 8;
    else typeScore = 10;

    let recencyBonus = 0;
    if (s.published_date && s.published_date !== 'unknown') {
      const monthsAgo = (new Date() - new Date(s.published_date)) / (1000 * 60 * 60 * 24 * 30);
      if (monthsAgo < 12) recencyBonus = 10;
      else if (monthsAgo < 24) recencyBonus = 5;
    }
    const credibility = Math.min(100, typeScore + recencyBonus + (s.relevance_score || 50));
    return { ...s, credibility_score: credibility, relevance_score: s.relevance_score || 50, source_type: sourceType };
  }).sort((a, b) => b.credibility_score - a.credibility_score || b.relevance_score - a.relevance_score);
}

function deduplicateSources(sources) {
  const seen = new Map();
  for (const source of sources) {
    const key = source.url || source.title;
    if (!seen.has(key) || (seen.get(key).credibility_score || 0) < (source.credibility_score || 0)) seen.set(key, source);
  }
  return Array.from(seen.values());
}

function filterLowQuality(sources) {
  return sources.filter(s => {
    const snippet = (s.snippet || '').toLowerCase();
    if (snippet.length < 20) return false;
    const domain = (s.domain || '').toLowerCase();
    if (domain.includes('wikipedia.org') && snippet.includes('may refer to')) return false;
    return true;
  });
}

async function searchSerper(query, count = 10) {
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, num: count, gl: 'us', hl: 'en' }),
  });
  if (!response.ok) throw new Error(`Serper API error (${response.status}): ${await response.text().catch(() => 'Unknown error')}`);
  const data = await response.json();
  const sources = [];
  if (data.organic && Array.isArray(data.organic)) {
    for (const result of data.organic) {
      const domain = extractDomain(result.link || '');
      sources.push({ title: result.title || 'Untitled', url: result.link || '', domain, snippet: result.snippet || '', published_date: result.date || 'unknown', source_type: inferSourceType(domain), relevance_score: 50 });
    }
  }
  if (data.knowledgeGraph) {
    const kg = data.knowledgeGraph;
    if (kg.description && kg.title) sources.push({ title: kg.title, url: kg.website || `https://en.wikipedia.org/wiki/${encodeURIComponent(kg.title.replace(/ /g, '_'))}`, domain: kg.website ? extractDomain(kg.website) : 'wikipedia.org', snippet: kg.description, published_date: 'unknown', source_type: 'other', relevance_score: 70 });
  }
  return sources;
}

async function searchBrave(query, count = 10) {
  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`, {
    headers: { 'Accept': 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY },
  });
  if (!response.ok) throw new Error(`Brave Search API error (${response.status}): ${await response.text().catch(() => 'Unknown error')}`);
  const data = await response.json();
  const sources = [];
  if (data.web && data.web.results && Array.isArray(data.web.results)) {
    for (const result of data.web.results) {
      const domain = extractDomain(result.url || '');
      sources.push({ title: result.title || 'Untitled', url: result.url || '', domain, snippet: result.description || '', published_date: result.age || 'unknown', source_type: inferSourceType(domain), relevance_score: result.importance ? Math.round(result.importance * 100) : 50 });
    }
  }
  return sources;
}

async function searchTavily(query, count = 10) {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query, search_depth: 'basic', max_results: count }),
  });
  if (!response.ok) throw new Error(`Tavily API error (${response.status}): ${await response.text().catch(() => 'Unknown error')}`);
  const data = await response.json();
  const sources = [];
  if (data.results && Array.isArray(data.results)) {
    for (const result of data.results) {
      const domain = extractDomain(result.url || '');
      sources.push({ title: result.title || 'Untitled', url: result.url || '', domain, snippet: result.content || '', published_date: result.published_date || 'unknown', source_type: inferSourceType(domain), relevance_score: result.score ? Math.round(result.score * 100) : 50 });
    }
  }
  return sources;
}

function getConfiguredProvider() {
  if (process.env.SERPER_API_KEY) return 'serper';
  if (process.env.BRAVE_SEARCH_API_KEY) return 'brave';
  if (process.env.TAVILY_API_KEY) return 'tavily';
  return null;
}

/* ─── POST /api/search ─── */

export async function handleSearch(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const rl = rateLimit(req, { key: 'search', limit: 20, windowMs: 60_000 });
  if (!rl.allowed) return res.status(429).json({ error: 'Search rate limit exceeded. Please wait before searching again.' });

  const { query, count = 8 } = req.body || {};
  if (!query || typeof query !== 'string' || query.trim().length === 0) return res.status(400).json({ error: 'Missing or empty query parameter' });
  if (query.length > 500) return res.status(400).json({ error: 'Query exceeds maximum length of 500 characters' });

  const provider = getConfiguredProvider();
  if (!provider) return res.status(503).json({ error: 'No search API key configured. Please set SERPER_API_KEY, BRAVE_SEARCH_API_KEY, or TAVILY_API_KEY.', provider: null, sources: [], trace: null });

  const startTime = Date.now();
  try {
    let rawSources = provider === 'serper' ? await searchSerper(query, count) : provider === 'brave' ? await searchBrave(query, count) : await searchTavily(query, count);
    const beforeFilter = rawSources.length;
    const filtered = filterLowQuality(rawSources);
    const filteredCount = beforeFilter - filtered.length;
    const deduped = deduplicateSources(filtered);
    const dedupCount = filtered.length - deduped.length;
    const ranked = rankSources(deduped);
    // Filter out low-credibility sources (< 40) — spam, unknown domains, garbage
    const credibleSources = ranked.filter(s => s.credibility_score >= 40);
    const credibilityFiltered = ranked.length - credibleSources.length;
    const topSources = credibleSources.slice(0, count);

    return res.status(200).json({
      provider, trace: { query, sources_retrieved: beforeFilter, sources_used: topSources.length, dedup_removed: dedupCount, low_quality_filtered: filteredCount, credibility_filtered: credibilityFiltered, latency_ms: Date.now() - startTime, search_provider: provider },
      sources: topSources.map((s, i) => ({
        id: i + 1, title: s.title, url: s.url, domain: s.domain, type: s.source_type,
        snippet: s.snippet, credibility_score: s.credibility_score, relevance_score: s.relevance_score,
        key_finding: s.snippet.substring(0, 200), published_date: s.published_date,
        bias_flag: null, retrieval_timestamp: new Date().toISOString(),
      })),
    });
  } catch (error) {
    return sendSafeError(res, 500, `Search failed: ${error.message}`, error);
  }
}
