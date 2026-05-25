/**
 * POST /api/admin-terminate
 *
 * Terminates (suspends) a user's account.
 * - Sets custom claim `suspended: true` on Firebase Auth
 * - Records the action in `suspended_users` Firestore collection
 * - Optionally disables the shared research if shareId is provided
 *
 * Headers:
 *   Authorization: Bearer <OPS_TELEMETRY_API_KEY>
 *
 * Body:
 *   { userId: string, reason: string }
 *   OR
 *   { shareId: string, reason: string }
 *
 * Response:
 *   { success: true, userId: string, username: string | null }
 */

import { applyCors, handleOptions } from './lib/cors.js';
import { sendSafeError } from './lib/errors.js';

const TELEMETRY_API_KEY = process.env.OPS_TELEMETRY_API_KEY || '';

export default async function handler(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token || token !== TELEMETRY_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized. Valid API key required.' });
  }

  if (!TELEMETRY_API_KEY) {
    return res.status(503).json({ error: 'Terminate API not configured.' });
  }

  try {
    const admin = await getFirebaseAdmin();
    if (!admin) {
      return res.status(503).json({ error: 'Firebase Admin SDK unavailable.' });
    }

    const firestore = admin.firestore();
    const auth = admin.auth();

    let body;
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    } else if (req.body) {
      body = req.body;
    } else {
      return res.status(400).json({ error: 'Request body required.' });
    }

    const { userId: rawUserId, shareId, reason } = body;
    let targetUserId = rawUserId;

    // If shareId is provided, look up the owner
    if (!targetUserId && shareId) {
      const shareDoc = await firestore.collection('shared_research').doc(shareId).get();
      if (!shareDoc.exists) {
        return res.status(404).json({ error: 'Shared research not found.' });
      }
      const shareData = shareDoc.data();
      targetUserId = shareData?.ownerId;

      // Disable the shared research
      if (targetUserId) {
        await shareDoc.ref.update({ active: false, disabledAt: new Date().toISOString(), disabledReason: reason || 'Terminated by admin' });
      }
    }

    if (!targetUserId) {
      return res.status(400).json({ error: 'Either userId or shareId is required.' });
    }

    // Set custom claims on the Firebase Auth user
    await auth.setCustomUserClaims(targetUserId, { suspended: true, suspendedAt: new Date().toISOString() });

    // Look up user info
    let userRecord = null;
    try {
      userRecord = await auth.getUser(targetUserId);
    } catch {
      // User might not exist in Auth — still record the suspension
    }

    const username = userRecord?.displayName || userRecord?.email || null;

    // Revoke refresh tokens to force re-login
    try {
      await auth.revokeRefreshTokens(targetUserId);
    } catch {
      // Non-fatal
    }

    // Write audit record to suspended_users collection
    await firestore.collection('suspended_users').doc(targetUserId).set({
      userId: targetUserId,
      username,
      email: userRecord?.email || null,
      reason: reason || 'No reason provided',
      suspendedBy: 'ops-admin',
      suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
      shareId: shareId || null,
    }, { merge: true });

    console.log(`[Admin Terminate] User ${targetUserId} (${username || 'unknown'}) suspended. Reason: ${reason || 'N/A'}`);

    return res.status(200).json({
      success: true,
      userId: targetUserId,
      username,
    });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to terminate user.', error);
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
    console.error('[Admin Terminate] Missing env vars:', missing);
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
    console.error('[Admin Terminate] Firebase Admin init failed:', err?.message || err);
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
