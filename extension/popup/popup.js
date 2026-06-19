document.getElementById('scan-btn').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab || !tab.id) return;

  chrome.tabs.sendMessage(tab.id, { action: "TRIGGER_SCAN" }, (response) => {
    if (chrome.runtime.lastError) {
      alert("Please refresh the current webpage and try scanning again!");
    }
  });
});