# Client State Snapshot Function Usage

## Overview

The `getClientStateSnapshot()` function returns a simplified JSON blob containing:

- **timestamp**: Current ISO timestamp
- **dom_string**: Raw HTML string from the current tab
- **current_tasks**: Array of all user tasks with their states

## Function Signature

```typescript
async function getClientStateSnapshot(): Promise<ClientStateSnapshot>
```

## Return Type

```typescript
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
```

## Example Usage

### Basic Usage

```typescript
import { getClientStateSnapshot } from "./utils/clientStateSnapshot"

// Get the current state snapshot
const snapshot = await getClientStateSnapshot()

// Send to LLM for analysis
const llmResponse = await sendToLLM({
  user_state: snapshot,
  prompt: "Analyze this user's current state and provide productivity insights"
})
```

### Example Output

```json
{
  "timestamp": "2024-01-15T14:30:25.123Z",
  "dom_string": "<!DOCTYPE html><html><head><title>Research Paper - Google Docs</title>...</html>",
  "current_tasks": [
    {
      "id": "1705323025123",
      "title": "Complete research paper",
      "completed": false,
      "current": true,
      "time_spent": 1800000,
      "estimated_time": 120,
      "deliverables": [
        {
          "id": "1705323025124",
          "title": "Write introduction",
          "completed": true,
          "estimated_time": 30,
          "time_spent": 1800000
        },
        {
          "id": "1705323025125",
          "title": "Research methodology",
          "completed": false,
          "estimated_time": 45,
          "time_spent": 0
        }
      ]
    }
  ]
}
```

## Integration with LLM

### Sending to LLM

```typescript
// Example: Send to OpenAI API
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`
  },
  body: JSON.stringify({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are a productivity assistant analyzing user state data."
      },
      {
        role: "user",
        content: `Analyze this user's current state:
        
        Current Time: ${snapshot.timestamp}
        Current Page: ${snapshot.dom_string.substring(0, 200)}...
        Active Tasks: ${snapshot.current_tasks.map((t) => t.title).join(", ")}
        
        Provide actionable insights for productivity improvement.`
      }
    ]
  })
})
```

### LLM Analysis Prompts

The function is designed to work with prompts like:

- "Analyze the user's current productivity state"
- "What should the user focus on next?"
- "Is the user on track with their tasks?"
- "Provide time management recommendations"

## Testing the Function

1. **Load the extension** in Chrome
2. **Open the popup** and go to the "Tasks" tab
3. **Click "Generate Client State Snapshot"**
4. **Check the browser console** for the full JSON output
5. **Check the chat tab** for a summary of the snapshot

## Notes

- The DOM string is cleaned (scripts and styles removed)
- Maximum DOM size is 100KB for performance
- All times are in milliseconds
- Estimated times are in minutes
- The function handles errors gracefully and returns empty data if extraction fails
