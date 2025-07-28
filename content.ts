// Track tab usage and time spent
let startTime = Date.now()
let currentTab = window.location.href
let tabData: { [url: string]: number } = {}

// Notification overlay state
let notificationOverlay: HTMLElement | null = null
let isExpanded = false

// Create notification overlay
function createNotificationOverlay() {
  if (notificationOverlay) return

  notificationOverlay = document.createElement("div")
  notificationOverlay.id = "studybuddy-notification"
  notificationOverlay.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 350px;
    max-height: 500px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    border: 1px solid #e5e7eb;
    overflow: hidden;
    transform: translateX(400px);
    transition: transform 0.3s ease-in-out;
  `

  // Add styles to prevent conflicts
  const style = document.createElement("style")
  style.textContent = `
    #studybuddy-notification * {
      box-sizing: border-box;
    }
    #studybuddy-notification {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    }
  `
  document.head.appendChild(style)
  document.body.appendChild(notificationOverlay)
}

// Show notification
function showNotification(message: string, analytics?: any) {
  createNotificationOverlay()

  if (!notificationOverlay) return

  const isExpanded = analytics !== undefined

  notificationOverlay.innerHTML = `
    <div style="padding: 16px; border-bottom: 1px solid #e5e7eb; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 24px; height: 24px; background: rgba(255,255,255,0.2); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">
            AI
          </div>
          <span style="font-weight: 600; font-size: 14px;">StudyBuddy AI</span>
        </div>
        <button id="close-notification" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
          ×
        </button>
      </div>
    </div>
    
    <div style="padding: 16px;">
      <div style="margin-bottom: 12px;">
        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.5;">
          ${message}
        </p>
      </div>
      
      ${
        analytics
          ? `
        <div style="border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 12px;">
          <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #374151;">Your Activity</h4>
          <div style="space-y: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f9fafb; border-radius: 6px;">
              <span style="font-size: 12px; color: #6b7280;">Current Page</span>
              <span style="font-size: 12px; color: #374151; font-weight: 500;">${new URL(window.location.href).hostname}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f9fafb; border-radius: 6px;">
              <span style="font-size: 12px; color: #6b7280;">Time on Page</span>
              <span style="font-size: 12px; color: #374151; font-weight: 500;">${formatTime(analytics.tabData[window.location.href] || 0)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #f9fafb; border-radius: 6px;">
              <span style="font-size: 12px; color: #6b7280;">Tabs Visited</span>
              <span style="font-size: 12px; color: #374151; font-weight: 500;">${Object.keys(analytics.tabData).length}</span>
            </div>
          </div>
        </div>
      `
          : ""
      }
    </div>
  `

  // Add event listeners
  const closeBtn = notificationOverlay.querySelector("#close-notification")
  if (closeBtn) {
    closeBtn.addEventListener("click", hideNotification)
  }

  // Show the notification
  setTimeout(() => {
    if (notificationOverlay) {
      notificationOverlay.style.transform = "translateX(0)"
    }
  }, 100)

  // Auto-hide after 10 seconds
  setTimeout(() => {
    hideNotification()
  }, 10000)
}

// Hide notification
function hideNotification() {
  if (notificationOverlay) {
    notificationOverlay.style.transform = "translateX(400px)"
    setTimeout(() => {
      if (notificationOverlay && notificationOverlay.parentNode) {
        notificationOverlay.parentNode.removeChild(notificationOverlay)
        notificationOverlay = null
      }
    }, 300)
  }
}

// Format time helper
function formatTime(milliseconds: number) {
  const minutes = Math.floor(milliseconds / 60000)
  const seconds = Math.floor((milliseconds % 60000) / 1000)
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

// Update tab data every 10 seconds
setInterval(() => {
  const currentUrl = window.location.href
  const timeSpent = Date.now() - startTime

  // Add time to current tab
  if (tabData[currentUrl]) {
    tabData[currentUrl] += timeSpent
  } else {
    tabData[currentUrl] = timeSpent
  }

  // Reset timer for next interval
  startTime = Date.now()

  // Send data to background script
  chrome.runtime.sendMessage({
    type: "TAB_DATA_UPDATE",
    data: {
      currentTab: currentUrl,
      tabData: tabData,
      timestamp: Date.now()
    }
  })
}, 10000)

// Listen for messages from popup and background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_TAB_DATA") {
    sendResponse({
      currentTab: window.location.href,
      tabData: tabData
    })
  }

  if (message.type === "SHOW_NOTIFICATION") {
    showNotification(message.text, message.analytics)
  }
})
