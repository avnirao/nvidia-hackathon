// DOM Extraction Utility for Plasmo Extension
// Encapsulates the DOM extraction functionality from the scripts folder

export interface DOMData {
  html: string
  url: string
  title: string
  timestamp: string
  tabId?: number
  plainText?: string // Added plain text content
}

export interface DOMExtractionOptions {
  removeScripts?: boolean
  removeStyles?: boolean
  includeMetadata?: boolean
  maxLength?: number
  extractPlainText?: boolean // New option to extract plain text
}

/**
 * Extracts DOM content from the current tab
 * @param options - Configuration options for DOM extraction
 * @returns Promise<DOMData> - Extracted DOM data
 */
export async function extractDOMFromCurrentTab(
  options: DOMExtractionOptions = {}
): Promise<DOMData> {
  const {
    removeScripts = true,
    removeStyles = true,
    includeMetadata = true,
    maxLength = 100000, // 100KB limit to prevent memory issues
    extractPlainText = true // Default to extracting plain text
  } = options

  try {
    // Check if we're in a content script context
    if (typeof document !== "undefined" && document.documentElement) {
      console.log("🔄 Extracting DOM from content script context...")
      // We're in a content script, extract directly
      return extractDOMFromPageContext(
        removeScripts,
        removeStyles,
        includeMetadata,
        maxLength,
        extractPlainText
      )
    }

    // We're in background script, need to inject into content script
    console.log("🔄 Extracting DOM from background script context...")

    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (!tab.id || !tab.url || !tab.url.startsWith("http")) {
      throw new Error("No valid HTTP tab found")
    }

    // Execute content script to extract DOM
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractDOMFromPageContext,
      args: [
        removeScripts,
        removeStyles,
        includeMetadata,
        maxLength,
        extractPlainText
      ]
    })

    if (!results || results.length === 0) {
      throw new Error("Failed to execute DOM extraction script")
    }

    const result = results[0]
    if (result.result && typeof result.result === "object") {
      return {
        ...result.result,
        tabId: tab.id
      } as DOMData
    } else {
      throw new Error("Invalid DOM extraction result")
    }
  } catch (error) {
    console.error("DOM extraction failed:", error)
    throw error
  }
}

/**
 * Extracts DOM content from a specific tab
 * @param tabId - The tab ID to extract DOM from
 * @param options - Configuration options for DOM extraction
 * @returns Promise<DOMData> - Extracted DOM data
 */
export async function extractDOMFromTab(
  tabId: number,
  options: DOMExtractionOptions = {}
): Promise<DOMData> {
  const {
    removeScripts = true,
    removeStyles = true,
    includeMetadata = true,
    maxLength = 100000,
    extractPlainText = true
  } = options

  try {
    // Get tab info
    const tab = await chrome.tabs.get(tabId)

    if (!tab.url || !tab.url.startsWith("http")) {
      throw new Error("Invalid tab URL")
    }

    // Execute content script to extract DOM
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractDOMFromPageContext,
      args: [
        removeScripts,
        removeStyles,
        includeMetadata,
        maxLength,
        extractPlainText
      ]
    })

    if (!results || results.length === 0) {
      throw new Error("Failed to execute DOM extraction script")
    }

    const result = results[0]
    if (result.result && typeof result.result === "object") {
      return {
        ...result.result,
        tabId
      } as DOMData
    } else {
      throw new Error("Invalid DOM extraction result")
    }
  } catch (error) {
    console.error("DOM extraction failed:", error)
    throw error
  }
}

/**
 * Extracts DOM content from all open tabs
 * @param options - Configuration options for DOM extraction
 * @returns Promise<DOMData[]> - Array of extracted DOM data
 */
export async function extractDOMFromAllTabs(
  options: DOMExtractionOptions = {}
): Promise<DOMData[]> {
  try {
    // Get all tabs
    const tabs = await chrome.tabs.query({ url: "http*://*" })
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
    console.error("Bulk DOM extraction failed:", error)
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
      console.warn("Failed to extract DOM on tab activation:", error)
    }
  }

  // Monitor tab updates
  const onUpdated = async (
    tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
    tab: chrome.tabs.Tab
  ) => {
    if (
      changeInfo.status === "complete" &&
      tab.url &&
      tab.url.startsWith("http")
    ) {
      try {
        const domData = await extractDOMFromTab(tabId, options)
        callback(domData)
      } catch (error) {
        console.warn("Failed to extract DOM on tab update:", error)
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
    listeners.forEach((cleanup) => cleanup())
  }
}

/**
 * Content script function that runs in the page context
 * This function is injected into the page and executed there
 */
function extractDOMFromPageContext(
  removeScripts: boolean,
  removeStyles: boolean,
  includeMetadata: boolean,
  maxLength: number,
  extractPlainText: boolean
): DOMData {
  try {
    console.log("Extracting DOM from page:", window.location.href)

    // Clone the document
    const clonedDoc = document.documentElement.cloneNode(true) as HTMLElement

    // Remove unwanted elements
    if (removeScripts) {
      clonedDoc.querySelectorAll("script").forEach((el) => el.remove())
    }
    if (removeStyles) {
      clonedDoc
        .querySelectorAll('style, link[rel="stylesheet"]')
        .forEach((el) => el.remove())
    }

    // Get clean HTML
    let cleanHTML = clonedDoc.outerHTML

    // Truncate if too long
    if (maxLength && cleanHTML.length > maxLength) {
      cleanHTML = cleanHTML.substring(0, maxLength) + "... [truncated]"
    }

    // Extract plain text if requested
    let plainText = ""
    if (extractPlainText) {
      plainText = extractMainPlainTextFromPage()
      console.log("Extracted plain text length:", plainText.length)
    }

    // Create result object
    const result: DOMData = {
      html: cleanHTML,
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
      plainText: plainText
    }

    console.log("DOM extraction completed:", {
      url: result.url,
      title: result.title,
      htmlLength: result.html.length,
      plainTextLength: result.plainText.length
    })

    return result
  } catch (error) {
    console.error("DOM extraction failed in page context:", error)
    throw error
  }
}

/**
 * Extracts main plain text content from the page
 * This function runs in the page context
 */
function extractMainPlainTextFromPage(): string {
  try {
    // Try to find main content areas
    const mainSelectors = [
      "main",
      '[role="main"]',
      ".main-content",
      ".content",
      "#content",
      "article",
      ".article",
      ".post-content",
      ".entry-content",
      ".story-body"
    ]

    let mainContent = ""

    for (const selector of mainSelectors) {
      const element = document.querySelector(selector) as HTMLElement
      if (element) {
        mainContent = getCleanTextContentFromPage(element)
        console.log(`Found content using selector: ${selector}`)
        break
      }
    }

    // If no main content found, extract from body
    if (!mainContent) {
      const bodyClone = document.body.cloneNode(true) as HTMLElement
      // Remove non-content elements
      bodyClone
        .querySelectorAll(
          "script, style, noscript, iframe, embed, object, nav, header, footer, .nav, .header, .footer, .sidebar, .menu"
        )
        .forEach((el) => {
          if (el.parentNode) {
            el.parentNode.removeChild(el)
          }
        })
      mainContent = getCleanTextContentFromPage(bodyClone)
      console.log("Extracted content from body")
    }

    return mainContent
  } catch (error) {
    console.error("Plain text extraction failed:", error)
    return document.body.textContent || document.body.innerText || ""
  }
}

/**
 * Gets clean text content from an element
 * This function runs in the page context
 */
function getCleanTextContentFromPage(element: HTMLElement): string {
  try {
    // Get text content and clean it up
    let text = element.textContent || element.innerText || ""

    // Remove extra whitespace and normalize
    text = text.replace(/\s+/g, " ").trim()

    // Remove common unwanted text patterns
    text = text.replace(/javascript:/gi, "")
    text = text.replace(/mailto:/gi, "")
    text = text.replace(/tel:/gi, "")
    text = text.replace(/^\s*[\r\n]/gm, "") // Remove empty lines
    text = text.replace(/\n\s*\n/g, "\n") // Remove multiple consecutive newlines

    return text
  } catch (error) {
    console.error("Text content extraction failed:", error)
    return ""
  }
}

// Utility function to analyze DOM content
export function analyzeDOMContent(domData: DOMData) {
  const { html, title, plainText } = domData

  // Basic content analysis
  const analysis = {
    wordCount: html.replace(/<[^>]*>/g, "").split(/\s+/).length,
    plainTextWordCount: plainText ? plainText.split(/\s+/).length : 0,
    titleLength: title.length,
    hasImages: html.includes("<img"),
    hasForms: html.includes("<form"),
    hasLinks: html.includes("<a"),
    hasVideos: html.includes("<video") || html.includes("<iframe"),
    estimatedReadingTime: Math.ceil(
      html.replace(/<[^>]*>/g, "").split(/\s+/).length / 200
    ) // 200 words per minute
  }

  return analysis
}

// Export types for use in other files
// Note: These types are already exported at the top of the file
