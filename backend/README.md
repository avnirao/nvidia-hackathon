# Virtual Assistant Attention Monitor Backend

A FastAPI backend with LangChain agentic workflow for monitoring user attention and providing therapeutic guidance to keep users focused and on-screen.

## Features

- **Attention Analysis**: Uses LangChain agents to analyze user attention patterns
- **Therapeutic Responses**: Provides gentle, therapeutic guidance when intervention is needed
- **DOM Analysis**: Analyzes webpage content to determine if sites are productive or distracting
- **Task Context**: Considers active tasks and urgency when making recommendations
- **Configurable Thresholds**: Customizable attention and distraction thresholds

## Setup

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Environment Configuration**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run the Server**:
   ```bash
   python run.py
   ```
   
   Or using uvicorn directly:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

## API Endpoints

### Main Endpoint

#### `POST /analyze-attention`
Analyzes user attention patterns and provides therapeutic guidance.

**Request Body**:
```json
{
  "user_id": "user123",
  "current_activity": {
    "is_on_screen": true,
    "current_url": "https://example.com",
    "page_title": "Work Document",
    "dom_elements": [...],
    "mouse_activity": true,
    "keyboard_activity": false,
    "last_activity_timestamp": "2024-01-01T12:00:00Z"
  },
  "active_tasks": [
    {
      "id": "task1",
      "title": "Complete project report",
      "estimated_duration_minutes": 60,
      "priority": "high",
      "deadline": "2024-01-01T17:00:00Z",
      "progress_percentage": 50
    }
  ],
  "time_off_screen_seconds": 120,
  "time_on_current_site_seconds": 300,
  "session_start_time": "2024-01-01T09:00:00Z"
}
```

**Response**:
```json
{
  "therapeutic_response": {
    "action_needed": true,
    "attention_status": "concerning_distraction",
    "message": "I notice you've been away for a while. Your project report deadline is approaching - would you like to take a moment to refocus?",
    "severity_level": 6,
    "recommendations": [
      "Consider taking a short mindful break",
      "Review your current tasks and priorities"
    ]
  },
  "analysis_summary": "User user123 - Status: concerning_distraction - Intervention provided (severity: 6/10)",
  "next_check_in_seconds": 30,
  "timestamp": "2024-01-01T12:05:00Z"
}
```

### Additional Endpoints

- `POST /quick-check` - Simple attention check without full context
- `GET /session/{user_id}` - Get user session information
- `DELETE /session/{user_id}` - End user session
- `GET /config` - Get configuration settings
- `GET /health` - Health check

## Configuration

The application can be configured via environment variables:

- `OPENAI_API_KEY` - Your Brev API key
- `OPENAI_BASE_URL` - API base URL (default: https://api.brev.dev/v1)
- `MODEL_NAME` - LLM model name
- `ATTENTION_THRESHOLD_SECONDS` - Off-screen time threshold (default: 300)
- `DISTRACTION_THRESHOLD_SECONDS` - Distraction time threshold (default: 120)

## LangChain Agent Architecture

The system uses a LangChain agent with specialized tools:

1. **DOM Content Analyzer** - Determines if current page is productive or distracting
2. **Urgency Calculator** - Calculates task urgency based on deadlines and priorities  
3. **Therapeutic Message Generator** - Creates empathetic, actionable guidance messages

## Attention Status Levels

- `focused` - User is on productive sites or taking appropriate breaks
- `briefly_distracted` - Short-term distraction, minimal intervention needed
- `concerning_distraction` - Extended distraction requiring therapeutic guidance
- `off_screen` - User has been away from screen for extended period

## Therapeutic Response Guidelines

The system follows therapeutic best practices:

- **Empathetic**: Non-judgmental, understanding approach
- **Actionable**: Specific, practical suggestions
- **Contextual**: Considers current tasks and deadlines
- **Graduated**: Intervention intensity matches severity level
- **Respectful**: Acknowledges user autonomy and healthy break-taking

## Development

### Running Tests
```bash
pytest tests/
```

### API Documentation
Visit `http://localhost:8000/docs` for interactive API documentation.

## Deployment

For production deployment:

1. Set environment variables appropriately
2. Use a production WSGI server
3. Configure proper CORS settings
4. Implement proper session storage (Redis/database)
5. Add authentication/authorization as needed 