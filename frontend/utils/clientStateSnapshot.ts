// Client State Snapshot Utility
// Outputs a simplified JSON blob for LLM analysis

import { extractDOMFromCurrentTab, type DOMData } from "./domExtractor"

interface ClientStateSnapshot {
  timestamp: string
  dom_string: string
  current_tasks: TaskState[]
}

interface TaskState {
  id: string
  title: string
  completed: boolean
  current: boolean
  time_spent: number
  estimated_time: number
  deliverables: DeliverableState[]
}

interface DeliverableState {
  id: string
  title: string
  completed: boolean
  estimated_time: number
  time_spent: number
}

interface Task {
  id: string
  title: string
  completed: boolean
  current: boolean
  timeSpent: number
  estimatedTime: number
  deliverables: any[]
}

/**
 * Generates a simplified client state snapshot for LLM analysis
 * @returns Promise<ClientStateSnapshot> - Minimal state data with DOM, time, and tasks
 */
async function getClientStateSnapshot(): Promise<ClientStateSnapshot> {
  const timestamp = new Date().toISOString()

  try {
    // Get current tasks from background script
    const tasks = await getTasksFromBackground()

    // Extract DOM from current tab
    const domData = await extractDOMFromCurrentTab({
      removeScripts: true,
      removeStyles: true,
      includeMetadata: false,
      maxLength: 100000 // 100KB for comprehensive DOM
    })

    // Process tasks into structured format
    const taskStates = processTasksToState(tasks)

    // Create the simplified snapshot
    const snapshot: ClientStateSnapshot = {
      timestamp,
      dom_string: domData.html,
      current_tasks: taskStates
    }

    return snapshot
  } catch (error) {
    console.error("Failed to generate client state snapshot:", error)

    // Return minimal snapshot with error information
    return {
      timestamp,
      dom_string: "",
      current_tasks: []
    }
  }
}

// Helper functions

async function getTasksFromBackground(): Promise<Task[]> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "GET_TASKS" }, (response) => {
      if (response && response.tasks) {
        resolve(response.tasks)
      } else {
        reject(new Error("Failed to get tasks from background"))
      }
    })
  })
}

function processTasksToState(tasks: Task[]): TaskState[] {
  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    completed: task.completed,
    current: task.current,
    time_spent: task.timeSpent,
    estimated_time: task.estimatedTime,
    deliverables: task.deliverables.map((d) => ({
      id: d.id,
      title: d.title,
      completed: d.completed,
      estimated_time: d.estimatedTime,
      time_spent: d.timeSpent
    }))
  }))
}

// Export the main function and types
export { getClientStateSnapshot }
export type { ClientStateSnapshot }
