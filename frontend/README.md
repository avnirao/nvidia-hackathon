# StudyBuddy AI - Chrome Extension

A Chrome extension that helps students manage their time and find actionable steps to make the most of their time using AI-powered insights.

## Features

### 🎯 Task Management

- **Add Tasks**: Create tasks with estimated completion times
- **Track Progress**: Monitor time spent vs. estimated time
- **Deliverables**: Break down tasks into smaller sub-tasks
- **Start/Stop Tasks**: Mark tasks as current to track active work

### ✅ Task Completion System

- **Automatic Completion**: Tasks move to "Completed" section when checked
- **Celebration Overlay**: Beautiful completion celebration with task stats
- **Chat Notifications**: AI messages congratulate users on completion
- **New Task Prompting**: Encourages users to start their next task
- **Progress Tracking**: Shows completion percentage and time efficiency

### 🤖 AI-Powered Insights

- **Real-time Analysis**: Monitors tab usage and task progress
- **Smart Notifications**: Provides context-aware productivity tips
- **DOM Analysis**: Analyzes current webpage content for better insights
- **Client State Snapshot**: Comprehensive JSON blob for LLM analysis

### 💬 Conversation Interface

- **Chat Tab**: AI assistant provides productivity guidance
- **Notification System**: Important alerts appear in chat
- **Context Awareness**: AI understands current tasks and webpage content

### 📊 Time Tracking

- **Tab Monitoring**: Tracks time spent on each website
- **Task Timing**: Records actual vs. estimated time for tasks
- **Session Analytics**: Provides focus scores and productivity metrics

### 🔧 Technical Features

- **DOM Extraction**: Captures and analyzes webpage content
- **State Management**: Comprehensive client state for LLM analysis
- **Real-time Updates**: Live tracking of user activity
- **Error Handling**: Graceful fallbacks for all operations

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd nvidia-hackathon/frontend
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Build the extension**

   ```bash
   pnpm build
   ```

4. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `build/chrome-mv3-prod` folder

## Usage

### Getting Started

1. **Open the extension** by clicking the StudyBuddy AI icon
2. **Add your first task** with an estimated completion time
3. **Click "Start"** to begin working on a task
4. **Check off tasks** when completed to see the celebration!

### Task Management

- **Add Tasks**: Use the "Add New Task" section
- **Set Current Task**: Click "Start" on any active task
- **Track Deliverables**: Expand tasks to add sub-tasks
- **Monitor Progress**: Watch the progress bars and time tracking

### AI Features

- **Chat Tab**: Ask questions about productivity and time management
- **Automatic Insights**: AI will provide tips based on your activity
- **DOM Analysis**: AI understands what you're working on
- **State Snapshots**: Generate comprehensive data for LLM analysis

## Architecture

### Core Components

- **Popup (`popup.tsx`)**: Main UI for task management and chat
- **Background Script (`background.ts`)**: Manages state and AI logic
- **Content Script (`content.ts`)**: Tracks tab usage and injects notifications
- **DOM Extractor (`utils/domExtractor.ts`)**: Extracts and analyzes webpage content
- **Client State Snapshot (`utils/clientStateSnapshot.ts`)**: Generates LLM-ready JSON blobs

### Data Flow

1. **User Activity** → Content script tracks tab usage
2. **Task Updates** → Background script manages task state
3. **AI Analysis** → Background script generates insights
4. **Notifications** → Content script shows pop-out alerts
5. **State Snapshots** → Utility functions create LLM-ready data

### Key Interfaces

```typescript
interface Task {
  id: string
  title: string
  completed: boolean
  current: boolean
  timeSpent: number
  estimatedTime: number
  deliverables: Deliverable[]
}

interface ClientStateSnapshot {
  timestamp: string
  dom_string: string
  current_tasks: TaskState[]
}
```

## Development

### Project Structure

```
frontend/
├── popup.tsx              # Main UI component
├── background.ts          # Background script
├── content.ts             # Content script
├── utils/
│   ├── domExtractor.ts    # DOM extraction utilities
│   └── clientStateSnapshot.ts # State snapshot generator
├── style.css              # Tailwind CSS imports
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

### Available Scripts

- `pnpm build`: Build the extension for production
- `pnpm dev`: Start development mode with hot reload
- `pnpm type-check`: Run TypeScript type checking

### Technology Stack

- **Framework**: Plasmo (Chrome Extension Framework)
- **UI**: React + TypeScript
- **Styling**: Tailwind CSS
- **Build Tool**: Parcel (via Plasmo)
- **Package Manager**: pnpm

## API Integration

### Client State Snapshot

The extension provides a `getClientStateSnapshot()` function that returns a comprehensive JSON blob perfect for LLM analysis:

```typescript
const snapshot = await getClientStateSnapshot()
// Returns: { timestamp, dom_string, current_tasks }
```

### LLM Integration Example

```typescript
// Send to OpenAI API
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
        content: `Analyze this user's current state: ${JSON.stringify(snapshot)}`
      }
    ]
  })
})
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the NVIDIA Hackathon and is licensed under the MIT License.

---

**Built with ❤️ for students who want to make the most of their time!**
