#!/usr/bin/env python3
"""
Test client for the Virtual Assistant Attention Monitor API v2.0
Tests the simplified schema with time pressure analysis
"""

import httpx
import asyncio
import json
from datetime import datetime, timezone, timedelta


async def test_simplified_api():
    """Test the new simplified API endpoints"""
    base_url = "http://localhost:8000"
    
    async with httpx.AsyncClient() as client:
        # Test health check
        print("Testing health check...")
        response = await client.get(f"{base_url}/health")
        print(f"Health check: {response.status_code} - {response.json()}")
        
        # Test configuration
        print("\nTesting configuration...")
        response = await client.get(f"{base_url}/config")
        print(f"Config: {response.status_code} - {response.json()}")
        
        # Test Case 1: High time pressure with distracting content
        print("\n🔴 TEST 1: High time pressure + distracting content")
        current_time = datetime.now(timezone.utc)
        # Simulate it's 4 PM with lots of work remaining
        late_afternoon = current_time.replace(hour=16, minute=0, second=0)
        
        test_request_1 = {
            "dom": "YouTube - Funny Cat Videos Compilation 2024 - Watch more videos, subscribe, like, comment. Trending videos, entertainment content",
            "current_time": late_afternoon.isoformat(),
            "current_tasks": {
                "task1": {
                    "title": "Complete quarterly report",
                    "description": "Finish Q4 analysis", 
                    "estimated_duration_minutes": 180,  # 3 hours
                    "priority": "urgent"
                },
                "task2": {
                    "title": "Prepare presentation slides",
                    "estimated_duration_minutes": 120,  # 2 hours
                    "priority": "high"
                },
                "task3": {
                    "title": "Review team feedback",
                    "estimated_duration_minutes": 60,   # 1 hour
                    "priority": "medium"
                }
            }
        }
        
        response = await client.post(f"{base_url}/analyze", json=test_request_1)
        await print_analysis_result("High Pressure + Distraction", response)
        
        # Test Case 2: Low time pressure with productive content
        print("\n🟢 TEST 2: Low time pressure + productive content")
        early_morning = current_time.replace(hour=9, minute=30, second=0)
        
        test_request_2 = {
            "dom": "Google Docs - Quarterly Report Draft - Edit document, share with team, track changes, collaborate in real-time",
            "current_time": early_morning.isoformat(),
            "current_tasks": {
                "task1": {
                    "title": "Review emails",
                    "estimated_duration_minutes": 30,
                    "priority": "low"
                },
                "task2": {
                    "title": "Update project status",
                    "estimated_duration_minutes": 45,
                    "priority": "medium"
                }
            }
        }
        
        response = await client.post(f"{base_url}/analyze", json=test_request_2)
        await print_analysis_result("Low Pressure + Productive", response)
        
        # Test Case 3: Medium time pressure with neutral content
        print("\n🟡 TEST 3: Medium time pressure + neutral content")
        midday = current_time.replace(hour=12, minute=0, second=0)
        
        test_request_3 = {
            "dom": "Company Intranet - Employee Portal - Dashboard, announcements, company news, resources",
            "current_time": midday.isoformat(),
            "current_tasks": {
                "task1": {
                    "title": "Client meeting preparation",
                    "estimated_duration_minutes": 90,
                    "priority": "high"
                },
                "task2": {
                    "title": "Code review",
                    "estimated_duration_minutes": 75,
                    "priority": "medium"
                },
                "task3": {
                    "title": "Documentation update",
                    "estimated_duration_minutes": 60,
                    "priority": "low"
                }
            }
        }
        
        response = await client.post(f"{base_url}/analyze", json=test_request_3)
        await print_analysis_result("Medium Pressure + Neutral", response)
        
        # Test quick time check
        print("\n⚡ Testing quick time check...")
        response = await client.post(
            f"{base_url}/quick-time-check",
            params={
                "current_time": late_afternoon.isoformat(),
                "task_count": 5
            }
        )
        print(f"Quick check: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"  Time pressure: {result['time_pressure']}")
            print(f"  Action needed: {result['action_needed']}")
            print(f"  Message: {result['message']}")
            print(f"  Severity: {result['severity']}/10")


async def print_analysis_result(test_name: str, response):
    """Helper function to print analysis results"""
    print(f"  Status: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        therapeutic = result['therapeutic_response']
        time_analysis = result.get('time_analysis', {})
        
        print(f"  Action needed: {therapeutic['action_needed']}")
        print(f"  Attention status: {therapeutic['attention_status']}")
        print(f"  Severity: {therapeutic['severity_level']}/10")
        
        if therapeutic.get('time_remaining_hours'):
            print(f"  Time remaining: {therapeutic['time_remaining_hours']:.1f} hours")
        if therapeutic.get('task_completion_estimate_hours'):
            print(f"  Work needed: {therapeutic['task_completion_estimate_hours']:.1f} hours")
        
        if therapeutic.get('message'):
            print(f"  💬 Message: {therapeutic['message']}")
        
        if therapeutic.get('recommendations'):
            print(f"  📋 Recommendations:")
            for rec in therapeutic['recommendations']:
                print(f"    • {rec}")
        
        print(f"  📊 Time Analysis: {time_analysis}")
        print(f"  📝 Summary: {result['analysis_summary']}")
    else:
        print(f"  ❌ Error: {response.text}")


if __name__ == "__main__":
    print("🧪 Starting API tests for simplified schema...")
    print("Make sure the backend is running on localhost:8000")
    print("=" * 60)
    asyncio.run(test_simplified_api())
    print("=" * 60)
    print("✅ Tests completed!") 