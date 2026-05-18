// Dynamic API Base Configuration
const BASE_URL = "https://cognapse.vercel.app";

// DOM Elements
const authPanel = document.getElementById("auth-panel");
const premiumPanel = document.getElementById("premium-panel");
const analysisPanel = document.getElementById("analysis-panel");
const premiumBadge = document.getElementById("premium-status-badge");

const selectionTextPreview = document.getElementById("selection-text-preview");
const selectionCharCount = document.getElementById("selection-char-count");

const stateIdle = document.getElementById("state-idle");
const stateLoading = document.getElementById("state-loading");
const stateError = document.getElementById("state-error");
const stateSuccess = document.getElementById("state-success");

const loadingStatusText = document.getElementById("loading-status-text");
const errorMessageText = document.getElementById("error-message-text");

const resultSummary = document.getElementById("result-summary");
const resultInsight = document.getElementById("result-insight");
const resultConfidence = document.getElementById("result-confidence");
const resultRecommendation = document.getElementById("result-recommendation");

const btnLoginRedirect = document.getElementById("btn-login-redirect");
const btnPremiumUpgrade = document.getElementById("btn-premium-upgrade");

// Clear action badge on open
chrome.action.setBadgeText({ text: "" });

// Initialize UI Panels state
function showPanel(panel) {
  authPanel.classList.add("hidden");
  premiumPanel.classList.add("hidden");
  analysisPanel.classList.add("hidden");
  panel.classList.remove("hidden");
}

function showState(state) {
  stateIdle.classList.add("hidden");
  stateLoading.classList.add("hidden");
  stateError.classList.add("hidden");
  stateSuccess.classList.add("hidden");
  state.classList.remove("hidden");
}

// Redirect helpers
btnLoginRedirect.addEventListener("click", () => {
  chrome.tabs.create({ url: `${BASE_URL}?action=login` });
});

btnPremiumUpgrade.addEventListener("click", () => {
  chrome.tabs.create({ url: `${BASE_URL}?action=premium` });
});

// Run verification and analysis
document.addEventListener("DOMContentLoaded", async () => {
  console.log("COGNAPSE Extension: Initializing popup...");
  
  // 1. Get logged-in user from storage (synced via content.js)
  chrome.storage.local.get(["cognapse_user", "selectedText"], async (store) => {
    const user = store.cognapse_user;
    const selectedText = store.selectedText;

    // Immediately clear selectedText from storage to prevent infinite query loops on next popup opens
    if (selectedText) {
      chrome.storage.local.remove("selectedText", () => {
        console.log("COGNAPSE Extension: Cleared selectedText from storage for next session.");
      });
    }

    if (!user || !user.id) {
      console.log("COGNAPSE Extension: No user logged in.");
      premiumBadge.textContent = "AUTH REQ";
      premiumBadge.style.background = "rgba(239, 68, 68, 0.2)";
      premiumBadge.style.color = "#ef4444";
      showPanel(authPanel);
      return;
    }

    console.log("COGNAPSE Extension: Authenticated user detected:", user.username);
    
    // 2. Validate Premium Status using backend validator
    showPanel(analysisPanel);
    showState(stateLoading);
    loadingStatusText.textContent = "Verifying premium security layer...";

    try {
      const verifyRes = await fetch(`${BASE_URL}/api/check-premium?userId=${user.id}`);
      if (!verifyRes.ok) {
        throw new Error("Failed to contact premium server");
      }
      
      const verifyData = await verifyRes.json();
      
      if (!verifyData.premium) {
        console.log("COGNAPSE Extension: User is not premium.");
        premiumBadge.textContent = "FREE TIER";
        premiumBadge.style.background = "rgba(250, 204, 21, 0.15)";
        premiumBadge.style.color = "#FACC15";
        showPanel(premiumPanel);
        return;
      }

      // Premium verified!
      console.log("COGNAPSE Extension: Premium entitlement verified.");
      premiumBadge.textContent = "PREMIUM";
      premiumBadge.style.background = "rgba(16, 185, 129, 0.2)";
      premiumBadge.style.color = "#10b981";
      premiumBadge.style.boxShadow = "0 0 10px rgba(16, 185, 129, 0.3)";

      // 3. Process highlighted raw intelligence if present
      if (selectedText) {
        // Display raw snippet
        selectionTextPreview.textContent = `"${selectedText}"`;
        selectionCharCount.textContent = `${selectedText.length} chars`;

        // Start backend AI processing
        showState(stateLoading);
        loadingStatusText.textContent = "Synthesizing AI swarm insight...";

        const analyzeRes = await fetch(`${BASE_URL}/api/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            userId: user.id,
            text: selectedText
          })
        });

        if (!analyzeRes.ok) {
          if (analyzeRes.status === 403) {
            showPanel(premiumPanel);
            return;
          }
          let errorMsg = "Analysis failed";
          try {
            const errJson = await analyzeRes.json();
            errorMsg = errJson.error || errorMsg;
          } catch (e) {}
          throw new Error(errorMsg);
        }

        const result = await analyzeRes.json();
        
        // Render results
        resultSummary.textContent = result.summary || "Summary generation failure.";
        resultInsight.textContent = result.insight || "Insight generation failure.";
        resultConfidence.textContent = (result.confidence || "HIGH").toUpperCase();
        
        // Dynamic confidence badging
        const conf = (result.confidence || "high").toLowerCase();
        if (conf === "high") {
          resultConfidence.style.color = "#10b981";
          resultConfidence.style.background = "rgba(16, 185, 129, 0.1)";
        } else if (conf === "medium") {
          resultConfidence.style.color = "#fbbf24";
          resultConfidence.style.background = "rgba(251, 191, 36, 0.1)";
        } else {
          resultConfidence.style.color = "#ef4444";
          resultConfidence.style.background = "rgba(239, 68, 68, 0.1)";
        }

        resultRecommendation.textContent = result.recommendation || "No immediate follow-up required.";

        showState(stateSuccess);
      } else {
        // Empty state
        selectionTextPreview.innerHTML = `No webpage text selected. Highlight text on any page, right-click, and select <strong style="color: #FACC15;">Analyze with COGNAPSE</strong>.`;
        selectionCharCount.textContent = "0 chars";
        showState(stateIdle);
      }

    } catch (err) {
      console.error("COGNAPSE Extension: Error executing research step:", err);
      errorMessageText.textContent = err.message || "Failed to establish a secure database connection.";
      showState(stateError);
    }
  });
});
