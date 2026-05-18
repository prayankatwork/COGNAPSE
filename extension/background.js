// Register Context Menu on Install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "analyze-text",
    title: "Analyze with COGNAPSE",
    contexts: ["selection"]
  });
  console.log("COGNAPSE Extension: Context menu registered.");
});

// Listen for Context Menu Click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "analyze-text" && info.selectionText) {
    const selectedText = info.selectionText;
    
    // Save to local storage for popup retrieval
    chrome.storage.local.set({ 
      selectedText: selectedText,
      analysisStatus: "loading",
      analysisError: null,
      analysisResponse: null
    }, () => {
      console.log("Captured selection: ", selectedText);
      
      // Prompt the user to open extension popup by setting action badge
      chrome.action.setBadgeText({ text: "NEW" });
      chrome.action.setBadgeBackgroundColor({ color: "#f97316" }); // Orange
      
      // Try to open popup programmatically (Chrome 116+)
      if (chrome.action.openPopup) {
        chrome.action.openPopup().catch((err) => {
          console.log("Auto popup opening not permitted. User click required.", err);
        });
      }
    });
  }
});
