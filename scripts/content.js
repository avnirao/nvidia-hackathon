(function() {
  'use strict';

  function extractDOM() {
    console.log('Extracting DOM from:', window.location.href);

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
      const clonedDoc = document.documentElement.cloneNode(true);
      clonedDoc.querySelectorAll('script, style').forEach(el => el.remove());
      
      const cleanHTML = clonedDoc.outerHTML;

      chrome.runtime.sendMessage({
        type: 'DOM_EXTRACTED',
        html: cleanHTML,
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString()
      }, (response) => {
        if (response && response.success) {
          console.log('DOM successfully sent to background');
        } else {
          console.error('Failed to send DOM');
        }
      });
    } catch (err) {
      console.error('DOM extraction failed:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', extractDOM);
  } else {
    extractDOM();
  }
})();
