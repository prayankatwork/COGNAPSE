let lastSessionHash = '';

function getSessionHash(session) {
  if (!session) return '';
  // Use idToken length + update time as a lightweight change detector
  const t = typeof session === 'string' ? session : (session.idToken || '') + (session.id || '');
  let hash = 0;
  for (let i = 0; i < t.length; i++) {
    const char = t.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return String(hash);
}

function syncSession(force = false) {
  const session = localStorage.getItem('cognapse_session');
  const loggedOut = localStorage.getItem('cognapse_logged_out');
  const currentHash = getSessionHash(session);
  // Skip unchanged state UNLESS this is a forced initial sync.
  // Without this, the initial call short-circuits when localStorage is clean
  // (both session and sentinel null), leaving stale data in chrome.storage.
  if (!force && currentHash === lastSessionHash && !loggedOut) return;
  lastSessionHash = currentHash;

  // No session? Clear chrome.storage (write sentinel if logout flag is present)
  if (!session) {
    const removeKeys = ['cognapse_user', 'cognapse_session', 'cognapse_premium'];
    if (loggedOut) {
      chrome.storage.local.set({ cognapse_logged_out: loggedOut }, () => {
        chrome.storage.local.remove(removeKeys, () => {
          console.log('COGNAPSE Extension: Cleared session after logout.');
        });
      });
    } else {
      chrome.storage.local.remove([...removeKeys, 'cognapse_logged_out'], () => {
        console.log('COGNAPSE Extension: Cleared session.');
      });
    }
    return;
  }

  // Session exists — clear any stale sentinel, then sync
  chrome.storage.local.remove('cognapse_logged_out');

  try {
    const parsed = JSON.parse(session);
    chrome.storage.local.set({
      cognapse_session: parsed,
      cognapse_user: { id: parsed.id, username: parsed.username },
    }, () => {
      console.log('COGNAPSE Extension: Synchronized session for', parsed.username);
    });

    const premiumKey = `cognapse_premium_${parsed.id}`;
    const premium = localStorage.getItem(premiumKey);
    if (premium) {
      try {
        const parsedPremium = JSON.parse(premium);
        chrome.storage.local.set({ cognapse_premium: parsedPremium });
      } catch (pe) {
        console.error('COGNAPSE Extension: Error parsing premium data:', pe);
      }
    } else {
      chrome.storage.local.remove('cognapse_premium');
    }
  } catch (e) {
    console.error('COGNAPSE Extension: Error parsing session:', e);
  }
}

// Initial sync — force=true ensures chrome.storage is cleared even when
// localStorage is clean (no session, no sentinel), preventing stale data reuse.
syncSession(true);

// Listen for storage events from other tabs
window.addEventListener('storage', (e) => {
  if (e.key === 'cognapse_session' || e.key?.startsWith('cognapse_premium_')) {
    syncSession();
  }
});

// Immediately sync when the SPA dispatches a logout event
window.addEventListener('message', (event) => {
  if (event.data?.source === 'cognapse' && event.data?.type === 'logout') {
    syncSession();
  }
});

// Poll every 5s to catch SPA auth changes (storage event doesn't fire in the same tab)
const syncInterval = setInterval(syncSession, 5000);
window.addEventListener('beforeunload', () => clearInterval(syncInterval));
