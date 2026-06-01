const BASE_URL = 'https://cognapse.vercel.app';

const authPanel = document.getElementById('auth-panel');
const premiumPanel = document.getElementById('premium-panel');
const analysisPanel = document.getElementById('analysis-panel');
const premiumBadge = document.getElementById('premium-status-badge');

const selectionTextPreview = document.getElementById('selection-text-preview');
const selectionCharCount = document.getElementById('selection-char-count');

const stateIdle = document.getElementById('state-idle');
const stateLoading = document.getElementById('state-loading');
const stateError = document.getElementById('state-error');
const stateSuccess = document.getElementById('state-success');

const loadingStatusText = document.getElementById('loading-status-text');
const errorMessageText = document.getElementById('error-message-text');

const resultSummary = document.getElementById('result-summary');
const resultInsight = document.getElementById('result-insight');
const resultConfidence = document.getElementById('result-confidence');
const resultRecommendation = document.getElementById('result-recommendation');

const btnPremiumUpgrade = document.getElementById('btn-premium-upgrade');

// ── Debug trace ──
const debugEl = document.getElementById('debug-trace');
const trace = [];
function dbg(label, data) {
  const ts = new Date().toISOString().slice(11, 23);
  const msg = `[${ts}] ${label}: ${typeof data === 'string' ? data : JSON.stringify(data)}`;
  trace.push(msg);
  console.log('DBG:', msg);
  if (debugEl) {
    debugEl.style.display = 'block';
    debugEl.innerHTML = trace.map(m => `<div>${m}</div>`).join('');
    debugEl.scrollTop = debugEl.scrollHeight;
  }
}

chrome.action.setBadgeText({ text: '' });

function showPanel(panel) {
  authPanel.classList.add('hidden');
  premiumPanel.classList.add('hidden');
  analysisPanel.classList.add('hidden');
  panel.classList.remove('hidden');
}

function showState(state) {
  stateIdle.classList.add('hidden');
  stateLoading.classList.add('hidden');
  stateError.classList.add('hidden');
  stateSuccess.classList.add('hidden');
  state.classList.remove('hidden');
}

function authHeaders(session) {
  const headers = { 'Content-Type': 'application/json' };
  if (session?.idToken) {
    headers.Authorization = `Bearer ${session.idToken}`;
  }
  return headers;
}

/**
 * Show the strict blocked panel with no interactive functionality.
 * This is the only thing a non-logged-in user ever sees.
 */
function showBlocked() {
  premiumBadge.textContent = 'AUTH REQ';
  premiumBadge.style.background = 'rgba(239, 68, 68, 0.2)';
  premiumBadge.style.color = '#ef4444';
  showPanel(authPanel);
}

/** Clear cached session data from chrome.storage. */
function clearSession() {
  chrome.storage.local.remove(['cognapse_user', 'cognapse_session', 'cognapse_premium', 'cognapse_logged_out'], () => {
    console.log('COGNAPSE Extension: Cleared session data.');
  });
}

const btnRetry = document.getElementById('btn-retry');

btnPremiumUpgrade.addEventListener('click', () => {
  chrome.tabs.create({ url: `${BASE_URL}?action=premium` });
});

let _isRunning = false;

async function runAnalysis() {
  if (_isRunning) return;
  _isRunning = true;

  try {
    const store = await new Promise(resolve =>
      chrome.storage.local.get(['cognapse_session', 'selectedText', 'cognapse_logged_out'], resolve)
    );

    dbg('STORAGE', { hasSession: !!store.cognapse_session, hasLoggedOut: !!store.cognapse_logged_out, hasSelectedText: !!store.selectedText });

    // If a logout sentinel exists, clear everything and block immediately
    if (store.cognapse_logged_out) {
      dbg('BLOCK', 'cognapse_logged_out sentinel found in chrome.storage');
      clearSession();
      showBlocked();
      return;
    }

    const session = store.cognapse_session;
    const selectedText = store.selectedText;

    if (selectedText) {
      chrome.storage.local.remove('selectedText');
    }

    // Fast local expiry check — if the token was obtained more than 58 minutes ago,
    // it's definitely stale. Don't even bother the server with it.
    if (session?.tokenExpiresAt) {
      const expired = Date.now() > session.tokenExpiresAt;
      dbg('EXPIRY', { expiresAt: new Date(session.tokenExpiresAt).toISOString(), expired });
      if (expired) {
        dbg('BLOCK', 'tokenExpiresAt expired locally');
        clearSession();
        showBlocked();
        return;
      }
    } else {
      dbg('EXPIRY', 'no tokenExpiresAt field on session');
    }

    // --- STEP 1: Server-verify the session before showing ANY UI ---
    // No local storage trust — the server is the sole authority on whether
    // the user has a valid session from cognapse.vercel.app.
    showPanel(analysisPanel);
    showState(stateLoading);
    loadingStatusText.textContent = 'Verifying secure session...';

    const verifyRes = await fetch(`${BASE_URL}/api/verify-session`, {
      headers: authHeaders(session),
    });

    dbg('VERIFY', { status: verifyRes.status, ok: verifyRes.ok, hasAuthHeader: !!session?.idToken });

    if (verifyRes.status === 401) {
      dbg('BLOCK', 'verify-session returned 401');
      clearSession();
      showBlocked();
      return;
    }

    if (!verifyRes.ok) {
      let detail = 'Session verification failed';
      try {
        const errJson = await verifyRes.json();
        detail = errJson.error || detail;
      } catch (_) {}
      dbg('ERROR', `verify-session !ok: ${detail}`);
      throw new Error(detail);
    }

    const verifyData = await verifyRes.json();
    dbg('VERIFY', { valid: verifyData.valid, uid: verifyData.user?.uid });

    if (!verifyData.valid || !verifyData.user?.uid) {
      dbg('BLOCK', 'verify-session response invalid or missing uid');
      clearSession();
      showBlocked();
      return;
    }

    // --- STEP 2: Session is server-verified — check premium ---
    try {
      loadingStatusText.textContent = 'Verifying premium security layer...';

      const premiumRes = await fetch(
        `${BASE_URL}/api/check-premium?userId=${encodeURIComponent(verifyData.user.uid)}`,
        { headers: authHeaders(session) }
      );

      if (premiumRes.status === 401) {
        clearSession();
        showBlocked();
        return;
      }

      if (!premiumRes.ok) {
        let detail = 'Failed to verify premium status';
        try {
          const errJson = await premiumRes.json();
          detail = errJson.error || detail;
        } catch (_) {}
        throw new Error(detail);
      }

      const premiumData = await premiumRes.json();
      dbg('PREMIUM', { premium: premiumData.premium, status: premiumRes.status });

      if (!premiumData.premium) {
        dbg('BLOCK', 'not premium (FREE TIER)');
        premiumBadge.textContent = 'FREE TIER';
        showPanel(premiumPanel);
        return;
      }

      dbg('PREMIUM', 'PREMIUM CONFIRMED — showing analysis panel');
      premiumBadge.textContent = 'PREMIUM';
      premiumBadge.style.background = 'rgba(16, 185, 129, 0.2)';
      premiumBadge.style.color = '#10b981';

      // --- STEP 3: Premium verified — run analysis or show idle ---
      if (selectedText) {
        selectionTextPreview.textContent = `"${selectedText}"`;
        selectionCharCount.textContent = `${selectedText.length} chars`;
        showState(stateLoading);
        loadingStatusText.textContent = 'Synthesizing AI swarm insight...';

        const analyzeRes = await fetch(`${BASE_URL}/api/analyze`, {
          method: 'POST',
          headers: authHeaders(session),
          body: JSON.stringify({ userId: verifyData.user.uid, text: selectedText }),
        });

        if (analyzeRes.status === 401) {
          clearSession();
          showBlocked();
          return;
        }

        if (!analyzeRes.ok) {
          if (analyzeRes.status === 403) {
            showPanel(premiumPanel);
            return;
          }
          let errorMsg = 'Analysis failed';
          try {
            const errJson = await analyzeRes.json();
            errorMsg = errJson.error || errorMsg;
          } catch (_) {}
          throw new Error(errorMsg);
        }

        const result = await analyzeRes.json();
        resultSummary.textContent = result.summary || 'Summary unavailable.';
        resultInsight.textContent = result.insight || 'Insight unavailable.';
        resultConfidence.textContent = (result.confidence || 'HIGH').toUpperCase();
        resultRecommendation.textContent =
          result.recommendation || 'No immediate follow-up required.';
        showState(stateSuccess);
      } else {
        selectionTextPreview.innerHTML =
          'No webpage text selected. Highlight text, right-click, and choose <strong style="color: #FACC15;">Analyze with COGNAPSE</strong>.';
        selectionCharCount.textContent = '0 chars';
        showState(stateIdle);
      }
    } catch (err) {
      const isNetworkError = err instanceof TypeError && (
        err.message.includes('Failed to fetch') || err.message.includes('NetworkError')
      );
      errorMessageText.textContent = isNetworkError
        ? 'Network error. Check your internet connection and try again.'
        : (err.message || 'Secure connection failed.');
      showState(stateError);
    }
  } finally {
    _isRunning = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  runAnalysis();
});

btnRetry.addEventListener('click', () => {
  runAnalysis();
});
