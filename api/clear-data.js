/**
 * COGNAPSE Ops — Clear Telemetry Data API
 *
 * POST /api/clear-data
 *   Deletes ALL documents from the ops_telemetry Firestore collection.
 *   Authenticated via Bearer token (same OPS_TELEMETRY_API_KEY).
 *
 * Headers:
 *   Authorization: Bearer <OPS_TELEMETRY_API_KEY>
 *
 * Response:
 *   { success: true, deletedCount: number }
 *
 * Uses listDocuments() to get document references (zero read cost)
 * then batches deletes (max 500 per batch) to minimize Firestore operations.
 */

import { applyCors, handleOptions } from './lib/cors.js';
import { sendSafeError } from './lib/errors.js';

const BATCH_SIZE = 500;
const TELEMETRY_API_KEY = process.env.OPS_TELEMETRY_API_KEY || '';

export default async function handler(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
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
    const admin = await getFirebaseAdmin();
    if (!admin) {
      return res.status(503).json({ error: 'Firebase Admin SDK unavailable.' });
    }

    const firestore = admin.firestore();
    const collectionRef = firestore.collection('ops_telemetry');

    // Get all document references (zero read cost — no data fetched)
    const snapshot = await collectionRef.listDocuments();
    const docRefs = snapshot.filter((ref) => ref.id); // filter out any invalid refs

    if (docRefs.length === 0) {
      return res.status(200).json({ success: true, deletedCount: 0, message: 'No telemetry data to clear.' });
    }

    // Delete in batches of 500 (Firestore batch limit)
    let deletedCount = 0;
    for (let i = 0; i < docRefs.length; i += BATCH_SIZE) {
      const batch = firestore.batch();
      const chunk = docRefs.slice(i, i + BATCH_SIZE);
      for (const docRef of chunk) {
        batch.delete(docRef);
      }
      await batch.commit();
      deletedCount += chunk.length;
    }

    console.log(`[Clear Data] Deleted ${deletedCount} telemetry documents.`);

    return res.status(200).json({
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} telemetry event(s).`,
    });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to clear telemetry data.', error);
  }
}

/* ─── Lazy Firebase Admin init (same pattern as ops-telemetry.js) ─── */
// NOTE: No permanent failure flag — retries on every invocation so transient
// cold-start issues self-heal once env vars are available (pattern from ops-telemetry.js).

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
    console.error('[Clear Data API] Missing env vars:', missing);
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
    console.error('[Clear Data API] Firebase Admin init failed:', err?.message || err);
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
