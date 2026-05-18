function syncSession() {
  const session = localStorage.getItem('cognapse_session');
  if (session) {
    try {
      const parsed = JSON.parse(session);
      chrome.storage.local.set({ cognapse_user: parsed }, () => {
        console.log("COGNAPSE Extension: Synchronized user session: ", parsed);
      });
    } catch (e) {
      console.error("COGNAPSE Extension: Error parsing session:", e);
    }
  } else {
    chrome.storage.local.remove('cognapse_user', () => {
      console.log("COGNAPSE Extension: Cleared user session.");
    });
  }
}

// Initial Sync on DOM Loaded
syncSession();

// Monitor local storage session switches or logout events
window.addEventListener('storage', (e) => {
  if (e.key === 'cognapse_session') {
    syncSession();
  }
});
