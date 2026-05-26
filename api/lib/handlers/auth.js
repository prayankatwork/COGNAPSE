/**
 * COGNAPSE API — Auth Handlers
 * Consolidated from: admin-auth.js, check-premium.js, revoke-session.js
 */
import { applyCors, handleOptions } from '../cors.js';
import { sendSafeError } from '../errors.js';
import { requireUser, assertUserIdMatches } from '../auth.js';
import { getPremiumStatus } from '../premium.js';

/* ─── Shared Firebase Admin lazy init ─── */

let adminInstance = null;

async function getFirebaseAdmin() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = normalizePrivateKey(rawPrivateKey);

  if (!projectId || !clientEmail || !privateKey) {
    const missing = [!projectId && 'FIREBASE_PROJECT_ID', !clientEmail && 'FIREBASE_CLIENT_EMAIL', !privateKey && 'FIREBASE_PRIVATE_KEY'].filter(Boolean).join(', ');
    console.error('[Auth API] Missing env vars:', missing);
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
    console.error('[Auth API] Firebase Admin init failed:', err?.message || err);
    throw err;
  }
}

function normalizePrivateKey(raw) {
  if (!raw) return null;
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) key = key.slice(1, -1);
  return key.replace(/\\n/g, '\n');
}

/* ─── POST /api/admin-auth/verify ─── */

export async function handleAdminAuth(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { idToken } = req.body;
    if (!idToken || typeof idToken !== 'string') return res.status(400).json({ error: 'Missing or invalid idToken' });

    const admin = await getFirebaseAdmin();
    if (!admin) return res.status(503).json({ error: 'Firebase Admin SDK unavailable.' });

    const decodedToken = await admin.auth().verifyIdToken(idToken, true);
    const isAdmin = decodedToken.admin === true;
    const role = decodedToken.role || (isAdmin ? 'admin' : null);

    if (!isAdmin) {
      console.warn(`[OPS-AUTH] Unauthorized admin access attempt by ${decodedToken.uid}`);
      return res.status(403).json({ error: 'Access denied. Admin privileges required.', code: 'ADMIN_REQUIRED' });
    }

    const userRecord = await admin.auth().getUser(decodedToken.uid);
    console.info(`[OPS-AUTH] Admin login: ${userRecord.email} (role: ${role})`);

    return res.status(200).json({
      admin: { uid: decodedToken.uid, email: userRecord.email, role: role || 'admin', displayName: userRecord.displayName, photoURL: userRecord.photoURL, lastLogin: new Date().toISOString() },
      role: role || 'admin',
    });
  } catch (error) {
    console.error('[OPS-AUTH] Token verification failed:', error.message);
    if (error.code === 'auth/id-token-expired') return res.status(401).json({ error: 'Token expired. Please re-authenticate.' });
    return res.status(401).json({ error: 'Authentication failed.' });
  }
}

/* ─── GET/POST /api/check-premium ─── */

export async function handleCheckPremium(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const decoded = await requireUser(req, res);
  if (decoded === false) return;

  const userId = req.method === 'POST' ? req.body?.userId : req.query?.userId;
  if (!userId) return res.status(400).json({ error: 'Missing userId parameter' });

  if (decoded && !assertUserIdMatches(decoded, userId)) return res.status(403).json({ error: 'User ID does not match authenticated session' });

  const uid = decoded?.uid || userId;
  try {
    const status = await getPremiumStatus(uid);
    return res.status(200).json(status);
  } catch (error) {
    if (error.message === 'SERVER_DATABASE_NOT_CONFIGURED') return res.status(503).json({ error: 'Premium verification is temporarily unavailable.' });
    return sendSafeError(res, 500, 'Failed to validate premium status.', error);
  }
}

/* ─── POST /api/revoke-session ─── */

export async function handleRevokeSession(req, res) {
  applyCors(req, res);
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });

  try {
    let body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { idToken } = body;
    if (!idToken) return res.status(400).json({ error: 'idToken required.' });

    const admin = await getFirebaseAdmin();
    if (!admin) return res.status(503).json({ error: 'Firebase Admin SDK unavailable.' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    await admin.auth().revokeRefreshTokens(decoded.uid);
    return res.status(200).json({ success: true, uid: decoded.uid });
  } catch (error) {
    return sendSafeError(res, 500, 'Failed to revoke session.', error);
  }
}
