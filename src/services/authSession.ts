import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

export interface CognapseSession {
  id: string;
  username: string;
  idToken?: string;
  tokenExpiresAt?: number;
}

/** Resolve a fresh Firebase ID token for API calls. */
export async function getBearerToken(): Promise<string | null> {
  let firebaseUser = auth.currentUser;

  if (!firebaseUser) {
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => resolve(), 3000);
      const unsub = onAuthStateChanged(auth, (u) => {
        if (u) {
          firebaseUser = u;
          clearTimeout(timeout);
          unsub();
          resolve();
        }
      });
    });
  }

  if (firebaseUser && !firebaseUser.isAnonymous) {
    return firebaseUser.getIdToken(true);
  }

  try {
    const raw = localStorage.getItem('cognapse_session');
    if (!raw) return null;
    const session = JSON.parse(raw) as CognapseSession;
    return session.idToken || null;
  } catch {
    return null;
  }
}export async function syncAuthSession(user: { id: string; username: string } | null) {
  if (!user) {
    // ── Server-side token revocation ──
    // Revoke the idToken BEFORE clearing localStorage so the Chrome extension's
    // stale chrome.storage copy is invalidated even if the website never got a
    // chance to read the token (e.g. explicit logout in a different tab).
    try {
      const raw = localStorage.getItem('cognapse_session');
      if (raw) {
        const session = JSON.parse(raw) as CognapseSession;
        if (session.idToken) {
          fetch('/api/revoke-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: session.idToken }),
          }).catch(() => {});
        }
      }
    } catch { /* nothing to revoke */ }

    localStorage.removeItem('cognapse_session');

    // Clean up all premium keys from localStorage so extension can't re-sync stale data
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith('cognapse_premium_')) {
        localStorage.removeItem(key);
      }
    }

    const ts = Date.now().toString();
    localStorage.setItem('cognapse_logged_out', ts);

    // Immediately notify the Chrome extension (if content script is active)
    try {
      window.postMessage({ source: 'cognapse', type: 'logout', timestamp: ts }, '*');
    } catch { /* extension may not be installed */ }

    return;
  }

  // Clear any stale logout sentinel on re-login
  localStorage.removeItem('cognapse_logged_out');

  let idToken: string | undefined;
  let tokenExpiresAt: number | undefined;

  if (!user.id.startsWith('local_')) {
    const token = await getBearerToken();
    if (token) {
      idToken = token;
      tokenExpiresAt = Date.now() + 55 * 60 * 1000;
    }
  }

  const session: CognapseSession = {
    id: user.id,
    username: user.username,
    idToken,
    tokenExpiresAt,
  };
  localStorage.setItem('cognapse_session', JSON.stringify(session));
}

/** Refresh Firebase ID token before payment / protected API calls */
export async function ensurePaymentAuth(user: {
  id: string;
  username: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (user.id.startsWith('local_')) {
    return {
      ok: false,
      message:
        'Payments require a cloud account. Please sign out, register again, and sign in (not offline/local mode).',
    };
  }

  const token = await getBearerToken();
  if (!token) {
    return {
      ok: false,
      message: 'Session expired. Please sign out and sign in again, then retry payment.',
    };
  }

  if (auth.currentUser?.uid === user.id) {
    await syncAuthSession(user);
    return { ok: true };
  }

  const sessionRaw = localStorage.getItem('cognapse_session');
  if (sessionRaw) {
    try {
      const session = JSON.parse(sessionRaw) as CognapseSession;
      if (session.id === user.id && session.idToken) {
        return { ok: true };
      }
    } catch {
      // ignore
    }
  }

  return {
    ok: false,
    message: 'Session expired. Please sign out and sign in again, then retry payment.',
  };
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = await getBearerToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}
