// background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadImages') {
    if (request.urls && Array.isArray(request.urls)) {
      request.urls.forEach(url => {
        chrome.downloads.download({
          url: url,
          conflictAction: 'uniquify'
        });
      });
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'No URLs provided' });
    }
  }
  return true; // Keep the message channel open if needed
});
