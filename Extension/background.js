/**
 * URL Security Monitor - Background Script
 * Monitors web navigation and analyzes URLs for phishing threats
 */

// Configuration constants
const CONFIG = {
  MAX_SCAN_HISTORY: 10,
  DEBOUNCE_DELAY: 500,
  CLEANUP_INTERVAL: 30 * 60 * 1000, // 30 minutes
  API_ENDPOINT: "https://linkshield-backend-edrp.onrender.com/predict_url"
};

// Tab state management
const navigationTracker = new Map();

// Utility functions
const extractHostname = (url) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

const createDebouncer = (callback, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), delay);
  };
};

// Storage management
const HistoryManager = {
  async save(scanResult) {
    return new Promise((resolve) => {
      chrome.storage.local.get(["scanHistory"], (data) => {
        const history = data.scanHistory || [];
        history.unshift({
          url: scanResult.url,
          isPhishing: scanResult.isPhishing,
          timestamp: new Date().toLocaleString(),
          reported: false
        });
        
        if (history.length > CONFIG.MAX_SCAN_HISTORY) {
          history.pop();
        }
        
        chrome.storage.local.set({ scanHistory: history }, resolve);
      });
    });
  },

  async getRecent() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["scanHistory"], (data) => {
        resolve(data.scanHistory || []);
      });
    });
  }
};

// UI notification system
const NotificationUI = {
  createSecurityAlert(hostname) {
    return {
      id: 'security-alert',
      html: `
        <div id="security-alert" class="security-notification alert">
          <div class="notification-header">
            <div class="alert-icon">⚠️</div>
            <h3>SECURITY ALERT</h3>
            <button class="close-btn" data-action="close">×</button>
          </div>
          <p>Potential phishing site detected: ${hostname}</p>
          <div class="action-buttons">
            <button class="btn-primary" data-action="close-tab">Close Tab</button>
            <button class="btn-secondary" data-action="report">Report Site</button>
          </div>
        </div>
        <style>
          .security-notification {
            position: fixed; top: 20px; right: 20px; z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 400px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 20px; color: white;
          }
          .alert { background: #dc3545; }
          .safe { background: #28a745; }
          .info { background: #007bff; }
          .notification-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
          .alert-icon { font-size: 24px; margin-right: 10px; }
          .close-btn { background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0 5px; }
          .action-buttons { display: flex; gap: 10px; margin-top: 15px; }
          .btn-primary, .btn-secondary { background: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 500; }
          .btn-primary { color: #dc3545; }
          .btn-secondary { color: #6c757d; }
          .btn-primary:hover { background: #f8f9fa; }
          .btn-secondary:hover { background: #f8f9fa; }
        </style>
      `
    };
  },

  createSafeIndicator() {
    return {
      id: 'safe-indicator',
      html: `
        <div id="safe-indicator" class="security-notification safe auto-fade">
          <div class="notification-header">
            <div class="alert-icon">✓</div>
            <span>Secure Site</span>
            <button class="close-btn" data-action="close">×</button>
          </div>
        </div>
        <style>
          .security-notification {
            position: fixed; top: 20px; right: 20px; z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 400px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 20px; color: white;
          }
          .safe { background: #28a745; }
          .notification-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
          .alert-icon { font-size: 24px; margin-right: 10px; }
          .close-btn { background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0 5px; }
          .close-btn:hover { background: rgba(255,255,255,0.2); border-radius: 4px; }
          .auto-fade { animation: autoFade 5s forwards; }
          @keyframes autoFade { 0%, 80% { opacity: 1; } 100% { opacity: 0; } }
        </style>
      `
    };
  },

  createSameSiteIndicator() {
    return {
      id: 'same-site-indicator',
      html: `
        <div id="same-site-indicator" class="security-notification info auto-fade">
          <div class="notification-header">
            <div class="alert-icon">🔄</div>
            <span>Same Website</span>
            <button class="close-btn" data-action="close">×</button>
          </div>
        </div>
        <style>
          .security-notification {
            position: fixed; top: 20px; right: 20px; z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 400px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 20px; color: white;
          }
          .info { background: #007bff; }
          .notification-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
          .alert-icon { font-size: 24px; margin-right: 10px; }
          .close-btn { background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 0 5px; }
          .close-btn:hover { background: rgba(255,255,255,0.2); border-radius: 4px; }
          .auto-fade { animation: autoFade 5s forwards; }
          @keyframes autoFade { 0%, 80% { opacity: 1; } 100% { opacity: 0; } }
        </style>
      `
    };
  },

  async inject(tabId, notificationConfig) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (config) => {
          // Remove existing notifications
          ['security-alert', 'safe-indicator', 'same-site-indicator'].forEach(id => {
            const existing = document.getElementById(id);
            if (existing) existing.remove();
          });

          // Create new notification
          const container = document.createElement('div');
          container.innerHTML = config.html;
          document.body.appendChild(container);

          // Attach event handlers with proper context
          const closeButtons = container.querySelectorAll('[data-action="close"]');
          closeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
              console.log('Close button clicked');
              e.preventDefault();
              container.remove();
            });
          });

          const closeTabButtons = container.querySelectorAll('[data-action="close-tab"]');
          closeTabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
              console.log('Close tab button clicked');
              e.preventDefault();
              e.stopPropagation();
              
              // Send message to background script to close the tab
              if (typeof chrome !== 'undefined' && chrome.runtime) {
                chrome.runtime.sendMessage({ action: 'closeCurrentTab' }, (response) => {
                  console.log('Close tab response:', response);
                });
              } else {
                // Fallback methods if chrome API not available
                try {
                  window.close();
                  
                  setTimeout(() => {
                    if (!window.closed) {
                      console.log('window.close() failed, trying history.back()');
                      window.history.back();
                    }
                  }, 100);
                  
                } catch (error) {
                  console.error('Error closing tab:', error);
                  container.remove();
                }
              }
            });
          });

          const reportButtons = container.querySelectorAll('[data-action="report"]');
          reportButtons.forEach(button => {
            button.addEventListener('click', (e) => {
              console.log('Report button clicked');
              e.preventDefault();
              const reportUrl = `https://safebrowsing.google.com/safebrowsing/report_phish/?url=${encodeURIComponent(window.location.href)}`;
              window.open(reportUrl, '_blank');
            });
          });

          // Auto-remove after 5 seconds if it has auto-fade class
          if (container.querySelector('.auto-fade')) {
            setTimeout(() => {
              if (container.parentNode) {
                container.remove();
              }
            }, 5000);
          }
        },
        args: [notificationConfig]
      });
    } catch (error) {
      console.error('Failed to inject notification:', error);
    }
  }
};

// Trusted domains configuration
const TrustedDomains = {
  list: [
    'google.com', 'microsoft.com', 'github.com', 'stackoverflow.com',
    'linkedin.com', 'facebook.com', 'twitter.com', 'youtube.com',
    'amazon.com', 'netflix.com', 'spotify.com', 'reddit.com',
    'wikipedia.org', 'medium.com', 'dropbox.com', 'slack.com',
    'discord.com', 'zoom.us', 'mozilla.org', 'apple.com',
    'adobe.com', 'cloudflare.com'
  ],

  isTrusted(hostname) {
    return this.list.some(domain => hostname.includes(domain));
  }
};

// Main security analysis engine
const SecurityAnalyzer = {
  async analyzeURL(url, tabId, isPageReload = false) {
    try {
      console.log("Starting analysis for URL:", url);
      const hostname = extractHostname(url);
      console.log("Extracted hostname:", hostname);
      
      // Check for same-domain navigation
      const recentHistory = await HistoryManager.getRecent();
      if (recentHistory.length > 0) {
        const lastScannedDomain = extractHostname(recentHistory[0].url);
        if (lastScannedDomain === hostname) {
          console.log("Same domain detected, using cached result");
          if (isPageReload) {
            const notification = recentHistory[0].isPhishing 
              ? NotificationUI.createSecurityAlert(hostname)
              : NotificationUI.createSafeIndicator();
            await NotificationUI.inject(tabId, notification);
          }
          
          navigationTracker.set(tabId, { hostname, lastUrl: url });
          return recentHistory[0];
        }
      }

      // Skip analysis for trusted domains
      if (TrustedDomains.isTrusted(hostname)) {
        console.log("Trusted domain detected:", hostname);
        const result = {
          url,
          isPhishing: false,
          timestamp: new Date().toLocaleString()
        };
        
        await HistoryManager.save(result);
        await NotificationUI.inject(tabId, NotificationUI.createSafeIndicator());
        return result;
      }

      console.log("Performing ML analysis for:", url);
      
      // Skip analysis for chrome:// and extension URLs
      if (url.startsWith('chrome://') || 
          url.startsWith('chrome-extension://') || 
          url.startsWith('moz-extension://') ||
          url.startsWith('devtools://') ||
          url.startsWith('about:') ||
          url === 'about:blank') {
        console.log("Skipping internal browser URL:", url);
        const result = {
          url,
          isPhishing: false,
          timestamp: new Date().toLocaleString(),
          message: "Internal browser page - no analysis needed"
        };
        return result;
      }

      // Validate URL scheme - only analyze http/https URLs
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        console.log("Skipping non-HTTP URL:", url);
        const result = {
          url,
          isPhishing: false,
          timestamp: new Date().toLocaleString(),
          message: "Non-HTTP URL - no analysis needed"
        };
        return result;
      }
      
      // Perform ML-based analysis
      const analysisResult = await SecurityAnalyzer.performMLAnalysis(url);
      const result = {
        url,
        isPhishing: analysisResult.prediction === 0,
        timestamp: new Date().toLocaleString()
      };

      console.log("Analysis complete. Result:", result);

      // Update navigation state
      navigationTracker.set(tabId, { hostname, lastUrl: url });
      
      // Save and display result
      await HistoryManager.save(result);
      const notification = result.isPhishing 
        ? NotificationUI.createSecurityAlert(hostname)
        : NotificationUI.createSafeIndicator();
      await NotificationUI.inject(tabId, notification);

      return result;
    } catch (error) {
      console.error("Security analysis failed:", error);
      return { error: error.message };
    }
  },

  async performMLAnalysis(url) {
    try {
      console.log("Performing ML analysis for URL:", url);
      console.log("Using local API endpoint:", CONFIG.API_ENDPOINT);
      
      const response = await fetch(CONFIG.API_ENDPOINT, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ url })
      });

      console.log("API response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        throw new Error(`Local server error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("API analysis result:", result);
      return result;
      
    } catch (error) {
      console.error("ML Analysis error:", error);
      
      // Check if it's a connection error to local server
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error("Cannot connect to local backend server. Please ensure the server is running on http://127.0.0.1:8000");
      }
      
      // Re-throw the original error
      throw error;
    }
  }
};

// Event handlers
const debouncedAnalysis = createDebouncer(SecurityAnalyzer.analyzeURL, CONFIG.DEBOUNCE_DELAY);

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) {
    // Skip internal browser URLs
    if (details.url.startsWith('chrome://') || 
        details.url.startsWith('chrome-extension://') ||
        details.url.startsWith('devtools://') ||
        details.url.startsWith('about:') ||
        (!details.url.startsWith('http://') && !details.url.startsWith('https://'))) {
      console.log("Skipping navigation to internal URL:", details.url);
      return;
    }
    
    const isReload = details.transitionType === 'reload';
    debouncedAnalysis(details.url, details.tabId, isReload);
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab.url && 
        (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
      debouncedAnalysis(tab.url, activeInfo.tabId, false);
    } else {
      console.log("Skipping tab activation for internal URL:", tab.url);
    }
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  navigationTracker.delete(tabId);
});

// Message handling for popup communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request);
  
  if (request.action === "getCurrentStatus") {
    console.log("Processing getCurrentStatus request");
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      try {
        if (!tabs || tabs.length === 0) {
          console.log("No active tabs found");
          sendResponse({ error: "No active tab found" });
          return;
        }
        
        const activeTab = tabs[0];
        console.log("Active tab:", activeTab.url);
        
        if (!activeTab.url || 
            activeTab.url.startsWith('chrome://') || 
            activeTab.url.startsWith('chrome-extension://') ||
            activeTab.url.startsWith('moz-extension://') ||
            activeTab.url.startsWith('devtools://') ||
            activeTab.url.startsWith('about:') ||
            activeTab.url === 'about:blank' ||
            (!activeTab.url.startsWith('http://') && !activeTab.url.startsWith('https://'))) {
          console.log("Skipping internal/invalid browser page:", activeTab.url);
          sendResponse({ 
            url: activeTab.url, 
            isPhishing: false, 
            timestamp: new Date().toLocaleString(),
            message: "Internal or non-HTTP page - no analysis needed"
          });
          return;
        }
        
        const result = await SecurityAnalyzer.analyzeURL(activeTab.url, activeTab.id, false);
        console.log("Analysis result:", result);
        sendResponse(result);
      } catch (error) {
        console.error("Error in getCurrentStatus:", error);
        sendResponse({ error: error.message });
      }
    });
    return true; // Keep message channel open for async response
  } 
  
  if (request.action === "getHistory") {
    console.log("Processing getHistory request");
    HistoryManager.getRecent().then(history => {
      console.log("Sending history:", history);
      sendResponse(history);
    }).catch(error => {
      console.error("Error getting history:", error);
      sendResponse([]);
    });
    return true; // Keep message channel open for async response
  }
  
  if (request.action === "closeCurrentTab") {
    console.log("Processing closeCurrentTab request");
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.remove(tabs[0].id, () => {
          console.log("Tab closed successfully");
          sendResponse({ success: true });
        });
      } else {
        console.log("No active tab found to close");
        sendResponse({ success: false, error: "No active tab found" });
      }
    });
    return true; // Keep message channel open for async response
  }
  
  console.log("Unknown action:", request.action);
});

// Periodic cleanup
setInterval(() => {
  navigationTracker.clear();
}, CONFIG.CLEANUP_INTERVAL);

// Check if local backend server is running on startup
async function checkBackendServer() {
  try {
    console.log("Checking if backend server is running...");
    const response = await fetch("https://linkshield-backend-edrp.onrender.com/", {
      method: "GET",
      headers: { "Accept": "application/json" }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("✅ Backend server is running:", data.message || "Server active");
    } else {
      console.warn("⚠️ Backend server responded with status:", response.status);
    }
  } catch (error) {
    console.error("❌ Backend server is not accessible:", error.message);
    console.error("Please check if the backend is deployed correctly at:");
    console.error("  https://linkshield-backend-edrp.onrender.com");
  }
}

// Check server status on extension startup
setTimeout(checkBackendServer, 2000);

console.log("URL Security Monitor initialized");

// Test that all components are working
setTimeout(() => {
  console.log("Background script components check:");
  console.log("- CONFIG:", CONFIG);
  console.log("- HistoryManager:", typeof HistoryManager);
  console.log("- SecurityAnalyzer:", typeof SecurityAnalyzer);
  console.log("- TrustedDomains:", TrustedDomains.list.length, "domains");
  
  // Add test function for notifications
  window.testPhishingAlert = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      const notification = NotificationUI.createSecurityAlert("test-site.com");
      await NotificationUI.inject(tabs[0].id, notification);
      console.log("Test phishing alert injected - try clicking the 'Close Tab' button");
    }
  };
  
  window.testCloseTab = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      chrome.tabs.remove(tabs[0].id);
      console.log("Tab closed via background script");
    }
  };
  
  console.log("Test functions available:");
  console.log("- testPhishingAlert() - Shows security alert with close tab button");
  console.log("- testCloseTab() - Directly closes current tab");
}, 1000);