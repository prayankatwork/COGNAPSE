/**
 * COGNAPSE API — Admin Handlers
 * Consolidated from: admin-terminate.js, admin-track.js, clear-data.js
 */
import { applyCors, handleOptions } from '../cors.js';
import { sendSafeError } from '../errors.js';

const TELEMETRY_API_KEY = process.env.OPS_TELEMETRY_API_KEY || '';
const BATCH_SIZE = 500;

/* ─── Shared Firebase Admin lazy init ─── */

let adminInstance = null;

async function getFirebaseAdmin() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = normalizePrivateKey(rawPrivateKey);

  if (!projectId || !clientEmail || !privateKey) {
    console.error('[Admin API] Missing env vars:', [!projectId && 'FIREBASE_PROJECT_ID', !clientEmail && 'FIREBASE_CLIENT_EMAIL', !privateKey && 'FIREBASE_PRIVATE_KEY'].filter(Boolean).join(', '));
    return null;
  }

  try {
    if (adminInstance && adminInstance.apps.length) return adminInstance;
    const mod = await import('firebase-admin');
    const admin = mod.default || mod;
    if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
    adminInstance = admin;
    return admin;
  } catch (err) {
    console.error('[Admin API] Firebase Admin init failed:', err?.message || err);
    throw err;
  }
}

function normalizePrivateKey(raw) {
  if (!raw) return null;
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) key = key.slice(1, -1);
  return key.replace(/\\n/g, '\n');
}

function authenticateApiKey(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token || token !== TELEMETRY_API_KEY) return false;
  return true;
}

/* ─── POST /api/admin-terminate ─── */

export async function handleAdminTerminate(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  if (!authenticateApiKey(req)) return res.status(401).json({ error: 'Unauthorized. Valid API key required.' });
  if (!TELEMETRY_API_KEY) return res.status(503).json({ error: 'Terminate API not configured.' });

  try {
    const admin = await getFirebaseAdmin();
    if (!admin) return res.status(503).json({ error: 'Firebase Admin SDK unavailable.' });

    const firestore = admin.firestore();
    const auth = admin.auth();
    let body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { userId: rawUserId, shareId, reason } = body;
    let targetUserId = rawUserId;

    if (!targetUserId && shareId) {
      const shareDoc = await firestore.collection('shared_research').doc(shareId).get();
      if (!shareDoc.exists) return res.status(404).json({ error: 'Shared research not found.' });
      targetUserId = shareDoc.data()?.ownerId;
      if (targetUserId) await shareDoc.ref.update({ active: false, disabledAt: new Date().toISOString(), disabledReason: reason || 'Terminated by admin' });
    }

    if (!targetUserId) return res.status(400).json({ error: 'Either userId or shareId is required.' });

    await auth.setCustomUserClaims(targetUserId, { suspended: true, suspendedAt: new Date().toISOString() });

    let userRecord = null;
    try { userRecord = await auth.getUser(targetUserId); } catch { }
    const username = userRecord?.displayName || userRecord?.email || null;
    try { await auth.revokeRefreshTokens(targetUserId); } catch { }

    await firestore.collection('suspended_users').doc(targetUserId).set({
      userId: targetUserId, username, email: userRecord?.email || null,
      reason: reason || 'No reason provided', suspendedBy: 'ops-admin',
      suspendedAt: admin.firestore.FieldValue.serverTimestamp(), shareId: shareId || null,
    }, { merge: true });

    console.log(`[Admin Terminate] User ${targetUserId} (${username || 'unknown'}) suspended. Reason: ${reason || 'N/A'}`);
    return res.status(200).json({ success: true, userId: targetUserId, username });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to terminate user.', error);
  }
}

/* ─── POST /api/admin-track ─── */

export async function handleAdminTrack(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing authorization' });
    const idToken = authHeader.slice(7);

    const admin = await getFirebaseAdmin();
    if (!admin) return res.status(503).json({ error: 'Firebase Admin SDK unavailable.' });

    const decodedToken = await admin.auth().verifyIdToken(idToken, true);
    if (!decodedToken.admin) return res.status(403).json({ error: 'Admin required' });

    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) return res.status(400).json({ error: 'Events array required' });

    const db = admin.firestore();
    const batch = db.batch();
    const opsTelemetryRef = db.collection('ops_telemetry');
    for (const event of events) {
      const docRef = opsTelemetryRef.doc();
      batch.set(docRef, { ...event, ingestedAt: new Date().toISOString(), ingestedBy: decodedToken.uid });
    }
    await batch.commit();
    return res.status(200).json({ ingested: events.length });
  } catch (error) {
    console.error('[OPS-TRACK] Ingestion failed:', error.message);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/* ─── POST /api/clear-data ─── */

export async function handleClearData(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  if (!authenticateApiKey(req)) return res.status(401).json({ error: 'Unauthorized. Valid API key required.' });
  if (!TELEMETRY_API_KEY) return res.status(503).json({ error: 'Telemetry API not configured.' });

  try {
    const admin = await getFirebaseAdmin();
    if (!admin) return res.status(503).json({ error: 'Firebase Admin SDK unavailable.' });

    const firestore = admin.firestore();
    const collectionRef = firestore.collection('ops_telemetry');
    const snapshot = await collectionRef.listDocuments();
    const docRefs = snapshot.filter(ref => ref.id);

    if (docRefs.length === 0) return res.status(200).json({ success: true, deletedCount: 0, message: 'No telemetry data to clear.' });

    let deletedCount = 0;
    for (let i = 0; i < docRefs.length; i += BATCH_SIZE) {
      const batch = firestore.batch();
      const chunk = docRefs.slice(i, i + BATCH_SIZE);
      for (const docRef of chunk) batch.delete(docRef);
      await batch.commit();
      deletedCount += chunk.length;
    }

    console.log(`[Clear Data] Deleted ${deletedCount} telemetry documents.`);
    return res.status(200).json({ success: true, deletedCount, message: `Deleted ${deletedCount} telemetry event(s).` });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to clear telemetry data.', error);
  }
}
