

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "OPEN_PROFILE_AND_LIKE") {
    chrome.tabs.create({ url: `https://www.instagram.com/${msg.username}/`, active: false }, (tab) => {
      const tabId = tab.id;

      setTimeout(() => {
        // Step 1: Inject content script
        chrome.scripting.executeScript({
          target: { tabId },
          files: ['content/content-script.js']
        }, () => {
          // Step 2: Send message to run like logic
          chrome.tabs.sendMessage(tabId, { type: "START_LIKE_FIRST_POST" }, (response) => {
            const success = response?.success || false;
            chrome.tabs.remove(tabId); // Close tab after like attempt
            sendResponse({ success }); // Return result to UI
          });
        });
      }, 3000); // Wait for profile page to load
    });

    return true; // Keep message channel open
  }



});



chrome.action.onClicked.addListener(async () => {
  // Find an open Instagram tab
  let [instaTab] = await chrome.tabs.query({
    url: ["*://www.instagram.com/*", "*://instagram.com/*"]
  });

  if (instaTab) {
    // Focus Instagram tab
    await chrome.tabs.update(instaTab.id, { active: true });
    // Tell content script to open the UI immediately
    chrome.tabs.sendMessage(instaTab.id, { action: "openInstaBotUI" });
  } else {
    // Open Instagram in a new tab
    const newTab = await chrome.tabs.create({ url: "https://www.instagram.com/" });
    // Wait for tab to finish loading, then send message to open UI
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === newTab.id && info.status === "complete") {
        chrome.tabs.sendMessage(tabId, { action: "openInstaBotUI" });
        chrome.tabs.onUpdated.removeListener(listener);
      }
    });
  }
});
