console.log("🧠 HypeFilter.ai: Background Service Worker Active.");

// Listen for scanning signals from the extension popup dashboard
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analyze_content") {
    console.log("🔌 Relaying text payload to local Node.js microservice...");

    // Send the extraction data directly to your local Express endpoint
    fetch("http://localhost:3000/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: request.text,
        platform: request.platform
      })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Server returned HTTP error status: ${response.status}`);
      }
      return response.json();
    })
    .then(analysisData => {
      console.log("🎯 Analysis payload fetched cleanly from Gemini backend:", analysisData);

      // Query the active tab to inject highlights dynamically
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0] || !tabs[0].id) {
          sendResponse({ status: "error", error: "No active display tab found." });
          return;
        }

        // Send the JSON result down to content.js to perform DOM parsing and coloring
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "apply_analysis",
          data: analysisData
        }, (response) => {
          sendResponse({ status: "success", data: analysisData });
        });
      });
    })
    .catch(error => {
      console.error("❌ Communication pipeline broken:", error);
      sendResponse({ status: "error", error: error.message });
    });

    return true; // Keeps async link open while waiting for local server response loop
  }
});