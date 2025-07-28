chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    
    if (tab.url && tab.url.startsWith('http')) {
      console.log(`Tab activated: ${tab.url}`);
      
      await injectContentScript(activeInfo.tabId);
    }
  } catch (error) {
    console.error('Error handling tab activation:', error);
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
    try {
      console.log(`Tab updated: ${tab.url}`);
      
      await injectContentScript(tabId);
    } catch (error) {
      console.error('Error handling tab update:', error);
    }
  }
});

async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
  } catch (err) {
    console.error('Failed to inject script:', err);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'DOM_EXTRACTED') {
    console.log('Received DOM HTML from tab:', sender.tab?.url);
    
    console.log('Extracted HTML snippet:', message.html);
    
    sendResponse({ success: true });
  }
});
