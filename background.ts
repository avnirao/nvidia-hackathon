// Background script to manage tab data and AI responses

interface Task {
  id: string
  title: string
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

let tasks: Task[] = []
let currentTabData: TabData | null = null
let lastResponseTime = 0

// Simulated AI response function
async function getResponse(
  tasks: Task[],
  tabData: TabData
): Promise<string | null> {
  // This is where you would integrate with your actual AI service
  // For now, we'll simulate responses based on usage patterns

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
  includeAnalytics: boolean = false
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

      chrome.tabs.sendMessage(tabs[0].id, notificationData)
    }
  })
}

// Listen for tab data updates from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TAB_DATA_UPDATE") {
    currentTabData = message.data

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

  return true // Keep message channel open for async response
})
