/**
 * POST /api/revoke-session
 *
 * Revokes ALL Firebase Auth refresh tokens for a user.
 * This immediately invalidates every existing ID token for that user.
 *
 * Called by the main COGNAPSE app on logout so the Chrome extension
 * (or any stale client) cannot reuse the old token.
 *
 * Body: { idToken: string }
 *
 * Response: { success: true, uid: string }
 */

import { applyCors, handleOptions } from './lib/cors.js';
import { sendSafeError } from './lib/errors.js';

export default async function handler(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    let body;
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    } else if (req.body) {
      body = req.body;
    } else {
      return res.status(400).json({ error: 'Request body required.' });
    }

    const { idToken } = body;
    if (!idToken) {
      return res.status(400).json({ error: 'idToken required.' });
    }

    const admin = await getFirebaseAdmin();
    if (!admin) {
      return res.status(503).json({ error: 'Firebase Admin SDK unavailable.' });
    }

    // Verify the token to extract uid (default verifyIdToken does NOT check revocation)
    const decoded = await admin.auth().verifyIdToken(idToken);

    // Revoke all refresh tokens — this invalidates every existing ID token
    await admin.auth().revokeRefreshTokens(decoded.uid);

    return res.status(200).json({ success: true, uid: decoded.uid });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to revoke session.', error);
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
    const missing = [
      !projectId && 'FIREBASE_PROJECT_ID',
      !clientEmail && 'FIREBASE_CLIENT_EMAIL',
      !privateKey && 'FIREBASE_PRIVATE_KEY',
    ].filter(Boolean).join(', ');
    console.error('[Revoke Session] Missing env vars:', missing);
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
    console.error('[Revoke Session] Firebase Admin init failed:', err?.message || err);
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
