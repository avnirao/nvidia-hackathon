import { getClientStateSnapshot } from "./utils/clientStateSnapshot"
import {
  analyzeDOMContent,
  extractDOMFromCurrentTab,
  monitorTabActivity,
  type DOMData
} from "./utils/domExtractor"

// Background script to manage tab data and AI responses

interface Task {
  id: string
  title: string
  description: string
  priority: "low" | "medium" | "high" | "urgent"
  completed: boolean
  current: boolean
  timeSpent: number
  estimatedTime: number // in minutes
  deliverables: Deliverable[]
}

interface Deliverable {
  id: string
  title: string
  completed: boolean
  estimatedTime: number // in minutes
  timeSpent: number
}

interface TabData {
  currentTab: string
  tabData: { [url: string]: number }
  timestamp: number
}

interface EnhancedTabData extends TabData {
  domData?: DOMData
  contentAnalysis?: any
}

// Backend API response interfaces
interface TherapeuticResponse {
  action_needed: boolean
  attention_status: string
  message: string
  severity_level: number
  recommendations: string[]
  time_remaining_hours?: number
  task_completion_estimate_hours?: number
}

interface AnalysisResponse {
  therapeutic_response: TherapeuticResponse
  analysis_summary: string
  time_analysis: any
  next_check_in_seconds: number
  timestamp: string
}

let tasks: Task[] = [
  // Add some sample tasks for testing
  {
    id: "1",
    title: "Complete project documentation",
    description:
      "Write comprehensive documentation for the ADHD Buddy extension project including API docs, user guides, and technical specifications",
    priority: "high",
    completed: false,
    current: true,
    timeSpent: 120000, // 2 minutes
    estimatedTime: 30, // 30 minutes
    deliverables: [
      {
        id: "1-1",
        title: "Write introduction section",
        completed: true,
        estimatedTime: 10,
        timeSpent: 60000
      },
      {
        id: "1-2",
        title: "Create API documentation",
        completed: false,
        estimatedTime: 20,
        timeSpent: 60000
      }
    ]
  },
  {
    id: "2",
    title: "Review code changes",
    description:
      "Perform thorough code review of recent changes to ensure quality and catch any potential issues",
    priority: "medium",
    completed: false,
    current: false,
    timeSpent: 0,
    estimatedTime: 15,
    deliverables: [
      {
        id: "2-1",
        title: "Check for bugs",
        completed: false,
        estimatedTime: 10,
        timeSpent: 0
      },
      {
        id: "2-2",
        title: "Update tests",
        completed: false,
        estimatedTime: 5,
        timeSpent: 0
      }
    ]
  },
  {
    id: "3",
    title: "Fix critical bug in notification system",
    description:
      "Urgent fix needed for notification system that's not displaying properly on some browsers",
    priority: "urgent",
    completed: false,
    current: false,
    timeSpent: 0,
    estimatedTime: 45,
    deliverables: [
      {
        id: "3-1",
        title: "Investigate browser compatibility",
        completed: false,
        estimatedTime: 20,
        timeSpent: 0
      },
      {
        id: "3-2",
        title: "Implement fix",
        completed: false,
        estimatedTime: 25,
        timeSpent: 0
      }
    ]
  },
  {
    id: "4",
    title: "Update README file",
    description:
      "Minor update to README with latest installation instructions and feature list",
    priority: "low",
    completed: false,
    current: false,
    timeSpent: 0,
    estimatedTime: 10,
    deliverables: [
      {
        id: "4-1",
        title: "Add installation steps",
        completed: false,
        estimatedTime: 5,
        timeSpent: 0
      },
      {
        id: "4-2",
        title: "Update feature list",
        completed: false,
        estimatedTime: 5,
        timeSpent: 0
      }
    ]
  }
]
let currentTabData: EnhancedTabData | null = null
let lastResponseTime = 0
let domMonitoringCleanup: (() => void) | null = null
let lastAnalysisTime = 0 // Track last backend analysis to prevent spam

// Backend API integration function
async function analyzeTabWithBackend(
  snapshot: any
): Promise<AnalysisResponse | null> {
  try {
    console.log("🔗 Sending client state snapshot to backend for analysis...")

    // Prepare request payload for backend
    const requestPayload = {
      dom: snapshot.dom_string,
      current_time: snapshot.timestamp,
      current_tasks: snapshot.current_tasks
    }

    console.log("📤 Backend request payload:", {
      domLength: requestPayload.dom.length,
      plainTextLength: snapshot.plain_text?.length || 0,
      taskCount: Object.keys(requestPayload.current_tasks).length,
      timestamp: requestPayload.current_time
    })

    // Send request to backend
    const response = await fetch("http://localhost:8000/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestPayload)
    })

    if (!response.ok) {
      throw new Error(
        `Backend API error: ${response.status} ${response.statusText}`
      )
    }

    const analysisResult: AnalysisResponse = await response.json()

    console.log("✅ Backend analysis received:", {
      actionNeeded: analysisResult.therapeutic_response.action_needed,
      attentionStatus: analysisResult.therapeutic_response.attention_status,
      severityLevel: analysisResult.therapeutic_response.severity_level,
      message:
        analysisResult.therapeutic_response.message.substring(0, 100) + "..."
    })

    return analysisResult
  } catch (error) {
    console.error("❌ Backend analysis failed:", error)
    return null
  }
}

// Initialize DOM monitoring
function initializeDOMMonitoring() {
  if (domMonitoringCleanup) {
    domMonitoringCleanup()
  }

  domMonitoringCleanup = monitorTabActivity(
    async (domData) => {
      console.log("DOM extracted from:", domData.url)
      console.log("Plain text length:", domData.plainText?.length || 0)

      // Analyze the content
      const contentAnalysis = analyzeDOMContent(domData)

      // Update current tab data with DOM information
      if (currentTabData) {
        currentTabData.domData = domData
        currentTabData.contentAnalysis = contentAnalysis
      }

      // Generate client state snapshot for LLM analysis
      try {
        const snapshot = await getClientStateSnapshot()
        console.log("Client state snapshot generated:", {
          timestamp: snapshot.timestamp,
          domLength: snapshot.dom_string.length,
          plainTextLength: snapshot.plain_text.length,
          taskCount: snapshot.current_tasks.length
        })

        // Store the snapshot for potential use by AI agents
        chrome.storage.local.set({
          lastClientStateSnapshot: snapshot,
          lastExtractionTime: new Date().toISOString()
        })

        // Rate limiting: only analyze every 30 seconds to prevent spam
        const currentTime = Date.now()
        if (currentTime - lastAnalysisTime > 30000) {
          lastAnalysisTime = currentTime

          // Send to backend for analysis
          const analysisResult = await analyzeTabWithBackend(snapshot)

          if (
            analysisResult &&
            analysisResult.therapeutic_response.action_needed
          ) {
            const therapeuticMessage =
              analysisResult.therapeutic_response.message

            // Send notification to popup chat
            chrome.runtime.sendMessage({
              type: "AI_RESPONSE",
              response: therapeuticMessage,
              analysisData: analysisResult
            })

            // Send pop-out notification to current tab
            sendNotificationToTab(therapeuticMessage, true, analysisResult)

            console.log("🎯 Therapeutic intervention delivered:", {
              status: analysisResult.therapeutic_response.attention_status,
              severity: analysisResult.therapeutic_response.severity_level,
              nextCheckIn: analysisResult.next_check_in_seconds
            })
          }
        }
      } catch (error) {
        console.error("Failed to generate client state snapshot:", error)
      }

      // Trigger legacy AI analysis with enhanced data (fallback)
      if (currentTabData) {
        const response = await getResponse(tasks, currentTabData)
        if (response) {
          // Send notification to popup
          chrome.runtime.sendMessage({
            type: "AI_RESPONSE",
            response: response
          })

          // Send pop-out notification to current tab
          sendNotificationToTab(response, true)
        }
      }
    },
    {
      removeScripts: true,
      removeStyles: true,
      includeMetadata: true,
      maxLength: 50000, // 50KB limit for performance
      extractPlainText: true // Ensure plain text is extracted
    }
  )
}

// Enhanced AI response function with DOM analysis
async function getResponse(
  tasks: Task[],
  tabData: EnhancedTabData
): Promise<string | null> {
  // This is where you would integrate with your actual AI service
  // For now, we'll simulate responses based on usage patterns and DOM content

  const currentTime = Date.now()
  const timeSinceLastResponse = currentTime - lastResponseTime

  // Only respond every 30 seconds to avoid spam
  if (timeSinceLastResponse < 30000) {
    return null
  }

  // Check if user has been on the same tab for too long (5 minutes)
  const timeOnCurrentTab = tabData.tabData[tabData.currentTab] || 0
  if (timeOnCurrentTab > 300000) {
    // 5 minutes
    lastResponseTime = currentTime

    // Enhanced message based on content analysis
    if (tabData.contentAnalysis) {
      const { estimatedReadingTime, hasVideos, hasImages } =
        tabData.contentAnalysis

      if (hasVideos) {
        return "You've been on this video page for a while. Consider if you're getting distracted or if this content is relevant to your current task."
      } else if (estimatedReadingTime > 10) {
        return `This page has a lot of content (estimated ${estimatedReadingTime} min read). Consider if you need to read it all now or bookmark it for later.`
      } else {
        return "You've been on this page for a while. Consider taking a break or moving to your next task!"
      }
    }

    return "You've been on this page for a while. Consider taking a break or moving to your next task!"
  }

  // Check task progress and provide feedback
  const currentTask = tasks.find((task) => task.current)
  if (currentTask) {
    const progress =
      (currentTask.timeSpent / (currentTask.estimatedTime * 60000)) * 100
    if (progress > 100) {
      lastResponseTime = currentTime
      return `You've exceeded the estimated time for "${currentTask.title}". Consider if you need to break it down further or adjust your approach.`
    } else if (progress > 80) {
      lastResponseTime = currentTime
      return `Great progress on "${currentTask.title}"! You're ${Math.round(progress)}% done. Keep going!`
    }
  }

  // Check if user has completed tasks
  const completedTasks = tasks.filter((task) => task.completed)
  if (completedTasks.length > 0 && completedTasks.length % 3 === 0) {
    lastResponseTime = currentTime
    return `Great job! You've completed ${completedTasks.length} tasks. Keep up the momentum!`
  }

  // Check if user has been switching tabs frequently
  const tabCount = Object.keys(tabData.tabData).length
  if (tabCount > 5) {
    lastResponseTime = currentTime
    return "You've been switching between many tabs. Try to focus on one task at a time for better productivity."
  }

  // Content-based insights
  if (tabData.contentAnalysis) {
    const { hasForms, hasLinks, wordCount } = tabData.contentAnalysis

    if (hasForms && wordCount > 1000) {
      lastResponseTime = currentTime
      return "This looks like a form-heavy page. Make sure you're not getting stuck on administrative tasks when you should be working on your main goals."
    }

    if (hasLinks && tabCount > 3) {
      lastResponseTime = currentTime
      return "I notice you're on a page with many links. Be careful not to fall into a link-clicking rabbit hole!"
    }
  }

  // Random motivational message
  const messages = [
    "Remember to take short breaks every 25 minutes for better focus!",
    "How's your current task going? Need any help breaking it down?",
    "Consider using the Pomodoro technique to stay focused!",
    "Great progress! Keep pushing forward with your goals."
  ]

  if (Math.random() < 0.1) {
    // 10% chance every 30 seconds
    lastResponseTime = currentTime
    return messages[Math.floor(Math.random() * messages.length)]
  }

  return null
}

// Send notification to current tab
function sendNotificationToTab(
  message: string,
  includeAnalytics: boolean = false,
  analysisData?: AnalysisResponse
) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].id) {
      const notificationData: any = {
        type: "SHOW_NOTIFICATION",
        text: message
      }

      if (includeAnalytics && currentTabData) {
        notificationData.analytics = currentTabData
      }

      if (analysisData) {
        notificationData.analysisData = analysisData
      }

      chrome.tabs.sendMessage(tabs[0].id, notificationData)
    }
  })
}

// Initialize DOM monitoring when extension starts
initializeDOMMonitoring()

// Listen for tab data updates from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TAB_DATA_UPDATE") {
    currentTabData = {
      ...message.data,
      domData: currentTabData?.domData,
      contentAnalysis: currentTabData?.contentAnalysis
    }

    // Update time spent on current task
    const currentTask = tasks.find((task) => task.current)
    if (currentTask) {
      currentTask.timeSpent += 10000 // Add 10 seconds
    }

    // Check for AI response
    getResponse(tasks, currentTabData).then((response) => {
      if (response) {
        // Send notification to popup
        chrome.runtime.sendMessage({
          type: "AI_RESPONSE",
          response: response
        })

        // Send pop-out notification to current tab
        sendNotificationToTab(response, true) // Include analytics
      }
    })
  }

  if (message.type === "GET_TASKS") {
    sendResponse({ tasks })
  }

  if (message.type === "ADD_TASK") {
    const newTask: Task = {
      id: Date.now().toString(),
      title: message.title,
      description: message.description || "",
      priority: message.priority || "medium", // default to medium priority
      completed: false,
      current: false,
      timeSpent: 0,
      estimatedTime: message.estimatedTime || 30, // default 30 minutes
      deliverables: message.deliverables || []
    }
    tasks.push(newTask)
    sendResponse({ success: true, task: newTask })
  }

  if (message.type === "UPDATE_TASK") {
    const taskIndex = tasks.findIndex((task) => task.id === message.taskId)
    if (taskIndex !== -1) {
      tasks[taskIndex] = { ...tasks[taskIndex], ...message.updates }
      sendResponse({ success: true, task: tasks[taskIndex] })
    }
  }

  if (message.type === "DELETE_TASK") {
    tasks = tasks.filter((task) => task.id !== message.taskId)
    sendResponse({ success: true })
  }

  if (message.type === "ADD_DELIVERABLE") {
    const taskIndex = tasks.findIndex((task) => task.id === message.taskId)
    if (taskIndex !== -1) {
      const newDeliverable: Deliverable = {
        id: Date.now().toString(),
        title: message.title,
        completed: false,
        estimatedTime: message.estimatedTime || 15, // default 15 minutes
        timeSpent: 0
      }
      tasks[taskIndex].deliverables.push(newDeliverable)
      sendResponse({
        success: true,
        deliverable: newDeliverable,
        task: tasks[taskIndex]
      })
    }
  }

  if (message.type === "UPDATE_DELIVERABLE") {
    const taskIndex = tasks.findIndex((task) => task.id === message.taskId)
    if (taskIndex !== -1) {
      const deliverableIndex = tasks[taskIndex].deliverables.findIndex(
        (d) => d.id === message.deliverableId
      )
      if (deliverableIndex !== -1) {
        tasks[taskIndex].deliverables[deliverableIndex] = {
          ...tasks[taskIndex].deliverables[deliverableIndex],
          ...message.updates
        }
        sendResponse({
          success: true,
          deliverable: tasks[taskIndex].deliverables[deliverableIndex],
          task: tasks[taskIndex]
        })
      }
    }
  }

  if (message.type === "DELETE_DELIVERABLE") {
    const taskIndex = tasks.findIndex((task) => task.id === message.taskId)
    if (taskIndex !== -1) {
      tasks[taskIndex].deliverables = tasks[taskIndex].deliverables.filter(
        (d) => d.id !== message.deliverableId
      )
      sendResponse({ success: true, task: tasks[taskIndex] })
    }
  }

  if (message.type === "GET_TAB_DATA") {
    sendResponse({ tabData: currentTabData })
  }

  if (message.type === "SEND_NOTIFICATION") {
    sendNotificationToTab(message.text, message.includeAnalytics)
    sendResponse({ success: true })
  }

  if (message.type === "EXTRACT_DOM") {
    // Manual DOM extraction request
    extractDOMFromCurrentTab(message.options || {})
      .then((domData) => {
        sendResponse({ success: true, domData })
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message })
      })
    return true // Keep message channel open for async response
  }

  if (message.type === "TEST_DOM_EXTRACTION") {
    // Test function to see DOM extraction output
    testDOMExtraction()
      .then((result) => {
        sendResponse({ success: true, result })
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message })
      })
    return true // Keep message channel open for async response
  }

  if (message.type === "TEST_CLIENT_STATE_SNAPSHOT") {
    // Test function to debug client state snapshot
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

  if (message.type === "TEST_MESSAGE") {
    // Simple test message handler
    sendResponse({ success: true, message: "Test message received" })
  }

  if (message.type === "TEST_BACKEND_ANALYSIS") {
    // Test backend analysis integration
    import("./utils/clientStateSnapshot").then(({ getClientStateSnapshot }) => {
      getClientStateSnapshot()
        .then(async (snapshot) => {
          try {
            const analysisResult = await analyzeTabWithBackend(snapshot)
            sendResponse({
              success: true,
              snapshot,
              analysisResult
            })
          } catch (error) {
            sendResponse({
              success: false,
              error: error.message,
              snapshot
            })
          }
        })
        .catch((error) => {
          sendResponse({
            success: false,
            error: error.message
          })
        })
    })
    return true // Keep message channel open for async response
  }

  return true // Keep message channel open for async response
})

/**
 * Test function to demonstrate DOM extraction
 * This will extract DOM from the current tab and log the results
 */
async function testDOMExtraction() {
  try {
    console.log("🧪 Starting DOM extraction test...")

    // Extract DOM with plain text
    const domData = await extractDOMFromCurrentTab({
      removeScripts: true,
      removeStyles: true,
      includeMetadata: true,
      maxLength: 50000,
      extractPlainText: true
    })

    // Analyze the content
    const analysis = analyzeDOMContent(domData)

    // Create detailed test result
    const testResult = {
      url: domData.url,
      title: domData.title,
      timestamp: domData.timestamp,
      htmlLength: domData.html.length,
      plainTextLength: domData.plainText?.length || 0,
      plainTextPreview:
        domData.plainText?.substring(0, 500) + "..." ||
        "No plain text extracted",
      analysis: analysis,
      wordCount: analysis.wordCount,
      plainTextWordCount: analysis.plainTextWordCount,
      estimatedReadingTime: analysis.estimatedReadingTime
    }

    // Log the results
    console.log("✅ DOM Extraction Test Results:")
    console.log("URL:", testResult.url)
    console.log("Title:", testResult.title)
    console.log("HTML Length:", testResult.htmlLength, "characters")
    console.log("Plain Text Length:", testResult.plainTextLength, "characters")
    console.log("Word Count (HTML):", testResult.wordCount)
    console.log("Word Count (Plain Text):", testResult.plainTextWordCount)
    console.log(
      "Estimated Reading Time:",
      testResult.estimatedReadingTime,
      "minutes"
    )
    console.log("\n📄 Plain Text Preview:")
    console.log(testResult.plainTextPreview)
    console.log("\n📊 Content Analysis:")
    console.log("- Has Images:", analysis.hasImages)
    console.log("- Has Forms:", analysis.hasForms)
    console.log("- Has Links:", analysis.hasLinks)
    console.log("- Has Videos:", analysis.hasVideos)

    // Store the test result
    chrome.storage.local.set({
      lastDOMTestResult: testResult,
      lastTestTime: new Date().toISOString()
    })

    return testResult
  } catch (error) {
    console.error("❌ DOM extraction test failed:", error)
    throw error
  }
}
