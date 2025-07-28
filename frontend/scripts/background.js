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
  if (message.type === 'CONTENT_EXTRACTED') {
    console.log('Received plain text from tab:', sender.tab?.url);
    console.log('Page title:', message.content.title);
    console.log('Plain text length:', message.content.plainText.length);
    
    // Log the actual plain text content
    console.log('\n📄 EXTRACTED PLAIN TEXT:');
    console.log('URL:', message.content.url);
    console.log('Title:', message.content.title);
    console.log('Content Length:', message.content.plainText.length, 'characters');
    console.log('\n📝 CONTENT:');
    console.log(message.content.plainText);
    console.log('\n✅ Plain text extraction complete');
    
    // Store the plain text content
    chrome.storage.local.set({ 
      lastPlainText: message.content.plainText,
      lastUrl: message.content.url,
      lastTitle: message.content.title,
      lastExtractionTime: new Date().toISOString()
    });
    
    sendResponse({ success: true });
  }
});
