from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
import logging
import asyncio
import json
from typing import Dict

from models import SimplifiedAnalysisRequest, AnalysisResponse, TherapeuticResponse
from agents.attention_agent import AttentionAnalysisAgent
from config import settings

# Configure logging
logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL))
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Virtual Assistant Attention Monitor",
    description="API for monitoring user attention and providing therapeutic guidance based on time pressure and task management",
    version="2.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this more restrictively in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the attention analysis agent
attention_agent = AttentionAnalysisAgent()

# In-memory session storage (use Redis/database in production)
user_sessions: Dict[str, Dict] = {}


@app.on_event("startup")
async def startup_event():
    """Initialize the application on startup"""
    logger.info("Starting Virtual Assistant Attention Monitor API v2.0")
    logger.info(f"Using model: {settings.MODEL_NAME}")


@app.get("/")
async def root():
    """Root endpoint for health check"""
    return {
        "message": "Virtual Assistant Attention Monitor API v2.0",
        "status": "active",
        "features": ["time-pressure analysis", "task prioritization", "therapeutic guidance"],
        "timestamp": datetime.now()
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model": settings.MODEL_NAME,
        "version": "2.0.0",
        "timestamp": datetime.now()
    }


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_attention_simplified(request: SimplifiedAnalysisRequest):
    """
    Simplified endpoint for analyzing user attention based on DOM, current time, and tasks
    
    Expected format:
    {
        "dom": "string containing DOM content",
        "current_time": "2024-01-01T14:30:00Z",
        "current_tasks": {
            "task1": {
                "title": "Complete report",
                "estimated_duration_minutes": 120,
                "priority": "high"
            },
            "task2": {
                "title": "Review documents", 
                "estimated_duration_minutes": 45,
                "priority": "medium"
            }
        }
    }
    """
    try:
        logger.info("Analyzing attention with simplified schema")
        
        # Parse current time to extract user context
        try:
            current_dt = datetime.fromisoformat(request.current_time.replace('Z', '+00:00'))
            hours_into_day = current_dt.hour + current_dt.minute / 60.0
        except:
            current_dt = datetime.now()
            hours_into_day = current_dt.hour + current_dt.minute / 60.0
        
        # Analyze attention using the LangChain agent
        therapeutic_response = await attention_agent.analyze_attention(request)
        
        # Generate time analysis summary
        task_count = len(request.current_tasks) if isinstance(request.current_tasks, dict) else len(request.current_tasks) if isinstance(request.current_tasks, list) else 0
        
        time_analysis = {
            "current_hour": hours_into_day,
            "task_count": task_count,
            "time_remaining_hours": therapeutic_response.time_remaining_hours,
            "estimated_work_hours": therapeutic_response.task_completion_estimate_hours,
            "time_pressure": "high" if therapeutic_response.attention_status.value == "time_pressure" else "moderate" if task_count > 3 else "low"
        }
        
        # Calculate next check-in interval based on time pressure
        next_check_in = 60  # default 1 minute
        if therapeutic_response.attention_status.value == "time_pressure":
            next_check_in = 30  # check more frequently if time pressure
        elif therapeutic_response.attention_status.value == "focused":
            next_check_in = 120  # check less frequently if focused
        
        # Generate analysis summary
        analysis_summary = f"Time pressure: {time_analysis['time_pressure']} - Status: {therapeutic_response.attention_status.value}"
        if therapeutic_response.action_needed:
            analysis_summary += f" - Intervention provided (severity: {therapeutic_response.severity_level}/10)"
        
        logger.info(f"Analysis complete: {analysis_summary}")
        
        return AnalysisResponse(
            therapeutic_response=therapeutic_response,
            analysis_summary=analysis_summary,
            time_analysis=time_analysis,
            next_check_in_seconds=next_check_in,
            timestamp=datetime.now()
        )
        
    except Exception as e:
        logger.error(f"Error analyzing attention: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/quick-time-check")
async def quick_time_check(current_time: str, task_count: int):
    """
    Quick check for time pressure without full analysis
    """
    try:
        current_dt = datetime.fromisoformat(current_time.replace('Z', '+00:00'))
        end_of_day = current_dt.replace(hour=18, minute=0, second=0, microsecond=0)
        
        if current_dt.hour >= 18:
            end_of_day = end_of_day + timedelta(days=1)
        
        hours_remaining = (end_of_day - current_dt).total_seconds() / 3600
        estimated_hours_needed = task_count * 0.75  # Rough estimate: 45 min per task
        
        if estimated_hours_needed > hours_remaining * 1.2:
            return {
                "time_pressure": "high",
                "action_needed": True,
                "message": f"You have {task_count} tasks with only {hours_remaining:.1f} hours remaining. Consider prioritizing.",
                "severity": min(8, int(estimated_hours_needed / hours_remaining * 3))
            }
        elif estimated_hours_needed > hours_remaining * 0.8:
            return {
                "time_pressure": "medium", 
                "action_needed": True,
                "message": f"Moderate time pressure with {task_count} tasks remaining. Stay focused.",
                "severity": 4
            }
        
        return {
            "time_pressure": "low",
            "action_needed": False,
            "message": "Good time management - you're on track with your tasks.",
            "severity": 1
        }
        
    except Exception as e:
        logger.error(f"Error in quick time check: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Quick check failed: {str(e)}")


@app.get("/config")
async def get_configuration():
    """
    Get current configuration settings (excluding sensitive data)
    """
    return {
        "attention_threshold_seconds": settings.ATTENTION_THRESHOLD_SECONDS,
        "distraction_threshold_seconds": settings.DISTRACTION_THRESHOLD_SECONDS,
        "model_name": settings.MODEL_NAME,
        "temperature": settings.TEMPERATURE,
        "max_tokens": settings.MAX_TOKENS,
        "version": "2.0.0",
        "features": ["time_pressure_analysis", "task_prioritization", "simplified_schema"]
    }


# Legacy endpoint for backward compatibility
@app.post("/analyze-attention")
async def analyze_attention_legacy():
    """Legacy endpoint - redirects to new simplified endpoint"""
    return {
        "message": "This endpoint has been deprecated. Please use POST /analyze with the new simplified schema.",
        "new_schema": {
            "dom": "string",
            "current_time": "ISO timestamp string", 
            "current_tasks": "JSON object with tasks"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
        log_level=settings.LOG_LEVEL.lower()
    ) 