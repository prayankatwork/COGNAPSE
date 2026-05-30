import { doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

type TakeoverCallback = () => void;

interface SessionLockInstance {
  /** Release all resources (Firestore listener, heartbeat, channel). */
  release: () => void;
}

interface ActiveSession {
  tabSessionId: string;
  lastActive: unknown;
  username: string;
}

const CHANNEL_NAME = 'cognapse-session-lock';
const HEARTBEAT_INTERVAL_MS = 30_000;

/**
 * Claim the Cognapse session lock for this tab.
 *
 * **Authenticated users:** A Firestore document `activeSessions/{userId}`
 * tracks the active tab. Each tab writes its unique `tabSessionId`; the last
 * writer wins. An `onSnapshot` listener detects when another tab overwrites
 * the document and fires `onTakenOver`.
 *
 * **Fallback (unauthenticated / BroadcastChannel-only):** A `BroadcastChannel`
 * provides instant peer-to-peer coordination between same-origin tabs. If a
 * newer tab announces itself while this tab is active, `onTakenOver` fires.
 *
 * Call `release()` on cleanup (e.g. in a `useEffect` return).
 */
export function claimSessionLock(
  userId: string | null,
  username: string,
  onTakenOver: TakeoverCallback,
): SessionLockInstance {
  const tabSessionId = crypto.randomUUID();
  const channel = new BroadcastChannel(CHANNEL_NAME);
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let unsubFirestore: (() => void) | null = null;
  let released = false;
  /** Guards against the race where `onSnapshot` fires before our initial
   *  `setDoc` completes, which could cause a false takeover by seeing stale
   *  data from a previous session. */
  let claimed = false;

  // ── BroadcastChannel (always active) ──

  const broadcastHeartbeat = () => {
    if (released) return;
    try {
      channel.postMessage({
        type: 'heartbeat',
        tabSessionId,
        userId,
        timestamp: Date.now(),
      });
    } catch {
      // channel may be closed
    }
  };

  channel.onmessage = (event: MessageEvent) => {
    if (released) return;
    const msg = event.data;
    if (!msg || msg.tabSessionId === tabSessionId) return;

    // Another tab for the same user is active — we lose
    if (msg.type === 'heartbeat' && msg.userId === userId) {
      onTakenOver();
    }
  };

  broadcastHeartbeat();

  // ── Firestore (authenticated users only) ──

  if (userId) {
    const sessionRef = doc(db, 'activeSessions', userId);

    // Write our session claim; mark claimed once the write goes through
    setDoc(sessionRef, {
      tabSessionId,
      lastActive: serverTimestamp(),
      username,
    })
      .then(() => {
        claimed = true;
      })
      .catch((err) => {
        console.warn('[SessionLock] Firestore write failed, falling back to BroadcastChannel:', err);
      });

    // Listen for conflicting claims
    unsubFirestore = onSnapshot(
      sessionRef,
      (snap) => {
        if (released || !claimed) return; // Don't react to stale data
        if (!snap.exists()) return;

        const remote = snap.data() as ActiveSession;
        if (remote.tabSessionId && remote.tabSessionId !== tabSessionId) {
          onTakenOver();
        }
      },
      (err) => {
        console.warn('[SessionLock] Firestore listener error, falling back to BroadcastChannel:', err);
      },
    );
  }

  // ── Unified heartbeat (BroadcastChannel + Firestore keepalive) ──

  heartbeatTimer = setInterval(() => {
    if (released) return;
    broadcastHeartbeat();
    if (userId && claimed) {
      // Keep `lastActive` fresh so stale sessions can be detected externally
      setDoc(doc(db, 'activeSessions', userId), { lastActive: serverTimestamp() }, { merge: true }).catch(() => {});
    }
  }, HEARTBEAT_INTERVAL_MS);

  // ── Cleanup on tab close ──

  const handleBeforeUnload = () => {
    released = true;
    if (userId) {
      deleteDoc(doc(db, 'activeSessions', userId)).catch(() => {});
    }
  };
  window.addEventListener('beforeunload', handleBeforeUnload);

  // ── Release ──

  return {
    release: () => {
      if (released) return;
      released = true;

      if (heartbeatTimer) clearInterval(heartbeatTimer);
      channel.close();
      if (unsubFirestore) unsubFirestore();
      window.removeEventListener('beforeunload', handleBeforeUnload);

      if (userId) {
        deleteDoc(doc(db, 'activeSessions', userId)).catch(() => {});
      }
    },
  };
}
