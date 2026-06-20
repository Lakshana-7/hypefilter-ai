document.addEventListener("DOMContentLoaded", () => {
  const scanButton = document.getElementById("scan-btn");
  const platformSelect = document.getElementById("platform-select");
  const statusDisplay = document.getElementById("status-display");
  const statusText = document.getElementById("status-text");
  const resultsCard = document.getElementById("results-card");
  const scoreValue = document.getElementById("score-value");
  const summaryText = document.getElementById("summary-text");
  const roastText = document.getElementById("roast-text");
  
  const heatmapToggle = document.getElementById("heatmap-toggle");
  const roastToggle = document.getElementById("roast-toggle");
  const viewHistoryBtn = document.getElementById("view-history-btn");
  
  const summaryContainer = document.getElementById("summary-container");
  const roastContainer = document.getElementById("roast-container");

  const countJargon = document.getElementById("count-jargon");
  const countFallacy = document.getElementById("count-fallacy");
  const countBias = document.getElementById("count-bias");
  const countManipulation = document.getElementById("count-manipulation");
  const countClaim = document.getElementById("count-claim");

  const shorterValue = document.getElementById("shorter-value");
  const shorterBar = document.getElementById("shorter-bar");

  let currentAnalysis = null;
  let activeTabUrl = null;

  // 1. Initial configuration on popup load
  initializePopup();

  async function initializePopup() {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab || !activeTab.url) return;
      activeTabUrl = activeTab.url;

      // Load user toggle preferences from storage
      chrome.storage.local.get(["heatmapPref", "roastPref", "history"], (result) => {
        if (result.heatmapPref !== undefined) {
          heatmapToggle.checked = result.heatmapPref;
        }
        if (result.roastPref !== undefined) {
          roastToggle.checked = result.roastPref;
          toggleRoastDisplay(result.roastPref);
        }

        // Check if we have scanned this page already in the past
        if (result.history) {
          const cachedScan = result.history.find(item => item.url === activeTabUrl);
          if (cachedScan) {
            currentAnalysis = cachedScan;
            renderResults(cachedScan);
            // Ensure heatmap mode state is synced with content script
            syncHeatmapState(heatmapToggle.checked);
          }
        }
      });
    } catch (err) {
      console.error("Initialization error:", err);
    }
  }

  // 2. Scan Button Handler
  scanButton.addEventListener("click", async () => {
    statusDisplay.classList.remove("hidden");
    resultsCard.classList.add("hidden");
    statusText.innerText = "Extracting webpage DOM...";
    scanButton.disabled = true;

    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab || !activeTab.id) {
        throw new Error("Unable to locate active target browser window tab.");
      }

      activeTabUrl = activeTab.url;

      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => document.body.innerText
      }, (results) => {
        if (!results || !results[0] || !results[0].result) {
          showError("Failed parsing visible document structure elements.");
          return;
        }

        let rawText = results[0].result;
        if (rawText.length > 15000) {
          rawText = rawText.substring(0, 15000) + "... [Truncated for analysis limit]";
        }

        const chosenPlatform = platformSelect.value;
        statusText.innerText = "Querying Gemini processing node...";

        chrome.runtime.sendMessage({
          action: "analyze_content",
          text: rawText,
          platform: chosenPlatform
        }, (response) => {
          scanButton.disabled = false;
          statusDisplay.classList.add("hidden");

          if (response && response.status === "success" && response.data) {
            saveAndRenderScan(activeTab, response.data, chosenPlatform);
          } else {
            showError(response ? response.error : "Connection loop timed out.");
          }
        });
      });

    } catch (err) {
      showError(err.message);
      scanButton.disabled = false;
      statusDisplay.classList.add("hidden");
    }
  });

  // 3. Toggle Listeners
  heatmapToggle.addEventListener("change", (e) => {
    const enabled = e.target.checked;
    chrome.storage.local.set({ heatmapPref: enabled });
    syncHeatmapState(enabled);
  });

  roastToggle.addEventListener("change", (e) => {
    const enabled = e.target.checked;
    chrome.storage.local.set({ roastPref: enabled });
    toggleRoastDisplay(enabled);
  });

  // 4. View History Button
  viewHistoryBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/dashboard.html") });
  });

  // Helper: Synchronize heatmap state with content.js
  async function syncHeatmapState(enabled) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: "toggle_heatmap", enabled });
    }
  }

  // Helper: Toggle summary / roast visibility
  function toggleRoastDisplay(showRoast) {
    if (showRoast) {
      roastContainer.classList.remove("hidden");
      summaryContainer.classList.add("hidden");
    } else {
      roastContainer.classList.add("hidden");
      summaryContainer.classList.remove("hidden");
    }
  }

  // Helper: Save to local storage and display
  function saveAndRenderScan(tab, data, chosenPlatform) {
    const offendingPhrases = data.offending_phrases || [];
    
    // Count categories
    const counts = { jargon: 0, fallacy: 0, bias: 0, manipulation: 0, claim: 0 };
    offendingPhrases.forEach(item => {
      const type = (item.type || "").toLowerCase();
      if (type.includes("buzzword") || type.includes("jargon")) counts.jargon++;
      else if (type.includes("fallacy")) counts.fallacy++;
      else if (type.includes("bias")) counts.bias++;
      else if (type.includes("manipulation") || type.includes("urgency")) counts.manipulation++;
      else if (type.includes("claim") || type.includes("fact")) counts.claim++;
      else counts.jargon++; // Fallback
    });

    const hostname = tab.url ? new URL(tab.url).hostname : "local-page";

    const scanRecord = {
      url: tab.url,
      title: tab.title || hostname,
      hostname: hostname,
      timestamp: Date.now(),
      verdict_score: data.verdict_score !== undefined ? data.verdict_score : 100,
      could_have_been_shorter_score: data.could_have_been_shorter_score !== undefined ? data.could_have_been_shorter_score : 0,
      summary: data.summary || "No assessment returned.",
      roast: data.roast || "No specific roast compiled.",
      platform: data.platform_detected || chosenPlatform,
      breakdown: counts,
      offending_phrases: offendingPhrases
    };

    currentAnalysis = scanRecord;

    // Save to storage
    chrome.storage.local.get("history", (result) => {
      let history = result.history || [];
      // Remove any prior scan of the same URL to prevent duplicates
      history = history.filter(item => item.url !== scanRecord.url);
      history.unshift(scanRecord); // Add to top
      // Cap at 100 scans
      if (history.length > 100) history.pop();
      
      chrome.storage.local.set({ history }, () => {
        renderResults(scanRecord);
        // Sync heatmap mode if enabled
        if (heatmapToggle.checked) {
          syncHeatmapState(true);
        }
      });
    });
  }

  // Helper: Render scan record in popup
  function renderResults(scan) {
    resultsCard.classList.remove("hidden");
    
    const score = scan.verdict_score;
    scoreValue.innerText = `${score}%`;

    // Apply color class depending on substance score
    scoreValue.className = "score";
    if (score >= 80) {
      scoreValue.classList.add("high-substance");
    } else if (score >= 50) {
      scoreValue.classList.add("med-substance");
    } else {
      scoreValue.classList.add("low-substance");
    }

    // Render fluff meter
    const fluffScore = scan.could_have_been_shorter_score !== undefined ? scan.could_have_been_shorter_score : 0;
    shorterValue.innerText = `${fluffScore}%`;
    shorterBar.style.width = `${fluffScore}%`;

    // Style fluff score color
    shorterValue.className = "shorter-score";
    if (fluffScore >= 60) {
      shorterValue.style.color = "var(--color-danger)"; // High fluff
    } else if (fluffScore >= 30) {
      shorterValue.style.color = "var(--color-warning)"; // Med fluff
    } else {
      shorterValue.style.color = "var(--color-success)"; // Low fluff (concise)
    }

    summaryText.innerText = scan.summary;
    roastText.innerText = scan.roast;

    // Update breakdown numbers
    const b = scan.breakdown || { jargon: 0, fallacy: 0, bias: 0, manipulation: 0, claim: 0 };
    countJargon.innerText = b.jargon;
    countFallacy.innerText = b.fallacy;
    countBias.innerText = b.bias;
    countManipulation.innerText = b.manipulation;
    countClaim.innerText = b.claim;

    // Add visual indicator to counts > 0
    updateCountHighlight(countJargon, b.jargon);
    updateCountHighlight(countFallacy, b.fallacy);
    updateCountHighlight(countBias, b.bias);
    updateCountHighlight(countManipulation, b.manipulation);
    updateCountHighlight(countClaim, b.claim);

    toggleRoastDisplay(roastToggle.checked);
  }

  function updateCountHighlight(element, count) {
    if (count > 0) {
      element.classList.add("active-high");
    } else {
      element.classList.remove("active-high");
    }
  }

  function showError(msg) {
    statusDisplay.classList.remove("hidden");
    statusText.innerText = `❌ Error: ${msg}`;
    scanButton.disabled = false;
  }
});