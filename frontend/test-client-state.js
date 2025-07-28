// Test script for client state snapshot functionality
// Run this in the browser console to test the extension

console.log("🧪 Starting client state snapshot test...")

// Test 1: Check if extension is loaded
if (typeof chrome === "undefined" || !chrome.runtime) {
  console.error("❌ Chrome runtime not available - extension may not be loaded")
} else {
  console.log("✅ Chrome runtime is available")
}

// Test 2: Test message sending
chrome.runtime.sendMessage({ type: "TEST_MESSAGE" }, (response) => {
  if (chrome.runtime.lastError) {
    console.log(
      "⚠️ Test message failed (expected):",
      chrome.runtime.lastError.message
    )
  } else {
    console.log("✅ Test message successful:", response)
  }
})

// Test 3: Test task retrieval
chrome.runtime.sendMessage({ type: "GET_TASKS" }, (response) => {
  if (chrome.runtime.lastError) {
    console.error("❌ Failed to get tasks:", chrome.runtime.lastError.message)
  } else {
    console.log("✅ Tasks retrieved:", response)
    console.log("📋 Number of tasks:", response.tasks?.length || 0)
  }
})

// Test 4: Test DOM extraction
chrome.runtime.sendMessage({ type: "TEST_DOM_EXTRACTION" }, (response) => {
  if (chrome.runtime.lastError) {
    console.error(
      "❌ DOM extraction test failed:",
      chrome.runtime.lastError.message
    )
  } else {
    console.log("✅ DOM extraction test results:", response)
    if (response.success) {
      const result = response.result
      console.log("📄 DOM Analysis:")
      console.log("- URL:", result.url)
      console.log("- Title:", result.title)
      console.log("- HTML Length:", result.htmlLength, "characters")
      console.log("- Plain Text Length:", result.plainTextLength, "characters")
      console.log("- Word Count:", result.wordCount)
      console.log(
        "- Estimated Reading Time:",
        result.estimatedReadingTime,
        "minutes"
      )
    }
  }
})

// Test 5: Test full client state snapshot
chrome.runtime.sendMessage(
  { type: "TEST_CLIENT_STATE_SNAPSHOT" },
  (response) => {
    if (chrome.runtime.lastError) {
      console.error(
        "❌ Client state snapshot test failed:",
        chrome.runtime.lastError.message
      )
    } else {
      console.log("✅ Client state snapshot test results:", response)
      if (response.success) {
        const result = response.result
        if (result.success) {
          const snapshot = result.snapshot
          console.log("📊 Client State Snapshot:")
          console.log("- Timestamp:", snapshot.timestamp)
          console.log(
            "- DOM String Length:",
            snapshot.dom_string.length,
            "characters"
          )
          console.log(
            "- Plain Text Length:",
            snapshot.plain_text.length,
            "characters"
          )
          console.log("- Number of Tasks:", snapshot.current_tasks.length)

          if (snapshot.current_tasks.length > 0) {
            console.log("📋 Tasks:")
            snapshot.current_tasks.forEach((task, index) => {
              console.log(`  ${index + 1}. ${task.title}`)
              console.log(`     Priority: ${task.priority.toUpperCase()}`)
              console.log(`     Duration: ${task.estimated_duration_minutes} minutes`)
              console.log(`     Description: ${task.description}`)
            })
          }

          // Show a preview of the DOM content
          if (snapshot.dom_string.length > 0) {
            console.log("📄 DOM Preview (first 200 chars):")
            console.log(snapshot.dom_string.substring(0, 200) + "...")
          }

          if (snapshot.plain_text.length > 0) {
            console.log("📝 Plain Text Preview (first 200 chars):")
            console.log(snapshot.plain_text.substring(0, 200) + "...")
          }
        } else {
          console.error("❌ Snapshot generation failed:", result.error)
        }
      }
    }
  }
)

console.log("🧪 All tests initiated. Check the console for results...")
