// DOM Extraction Utility for Plasmo Extension
// Encapsulates the DOM extraction functionality from the scripts folder

export interface DOMData {
  html: string
  url: string
  title: string
  timestamp: string
  tabId?: number
}

export interface DOMExtractionOptions {
  removeScripts?: boolean
  removeStyles?: boolean
  includeMetadata?: boolean
  maxLength?: number
}

/**
 * Extracts DOM content from the current tab
 * @param options - Configuration options for DOM extraction
 * @returns Promise<DOMData> - Extracted DOM data
 */
export async function extractDOMFromCurrentTab(options: DOMExtractionOptions = {}): Promise<DOMData> {
  const {
    removeScripts = true,
    removeStyles = true,
    includeMetadata = true,
    maxLength = 100000 // 100KB limit to prevent memory issues
  } = options

  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    
    if (!tab.id || !tab.url || !tab.url.startsWith('http')) {
      throw new Error('No valid HTTP tab found')
    }

    // Execute content script to extract DOM
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractDOMFromPage,
      args: [removeScripts, removeStyles, includeMetadata, maxLength]
    })

    if (!results || results.length === 0) {
      throw new Error('Failed to execute DOM extraction script')
    }

    const result = results[0]
    if (result.result && typeof result.result === 'object') {
      return {
        ...result.result,
        tabId: tab.id
      } as DOMData
    } else {
      throw new Error('Invalid DOM extraction result')
    }

  } catch (error) {
    console.error('DOM extraction failed:', error)
    throw error
  }
}

/**
 * Extracts DOM content from a specific tab
 * @param tabId - The tab ID to extract DOM from
 * @param options - Configuration options for DOM extraction
 * @returns Promise<DOMData> - Extracted DOM data
 */
export async function extractDOMFromTab(tabId: number, options: DOMExtractionOptions = {}): Promise<DOMData> {
  const {
    removeScripts = true,
    removeStyles = true,
    includeMetadata = true,
    maxLength = 100000
  } = options

  try {
    // Get tab info
    const tab = await chrome.tabs.get(tabId)
    
    if (!tab.url || !tab.url.startsWith('http')) {
      throw new Error('Invalid tab URL')
    }

    // Execute content script to extract DOM
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractDOMFromPage,
      args: [removeScripts, removeStyles, includeMetadata, maxLength]
    })

    if (!results || results.length === 0) {
      throw new Error('Failed to execute DOM extraction script')
    }

    const result = results[0]
    if (result.result && typeof result.result === 'object') {
      return {
        ...result.result,
        tabId
      } as DOMData
    } else {
      throw new Error('Invalid DOM extraction result')
    }

  } catch (error) {
    console.error('DOM extraction failed:', error)
    throw error
  }
}

/**
 * Extracts DOM content from all open tabs
 * @param options - Configuration options for DOM extraction
 * @returns Promise<DOMData[]> - Array of extracted DOM data
 */
export async function extractDOMFromAllTabs(options: DOMExtractionOptions = {}): Promise<DOMData[]> {
  try {
    // Get all tabs
    const tabs = await chrome.tabs.query({ url: 'http*://*' })
    const results: DOMData[] = []

    for (const tab of tabs) {
      if (tab.id && tab.url) {
        try {
          const domData = await extractDOMFromTab(tab.id, options)
          results.push(domData)
        } catch (error) {
          console.warn(`Failed to extract DOM from tab ${tab.id}:`, error)
        }
      }
    }

    return results

  } catch (error) {
    console.error('Bulk DOM extraction failed:', error)
    throw error
  }
}

/**
 * Monitors tab activity and automatically extracts DOM when tabs change
 * @param callback - Function called when DOM is extracted
 * @param options - Configuration options for DOM extraction
 * @returns Function - Cleanup function to stop monitoring
 */
export function monitorTabActivity(
  callback: (domData: DOMData) => void,
  options: DOMExtractionOptions = {}
): () => void {
  const listeners: Array<() => void> = []

  // Monitor tab activation
  const onActivated = async (activeInfo: chrome.tabs.TabActiveInfo) => {
    try {
      const domData = await extractDOMFromTab(activeInfo.tabId, options)
      callback(domData)
    } catch (error) {
      console.warn('Failed to extract DOM on tab activation:', error)
    }
  }

  // Monitor tab updates
  const onUpdated = async (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.startsWith('http')) {
      try {
        const domData = await extractDOMFromTab(tabId, options)
        callback(domData)
      } catch (error) {
        console.warn('Failed to extract DOM on tab update:', error)
      }
    }
  }

  // Add listeners
  chrome.tabs.onActivated.addListener(onActivated)
  chrome.tabs.onUpdated.addListener(onUpdated)

  // Store cleanup functions
  listeners.push(() => chrome.tabs.onActivated.removeListener(onActivated))
  listeners.push(() => chrome.tabs.onUpdated.removeListener(onUpdated))

  // Return cleanup function
  return () => {
    listeners.forEach(cleanup => cleanup())
  }
}

// Content script function that runs in the page context
function extractDOMFromPage(
  removeScripts: boolean,
  removeStyles: boolean,
  includeMetadata: boolean,
  maxLength: number
): DOMData {
  try {
    // Clone the document
    const clonedDoc = document.documentElement.cloneNode(true) as HTMLElement

    // Remove unwanted elements
    if (removeScripts) {
      clonedDoc.querySelectorAll('script').forEach(el => el.remove())
    }
    if (removeStyles) {
      clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => el.remove())
    }

    // Get clean HTML
    let cleanHTML = clonedDoc.outerHTML

    // Truncate if too long
    if (maxLength && cleanHTML.length > maxLength) {
      cleanHTML = cleanHTML.substring(0, maxLength) + '... [truncated]'
    }

    // Create result object
    const result: DOMData = {
      html: cleanHTML,
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString()
    }

    // Add metadata if requested
    if (includeMetadata) {
      // You can add more metadata here like:
      // - Meta tags
      // - Page structure analysis
      // - Content type detection
    }

    return result

  } catch (error) {
    console.error('DOM extraction failed in page context:', error)
    throw error
  }
}

// Utility function to analyze DOM content
export function analyzeDOMContent(domData: DOMData) {
  const { html, title } = domData
  
  // Basic content analysis
  const analysis = {
    wordCount: html.replace(/<[^>]*>/g, '').split(/\s+/).length,
    titleLength: title.length,
    hasImages: html.includes('<img'),
    hasForms: html.includes('<form'),
    hasLinks: html.includes('<a'),
    hasVideos: html.includes('<video') || html.includes('<iframe'),
    estimatedReadingTime: Math.ceil(html.replace(/<[^>]*>/g, '').split(/\s+/).length / 200) // 200 words per minute
  }

  return analysis
}

// Export types for use in other files
export type { DOMData, DOMExtractionOptions } 