/**
 * Security Status Popup Interface
 * Displays current URL security status and scan history
 */

class SecurityStatusUI {
  constructor() {
    this.elements = {};
    this.isInitialized = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    
    this.initialize();
  }

  initialize() {
    // Multiple initialization strategies
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupElements());
    } else {
      this.setupElements();
    }
    
    // Backup initialization
    setTimeout(() => this.setupElements(), 100);
  }

  setupElements() {
    if (this.isInitialized) return;
    
    try {
      // Get elements
      this.elements = {
        result: document.getElementById("result"),
        loading: document.getElementById("loading"),
        history: document.getElementById("history")
      };

      // Check if all required elements exist
      const missingElements = [];
      if (!this.elements.result) missingElements.push('result');
      if (!this.elements.loading) missingElements.push('loading');
      if (!this.elements.history) missingElements.push('history');

      if (missingElements.length > 0) {
        console.warn("Missing elements:", missingElements);
        
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          setTimeout(() => this.setupElements(), 200 * this.retryCount);
          return;
        }
        
        this.createFallbackUI();
        return;
      }

      this.isInitialized = true;
      this.startApplication();
      
    } catch (error) {
      console.error("Error setting up elements:", error);
      this.createFallbackUI();
    }
  }

  createFallbackUI() {
    console.log("Creating fallback UI");
    
    document.body.innerHTML = `
      <div style="padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
        <h3 style="margin: 0 0 16px 0;">🛡️ LinkShield</h3>
        <div id="fallback-loading" style="display: none; text-align: center; padding: 20px; color: #6c757d;">
          🔄 Loading...
        </div>
        <div id="fallback-result" style="margin-bottom: 16px;"></div>
        <h4 style="margin: 16px 0 8px 0; font-size: 14px;">Recent Scans</h4>
        <div id="fallback-history"></div>
      </div>
    `;
    
    this.elements = {
      result: document.getElementById("fallback-result"),
      loading: document.getElementById("fallback-loading"),
      history: document.getElementById("fallback-history")
    };
    
    this.isInitialized = true;
    this.startApplication();
  }

  startApplication() {
    console.log("Starting application");
    
    this.showLoadingState();
    this.loadCurrentStatus();
    this.loadScanHistory();
    
    // Start periodic updates after initial load
    setTimeout(() => {
      if (this.isInitialized) {
        this.startPeriodicUpdates();
      }
    }, 2000);
  }

  showLoadingState() {
    if (this.elements.loading) {
      this.elements.loading.style.display = "block";
    }
    if (this.elements.result) {
      this.elements.result.innerHTML = "";
    }
  }

  hideLoadingState() {
    if (this.elements.loading) {
      this.elements.loading.style.display = "none";
    }
  }

  loadCurrentStatus() {
    console.log("Loading current status");
    
    // Check if Chrome extension APIs are available
    if (!chrome || !chrome.runtime) {
      this.displayError("Chrome extension API not available");
      return;
    }
    
    try {
      chrome.runtime.sendMessage({ action: "getCurrentStatus" }, (response) => {
        console.log("Status response:", response);
        this.hideLoadingState();
        
        if (chrome.runtime.lastError) {
          console.error("Runtime error:", chrome.runtime.lastError);
          this.displayError(`Communication error: ${chrome.runtime.lastError.message}`);
          return;
        }

        if (!response) {
          this.displayError("No response from background script");
          return;
        }
        
        if (response.error) {
          this.displayError(response.error);
          return;
        }

        this.displaySecurityStatus(response);
      });
    } catch (error) {
      console.error("Error sending message:", error);
      this.hideLoadingState();
      this.displayError(`Script error: ${error.message}`);
    }
  }

  displayError(errorMessage) {
    if (!this.elements.result) return;
    
    this.elements.result.innerHTML = `
      <div style="padding: 12px; border-radius: 6px; background: #f8d7da; color: #721c24; border-left: 4px solid #dc3545;">
        <div style="font-weight: 600; margin-bottom: 4px;">❌ Analysis Failed</div>
        <div style="font-size: 14px;">${errorMessage}</div>
      </div>
    `;
  }

  displaySecurityStatus(statusData) {
    if (!this.elements.result || !statusData) return;

    const isSecure = !statusData.isPhishing;
    const bgColor = isSecure ? "#d4edda" : "#f8d7da";
    const textColor = isSecure ? "#155724" : "#721c24";
    const borderColor = isSecure ? "#28a745" : "#dc3545";
    const statusIcon = isSecure ? "✅" : "❌";
    const statusTitle = isSecure ? "Secure Site" : "Security Threat";
    const statusLabel = isSecure ? "Safe to browse" : "Phishing detected";

    this.elements.result.innerHTML = `
      <div style="padding: 16px; border-radius: 8px; background: ${bgColor}; color: ${textColor}; border-left: 4px solid ${borderColor};">
        <div style="display: flex; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 24px; margin-right: 12px;">${statusIcon}</span>
          <div>
            <div style="font-weight: 600; font-size: 16px;">${statusTitle}</div>
            <div style="font-size: 14px; opacity: 0.8;">${statusLabel}</div>
          </div>
        </div>
        <div style="font-size: 12px; word-break: break-all; opacity: 0.7;">
          ${statusData.url || 'Unknown URL'}
        </div>
      </div>
    `;
  }

  loadScanHistory() {
    console.log("Loading scan history");
    
    if (!chrome || !chrome.runtime) return;
    
    try {
      chrome.runtime.sendMessage({ action: "getHistory" }, (historyData) => {
        console.log("History response:", historyData);
        
        if (chrome.runtime.lastError) {
          console.error("History runtime error:", chrome.runtime.lastError);
          return;
        }

        this.displayScanHistory(historyData || []);
      });
    } catch (error) {
      console.error("Error loading history:", error);
    }
  }

  displayScanHistory(historyItems) {
    if (!this.elements.history) return;

    if (!historyItems || historyItems.length === 0) {
      this.elements.history.innerHTML = `
        <div style="text-align: center; color: #6c757d; font-style: italic; padding: 20px;">
          No scan history available
        </div>
      `;
      return;
    }

    try {
      this.elements.history.innerHTML = historyItems
        .slice(0, 5) // Show only last 5 items
        .map(item => this.createHistoryItem(item))
        .join('');
    } catch (error) {
      console.error("Error displaying history:", error);
      this.elements.history.innerHTML = `
        <div style="color: #dc3545; padding: 10px;">
          Error loading history
        </div>
      `;
    }
  }

  createHistoryItem(scanItem) {
    if (!scanItem) return '';

    const isSecure = !scanItem.isPhishing;
    const borderColor = isSecure ? '#28a745' : '#dc3545';
    const bgColor = isSecure ? '#f8fff9' : '#fff8f8';
    const statusIcon = isSecure ? '✅' : '❌';
    const statusText = isSecure ? 'Secure' : 'Threat';
    const url = scanItem.url || 'Unknown URL';
    const timestamp = scanItem.timestamp || 'Unknown time';
    
    return `
      <div style="padding: 12px; margin-bottom: 8px; border-radius: 6px; background: ${bgColor}; border-left: 3px solid ${borderColor};">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; font-weight: 500;">
            <span style="margin-right: 6px;">${statusIcon}</span>
            <span>${statusText}</span>
          </div>
          <a href="https://safebrowsing.google.com/safebrowsing/report_phish/?url=${encodeURIComponent(url)}" 
             target="_blank" 
             style="font-size: 12px; color: #007bff; text-decoration: none;">Report</a>
        </div>
        <div style="font-size: 12px; color: #495057; word-break: break-all; margin-bottom: 4px;">
          ${url}
        </div>
        <div style="font-size: 11px; color: #6c757d;">
          ${timestamp}
        </div>
      </div>
    `;
  }

  startPeriodicUpdates() {
    console.log("Starting periodic updates");
    
    setInterval(() => {
      if (this.isInitialized) {
        this.loadScanHistory();
      }
    }, 10000); // Update every 10 seconds instead of 5
  }
}

// Initialize with comprehensive error handling
let securityUI;

function initializePopup() {
  try {
    console.log("Initializing popup");
    securityUI = new SecurityStatusUI();
  } catch (error) {
    console.error("Failed to initialize popup:", error);
    
    // Ultimate fallback
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h3 style="color: #dc3545;">🛡️ LinkShield</h3>
        <p>Error initializing interface</p>
        <button onclick="location.reload()" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Retry
        </button>
      </div>
    `;
  }
}

// Multiple initialization attempts
console.log("Popup script loaded, document state:", document.readyState);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  initializePopup();
}

// Additional backup initialization
setTimeout(() => {
  if (!securityUI) {
    console.log("Backup initialization triggered");
    initializePopup();
  }
}, 500);