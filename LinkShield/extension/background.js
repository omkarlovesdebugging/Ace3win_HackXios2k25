chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;

  try {
    const response = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: tab.url })
    });

    const result = await response.json();

    if (result.risk === "high") {
      chrome.tabs.sendMessage(tabId, {
        action: "SHOW_WARNING",
        risk: result.score
      });
    }

  } catch (error) {
    console.error("Scan failed:", error);
  }
});
