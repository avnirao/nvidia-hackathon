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
function showNotification(
  message: string,
  analytics?: any,
  analysisData?: any
) {
  createNotificationOverlay()

  if (!notificationOverlay) return

  const isExpanded = analytics !== undefined

  // Determine notification styling based on analysis data
  let headerBackground = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  let icon = "AI"

  if (analysisData) {
    const severity = analysisData.therapeutic_response.severity_level
    const status = analysisData.therapeutic_response.attention_status

    if (severity >= 7 || status.includes("time_pressure")) {
      headerBackground = "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
      icon = "⚠️"
    } else if (severity >= 4 || status.includes("distraction")) {
      headerBackground = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
      icon = "🎯"
    } else if (status.includes("focused")) {
      headerBackground = "linear-gradient(135deg, #10b981 0%, #059669 100%)"
      icon = "✅"
    }
  }

  notificationOverlay.innerHTML = `
    <div style="padding: 16px; border-bottom: 1px solid #e5e7eb; background: ${headerBackground}; color: white;">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 24px; height: 24px; background: rgba(255,255,255,0.2); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">
            ${icon}
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
        ${
          analysisData
            ? `
          <div style="margin-top: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 12px; color: #64748b; font-weight: 500;">Attention Status:</span>
              <span style="font-size: 12px; color: #1e293b; font-weight: 600; text-transform: capitalize;">${analysisData.therapeutic_response.attention_status.replace(/_/g, " ")}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 12px; color: #64748b; font-weight: 500;">Severity Level:</span>
              <span style="font-size: 12px; color: #1e293b; font-weight: 600;">${analysisData.therapeutic_response.severity_level}/10</span>
            </div>
            ${
              analysisData.therapeutic_response.recommendations &&
              analysisData.therapeutic_response.recommendations.length > 0
                ? `
              <div style="margin-top: 8px;">
                <span style="font-size: 12px; color: #64748b; font-weight: 500;">Recommendations:</span>
                <ul style="margin: 4px 0 0 0; padding-left: 16px;">
                  ${analysisData.therapeutic_response.recommendations.map((rec) => `<li style="font-size: 11px; color: #475569; margin-bottom: 2px;">${rec}</li>`).join("")}
                </ul>
              </div>
            `
                : ""
            }
          </div>
        `
            : ""
        }
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

// Initialize content script functionality
function initializeContentScript() {
  console.log(
    "ADHD Buddy content script initialized for:",
    window.location.href
  )

  // Show indicator that content script is active
  const indicator = document.createElement("div")
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
  `
  indicator.textContent = "ADHD Buddy Active"
  document.body.appendChild(indicator)

  setTimeout(() => {
    indicator.remove()
  }, 3000)

  // Add test button for debugging
  createTestButton()

  // Add task creation interface
  createTaskCreationInterface()
}

// Create test button for debugging
function createTestButton() {
  const testButton = document.createElement("button")
  testButton.textContent = "🧪 Test Client State"
  testButton.style.cssText = `
    position: fixed;
    top: 50px;
    right: 10px;
    background: #2196F3;
    color: white;
    padding: 8px 12px;
    border: none;
    border-radius: 5px;
    font-size: 12px;
    z-index: 10000;
    cursor: pointer;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `

  testButton.addEventListener("click", async () => {
    console.log("🧪 Test button clicked - testing client state snapshot...")

    try {
      // Test from content script context
      const response = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: "TEST_CLIENT_STATE_SNAPSHOT" },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
            } else {
              resolve(response)
            }
          }
        )
      })

      console.log("🧪 Test results:", response)

      // Show results in a notification
      if (response && response.success) {
        const result = response.result
        if (result.success) {
          const taskCount = result.snapshot.current_tasks.length
          const urgentTasks = result.snapshot.current_tasks.filter(
            (t) => t.priority === "urgent"
          ).length
          const highTasks = result.snapshot.current_tasks.filter(
            (t) => t.priority === "high"
          ).length
          showNotification(
            `✅ Test passed! Found ${taskCount} tasks (${urgentTasks} urgent, ${highTasks} high priority), DOM: ${result.snapshot.dom_string.length} chars`,
            {
              tabData: { [window.location.href]: 0 }
            }
          )
        } else {
          showNotification(`❌ Test failed: ${result.error}`, {
            tabData: { [window.location.href]: 0 }
          })
        }
      } else {
        showNotification(
          `❌ Test failed: ${response?.error || "Unknown error"}`,
          {
            tabData: { [window.location.href]: 0 }
          }
        )
      }
    } catch (error: any) {
      console.error("❌ Test failed:", error)
      showNotification(`❌ Test failed: ${error.message}`, {
        tabData: { [window.location.href]: 0 }
      })
    }
  })

  document.body.appendChild(testButton)
}

// Create task creation interface
function createTaskCreationInterface() {
  const taskButton = document.createElement("button")
  taskButton.textContent = "➕ Add Task"
  taskButton.style.cssText = `
    position: fixed;
    top: 90px;
    right: 10px;
    background: #FF9800;
    color: white;
    padding: 8px 12px;
    border: none;
    border-radius: 5px;
    font-size: 12px;
    z-index: 10000;
    cursor: pointer;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `

  taskButton.addEventListener("click", () => {
    showTaskCreationModal()
  })

  document.body.appendChild(taskButton)
}

// Show task creation modal
function showTaskCreationModal() {
  // Remove existing modal if any
  const existingModal = document.getElementById("task-creation-modal")
  if (existingModal) {
    existingModal.remove()
  }

  const modal = document.createElement("div")
  modal.id = "task-creation-modal"
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `

  const modalContent = document.createElement("div")
  modalContent.style.cssText = `
    background: white;
    padding: 24px;
    border-radius: 12px;
    width: 400px;
    max-width: 90vw;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  `

  modalContent.innerHTML = `
    <h3 style="margin: 0 0 20px 0; color: #333;">Create New Task</h3>
    
    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #555;">Title *</label>
      <input type="text" id="task-title" placeholder="Enter task title" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
    </div>
    
    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #555;">Description</label>
      <textarea id="task-description" placeholder="Enter task description" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; height: 80px; resize: vertical;"></textarea>
    </div>
    
    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #555;">Priority</label>
      <select id="task-priority" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
        <option value="low">Low</option>
        <option value="medium" selected>Medium</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </select>
    </div>
    
    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #555;">Estimated Duration (minutes)</label>
      <input type="number" id="task-duration" value="30" min="1" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
    </div>
    
    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button id="cancel-task" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; font-size: 14px;">Cancel</button>
      <button id="create-task" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">Create Task</button>
    </div>
  `

  modal.appendChild(modalContent)
  document.body.appendChild(modal)

  // Add event listeners
  const cancelBtn = modal.querySelector("#cancel-task")
  const createBtn = modal.querySelector("#create-task")
  const titleInput = modal.querySelector("#task-title") as HTMLInputElement
  const descriptionInput = modal.querySelector(
    "#task-description"
  ) as HTMLTextAreaElement
  const prioritySelect = modal.querySelector(
    "#task-priority"
  ) as HTMLSelectElement
  const durationInput = modal.querySelector(
    "#task-duration"
  ) as HTMLInputElement

  cancelBtn?.addEventListener("click", () => {
    modal.remove()
  })

  createBtn?.addEventListener("click", async () => {
    const title = titleInput?.value.trim()
    const description = descriptionInput?.value.trim()
    const priority = prioritySelect?.value as
      | "low"
      | "medium"
      | "high"
      | "urgent"
    const duration = parseInt(durationInput?.value || "30")

    if (!title) {
      alert("Please enter a task title")
      return
    }

    try {
      const response = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage(
          {
            type: "ADD_TASK",
            title: title,
            description: description,
            priority: priority,
            estimatedTime: duration
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
            } else {
              resolve(response)
            }
          }
        )
      })

      if (response && response.success) {
        showNotification(`✅ Task "${title}" created successfully!`, {
          tabData: { [window.location.href]: 0 }
        })
        modal.remove()
      } else {
        showNotification(
          `❌ Failed to create task: ${response?.error || "Unknown error"}`,
          {
            tabData: { [window.location.href]: 0 }
          }
        )
      }
    } catch (error: any) {
      console.error("Failed to create task:", error)
      showNotification(`❌ Failed to create task: ${error.message}`, {
        tabData: { [window.location.href]: 0 }
      })
    }
  })

  // Close modal when clicking outside
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove()
    }
  })
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
    showNotification(message.text, message.analytics, message.analysisData)
  }

  if (message.type === "TEST_CLIENT_STATE") {
    // Test client state snapshot from content script
    import("./utils/clientStateSnapshot").then(
      ({ testClientStateSnapshot }) => {
        testClientStateSnapshot()
          .then((result) => {
            sendResponse({ success: true, result })
          })
          .catch((error) => {
            sendResponse({ success: false, error: error.message })
          })
      }
    )
    return true // Keep message channel open for async response
  }
})

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeContentScript)
} else {
  initializeContentScript()
}
