async function getCurrentTabURL() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      resolve(tabs[0].url);
    });
  });
}

async function scanURL() {
  const statusBox = document.getElementById("statusBox");
  statusBox.className = "status loading";
  statusBox.innerText = "Scanning current site...";

  const url = await getCurrentTabURL();

  try {
    const response = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url })
    });

    const result = await response.json();

    if (result.risk === "high") {
      statusBox.className = "status danger";
      statusBox.innerText = "⚠️ High Risk Website Detected!";
    } else {
      statusBox.className = "status safe";
      statusBox.innerText = "✅ This site looks safe.";
    }

  } catch (err) {
    statusBox.className = "status danger";
    statusBox.innerText = "❌ Unable to scan website.";
  }
}

document.getElementById("scanBtn").addEventListener("click", scanURL);

// Auto-scan on popup open
scanURL();
