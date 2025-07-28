from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class AttentionStatus(str, Enum):
    FOCUSED = "focused"
    BRIEFLY_DISTRACTED = "briefly_distracted"
    CONCERNING_DISTRACTION = "concerning_distraction"
    TIME_PRESSURE = "time_pressure"
    OFF_SCREEN = "off_screen"


class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class SimplifiedAnalysisRequest(BaseModel):
    dom: str = Field(..., description="DOM content as a string")
    current_time: str = Field(..., description="Current timestamp as ISO string")
    current_tasks: Dict[str, Any] = Field(..., description="JSON object containing current tasks")


class TherapeuticResponse(BaseModel):
    action_needed: bool
    attention_status: AttentionStatus
    message: Optional[str] = None
    severity_level: int = Field(ge=1, le=10)  # 1-10 scale
    time_remaining_hours: Optional[float] = None
    task_completion_estimate_hours: Optional[float] = None
    recommendations: List[str] = []


class AnalysisResponse(BaseModel):
    therapeutic_response: TherapeuticResponse
    analysis_summary: str
    time_analysis: Dict[str, Any] = {}
    next_check_in_seconds: int = 60
    timestamp: datetime = Field(default_factory=datetime.now) 