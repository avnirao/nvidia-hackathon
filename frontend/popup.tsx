import { useState, useEffect } from "react"
import "./style.css"
import { getClientStateSnapshot, type ClientStateSnapshot } from "./utils/clientStateSnapshot"

interface Task {
  id: string
  title: string
  completed: boolean
  current: boolean
  timeSpent: number
  estimatedTime: number // in minutes
  deliverables: Deliverable[]
}

interface Deliverable {
  id: string
  title: string
  completed: boolean
  estimatedTime: number // in minutes
  timeSpent: number
}

interface TabData {
  currentTab: string
  tabData: { [url: string]: number }
  timestamp: number
}

function IndexPopup() {
  const [currentView, setCurrentView] = useState<"tasks" | "chat">("tasks")

  // Task management state
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState("")
  const [newTaskEstimatedTime, setNewTaskEstimatedTime] = useState(30)

  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ id: string, text: string, timestamp: number, type: 'ai' | 'user' }>>([])
  const [newMessage, setNewMessage] = useState("")

  // Deliverable management
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [newDeliverable, setNewDeliverable] = useState("")
  const [newDeliverableTime, setNewDeliverableTime] = useState(15)

  // DOM extraction state
  const [isExtractingDOM, setIsExtractingDOM] = useState(false)
  const [lastDOMData, setLastDOMData] = useState<any>(null)

  // Client state snapshot state
  const [isGeneratingSnapshot, setIsGeneratingSnapshot] = useState(false)
  const [lastSnapshot, setLastSnapshot] = useState<ClientStateSnapshot | null>(null)

  // Completed task celebration state
  const [showCompletionCelebration, setShowCompletionCelebration] = useState(false)
  const [lastCompletedTask, setLastCompletedTask] = useState<Task | null>(null)

  // Load tasks on component mount
  useEffect(() => {
    loadTasks()

    // Listen for AI responses
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'AI_RESPONSE') {
        let chatMessage = message.response

        // Enhance message with analysis data if available
        if (message.analysisData) {
          const analysis = message.analysisData
          const status = analysis.therapeutic_response.attention_status.replace(/_/g, ' ')
          const severity = analysis.therapeutic_response.severity_level

          chatMessage += `\n\n📊 Analysis: ${status} (Severity: ${severity}/10)`

          if (analysis.therapeutic_response.recommendations && analysis.therapeutic_response.recommendations.length > 0) {
            chatMessage += `\n💡 Recommendations:\n${analysis.therapeutic_response.recommendations.map(rec => `• ${rec}`).join('\n')}`
          }
        }

        addChatMessage(chatMessage, 'ai')
      }
    })
  }, [])

  const loadTasks = () => {
    chrome.runtime.sendMessage({ type: 'GET_TASKS' }, (response) => {
      if (response && response.tasks) {
        setTasks(response.tasks)
      }
    })
  }

  const addChatMessage = (text: string, type: 'ai' | 'user') => {
    const newMessage = {
      id: Date.now().toString(),
      text,
      timestamp: Date.now(),
      type
    }
    setChatMessages(prev => [...prev, newMessage])
  }

  const handleTaskCompletion = (taskId: string, completed: boolean) => {
    updateTask(taskId, { completed })

    if (completed) {
      const completedTask = tasks.find(t => t.id === taskId)
      if (completedTask) {
        setLastCompletedTask(completedTask)
        setShowCompletionCelebration(true)

        // Add celebration message to chat
        const celebrationMessage = `🎉 Task completed: "${completedTask.title}"! Great job! 
        
        Time spent: ${formatTime(completedTask.timeSpent)}
        Estimated time: ${formatMinutes(completedTask.estimatedTime)}
        
        Ready to start your next task?`

        addChatMessage(celebrationMessage, 'ai')

        // Auto-hide celebration after 5 seconds
        setTimeout(() => {
          setShowCompletionCelebration(false)
          setLastCompletedTask(null)
        }, 5000)
      }
    }
  }

  const extractDOM = async () => {
    setIsExtractingDOM(true)
    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'EXTRACT_DOM',
          options: {
            removeScripts: true,
            removeStyles: true,
            includeMetadata: true,
            maxLength: 10000 // 10KB for testing
          }
        }, (response) => {
          if (response && response.success) {
            resolve(response)
          } else {
            reject(new Error(response?.error || 'DOM extraction failed'))
          }
        })
      })

      setLastDOMData(response)
      addChatMessage(`DOM extracted from: ${(response as any).domData.url} (${(response as any).domData.html.length} characters)`, 'ai')
    } catch (error) {
      addChatMessage(`DOM extraction failed: ${error.message}`, 'ai')
    } finally {
      setIsExtractingDOM(false)
    }
  }

  const testDOMExtraction = async () => {
    setIsExtractingDOM(true)
    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'TEST_DOM_EXTRACTION'
        }, (response) => {
          if (response && response.success) {
            resolve(response)
          } else {
            reject(new Error(response?.error || 'DOM extraction test failed'))
          }
        })
      })

      const result = (response as any).result
      setLastDOMData(result)

      // Add detailed test results to chat
      const testMessage = `🧪 DOM Extraction Test Results:
📄 URL: ${result.url}
📝 Title: ${result.title}
📊 HTML Length: ${result.htmlLength} characters
📄 Plain Text Length: ${result.plainTextLength} characters
📈 Word Count: ${result.wordCount} (HTML) / ${result.plainTextWordCount} (Plain Text)
⏱️ Reading Time: ~${result.estimatedReadingTime} minutes

📄 Plain Text Preview:
${result.plainTextPreview}

📊 Content Analysis:
• Images: ${result.analysis.hasImages ? 'Yes' : 'No'}
• Forms: ${result.analysis.hasForms ? 'Yes' : 'No'}
• Links: ${result.analysis.hasLinks ? 'Yes' : 'No'}
• Videos: ${result.analysis.hasVideos ? 'Yes' : 'No'}`

      addChatMessage(testMessage, 'ai')

      // Also log to console for detailed inspection
      console.log('🧪 Full DOM Test Result:', result)

    } catch (error) {
      addChatMessage(`❌ DOM extraction test failed: ${error.message}`, 'ai')
    } finally {
      setIsExtractingDOM(false)
    }
  }

  const generateClientStateSnapshot = async () => {
    setIsGeneratingSnapshot(true)
    try {
      const snapshot = await getClientStateSnapshot()
      setLastSnapshot(snapshot)

      // Add to chat for visibility
      const summary = `Client State Snapshot generated:
• ${snapshot.current_tasks.length} tasks
• DOM string length: ${snapshot.dom_string.length} characters
• Timestamp: ${new Date(snapshot.timestamp).toLocaleTimeString()}`

      addChatMessage(summary, 'ai')

      // Log the full JSON for debugging
      console.log('Client State Snapshot:', JSON.stringify(snapshot, null, 2))

    } catch (error) {
      addChatMessage(`Snapshot generation failed: ${error.message}`, 'ai')
    } finally {
      setIsGeneratingSnapshot(false)
    }
  }

  const testBackendAnalysis = async () => {
    try {
      addChatMessage("🔗 Testing backend analysis integration...", 'ai')

      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          type: 'TEST_BACKEND_ANALYSIS'
        }, (response) => {
          if (response && response.success) {
            resolve(response)
          } else {
            reject(new Error(response?.error || 'Backend analysis test failed'))
          }
        })
      })

      const result = response as any
      if (result.analysisResult) {
        const analysis = result.analysisResult
        addChatMessage(`✅ Backend analysis successful!

📊 Analysis Results:
• Status: ${analysis.therapeutic_response.attention_status.replace(/_/g, ' ')}
• Severity: ${analysis.therapeutic_response.severity_level}/10
• Action Needed: ${analysis.therapeutic_response.action_needed ? 'Yes' : 'No'}

💬 Message: ${analysis.therapeutic_response.message}

${analysis.therapeutic_response.recommendations && analysis.therapeutic_response.recommendations.length > 0 ?
            `💡 Recommendations:
${analysis.therapeutic_response.recommendations.map(rec => `• ${rec}`).join('\n')}` : ''}`, 'ai')
      } else {
        addChatMessage(`❌ Backend analysis failed: No response from server`, 'ai')
      }
    } catch (error) {
      addChatMessage(`❌ Backend analysis test failed: ${error.message}`, 'ai')
    }
  }

  const sendTestToBackend = async () => {
    try {
      addChatMessage("🧪 Sending test data to backend...", 'ai')

      // Create a test payload
      const testPayload = {
        dom: "YouTube - Funny Cat Videos Compilation 2024 - Watch more videos, subscribe, like, comment. Trending videos, entertainment content",
        current_time: new Date().toISOString(),
        current_tasks: {
          task1: {
            title: "Complete quarterly report",
            description: "Finish Q4 analysis",
            estimated_duration_minutes: 180,
            priority: "urgent"
          },
          task2: {
            title: "Prepare presentation slides",
            estimated_duration_minutes: 120,
            priority: "high"
          },
          task3: {
            title: "Review team feedback",
            estimated_duration_minutes: 60,
            priority: "medium"
          }
        }
      }

      // Send directly to backend
      const response = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const analysisResult = await response.json()

      addChatMessage(`✅ Direct backend test successful!

📊 Test Results:
• Status: ${analysisResult.therapeutic_response.attention_status.replace(/_/g, ' ')}
• Severity: ${analysisResult.therapeutic_response.severity_level}/10
• Action Needed: ${analysisResult.therapeutic_response.action_needed ? 'Yes' : 'No'}

💬 Message: ${analysisResult.therapeutic_response.message}

${analysisResult.therapeutic_response.recommendations && analysisResult.therapeutic_response.recommendations.length > 0 ?
          `💡 Recommendations:
${analysisResult.therapeutic_response.recommendations.map(rec => `• ${rec}`).join('\n')}` : ''}

🔗 Response Time: ${response.headers.get('x-response-time') || 'N/A'}`, 'ai')

    } catch (error) {
      addChatMessage(`❌ Direct backend test failed: ${error.message}`, 'ai')
      console.error('Backend test error:', error)
    }
  }

  const addTask = () => {
    if (newTask.trim()) {
      chrome.runtime.sendMessage({
        type: 'ADD_TASK',
        title: newTask.trim(),
        estimatedTime: newTaskEstimatedTime
      }, (response) => {
        if (response && response.success) {
          setTasks([...tasks, response.task])
          setNewTask("")
          setNewTaskEstimatedTime(30)

          // If this is the first task, suggest starting it
          if (tasks.length === 0) {
            addChatMessage("Great! You've added your first task. Click 'Start' to begin working on it!", 'ai')
          }
        }
      })
    }
  }

  const addDeliverable = (taskId: string) => {
    if (newDeliverable.trim()) {
      chrome.runtime.sendMessage({
        type: 'ADD_DELIVERABLE',
        taskId,
        title: newDeliverable.trim(),
        estimatedTime: newDeliverableTime
      }, (response) => {
        if (response && response.success) {
          setTasks(tasks.map(task =>
            task.id === taskId ? response.task : task
          ))
          setNewDeliverable("")
          setNewDeliverableTime(15)
        }
      })
    }
  }

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    chrome.runtime.sendMessage({
      type: 'UPDATE_TASK',
      taskId,
      updates
    }, (response) => {
      if (response && response.success) {
        setTasks(tasks.map(task =>
          task.id === taskId ? response.task : task
        ))
      }
    })
  }

  const updateDeliverable = (taskId: string, deliverableId: string, updates: Partial<Deliverable>) => {
    chrome.runtime.sendMessage({
      type: 'UPDATE_DELIVERABLE',
      taskId,
      deliverableId,
      updates
    }, (response) => {
      if (response && response.success) {
        setTasks(tasks.map(task =>
          task.id === taskId ? response.task : task
        ))
      }
    })
  }

  const deleteTask = (taskId: string) => {
    chrome.runtime.sendMessage({
      type: 'DELETE_TASK',
      taskId
    }, (response) => {
      if (response && response.success) {
        setTasks(tasks.filter(task => task.id !== taskId))
      }
    })
  }

  const deleteDeliverable = (taskId: string, deliverableId: string) => {
    chrome.runtime.sendMessage({
      type: 'DELETE_DELIVERABLE',
      taskId,
      deliverableId
    }, (response) => {
      if (response && response.success) {
        setTasks(tasks.map(task =>
          task.id === taskId ? response.task : task
        ))
      }
    })
  }

  const setCurrentTask = (taskId: string) => {
    // Set all tasks as not current, then set the selected one as current
    tasks.forEach(task => {
      updateTask(task.id, { current: task.id === taskId })
    })

    const selectedTask = tasks.find(t => t.id === taskId)
    if (selectedTask) {
      addChatMessage(`Started working on: "${selectedTask.title}". You've got this! 💪`, 'ai')
    }
  }

  const sendMessage = () => {
    if (newMessage.trim()) {
      addChatMessage(newMessage, 'user')
      setNewMessage("")
      // Here you could also send the message to the background script for AI processing
    }
  }

  const formatTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000)
    const seconds = Math.floor((milliseconds % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`
    } else {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
    }
  }

  const getProgressPercentage = (task: Task) => {
    if (task.estimatedTime === 0) return 0
    const progress = (task.timeSpent / (task.estimatedTime * 60000)) * 100
    return Math.min(progress, 100)
  }

  const getActiveTasks = () => tasks.filter(task => !task.completed)
  const getCompletedTasks = () => tasks.filter(task => task.completed)

  return (
    <div className="w-96 h-[600px] bg-gradient-to-br from-blue-50 to-indigo-100 p-6 font-sans">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-2">
            <span className="text-white text-sm font-bold">AI</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800">StudyBuddy AI</h1>
        </div>
        <p className="text-sm text-gray-600">Your personal time management assistant</p>
      </div>

      {/* Completion Celebration Overlay */}
      {showCompletionCelebration && lastCompletedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 text-center shadow-xl">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Task Completed!</h3>
            <p className="text-gray-600 mb-4">"{lastCompletedTask.title}"</p>
            <div className="text-sm text-gray-500 mb-4">
              <p>Time spent: {formatTime(lastCompletedTask.timeSpent)}</p>
              <p>Estimated: {formatMinutes(lastCompletedTask.estimatedTime)}</p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => setShowCompletionCelebration(false)}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600 transition-colors"
              >
                Awesome! Let's continue
              </button>
              <button
                onClick={() => {
                  setShowCompletionCelebration(false)
                  setCurrentView("tasks")
                }}
                className="w-full px-4 py-2 bg-green-500 text-white rounded-md font-medium hover:bg-green-600 transition-colors"
              >
                Start New Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex mb-6 bg-white rounded-lg p-1 shadow-sm">
        <button
          onClick={() => setCurrentView("tasks")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${currentView === "tasks"
            ? "bg-blue-500 text-white"
            : "text-gray-600 hover:text-gray-800"
            }`}
        >
          Tasks
        </button>
        <button
          onClick={() => setCurrentView("chat")}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${currentView === "chat"
            ? "bg-blue-500 text-white"
            : "text-gray-600 hover:text-gray-800"
            }`}
        >
          Chat
        </button>
      </div>

      {currentView === "tasks" ? (
        <div className="space-y-4">
          {/* Current Task */}
          {getActiveTasks().filter(task => task.current).length > 0 && (
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-semibold mb-2">Currently Working On:</h3>
              {getActiveTasks().filter(task => task.current).map(task => (
                <div key={task.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{task.title}</span>
                    <span className="text-xs opacity-75">
                      {formatTime(task.timeSpent)} / {formatMinutes(task.estimatedTime)}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
                    <div
                      className="bg-white h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getProgressPercentage(task)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs opacity-75">
                    {Math.round(getProgressPercentage(task))}% complete
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Task Section */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Add New Task</h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addTask()}
                  placeholder="e.g., Complete research paper"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={addTask}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600">Estimated time:</label>
                <input
                  type="number"
                  value={newTaskEstimatedTime}
                  onChange={(e) => setNewTaskEstimatedTime(parseInt(e.target.value) || 30)}
                  min="1"
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-xs text-gray-600">minutes</span>
              </div>
            </div>
          </div>

          {/* Test Buttons Section */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Test Functions</h3>
            <div className="space-y-2">
              <button
                onClick={extractDOM}
                disabled={isExtractingDOM}
                className="w-full px-4 py-2 bg-green-500 text-white rounded-md text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {isExtractingDOM ? "Extracting..." : "Extract DOM from Current Tab"}
              </button>
              <button
                onClick={generateClientStateSnapshot}
                disabled={isGeneratingSnapshot}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded-md text-sm font-medium hover:bg-purple-600 transition-colors disabled:opacity-50"
              >
                {isGeneratingSnapshot ? "Generating..." : "Generate Client State Snapshot"}
              </button>
            </div>

            {/* Last Results */}
            {(lastDOMData || lastSnapshot) && (
              <div className="mt-3 p-3 bg-gray-50 rounded text-xs">
                <p className="text-gray-600 font-medium">Last Results:</p>
                {lastDOMData && (
                  <div className="mt-1">
                    <p className="text-gray-800">DOM: {lastDOMData.domData.url}</p>
                    <p className="text-gray-600">{lastDOMData.domData.html.length} characters</p>
                  </div>
                )}
                {lastSnapshot && (
                  <div className="mt-1">
                    <p className="text-gray-800">Snapshot: {lastSnapshot.current_tasks.length} tasks</p>
                    <p className="text-gray-600">{lastSnapshot.dom_string.length} chars DOM</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Active Tasks List */}
          {getActiveTasks().length > 0 && (
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Active Tasks</h3>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {getActiveTasks().map(task => (
                  <div key={task.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={(e) => handleTaskCompletion(task.id, e.target.checked)}
                        className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <span className={`text-sm font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-700'}`}>
                          {task.title}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {formatTime(task.timeSpent)} / {formatMinutes(task.estimatedTime)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {Math.round(getProgressPercentage(task))}%
                          </span>
                        </div>
                      </div>
                      {!task.current && !task.completed && (
                        <button
                          onClick={() => setCurrentTask(task.id)}
                          className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                        >
                          Start
                        </button>
                      )}
                      <button
                        onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                        className="text-gray-500 hover:text-gray-700 text-xs"
                      >
                        {expandedTask === task.id ? '−' : '+'}
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        ×
                      </button>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-1 mb-2">
                      <div
                        className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${getProgressPercentage(task)}%` }}
                      ></div>
                    </div>

                    {/* Expanded deliverables section */}
                    {expandedTask === task.id && (
                      <div className="mt-3 space-y-3">
                        <div className="text-xs font-medium text-gray-600">Deliverables:</div>

                        {/* Add deliverable */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newDeliverable}
                            onChange={(e) => setNewDeliverable(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && addDeliverable(task.id)}
                            placeholder="Add deliverable..."
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <input
                            type="number"
                            value={newDeliverableTime}
                            onChange={(e) => setNewDeliverableTime(parseInt(e.target.value) || 15)}
                            min="1"
                            className="w-16 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => addDeliverable(task.id)}
                            className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                          >
                            Add
                          </button>
                        </div>

                        {/* Deliverables list */}
                        {task.deliverables.map(deliverable => (
                          <div key={deliverable.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <input
                              type="checkbox"
                              checked={deliverable.completed}
                              onChange={() => updateDeliverable(task.id, deliverable.id, { completed: !deliverable.completed })}
                              className="w-3 h-3 text-green-500 rounded focus:ring-green-500"
                            />
                            <span className={`text-xs flex-1 ${deliverable.completed ? 'line-through text-gray-500' : 'text-gray-600'}`}>
                              {deliverable.title}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatMinutes(deliverable.estimatedTime)}
                            </span>
                            <button
                              onClick={() => deleteDeliverable(task.id, deliverable.id)}
                              className="text-red-500 hover:text-red-700 text-xs"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Tasks Section */}
          {getCompletedTasks().length > 0 && (
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Completed Tasks</h3>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {getCompletedTasks().map(task => (
                  <div key={task.id} className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-sm text-gray-600 line-through">{task.title}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(task.timeSpent)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {tasks.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-500 text-2xl">📝</span>
              </div>
              <p className="text-gray-500 text-sm">Add your first task to get started!</p>
            </div>
          )}

          {/* Start New Task Prompt */}
          {getActiveTasks().length === 0 && getCompletedTasks().length > 0 && (
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">🎉</div>
              <h3 className="font-semibold mb-2">All tasks completed!</h3>
              <p className="text-sm opacity-90 mb-3">Great job! Ready to tackle your next challenge?</p>
              <button
                onClick={() => {
                  setNewTask("")
                  setNewTaskEstimatedTime(30)
                  // Focus on the new task input
                  setTimeout(() => {
                    const input = document.querySelector('input[placeholder*="Complete"]') as HTMLInputElement
                    input?.focus()
                  }, 100)
                }}
                className="px-4 py-2 bg-white text-green-600 rounded-md font-medium hover:bg-gray-100 transition-colors"
              >
                Add New Task
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg p-4 shadow-sm h-80 flex flex-col">
          <div className="flex-1 overflow-y-auto mb-4">
            <div className="space-y-3">
              {chatMessages.length === 0 ? (
                <div className="flex justify-start">
                  <div className="bg-blue-100 rounded-lg p-3 max-w-xs">
                    <p className="text-sm text-gray-700">
                      Hi! I'm your StudyBuddy AI. I'll notify you with helpful insights about your productivity and time management.
                      Keep working on your tasks and I'll provide feedback when needed!
                    </p>
                  </div>
                </div>
              ) : (
                chatMessages.map(message => (
                  <div key={message.id} className={`flex ${message.type === 'ai' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`rounded-lg p-3 max-w-xs ${message.type === 'ai'
                      ? 'bg-blue-100 text-gray-700'
                      : 'bg-blue-500 text-white'
                      }`}>
                      <p className="text-sm">{message.text}</p>
                      <p className="text-xs opacity-75 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask me anything about time management..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={sendMessage}
              className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 text-center space-y-2">
        <div className="flex gap-2 justify-center">
          <button
            onClick={testDOMExtraction}
            disabled={isExtractingDOM}
            className="px-3 py-1 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExtractingDOM ? 'Testing...' : '🧪 Test DOM'}
          </button>
          <button
            onClick={generateClientStateSnapshot}
            disabled={isGeneratingSnapshot}
            className="px-3 py-1 bg-purple-500 text-white rounded text-xs font-medium hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingSnapshot ? 'Generating...' : '📊 Snapshot'}
          </button>
          <button
            onClick={testBackendAnalysis}
            className="px-3 py-1 bg-orange-500 text-white rounded text-xs font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔗 Test Backend
          </button>
          <button
            onClick={sendTestToBackend}
            className="px-3 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🧪 Direct Test
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Powered by AI • Helping students succeed
        </p>
      </div>
    </div>
  )
}

export default IndexPopup
