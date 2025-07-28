// Client State Snapshot Utility
// Outputs a simplified JSON blob for LLM analysis

import { extractDOMFromCurrentTab, type DOMData } from "./domExtractor"

interface ClientStateSnapshot {
  timestamp: string
  dom_string: string
  plain_text: string // Added plain text content
  current_tasks: TaskState[]
}

interface TaskState {
  title: string
  estimated_duration_minutes: number
  description: string
  priority: "low" | "medium" | "high" | "urgent"
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
  description: string
  priority: "low" | "medium" | "high" | "urgent"
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
  console.log("🔄 Generating client state snapshot...")

  try {
    // Get current tasks from background script
    console.log("📋 Fetching tasks from background script...")
    const tasks = await getTasksFromBackground()
    console.log("✅ Tasks fetched:", tasks.length, "tasks found")

    // Extract DOM from current tab with plain text
    console.log("🌐 Extracting DOM from current tab...")
    const domData = await extractDOMFromCurrentTab({
      removeScripts: true,
      removeStyles: true,
      includeMetadata: false,
      maxLength: 100000, // 100KB for comprehensive DOM
      extractPlainText: true // Ensure plain text is extracted
    })
    console.log("✅ DOM extracted:", {
      url: domData.url,
      title: domData.title,
      htmlLength: domData.html.length,
      plainTextLength: domData.plainText?.length || 0
    })

    // Process tasks into structured format
    const taskStates = processTasksToState(tasks)
    console.log("✅ Tasks processed:", taskStates.length, "task states")

    // Create the simplified snapshot
    const snapshot: ClientStateSnapshot = {
      timestamp,
      dom_string: domData.html,
      plain_text: domData.plainText || "", // Include plain text content
      current_tasks: taskStates
    }

    console.log("✅ Client state snapshot generated successfully:", {
      timestamp: snapshot.timestamp,
      domLength: snapshot.dom_string.length,
      plainTextLength: snapshot.plain_text.length,
      taskCount: snapshot.current_tasks.length
    })

    return snapshot
  } catch (error) {
    console.error("❌ Failed to generate client state snapshot:", error)

    // Return minimal snapshot with error information
    return {
      timestamp,
      dom_string: `Error extracting DOM: ${error}`,
      plain_text: "",
      current_tasks: []
    }
  }
}

// Helper functions

async function getTasksFromBackground(): Promise<Task[]> {
  return new Promise((resolve, reject) => {
    console.log("📤 Sending GET_TASKS message to background script...")

    chrome.runtime.sendMessage({ type: "GET_TASKS" }, (response) => {
      console.log("📥 Received response from background script:", response)

      if (chrome.runtime.lastError) {
        console.error("❌ Chrome runtime error:", chrome.runtime.lastError)
        reject(
          new Error(`Chrome runtime error: ${chrome.runtime.lastError.message}`)
        )
        return
      }

      if (response && response.tasks) {
        console.log("✅ Tasks received successfully:", response.tasks)
        resolve(response.tasks)
      } else {
        console.error("❌ Invalid response format:", response)
        reject(
          new Error(
            "Failed to get tasks from background - invalid response format"
          )
        )
      }
    })
  })
}

function processTasksToState(tasks: Task[]): TaskState[] {
  return tasks.map((task) => ({
    title: task.title,
    estimated_duration_minutes: task.estimatedTime,
    description: task.description,
    priority: task.priority
  }))
}

/**
 * Test function to debug client state snapshot generation
 * This function will help identify where the issues are occurring
 */
async function testClientStateSnapshot(): Promise<any> {
  console.log("🧪 Starting client state snapshot test...")

  try {
    // Test 1: Check if we can access chrome.runtime
    console.log("Test 1: Checking chrome.runtime access...")
    if (typeof chrome === "undefined" || !chrome.runtime) {
      throw new Error("Chrome runtime not available")
    }
    console.log("✅ Chrome runtime is available")

    // Test 2: Check if we can send messages
    console.log("Test 2: Testing message sending...")
    const testResponse = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "TEST_MESSAGE" }, (response) => {
        if (chrome.runtime.lastError) {
          console.log(
            "⚠️ Expected error for test message:",
            chrome.runtime.lastError.message
          )
          resolve("Message sending works (got expected error)")
        } else {
          resolve("Message sending works")
        }
      })
    })
    console.log("✅ Message sending test:", testResponse)

    // Test 3: Try to get tasks
    console.log("Test 3: Testing task retrieval...")
    const tasks = await getTasksFromBackground()
    console.log("✅ Task retrieval test passed:", tasks.length, "tasks")

    // Test 4: Try to extract DOM
    console.log("Test 4: Testing DOM extraction...")
    const domData = await extractDOMFromCurrentTab({
      removeScripts: true,
      removeStyles: true,
      includeMetadata: false,
      maxLength: 10000, // Smaller for testing
      extractPlainText: true
    })
    console.log("✅ DOM extraction test passed:", {
      url: domData.url,
      htmlLength: domData.html.length,
      plainTextLength: domData.plainText?.length || 0
    })

    // Test 5: Generate full snapshot
    console.log("Test 5: Testing full snapshot generation...")
    const snapshot = await getClientStateSnapshot()
    console.log("✅ Full snapshot test passed:", {
      timestamp: snapshot.timestamp,
      domLength: snapshot.dom_string.length,
      plainTextLength: snapshot.plain_text.length,
      taskCount: snapshot.current_tasks.length
    })

    return {
      success: true,
      tests: {
        chromeRuntime: "✅ Available",
        messageSending: "✅ Working",
        taskRetrieval: `✅ ${tasks.length} tasks found`,
        domExtraction: `✅ ${domData.html.length} chars extracted`,
        fullSnapshot: `✅ Generated with ${snapshot.current_tasks.length} tasks`
      },
      snapshot: snapshot
    }
  } catch (error) {
    console.error("❌ Client state snapshot test failed:", error)
    return {
      success: false,
      error: error.message,
      stack: error.stack
    }
  }
}

// Export the main function and types
export { getClientStateSnapshot, testClientStateSnapshot }
export type { ClientStateSnapshot }