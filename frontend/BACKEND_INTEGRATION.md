# Backend Integration for Tab Analysis

This document describes the new backend integration functionality that analyzes user behavior on tab changes and provides therapeutic guidance.

## Overview

The extension now integrates with a FastAPI backend server running on `localhost:8000` to provide real-time analysis of user attention patterns and therapeutic interventions.

## How It Works

### 1. Tab Change Detection
- The extension monitors tab changes using Chrome's `tabs.onActivated` and `tabs.onUpdated` events
- When a user switches to a new tab, the system automatically triggers analysis

### 2. Client State Snapshot Generation
- Generates a comprehensive snapshot including:
  - Current DOM content (HTML)
  - Plain text content
  - Current tasks and their status
  - Timestamp

### 3. Backend Analysis
- Sends the snapshot to `http://localhost:8000/analyze`
- Backend analyzes the data using LangChain agents
- Returns therapeutic response with:
  - Attention status (focused, distracted, time_pressure, etc.)
  - Severity level (1-10)
  - Therapeutic message
  - Recommendations
  - Time analysis

### 4. User Notification
- Displays notifications in the chat bubble with:
  - Therapeutic message
  - Attention status and severity
  - Recommendations (if any)
  - Visual indicators based on severity level

## API Endpoint

**POST** `http://localhost:8000/analyze`

**Request Body:**
```json
{
  "dom": "string containing DOM content",
  "current_time": "2024-01-01T14:30:00Z",
  "current_tasks": {
    "task1": {
      "title": "Complete report",
      "estimated_duration_minutes": 120,
      "priority": "high"
    }
  }
}
```

**Response:**
```json
{
  "therapeutic_response": {
    "action_needed": true,
    "attention_status": "time_pressure",
    "message": "I notice you have several urgent tasks...",
    "severity_level": 7,
    "recommendations": [
      "Consider prioritizing your most urgent task",
      "Take a short break to refocus"
    ],
    "time_remaining_hours": 4.5,
    "task_completion_estimate_hours": 6.0
  },
  "analysis_summary": "Time pressure: high - Status: time_pressure",
  "time_analysis": {
    "current_hour": 14.5,
    "task_count": 3,
    "time_remaining_hours": 4.5,
    "estimated_work_hours": 6.0,
    "time_pressure": "high"
  },
  "next_check_in_seconds": 30,
  "timestamp": "2024-01-01T14:30:00Z"
}
```

## Features

### Rate Limiting
- Analysis is limited to once every 30 seconds to prevent spam
- Only triggers when `action_needed` is true

### Visual Indicators
- **Red gradient**: High severity (7-10) or time pressure
- **Orange gradient**: Medium severity (4-6) or distraction
- **Green gradient**: Focused status
- **Blue gradient**: Default/neutral

### Enhanced Notifications
- Shows attention status and severity level
- Displays recommendations when available
- Includes activity analytics
- Auto-hides after 10 seconds

### Chat Integration
- Backend responses appear in the popup chat
- Enhanced with analysis data and recommendations
- Maintains chat history

## Testing

### Manual Testing
1. Click the "🔗 Test Backend" button in the popup
2. This will generate a snapshot and send it to the backend
3. Results will appear in the chat

### Automatic Testing
1. Switch between tabs
2. Wait for notifications to appear
3. Check the chat for analysis results

## Error Handling

- Graceful fallback if backend is unavailable
- Continues with legacy analysis if backend fails
- Error messages logged to console
- User-friendly error notifications

## Configuration

The backend URL is hardcoded to `http://localhost:8000/analyze`. To change this:

1. Modify the `analyzeTabWithBackend` function in `background.ts`
2. Update the fetch URL
3. Rebuild the extension

## Dependencies

- Backend server must be running on `localhost:8000`
- Requires the `/analyze` endpoint to be available
- Backend should accept the `SimplifiedAnalysisRequest` format
- CORS must be enabled on the backend

## Troubleshooting

### Backend Not Responding
- Check if backend server is running
- Verify the endpoint URL is correct
- Check browser console for CORS errors
- Ensure backend accepts POST requests

### No Notifications
- Check if rate limiting is preventing analysis
- Verify tab change detection is working
- Check console for error messages
- Ensure content script is injected

### Analysis Not Triggering
- Verify DOM extraction is working
- Check if client state snapshot generation succeeds
- Look for errors in background script console
- Ensure tasks are available for analysis 