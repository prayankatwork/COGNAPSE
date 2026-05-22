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

const btnLoginRedirect = document.getElementById('btn-login-redirect');
const btnPremiumUpgrade = document.getElementById('btn-premium-upgrade');

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

btnLoginRedirect.addEventListener('click', () => {
  chrome.tabs.create({ url: `${BASE_URL}?action=login` });
});

btnPremiumUpgrade.addEventListener('click', () => {
  chrome.tabs.create({ url: `${BASE_URL}?action=premium` });
});

document.addEventListener('DOMContentLoaded', async () => {
  chrome.storage.local.get(['cognapse_session', 'cognapse_user', 'selectedText'], async (store) => {
    const session = store.cognapse_session;
    const user = store.cognapse_user || session;
    const selectedText = store.selectedText;

    if (selectedText) {
      chrome.storage.local.remove('selectedText');
    }

    if (!user?.id) {
      premiumBadge.textContent = 'AUTH REQ';
      premiumBadge.style.background = 'rgba(239, 68, 68, 0.2)';
      premiumBadge.style.color = '#ef4444';
      showPanel(authPanel);
      return;
    }

    if (!session?.idToken) {
      errorMessageText.textContent =
        'Session expired. Open COGNAPSE in your browser, sign in again, then retry.';
      showPanel(analysisPanel);
      showState(stateError);
      return;
    }

    try {
      showPanel(analysisPanel);
      showState(stateLoading);
      loadingStatusText.textContent = 'Verifying premium security layer...';

      const verifyRes = await fetch(
        `${BASE_URL}/api/check-premium?userId=${encodeURIComponent(user.id)}`,
        { headers: authHeaders(session) }
      );

      if (!verifyRes.ok) {
        throw new Error('Failed to verify premium status');
      }

      const verifyData = await verifyRes.json();
      if (!verifyData.premium) {
        premiumBadge.textContent = 'FREE TIER';
        showPanel(premiumPanel);
        return;
      }

      premiumBadge.textContent = 'PREMIUM';
      premiumBadge.style.background = 'rgba(16, 185, 129, 0.2)';
      premiumBadge.style.color = '#10b981';

      if (selectedText) {
        selectionTextPreview.textContent = `"${selectedText}"`;
        selectionCharCount.textContent = `${selectedText.length} chars`;
        showState(stateLoading);
        loadingStatusText.textContent = 'Synthesizing AI swarm insight...';

        const analyzeRes = await fetch(`${BASE_URL}/api/analyze`, {
          method: 'POST',
          headers: authHeaders(session),
          body: JSON.stringify({ userId: user.id, text: selectedText }),
        });

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
      errorMessageText.textContent = err.message || 'Secure connection failed.';
      showState(stateError);
    }
  });
});
