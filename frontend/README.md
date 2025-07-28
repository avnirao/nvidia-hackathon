# StudyBuddy AI - Chrome Extension

A Chrome extension that helps students manage their time and find actionable steps to make the most of their time using AI-powered conversation and goal management.

## Features

- **Task Management**: Create tasks with estimated completion times and track progress
- **Deliverables Tracking**: Break down tasks into smaller deliverables with individual time estimates
- **Progress Monitoring**: Visual progress bars and percentage completion tracking
- **Time Tracking**: Automatic tracking of time spent on current tasks and tab usage
- **AI-Powered Insights**: Get personalized feedback based on your work patterns and progress
- **Goal Setting**: Add and manage your academic and personal goals
- **Conversation Interface**: Chat with AI about time management strategies
- **Analytics Dashboard**: View your tab usage patterns and time distribution
- **Modern UI**: Beautiful, intuitive interface designed for students

## Getting Started

First, install the dependencies:

```bash
pnpm install
# or
npm install
```

Then run the development server:

```bash
pnpm dev
# or
npm run dev
```

Open your browser and load the appropriate development build. For example, if you are developing for the chrome browser, using manifest v3, use: `build/chrome-mv3-dev`.

## How to Use

### Task Management

1. **Add Tasks**: Click on the extension icon and add your tasks in the "Tasks" tab
2. **Set Time Estimates**: Specify how long you think each task will take
3. **Add Deliverables**: Break down tasks into smaller, manageable deliverables
4. **Track Progress**: Start working on tasks and see real-time progress updates
5. **Monitor Time**: View time spent vs. estimated time for better planning

### AI Insights

- The AI monitors your work patterns and provides helpful feedback
- Get notifications when you've been on a page too long
- Receive progress updates and motivational messages
- AI responds based on your task completion and time management patterns

### Analytics

- View your current tab and time spent
- See your most visited websites
- Track productivity patterns throughout the day

### Goals & Chat

- Set long-term goals and get AI-generated action steps
- Chat with the AI about time management strategies
- Get personalized advice for improving productivity

## Key Features Explained

### Time Tracking

- **Automatic Tracking**: The extension tracks time spent on each tab every 10 seconds
- **Task-Specific Tracking**: When you start a task, time is automatically tracked
- **Progress Calculation**: Compare actual time spent vs. estimated time for better planning

### AI Integration

- **Smart Notifications**: AI provides context-aware feedback based on your work patterns
- **Progress Monitoring**: Get alerts when you're falling behind or making good progress
- **Productivity Tips**: Receive suggestions for improving focus and time management

### Deliverables System

- **Task Breakdown**: Break complex tasks into smaller, manageable deliverables
- **Individual Time Estimates**: Set time estimates for each deliverable
- **Progress Tracking**: Track completion of individual deliverables within tasks

## Making production build

Run the following:

```bash
pnpm build
# or
npm run build
```

This should create a production bundle for your extension, ready to be zipped and published to the stores.

## Submit to the webstores

The easiest way to deploy your Plasmo extension is to use the built-in [bpp](https://bpp.browser.market) GitHub action. Prior to using this action however, make sure to build your extension and upload the first version to the store to establish the basic credentials. Then, simply follow [this setup instruction](https://docs.plasmo.com/framework/workflows/submit) and you should be on your way for automated submission!

## Technology Stack

- **Plasmo**: Chrome extension framework
- **React**: UI library
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **AI Integration**: Simulated AI responses (ready for real AI integration)
- **Chrome Extension APIs**: Tab tracking, messaging, and storage

## Architecture

### Components

- **Content Script** (`content.ts`): Tracks tab usage and time spent
- **Background Script** (`background.ts`): Manages data and AI responses
- **Popup UI** (`popup.tsx`): Main user interface
- **AI Response Function**: Abstracted function that can be replaced with real AI service

### Data Flow

1. Content script tracks tab usage every 10 seconds
2. Background script receives data and manages task state
3. AI response function analyzes patterns and generates feedback
4. Popup displays tasks, progress, and AI responses
5. User interactions update task state and trigger AI analysis

## Contributing

This project is built with [Plasmo](https://docs.plasmo.com/), a powerful framework for building browser extensions. For further guidance, [visit our Documentation](https://docs.plasmo.com/)
