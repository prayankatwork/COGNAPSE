function syncSession() {
  const session = localStorage.getItem('cognapse_session');
  if (session) {
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
  } else {
    chrome.storage.local.remove(['cognapse_user', 'cognapse_session', 'cognapse_premium'], () => {
      console.log('COGNAPSE Extension: Cleared session.');
    });
  }
}

syncSession();

window.addEventListener('storage', (e) => {
  if (e.key === 'cognapse_session' || e.key?.startsWith('cognapse_premium_')) {
    syncSession();
  }
});
