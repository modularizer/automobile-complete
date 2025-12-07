// Service worker for programmatic script injection
// This avoids declaring host permissions in content_scripts

// Use webNavigation API to inject scripts on all HTTP/HTTPS pages
chrome.webNavigation.onCompleted.addListener((details) => {
  // Skip Chrome internal pages and extension pages
  if (details.url.startsWith('chrome://') || 
      details.url.startsWith('chrome-extension://') ||
      details.url.startsWith('moz-extension://') ||
      details.url.startsWith('about:') ||
      details.url.startsWith('edge://')) {
    return;
  }
  
  // Only inject on main frame (frameId 0)
  if (details.frameId === 0) {
    chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      files: [
        'baked-completions.js',
        'automobile-complete.js',
        'content-script.js'
      ]
    }).catch(err => {
      // Ignore errors (e.g., page doesn't allow injection, invalid tab, etc.)
      // This is expected for some pages
    });
  }
}, {
  url: [{ schemes: ['http', 'https'] }]
});

