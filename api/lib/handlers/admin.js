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

/* ─── GET /api/admin-users ─── */

export async function handleAdminUsers(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  if (!authenticateApiKey(req)) return res.status(401).json({ error: 'Unauthorized. Valid API key required.' });
  if (!TELEMETRY_API_KEY) return res.status(503).json({ error: 'Admin API not configured.' });

  try {
    const admin = await getFirebaseAdmin();
    if (!admin) return res.status(503).json({ error: 'Firebase Admin SDK unavailable.' });

    const auth = admin.auth();
    const firestore = admin.firestore();
    const search = (req.query?.search || '').trim().toLowerCase();
    const pageToken = req.query?.pageToken || undefined;
    const maxResults = Math.min(parseInt(req.query?.maxResults) || 50, 100);

    let listUsersResult;
    if (search && search.includes('@')) {
      try {
        const userRecord = await auth.getUserByEmail(search);
        listUsersResult = { users: [userRecord], pageToken: undefined };
      } catch {
        listUsersResult = { users: [], pageToken: undefined };
      }
    } else if (search && /^[a-zA-Z0-9_-]+$/.test(search)) {
      try {
        const userRecord = await auth.getUser(search);
        listUsersResult = { users: [userRecord], pageToken: undefined };
      } catch {
        listUsersResult = { users: [], pageToken: undefined };
      }
    } else {
      listUsersResult = await auth.listUsers(maxResults, pageToken);
    }

    const users = await Promise.all((listUsersResult.users || []).map(async (user) => {
      const uid = user.uid;
      let premiumData = null;
      let suspendedData = null;
      try {
        const premDoc = await firestore.collection('user_premium').doc(uid).get();
        if (premDoc.exists) premiumData = premDoc.data();
      } catch {}
      try {
        const suspDoc = await firestore.collection('suspended_users').doc(uid).get();
        if (suspDoc.exists) suspendedData = suspDoc.data();
      } catch {}

      return {
        uid,
        email: user.email || null,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        createdAt: user.metadata?.creationTime || null,
        lastLogin: user.metadata?.lastSignInTime || null,
        provider: user.providerData?.[0]?.providerId || null,
        premium: premiumData?.premium || false,
        premiumPlan: premiumData?.premiumPlan || null,
        premiumExpiresAt: premiumData?.premiumExpiresAt || null,
        suspended: !!suspendedData,
        suspendedAt: suspendedData?.suspendedAt || null,
        suspendedReason: suspendedData?.reason || null,
        customClaims: user.customClaims || {},
      };
    }));

    return res.status(200).json({
      users,
      nextPageToken: listUsersResult.pageToken || null,
      total: listUsersResult.users?.length || 0,
    });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to list users.', error);
  }
}

/* ─── POST /api/admin-set-premium ─── */

export async function handleAdminSetPremium(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  if (!authenticateApiKey(req)) return res.status(401).json({ error: 'Unauthorized. Valid API key required.' });
  if (!TELEMETRY_API_KEY) return res.status(503).json({ error: 'Admin API not configured.' });

  try {
    const admin = await getFirebaseAdmin();
    if (!admin) return res.status(503).json({ error: 'Firebase Admin SDK unavailable.' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { userId, premium, premiumPlan, premiumExpiresAt } = body;

    if (!userId) return res.status(400).json({ error: 'userId is required.' });

    const firestore = admin.firestore();
    const auth = admin.auth();

    if (premium) {
      const premiumData = {
        premium: true,
        premiumPlan: premiumPlan || 'admin-granted',
        premiumActivatedAt: new Date().toISOString(),
        premiumExpiresAt: premiumExpiresAt || null,
        grantedBy: 'ops-admin',
      };
      await firestore.collection('user_premium').doc(userId).set(premiumData, { merge: true });
      await auth.setCustomUserClaims(userId, { premium: true, premiumPlan: premiumPlan || 'admin-granted' });
      console.log(`[Admin Premium] User ${userId} granted premium by ops-admin.`);
      return res.status(200).json({ success: true, userId, premium: true });
    } else {
      await firestore.collection('user_premium').doc(userId).delete();
      try { await auth.setCustomUserClaims(userId, { premium: null, premiumPlan: null }); } catch {}
      console.log(`[Admin Premium] User ${userId} premium removed by ops-admin.`);
      return res.status(200).json({ success: true, userId, premium: false });
    }
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to update premium status.', error);
  }
}

/* ─── POST /api/admin-purge-user ─── */

export async function handleAdminPurgeUser(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  if (!authenticateApiKey(req)) return res.status(401).json({ error: 'Unauthorized. Valid API key required.' });
  if (!TELEMETRY_API_KEY) return res.status(503).json({ error: 'Admin API not configured.' });

  try {
    const admin = await getFirebaseAdmin();
    if (!admin) return res.status(503).json({ error: 'Firebase Admin SDK unavailable.' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { userId } = body;
    if (!userId) return res.status(400).json({ error: 'userId is required.' });

    const firestore = admin.firestore();
    const auth = admin.auth();
    let deletedCount = 0;
    const deletions = [];

    // 1. Direct doc lookups (doc ID = userId)
    const directDocCollections = ['user_premium', 'suspended_users', 'user_stats', 'user_settings', 'chat_history'];
    for (const col of directDocCollections) {
      deletions.push(firestore.collection(col).doc(userId).delete());
    }

    // 2. Query-by-field lookups
    async function deleteWhere(collection, field, value) {
      const snap = await firestore.collection(collection).where(field, '==', value).get();
      snap.docs.forEach(d => { deletions.push(d.ref.delete()); deletedCount++; });
    }

    await deleteWhere('shared_research', 'ownerId', userId);
    await deleteWhere('intelligence_reports', 'user_id', userId);
    await deleteWhere('notebook', 'user_id', userId);
    await deleteWhere('pdf_exports', 'userId', userId);
    await deleteWhere('user_documents', 'ownerId', userId);
    await deleteWhere('document_chunks', 'userId', userId);

    // 3. Document contents — no userId field, resolve via user_documents IDs
    const userDocSnap = await firestore.collection('user_documents').where('ownerId', '==', userId).get();
    for (const doc of userDocSnap.docs) {
      const docId = doc.id;
      deletions.push(firestore.collection('document_contents').doc(docId).delete());
    }

    // 4. Ops telemetry (batch in chunks of 500)
    const telemetrySnap = await firestore.collection('ops_telemetry').where('userId', '==', userId).get();
    const telemetryBatches = [];
    let batch = firestore.batch();
    let opCount = 0;
    telemetrySnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
      opCount++;
      if (opCount >= 500) {
        telemetryBatches.push(batch.commit());
        batch = firestore.batch();
        opCount = 0;
      }
    });
    if (opCount > 0) telemetryBatches.push(batch.commit());
    deletedCount += telemetrySnap.size;

    // Execute all deletions in parallel
    await Promise.all([...deletions, ...telemetryBatches]);

    // 5. Delete Firebase Auth account, revoke sessions, remove custom claims
    try { await auth.deleteUser(userId); } catch (err) {
      // If delete fails (e.g., user already deleted), still clear claims and revoke
      try { await auth.setCustomUserClaims(userId, {}); } catch {}
      try { await auth.revokeRefreshTokens(userId); } catch {}
    }

    console.log(`[Admin Purge] User ${userId} purged. ${deletedCount} associated records deleted.`);
    return res.status(200).json({
      success: true, userId,
      deletedRecords: deletedCount,
      message: `User purged. ${deletedCount} associated records deleted.`,
    });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to purge user.', error);
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
