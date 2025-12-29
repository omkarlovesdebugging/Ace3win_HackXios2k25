async function getCurrentTabURL() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0].url);
    });
  });
}

function updateConfidenceBar(confidence, risk) {
  const bar = document.getElementById("confidenceBar");
  const percentage = Math.round(confidence * 100);
  
  bar.style.width = `${percentage}%`;
  
  if (risk === "HIGH") {
    bar.style.background = "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)";
  } else {
    bar.style.background = "linear-gradient(90deg, #10b981 0%, #059669 100%)";
  }
}

function showDetails(result) {
  const detailsDiv = document.getElementById("details");
  
  if (result.details && result.details.length > 0) {
    detailsDiv.innerHTML = `
      <strong>Analysis Details:</strong><br>
      ${result.details.map(detail => `• ${detail}`).join('<br>')}
    `;
    detailsDiv.style.display = "block";
  } else {
    detailsDiv.style.display = "none";
  }
}

async function scanURL() {
  const statusBox = document.getElementById("statusBox");
  const scanBtn = document.getElementById("scanBtn");
  
  statusBox.className = "status loading pulse";
  statusBox.innerText = "🔍 Analyzing current website...";
  scanBtn.disabled = true;
  
  updateConfidenceBar(0, "LOW");

  const url = await getCurrentTabURL();
  console.log("Scanning URL:", url);

  try {
    // Try to make the request with a longer timeout for trusted domains
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("API Response:", result);
    
    // Check if there's an error in the response
    if (result.error) {
      throw new Error(result.error);
    }
    
    const confidence = result.confidence || 0;
    const percentage = Math.round(confidence * 100);

    updateConfidenceBar(confidence, result.risk);
    showDetails(result);

    if (result.risk === "HIGH") {
      statusBox.className = "status danger";
      statusBox.innerHTML = `
        🚨 <strong>Dangerous Website Detected</strong><br>
        Risk Level: HIGH<br>
        Confidence: ${percentage}%
      `;
    } else if (result.risk === "LOW") {
      statusBox.className = "status safe";
      statusBox.innerHTML = `
        ✅ <strong>Website Appears Safe</strong><br>
        Risk Level: LOW<br>
        Confidence: ${100 - percentage}% safe
      `;
    } else {
      statusBox.className = "status loading";
      statusBox.innerHTML = `
        ⚠️ <strong>Analysis Incomplete</strong><br>
        ${result.error || "Unable to determine risk"}
      `;
    }

  } catch (err) {
    console.error("Scan error:", err);
    
    // Check if it's a network error (backend offline)
    if (err.name === 'AbortError') {
      statusBox.className = "status danger";
      statusBox.innerHTML = `
        ⏱️ <strong>Request Timeout</strong><br>
        Backend is taking too long to respond<br>
        <small>Try refreshing the extension</small>
      `;
    } else if (err.message.includes('fetch')) {
      statusBox.className = "status danger";
      statusBox.innerHTML = `
        ❌ <strong>Scanner Offline</strong><br>
        Please ensure LinkShield backend is running<br>
        <small>Error: ${err.message}</small>
      `;
    } else {
      statusBox.className = "status danger";
      statusBox.innerHTML = `
        ⚠️ <strong>Analysis Failed</strong><br>
        ${err.message}<br>
        <small>Check console for details</small>
      `;
    }
    
    updateConfidenceBar(0, "HIGH");
  } finally {
    scanBtn.disabled = false;
  }
}

document.getElementById("scanBtn").addEventListener("click", scanURL);

// Auto scan on popup open
scanURL();
