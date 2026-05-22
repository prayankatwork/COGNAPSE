import { getFirebaseAdmin } from './firebaseAdmin.js';
import { requireAuth, allowDevBypass } from './env.js';

/** Fallback when Admin SDK env is missing — uses Firebase Web API key already on Vercel. */
async function verifyIdTokenWithIdentityToolkit(token) {
  const apiKey =
    process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const user = data.users?.[0];
    if (!user?.localId) return null;
    return { uid: user.localId, email: user.email };
  } catch {
    return null;
  }
}

export async function verifyBearerToken(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return null;

  const admin = getFirebaseAdmin();
  if (admin) {
    try {
      return await admin.auth().verifyIdToken(token);
    } catch {
      // try REST fallback below
    }
  }

  return verifyIdTokenWithIdentityToolkit(token);
}

export async function requireUser(req, res) {
  const decoded = await verifyBearerToken(req);

  if (decoded) {
    return decoded;
  }

  if (!requireAuth && allowDevBypass) {
    return { uid: 'dev-bypass', dev: true };
  }

  if (!requireAuth) {
    return null;
  }

  res.status(401).json({ error: 'Authentication required. Sign in to COGNAPSE to continue.' });
  return false;
}

export function assertUserIdMatches(decoded, userId) {
  if (!userId) return false;
  if (decoded?.dev) return true;
  return decoded?.uid === userId;
}
