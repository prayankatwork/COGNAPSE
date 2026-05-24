/**
 * COGNAPSE Ops Telemetry API
 *
 * Secure endpoint for the Command Centre to read operational telemetry data.
 * Protected by OPS_TELEMETRY_API_KEY shared secret.
 *
 * GET /api/ops-telemetry
 *   ?days=7            — time range (default 7, max 90)
 *   &scope=events      — return raw events (default)
 *   &scope=metrics     — return aggregated dashboard metrics
 *   &scope=daily       — return daily event counts grouped by type
 *
 * Headers:
 *   Authorization: Bearer <OPS_TELEMETRY_API_KEY>
 */

import { applyCors, handleOptions } from './lib/cors.js';
import { sendSafeError } from './lib/errors.js';

const TELEMETRY_API_KEY = process.env.OPS_TELEMETRY_API_KEY || '';

export default async function handler(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authenticate
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
