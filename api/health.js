/**
 * GET /api/health
 *
 * Lightweight health check endpoint for the ops app.
 * Returns overall system status based on Firebase connectivity.
 *
 * Response: { status: 'ok' | 'degraded' | 'down', services: { firebase: string }, timestamp: string }
 */

import { applyCors, handleOptions } from './lib/cors.js';

export default async function handler(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const services = { firebase: 'unknown' };

  try {
    const admin = await getFirebaseAdmin();
    if (!admin) {
      services.firebase = 'misconfigured';
      return res.status(200).json({
        status: 'degraded',
        services,
        timestamp: new Date().toISOString(),
      });
    }

    // Quick connectivity check — list 1 document from a known collection
    const firestore = admin.firestore();
    const testRef = firestore.collection('ops_telemetry').limit(1);
    await testRef.get();
    services.firebase = 'ok';

    return res.status(200).json({
      status: 'ok',
      services,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    services.firebase = 'error';
    return res.status(200).json({
      status: 'degraded',
      services,
      error: error?.message?.slice(0, 100),
      timestamp: new Date().toISOString(),
    });
  }
}

/* ─── Lazy Firebase Admin init (same pattern as ops-telemetry.js) ─── */

let adminInstance = null;

async function getFirebaseAdmin() {
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = normalizePrivateKey(rawPrivateKey);

  if (!projectId || !clientEmail || !privateKey) {
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
  } catch {
    return null;
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
