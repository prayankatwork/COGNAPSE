/**
 * COGNAPSE API — System Handlers
 * Consolidated from: health.js, ops-telemetry.js
 */
import { applyCors, handleOptions } from '../cors.js';
import { sendSafeError } from '../errors.js';

const TELEMETRY_API_KEY = process.env.OPS_TELEMETRY_API_KEY || '';

/* ─── Lazy Firebase Admin init ─── */

let adminInstance = null;

async function getFirebaseAdmin() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = normalizePrivateKey(rawPrivateKey);

  if (!projectId || !clientEmail || !privateKey) {
    const missing = [!projectId && 'FIREBASE_PROJECT_ID', !clientEmail && 'FIREBASE_CLIENT_EMAIL', !privateKey && 'FIREBASE_PRIVATE_KEY'].filter(Boolean).join(', ');
    console.error('[System API] Missing env vars:', missing);
    return null;
  }

  try {
    if (adminInstance && adminInstance.apps.length) return adminInstance;
    const mod = await import('firebase-admin');
    const admin = mod.default || mod;
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
    }
    adminInstance = admin;
    return admin;
  } catch (err) {
    console.error('[System API] Firebase Admin init failed:', err?.message || err);
    throw err;
  }
}

function normalizePrivateKey(raw) {
  if (!raw) return null;
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) key = key.slice(1, -1);
  return key.replace(/\\n/g, '\n');
}

/* ─── POST /api/fetch-url ─── */

/**
 * Fetch a URL and return its full text content.
 * Used by citation verification to fetch full source text (not just snippet).
 * Only accessible server-side to avoid CORS issues.
 */
export async function handleFetchUrl(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const url = body.url;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url field is required' });
    }

    // Basic URL validation — must be http/https
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return res.status(400).json({ error: 'Only http and https URLs are supported' });
    }

    // Fetch with a reasonable timeout (10s) and user-agent to avoid blocks
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; COGNAPSE/1.0; +https://cognapse.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(502).json({ error: `Source returned status ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || '';
    const isHtml = contentType.includes('text/html') || contentType.includes('application/xhtml');
    const isText = contentType.includes('text/') || contentType.includes('application/json') || contentType.includes('application/xml');

    if (!isHtml && !isText) {
      return res.status(415).json({ error: `Unsupported content type: ${contentType}` });
    }

    const rawText = await response.text();

    // Strip HTML tags for HTML content, keeping paragraph text
    let cleanText = rawText;
    if (isHtml) {
      // Remove script and style blocks
      cleanText = cleanText.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');
      cleanText = cleanText.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
      // Replace common block tags with newlines
      cleanText = cleanText.replace(/<\/(p|div|h[1-6]|li|blockquote|section|article|tr|td|th)[^>]*>/gi, '\n');
      // Strip all remaining HTML tags
      cleanText = cleanText.replace(/<[^>]+>/g, ' ');
      // Decode common entities
      cleanText = cleanText.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
      // Collapse whitespace
      cleanText = cleanText.replace(/\s+/g, ' ').trim();
    }

    // Limit response size (50KB of text is plenty for verification)
    const maxChars = 50000;
    const truncated = cleanText.length > maxChars;
    const text = cleanText.slice(0, maxChars);

    return res.status(200).json({
      url,
      text,
      truncated,
      length: text.length,
      title: extractTitle(rawText),
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Source fetch timed out after 10 seconds' });
    }
    if (error.code === 'ERR_INVALID_URL') {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    console.error('[fetch-url] Error fetching:', url, error?.message || error);
    return res.status(502).json({ error: `Failed to fetch source: ${error?.message || 'Unknown error'}` });
  }
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() : '';
}

/* ─── GET /api/health ─── */

export async function handleHealth(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  try {
    const admin = await getFirebaseAdmin();
    if (!admin) return res.status(503).json({ status: 'degraded', firebase: false, message: 'Firebase Admin SDK unavailable' });

    // Test Firestore connectivity
    const db = admin.firestore();
    await db.collection('_health_').doc('_check_').get();

    return res.status(200).json({ status: 'ok', firebase: true, timestamp: new Date().toISOString() });
  } catch (error) {
    return res.status(503).json({ status: 'degraded', firebase: false, message: error.message });
  }
}

/* ─── GET/POST /api/ops-telemetry ─── */

export async function handleOpsTelemetry(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method === 'POST') return handleIngest(req, res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // GET — authenticate with API key
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token || token !== TELEMETRY_API_KEY) return res.status(401).json({ error: 'Unauthorized. Valid API key required.' });
  if (!TELEMETRY_API_KEY) return res.status(503).json({ error: 'Telemetry API not configured.' });

  try {
    const days = Math.min(Math.max(parseInt(req.query.days) || 7, 1), 90);
    const scope = req.query.scope || 'events';

    const admin = await getFirebaseAdmin();
    if (!admin) return res.status(503).json({ error: 'Firebase Admin SDK unavailable.' });

    const firestore = admin.firestore();
    const snapshot = await firestore.collection('ops_telemetry')
      .where('createdAt', '>=', new Date(Date.now() - days * 86400000))
      .orderBy('createdAt', 'desc')
      .get();

    const events = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id, type: data.type || 'unknown', sessionId: data.sessionId || '',
        userId: data.userId || null, username: data.username || null,
        metadata: data.metadata || {},
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || null,
      };
    });

    switch (scope) {
      case 'metrics': return res.status(200).json({ events, metrics: aggregateMetrics(events) });
      case 'daily': return res.status(200).json({ events, daily: aggregateDaily(events) });
      default: return res.status(200).json({ events });
    }
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to fetch telemetry data.', error);
  }
}

async function handleIngest(req, res) {
  try {
    let body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const events = Array.isArray(body) ? body : body.events;
    if (!events || !Array.isArray(events) || events.length === 0) return res.status(400).json({ error: 'events array required.' });
    if (events.length > 50) events.length = 50;

    const admin = await getFirebaseAdmin();
    if (!admin) return res.status(503).json({ error: 'Firebase Admin SDK unavailable.' });

    const firestore = admin.firestore();
    const batch = firestore.batch();
    for (const event of events) {
      const docRef = firestore.collection('ops_telemetry').doc();
      batch.set(docRef, {
        sessionId: event.sessionId || '', type: event.type || 'unknown',
        userId: event.userId || null, username: event.username || null,
        metadata: event.metadata || {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    return res.status(200).json({ ingested: events.length });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to ingest telemetry events.', error);
  }
}

function aggregateMetrics(events) {
  const now = Date.now();
  const last24h = events.filter(e => { const t = e.createdAt ? new Date(e.createdAt).getTime() : 0; return now - t < 86400000; });
  const last7d = events.filter(e => { const t = e.createdAt ? new Date(e.createdAt).getTime() : 0; return now - t < 7 * 86400000; });
  const researchEvents = events.filter(e => e.type.startsWith('research') || e.type.startsWith('deep_research'));
  const completedResearch = researchEvents.filter(e => e.type === 'research_completed' || e.type === 'deep_research_completed');
  const failedResearch = researchEvents.filter(e => e.type === 'research_failed' || e.type === 'deep_research_failed');
  const sessions = events.filter(e => e.type === 'session_start');
  const uniqueUsers = new Set(events.filter(e => e.userId).map(e => e.userId));

  const tokenEvents = events.filter(e => e.type === 'tokens_consumed');
  const todayStr = new Date().toISOString().slice(0, 10);
  let todayTokens = 0, model70bTokens = 0, model8bTokens = 0, totalTokensAllTime = 0;
  for (const e of tokenEvents) {
    const m = e.metadata || {};
    const total = m.total_tokens || 0;
    totalTokensAllTime += total;
    if (m.model && m.model.includes('70b')) model70bTokens += total; else model8bTokens += total;
    if (e.createdAt && e.createdAt.slice(0, 10) === todayStr) todayTokens += total;
  }

  return {
    totalEvents: events.length, uniqueUsers: uniqueUsers.size,
    sessionsLast24h: last24h.filter(e => e.type === 'session_start').length,
    sessionsLast7d: last7d.filter(e => e.type === 'session_start').length,
    researchesCompleted: completedResearch.length, researchesFailed: failedResearch.length,
    failureRate: completedResearch.length + failedResearch.length > 0
      ? +(failedResearch.length / (completedResearch.length + failedResearch.length) * 100).toFixed(1) : 0,
    authLogins: events.filter(e => e.type === 'auth_login').length,
    authLogouts: events.filter(e => e.type === 'auth_logout').length,
    exports: events.filter(e => e.type === 'report_exported').length,
    errors: events.filter(e => e.type === 'error_encountered' || e.type === 'research_failed').length,
    tokensUsedToday: todayTokens, tokens70b: model70bTokens, tokens8b: model8bTokens, totalTokens: totalTokensAllTime,
  };
}

function aggregateDaily(events) {
  const daily = {};
  for (const event of events) {
    if (!event.createdAt) continue;
    const day = event.createdAt.slice(0, 10);
    if (!daily[day]) daily[day] = {};
    daily[day][event.type] = (daily[day][event.type] || 0) + 1;
    daily[day]._total = (daily[day]._total || 0) + 1;
  }
  return Object.entries(daily).map(([date, counts]) => ({ date, ...counts })).sort((a, b) => a.date.localeCompare(b.date));
}
