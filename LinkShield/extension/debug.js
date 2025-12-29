// Debug utilities for LinkShield extension
// Add this to popup.html for debugging: <script src="debug.js"></script>

function debugExtension() {
  console.log("🛡️ LinkShield Debug Information");
  console.log("================================");
  
  // Check current tab info
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    console.log("Current Tab:", {
      url: currentTab.url,
      title: currentTab.title,
      secure: currentTab.url.startsWith('https://'),
      domain: new URL(currentTab.url).hostname
    });
  });
  
  // Test backend connectivity
  testBackendConnection();
}

async function testBackendConnection() {
  console.log("🔍 Testing backend connection...");
  
  try {
    const response = await fetch("http://127.0.0.1:8000/health", {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log("✅ Backend is online:", result);
    } else {
      console.log("❌ Backend returned error:", response.status, response.statusText);
    }
  } catch (err) {
    console.log("❌ Backend connection failed:", err.message);
    console.log("   This might be due to CORS or mixed content policies");
  }
}

// Auto-run debug when script loads
if (typeof window !== 'undefined') {
  window.debugLinkShield = debugExtension;
  console.log("🛡️ LinkShield debug mode loaded. Run debugLinkShield() in console.");
}