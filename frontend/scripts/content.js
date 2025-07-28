(function() {
  'use strict';

  function extractRelevantContent() {
    console.log('Extracting plain text from:', window.location.href);

    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #4CAF50;
      color: white;
      padding: 5px 10px;
      border-radius: 5px;
      font-size: 12px;
      z-index: 10000;
      pointer-events: none;
    `;
    indicator.textContent = 'ADHD Buddy Active';
    document.body.appendChild(indicator);

    setTimeout(() => {
      indicator.remove();
    }, 3000);

    try {
      // Extract just the main plain text content
      const plainTextContent = extractMainPlainText();

      chrome.runtime.sendMessage({
        type: 'CONTENT_EXTRACTED',
        content: {
          url: window.location.href,
          title: document.title,
          plainText: plainTextContent
        }
      }, (response) => {
        if (response && response.success) {
          console.log('Plain text content sent to background');
        } else {
          console.error('Failed to send content');
        }
      });

      // Log the extracted plain text to console
      console.log('=== EXTRACTED PLAIN TEXT ===');
      console.log(plainTextContent);
      console.log('=== END PLAIN TEXT ===');
      
      // Also log it in a more readable format
      console.log('\n📄 PLAIN TEXT CONTENT:');
      console.log('URL:', window.location.href);
      console.log('Title:', document.title);
      console.log('Content Length:', plainTextContent.length, 'characters');
      console.log('\n📝 CONTENT:');
      console.log(plainTextContent);
      console.log('\n✅ Extraction complete');

    } catch (err) {
      console.error('Content extraction failed:', err);
    }
  }

  function extractMainPlainText() {
    // Try to find main content areas
    const mainSelectors = [
      'main',
      '[role="main"]',
      '.main-content',
      '.content',
      '#content',
      'article',
      '.article'
    ];
    
    let mainContent = '';
    
    for (const selector of mainSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        mainContent = getCleanTextContent(element);
        break;
      }
    }
    
    // If no main content found, extract from body
    if (!mainContent) {
      const bodyClone = document.body.cloneNode(true);
      // Remove non-content elements
      bodyClone.querySelectorAll('script, style, noscript, iframe, embed, object, nav, header, footer').forEach(el => el.remove());
      mainContent = getCleanTextContent(bodyClone);
    }
    
    return mainContent;
  }

  function getCleanTextContent(element) {
    // Get text content and clean it up
    let text = element.textContent || element.innerText || '';
    
    // Remove extra whitespace and normalize
    text = text.replace(/\s+/g, ' ').trim();
    
    // Remove common unwanted text patterns
    text = text.replace(/javascript:/gi, '');
    text = text.replace(/mailto:/gi, '');
    text = text.replace(/tel:/gi, '');
    
    return text;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', extractRelevantContent);
  } else {
    extractRelevantContent();
  }
})();
