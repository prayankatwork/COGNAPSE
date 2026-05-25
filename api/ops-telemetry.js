/**
 * COGNAPSE Ops Telemetry API
 *
 * Dual-purpose endpoint:
 *   GET  — Read telemetry data (Command Centre, requires OPS_TELEMETRY_API_KEY)
 *   POST — Ingest client-side telemetry events (no auth — events are anonymized operational data only)
 *
 * GET /api/ops-telemetry
 *   ?days=7            — time range (default 7, max 90)
 *   &scope=events      — return raw events (default)
 *   &scope=metrics     — return aggregated dashboard metrics
 *   &scope=daily       — return daily event counts grouped by type
 *
 * Headers (GET only):
 *   Authorization: Bearer <OPS_TELEMETRY_API_KEY>
 *
 * POST /api/ops-telemetry
 *   Body: { events: TelemetryPayload[] }
 *   No auth required — payload is anonymized operational data only.
 */

import { applyCors, handleOptions } from './lib/cors.js';
import { sendSafeError } from './lib/errors.js';

const TELEMETRY_API_KEY = process.env.OPS_TELEMETRY_API_KEY || '';

export default async function handler(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method === 'POST') {
    return handleIngest(req, res);
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // GET — Authenticate with API key
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token || token !== TELEMETRY_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized. Valid API key required.' });
  }

  if (!TELEMETRY_API_KEY) {
    return res.status(503).json({ error: 'Telemetry API not configured.' });
  }

  try {
    const days = Math.min(Math.max(parseInt(req.query.days) || 7, 1), 90);
    const scope = req.query.scope || 'events';

    const admin = await getFirebaseAdmin();
    if (!admin) {
      return res.status(503).json({ error: 'Firebase Admin SDK unavailable.' });
    }

    const firestore = admin.firestore();
    const snapshot = await firestore
      .collection('ops_telemetry')
      .where('createdAt', '>=', new Date(Date.now() - days * 86400000))
      .orderBy('createdAt', 'desc')
      .get();

    const events = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type || 'unknown',
        sessionId: data.sessionId || '',
        userId: data.userId || null,
        username: data.username || null,
        metadata: data.metadata || {},
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || null,
      };
    });

    switch (scope) {
      case 'metrics':
        return res.status(200).json({ events, metrics: aggregateMetrics(events) });

      case 'daily':
        return res.status(200).json({ events, daily: aggregateDaily(events) });

      default:
        return res.status(200).json({ events });
    }
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to fetch telemetry data.', error);
  }
}

/* ─── POST: Ingest telemetry events from client ─── */

async function handleIngest(req, res) {
  try {
    let body;
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    } else if (req.body) {
      body = req.body;
    } else {
      return res.status(400).json({ error: 'Request body required.' });
    }

    const events = Array.isArray(body) ? body : body.events;
    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'events array required.' });
    }

    if (events.length > 50) {
      events.length = 50; // limit batch size
    }

    const admin = await getFirebaseAdmin();
    if (!admin) {
      return res.status(503).json({ error: 'Firebase Admin SDK unavailable.' });
    }

    const firestore = admin.firestore();
    const batch = firestore.batch();

    for (const event of events) {
      const docRef = firestore.collection('ops_telemetry').doc();
      batch.set(docRef, {
        sessionId: event.sessionId || '',
        type: event.type || 'unknown',
        userId: event.userId || null,
        username: event.username || null,
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

/* ─── Aggregation helpers ─── */

function aggregateMetrics(events) {
  const now = Date.now();
  const last24h = events.filter((e) => {
    const t = e.createdAt ? new Date(e.createdAt).getTime() : 0;
    return now - t < 86400000;
  });
  const last7d = events.filter((e) => {
    const t = e.createdAt ? new Date(e.createdAt).getTime() : 0;
    return now - t < 7 * 86400000;
  });

  const researchEvents = events.filter((e) => e.type.startsWith('research') || e.type.startsWith('deep_research'));
  const completedResearch = researchEvents.filter((e) => e.type === 'research_completed' || e.type === 'deep_research_completed');
  const failedResearch = researchEvents.filter((e) => e.type === 'research_failed' || e.type === 'deep_research_failed');
  const sessions = events.filter((e) => e.type === 'session_start');
  const uniqueUsers = new Set(events.filter((e) => e.userId).map((e) => e.userId));

  // ─── Token usage aggregation ───
  const tokenEvents = events.filter((e) => e.type === 'tokens_consumed');
  const todayStr = new Date().toISOString().slice(0, 10);
  let todayTokens = 0;
  let model70bTokens = 0;
  let model8bTokens = 0;
  let totalTokensAllTime = 0;

  for (const e of tokenEvents) {
    const m = e.metadata || {};
    const total = m.total_tokens || 0;
    totalTokensAllTime += total;

    if (m.model && m.model.includes('70b')) model70bTokens += total;
    else model8bTokens += total;

    // Check if event is from today
    if (e.createdAt && e.createdAt.slice(0, 10) === todayStr) {
      todayTokens += total;
    }
  }

  return {
    totalEvents: events.length,
    uniqueUsers: uniqueUsers.size,
    sessionsLast24h: last24h.filter((e) => e.type === 'session_start').length,
    sessionsLast7d: last7d.filter((e) => e.type === 'session_start').length,
    researchesCompleted: completedResearch.length,
    researchesFailed: failedResearch.length,
    failureRate: completedResearch.length + failedResearch.length > 0
      ? +(failedResearch.length / (completedResearch.length + failedResearch.length) * 100).toFixed(1)
      : 0,
    authLogins: events.filter((e) => e.type === 'auth_login').length,
    authLogouts: events.filter((e) => e.type === 'auth_logout').length,
    exports: events.filter((e) => e.type === 'report_exported').length,
    errors: events.filter((e) => e.type === 'error_encountered' || e.type === 'research_failed').length,
    // Token usage
    tokensUsedToday: todayTokens,
    tokens70b: model70bTokens,
    tokens8b: model8bTokens,
    totalTokens: totalTokensAllTime,
  };
}

function aggregateDaily(events) {
  const daily = {};
  for (const event of events) {
    if (!event.createdAt) continue;
    const day = event.createdAt.slice(0, 10); // YYYY-MM-DD
    if (!daily[day]) daily[day] = {};
    daily[day][event.type] = (daily[day][event.type] || 0) + 1;
    daily[day]._total = (daily[day]._total || 0) + 1;
  }
  return Object.entries(daily)
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/* ─── Lazy Firebase Admin init ─── */

let adminInstance = null;

async function getFirebaseAdmin() {
  // Re-check env vars every time (no permanent failure flag)
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = normalizePrivateKey(rawPrivateKey);

  if (!projectId || !clientEmail || !privateKey) {
    const missing = [
      !projectId && 'FIREBASE_PROJECT_ID',
      !clientEmail && 'FIREBASE_CLIENT_EMAIL',
      !privateKey && 'FIREBASE_PRIVATE_KEY',
    ].filter(Boolean).join(', ');
    console.error('[OpsTelemetry API] Missing env vars:', missing);
    return null;
  }

  try {
    if (adminInstance && adminInstance.apps.length) {
      return adminInstance;
    }

    const mod = await import('firebase-admin');
    const admin = mod.default || mod;

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    }

    adminInstance = admin;
    return admin;
  } catch (err) {
    console.error('[OpsTelemetry API] Firebase Admin init failed:', err?.message || err);
    // Expose error safely for debugging (server-side, not client-sensitive)
    throw err;
  }
}

function normalizePrivateKey(raw) {
  if (!raw) return null;
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, '\n');
}
