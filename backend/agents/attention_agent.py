from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain.tools import Tool
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.memory import ConversationBufferWindowMemory
from typing import Dict, Any
import json
from datetime import datetime, timedelta
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import SimplifiedAnalysisRequest, TherapeuticResponse, AttentionStatus
from config import settings


class AttentionAnalysisAgent:
    def __init__(self):
        self.llm = ChatOpenAI(
            model=settings.MODEL_NAME,
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
            temperature=settings.TEMPERATURE,
            max_tokens=settings.MAX_TOKENS,
        )
        
        self.memory = ConversationBufferWindowMemory(
            k=5,
            memory_key="chat_history",
            return_messages=True
        )
        
        self.tools = self._create_tools()
        self.agent_executor = self._create_agent()
    
    def _create_tools(self) -> list:
        """Create tools for the attention analysis agent"""
        
        def analyze_dom_content(dom_data: str) -> str:
            """Analyze DOM content to determine if user is on a productive or distracting site"""
            try:
                # Keywords that suggest productivity
                productive_keywords = [
                    'work', 'project', 'task', 'document', 'spreadsheet', 'email',
                    'code', 'development', 'meeting', 'calendar', 'dashboard',
                    'analytics', 'report', 'presentation', 'confluence', 'jira',
                    'slack', 'teams', 'notion', 'github', 'gitlab', 'figma'
                ]
                
                # Keywords that suggest distraction
                distraction_keywords = [
                    'social', 'video', 'game', 'entertainment', 'news', 'shopping',
                    'meme', 'chat', 'stream', 'youtube', 'facebook', 'twitter',
                    'instagram', 'tiktok', 'reddit', 'netflix', 'hulu', 'twitch',
                    'amazon', 'ebay', 'sports', 'celebrity', 'gossip'
                ]
                
                dom_lower = dom_data.lower()
                
                productive_score = sum(1 for keyword in productive_keywords if keyword in dom_lower)
                distraction_score = sum(1 for keyword in distraction_keywords if keyword in dom_lower)
                
                if productive_score > distraction_score:
                    return "productive"
                elif distraction_score > productive_score:
                    return "distracting"
                else:
                    return "neutral"
                    
            except Exception as e:
                return f"error_analyzing_content: {str(e)}"
        
        def calculate_time_pressure(time_data: str) -> str:
            """Calculate time pressure based on current time and daily tasks"""
            try:
                data = json.loads(time_data)
                current_time_str = data.get('current_time')
                current_tasks = data.get('current_tasks', {})
                
                # Parse current time
                current_time = datetime.fromisoformat(current_time_str.replace('Z', '+00:00'))
                
                # Calculate hours remaining in the day (assuming work day ends at 6 PM)
                end_of_day = current_time.replace(hour=18, minute=0, second=0, microsecond=0)
                if current_time.hour >= 18:
                    # If it's after 6 PM, consider next day
                    end_of_day = end_of_day + timedelta(days=1)
                
                hours_remaining = (end_of_day - current_time).total_seconds() / 3600
                
                # Calculate total task time needed
                total_task_hours = 0
                task_count = 0
                urgent_tasks = 0
                
                if isinstance(current_tasks, dict):
                    for task_id, task_info in current_tasks.items():
                        if isinstance(task_info, dict):
                            duration_minutes = task_info.get('estimated_duration_minutes', 0)
                            total_task_hours += duration_minutes / 60
                            task_count += 1
                            
                            priority = task_info.get('priority', 'low')
                            if priority in ['high', 'urgent']:
                                urgent_tasks += 1
                elif isinstance(current_tasks, list):
                    for task in current_tasks:
                        if isinstance(task, dict):
                            duration_minutes = task.get('estimated_duration_minutes', 0)
                            total_task_hours += duration_minutes / 60
                            task_count += 1
                            
                            priority = task.get('priority', 'low')
                            if priority in ['high', 'urgent']:
                                urgent_tasks += 1
                
                # Calculate pressure ratio
                if hours_remaining > 0:
                    pressure_ratio = total_task_hours / hours_remaining
                else:
                    pressure_ratio = float('inf')
                
                result = {
                    "hours_remaining": round(hours_remaining, 2),
                    "total_task_hours": round(total_task_hours, 2),
                    "pressure_ratio": round(pressure_ratio, 2),
                    "task_count": task_count,
                    "urgent_tasks": urgent_tasks,
                    "time_pressure_level": "high" if pressure_ratio > 1.2 else "medium" if pressure_ratio > 0.8 else "low"
                }
                
                return json.dumps(result)
                
            except Exception as e:
                return f"error_calculating_time_pressure: {str(e)}"
        
        def generate_therapeutic_message(context: str) -> str:
            """Generate a therapeutic message based on the situation"""
            therapeutic_prompt = f"""
            Based on the following context about a user's attention and work situation, 
            generate a gentle, therapeutic message that helps them manage their time and attention effectively.
            
            Context: {context}
            
            Guidelines:
            - Be empathetic and understanding
            - Use positive, encouraging language
            - Offer specific, actionable time management suggestions
            - Keep it concise (1-2 sentences)
            - Avoid being preachy or condescending
            - If there's time pressure, acknowledge it but provide calming guidance
            - Focus on prioritization and realistic planning
            """
            
            response = self.llm.invoke(therapeutic_prompt)
            return response.content
        
        return [
            Tool(
                name="analyze_dom_content",
                description="Analyze DOM content to determine if the current page is productive or distracting",
                func=analyze_dom_content
            ),
            Tool(
                name="calculate_time_pressure", 
                description="Calculate time pressure based on current time and remaining daily tasks",
                func=calculate_time_pressure
            ),
            Tool(
                name="generate_therapeutic_message",
                description="Generate a therapeutic message for the user based on their situation",
                func=generate_therapeutic_message
            )
        ]
    
    def _create_agent(self) -> AgentExecutor:
        """Create the LangChain agent executor"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a compassionate digital wellness assistant that helps users manage their time and attention effectively.
            
            Your role is to analyze user attention patterns and time pressure, providing therapeutic guidance when needed.
            
            Analysis Guidelines:
            1. Use DOM analysis to understand current activity (productive vs distracting)
            2. Calculate time pressure based on remaining hours in day vs task requirements
            3. Determine if intervention is needed based on:
               - High time pressure (more tasks than time available)
               - Distraction during high-pressure periods
               - Unrealistic task scheduling
            
            Response Guidelines:
            1. Prioritize time management concerns over general distractions
            2. Be realistic about what can be accomplished
            3. Provide specific, actionable time management strategies
            4. Be therapeutic and encouraging, never judgmental
            5. Help users prioritize effectively when overwhelmed
            
            Available tools: {tools}
            Use them to analyze the situation thoroughly before making recommendations."""),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad")
        ])
        
        agent = create_openai_tools_agent(self.llm, self.tools, prompt)
        return AgentExecutor(agent=agent, tools=self.tools, memory=self.memory, verbose=True)
    
    async def analyze_attention(self, request: SimplifiedAnalysisRequest) -> TherapeuticResponse:
        """Main method to analyze user attention and time pressure"""
        
        try:
            # Analyze DOM content
            dom_analysis = self.tools[0].func(request.dom)
            
            # Calculate time pressure
            time_data = {
                "current_time": request.current_time,
                "current_tasks": request.current_tasks
            }
            time_pressure_result = self.tools[1].func(json.dumps(time_data))
            
            # Parse time pressure data
            try:
                time_pressure_data = json.loads(time_pressure_result)
            except:
                time_pressure_data = {"time_pressure_level": "low", "pressure_ratio": 0}
            
            # Default response
            therapeutic_response = TherapeuticResponse(
                action_needed=False,
                attention_status=AttentionStatus.FOCUSED,
                severity_level=1,
                recommendations=[],
                time_remaining_hours=time_pressure_data.get("hours_remaining"),
                task_completion_estimate_hours=time_pressure_data.get("total_task_hours")
            )
            
            # Determine attention status and need for intervention
            pressure_level = time_pressure_data.get("time_pressure_level", "low")
            pressure_ratio = time_pressure_data.get("pressure_ratio", 0)
            
            # High time pressure scenarios
            if pressure_level == "high" or pressure_ratio > 1.2:
                therapeutic_response.action_needed = True
                therapeutic_response.attention_status = AttentionStatus.TIME_PRESSURE
                therapeutic_response.severity_level = min(10, int(pressure_ratio * 5))
                
                if dom_analysis == "distracting":
                    context_for_message = f"User is on a distracting site but has {time_pressure_data.get('hours_remaining', 0)} hours remaining with {time_pressure_data.get('total_task_hours', 0)} hours of work. Pressure ratio: {pressure_ratio}"
                    therapeutic_response.severity_level = min(10, therapeutic_response.severity_level + 2)
                else:
                    context_for_message = f"User has time pressure with {time_pressure_data.get('hours_remaining', 0)} hours remaining and {time_pressure_data.get('total_task_hours', 0)} hours of work needed"
                
                therapeutic_response.message = self.tools[2].func(context_for_message)
                therapeutic_response.recommendations = [
                    "Review and prioritize your most important tasks",
                    "Consider breaking large tasks into smaller, manageable chunks",
                    "Focus on high-priority items first",
                    "Be realistic about what can be accomplished today"
                ]
                
            # Medium time pressure with distraction
            elif pressure_level == "medium" and dom_analysis == "distracting":
                therapeutic_response.action_needed = True
                therapeutic_response.attention_status = AttentionStatus.BRIEFLY_DISTRACTED
                therapeutic_response.severity_level = 4
                
                context_for_message = f"User is taking a break but has moderate time pressure with {time_pressure_data.get('task_count', 0)} tasks remaining"
                therapeutic_response.message = self.tools[2].func(context_for_message)
                therapeutic_response.recommendations = [
                    "Consider returning to your priority tasks",
                    "Take breaks mindfully to maintain energy"
                ]
                
            # Low pressure or productive activity
            else:
                if dom_analysis == "productive":
                    therapeutic_response.attention_status = AttentionStatus.FOCUSED
                elif dom_analysis == "distracting" and pressure_level == "low":
                    therapeutic_response.attention_status = AttentionStatus.BRIEFLY_DISTRACTED
                    therapeutic_response.recommendations = ["Enjoy your break time mindfully"]
            
            return therapeutic_response
            
        except Exception as e:
            # Fallback response
            return TherapeuticResponse(
                action_needed=False,
                attention_status=AttentionStatus.FOCUSED,
                severity_level=1,
                message=f"Unable to analyze attention pattern: {str(e)}",
                recommendations=[]
            ) 