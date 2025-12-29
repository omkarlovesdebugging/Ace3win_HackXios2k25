chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;

  try {
    const response = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: tab.url })
    });

    // Read response safely
    const text = await response.text();
    let result;

    try {
      result = JSON.parse(text);
    } catch (err) {
      console.error("Invalid JSON from backend:", text);
      return;
    }

    // Safety check
    if (!result || !result.risk) return;

    // 🔥 Show warning only if high risk
    if (result.risk === "HIGH") {
      chrome.tabs.sendMessage(tabId, {
        action: "SHOW_WARNING",
        risk: result.risk,
        confidence: result.confidence
      });
    }

  } catch (error) {
    console.error("Scan failed:", error);
  }
});
