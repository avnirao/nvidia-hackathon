# Testing Client State Snapshot Functionality

This guide will help you test and debug the client state snapshot functionality.

## Issues Fixed

1. **Empty DOM String**: Added better error handling and debugging to identify where DOM extraction fails
2. **Missing Tasks**: Added sample tasks and better error handling for task retrieval
3. **Context Issues**: Fixed DOM extraction to work from both content script and background script contexts

## How to Test

### Method 1: Using the Test Button (Easiest)

1. Load the extension in Chrome
2. Navigate to any webpage
3. Look for a blue "🧪 Test Client State" button in the top-right corner
4. Click the button to run the test
5. Check the browser console for detailed results

### Method 2: Using Browser Console

1. Load the extension in Chrome
2. Navigate to any webpage
3. Open Developer Tools (F12)
4. Go to the Console tab
5. Copy and paste the contents of `test-client-state.js` into the console
6. Press Enter to run the tests

### Method 3: Manual Testing

You can also test individual components:

#### Test Task Retrieval

```javascript
chrome.runtime.sendMessage({ type: "GET_TASKS" }, (response) => {
  console.log("Tasks:", response)
})
```

#### Test DOM Extraction

```javascript
chrome.runtime.sendMessage({ type: "TEST_DOM_EXTRACTION" }, (response) => {
  console.log("DOM Test:", response)
})
```

#### Test Full Client State Snapshot

```javascript
chrome.runtime.sendMessage(
  { type: "TEST_CLIENT_STATE_SNAPSHOT" },
  (response) => {
    console.log("Client State Test:", response)
  }
)
```

## Expected Results

### Successful Test Should Show:

1. **Tasks**: 4 sample tasks with different priorities (low, medium, high, urgent)
2. **Task Structure**: Each task has title, description, priority, and estimated duration
3. **DOM String**: HTML content from the current page (not empty)
4. **Plain Text**: Extracted text content from the page
5. **Timestamp**: Current timestamp

### Sample Output:

```
✅ Test passed! Found 4 tasks (1 urgent, 1 high priority), DOM: 15420 chars
```

### Task Creation:

- Click the "➕ Add Task" button to create new tasks
- Select priority: low, medium, high, or urgent
- Add description and estimated duration
- Tasks are automatically added to the system

## Debugging

If tests fail, check the browser console for detailed error messages. Common issues:

1. **Extension not loaded**: Make sure the extension is properly installed and enabled
2. **Permission issues**: Check if the extension has access to the current tab
3. **Content script not running**: Verify the content script is injected into the page

## Files Modified

- `utils/clientStateSnapshot.ts`: Added debugging and test function
- `utils/domExtractor.ts`: Fixed context detection for DOM extraction
- `background.ts`: Added sample tasks and test handlers
- `content.ts`: Added test button and improved error handling

## Next Steps

Once the basic functionality is working, you can:

1. Remove the test button from production
2. Add more sophisticated task management
3. Integrate with your AI backend
4. Add more detailed analytics
