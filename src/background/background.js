importScripts('../utils/constants.js');

chrome.runtime.onInstalled.addListener(() => {
  // Initialize empty keywords array
  chrome.storage.sync.set({ [STORAGE_KEYS.KEYWORDS]: [] });
});

// Listen for tab updates; once the page is loaded, try to message the content script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === 'complete' &&
    tab.url &&
    !tab.url.startsWith('chrome://')
  ) {
    chrome.tabs.sendMessage(tabId, { type: MESSAGES.REFRESH_CONTENT }, () => {
      // If the sendMessage fails (e.g., no content script yet),
      // we inject the content script via executeScript
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript({
          target: { tabId },
          files: ['src/content/content.js']
        });
      }
    });
  }
});

// Add listener for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes[STORAGE_KEYS.KEYWORDS]) {
    // Refresh all tabs when keywords change
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { type: MESSAGES.REFRESH_CONTENT });
      });
    });
  }
});
