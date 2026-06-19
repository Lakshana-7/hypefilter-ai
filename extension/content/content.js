console.log("🛡️ HyperFilter.ai: Content Script successfully injected.");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "TRIGGER_SCAN") {
    alert("HyperFilter.ai: Scan action captured! Check your developer tools console.");
    
    // Preliminary log to verify page communication pipeline
    console.log("=== HyperFilter.ai Raw Text Hook ===");
    console.log(document.body.innerText.substring(0, 500) + "\n...[Stage 1 Connection Active]");
    console.log("====================================");
  }
});