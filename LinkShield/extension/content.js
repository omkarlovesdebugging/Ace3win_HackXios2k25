chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "SHOW_WARNING") {
    showOverlay(message.risk);
  }
});

function showOverlay(riskScore) {
  if (document.getElementById("velocishield-overlay")) return;

  // Create blur layer
  const blurLayer = document.createElement("div");
  blurLayer.id = "vs-blur-layer";

  // Create overlay container
  const overlay = document.createElement("div");
  overlay.id = "velocishield-overlay";

  overlay.innerHTML = `
    <div class="vs-box">
      <div class="pulse-ring"></div>

      <h1>⚠️ Suspicious Website</h1>
      <p>This page shows phishing-like behavior.</p>

      <div class="risk">
        Risk Level: <b>${riskScore}/3</b>
      </div>

      <div class="buttons">
        <button id="leave">⬅ Go Back</button>
        <button id="continue">Proceed Anyway</button>
      </div>
    </div>
  `;

  const style = document.createElement("style");
  style.innerHTML = `
    /* BLUR BACKGROUND */
    #vs-blur-layer {
      position: fixed;
      inset: 0;
      backdrop-filter: blur(8px);
      background: rgba(0, 0, 0, 0.55);
      z-index: 999998;
    }

    /* OVERLAY */
    #velocishield-overlay {
      position: fixed;
      inset: 0;
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: Arial, sans-serif;
    }

    .vs-box {
      background: #0f172a;
      border-radius: 18px;
      padding: 30px;
      width: 340px;
      text-align: center;
      color: white;
      box-shadow: 0 0 60px rgba(59, 130, 246, 0.6);
      animation: popIn 0.4s ease;
    }

    @keyframes popIn {
      from {
        transform: scale(0.85);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }

    .pulse-ring {
      position: absolute;
      top: -25px;
      left: 50%;
      transform: translateX(-50%);
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.35);
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0% { transform: translateX(-50%) scale(0.8); opacity: 1; }
      100% { transform: translateX(-50%) scale(1.4); opacity: 0; }
    }

    .buttons {
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }

    button {
      flex: 1;
      padding: 12px;
      border: none;
      border-radius: 8px;
      font-weight: bold;
      cursor: pointer;
    }

    #leave {
      background: #ef4444;
      color: white;
    }

    #continue {
      background: #22c55e;
      color: black;
    }
  `;

  document.body.appendChild(blurLayer);
  document.body.appendChild(style);
  document.body.appendChild(overlay);

  document.getElementById("leave").onclick = () => {
    window.location.href = "https://www.google.com";
  };

  document.getElementById("continue").onclick = () => {
    blurLayer.remove();
    overlay.remove();
  };
}