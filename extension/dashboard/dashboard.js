document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const exportBtn = document.getElementById("export-btn");
  const clearBtn = document.getElementById("clear-btn");
  
  const metricTotalScans = document.getElementById("metric-total-scans");
  const metricAvgScore = document.getElementById("metric-avg-score");
  const metricAvgLabel = document.getElementById("metric-avg-label");
  const metricTopDomain = document.getElementById("metric-top-domain");
  const metricDomainScans = document.getElementById("metric-domain-scans");
  const metricTotalIssues = document.getElementById("metric-total-issues");
  
  const trendCanvas = document.getElementById("trend-chart");
  const leaderboardList = document.getElementById("leaderboard-list");
  
  const searchInput = document.getElementById("search-input");
  const historyTbody = document.getElementById("history-tbody");
  
  const paginationControls = document.getElementById("pagination-controls");
  const prevPageBtn = document.getElementById("prev-page");
  const nextPageBtn = document.getElementById("next-page");
  const pageIndicator = document.getElementById("page-indicator");
  
  // Modal Elements
  const detailsModal = document.getElementById("details-modal");
  const closeModalBtn = document.getElementById("close-modal");
  const modalTitle = document.getElementById("modal-title");
  const modalMeta = document.getElementById("modal-meta");
  const modalDomain = document.getElementById("modal-domain");
  const modalDate = document.getElementById("modal-date");
  const modalScore = document.getElementById("modal-score");
  const modalScoreVerdict = document.getElementById("modal-score-verdict");
  const modalSummary = document.getElementById("modal-summary");
  const modalRoast = document.getElementById("modal-roast");
  const modalPhrasesList = document.getElementById("modal-phrases-list");

  // State
  let scansList = [];
  let filteredScans = [];
  let currentPage = 1;
  const scansPerPage = 8;

  // Initialize
  loadHistory();

  // Event Listeners
  searchInput.addEventListener("input", handleSearch);
  exportBtn.addEventListener("click", exportHistory);
  clearBtn.addEventListener("click", clearHistory);
  
  prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  });
  
  nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(filteredScans.length / scansPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
    }
  });

  closeModalBtn.addEventListener("click", hideModal);
  detailsModal.addEventListener("click", (e) => {
    if (e.target === detailsModal) hideModal();
  });

  // 1. Load History Data
  function loadHistory() {
    chrome.storage.local.get("history", (result) => {
      scansList = result.history || [];
      filteredScans = [...scansList];
      
      calculateMetrics();
      renderLeaderboard();
      drawTrendChart();
      renderTable();
    });
  }

  // 2. Calculate Dashboard Top-level Statistics
  function calculateMetrics() {
    const total = scansList.length;
    metricTotalScans.innerText = total;

    if (total === 0) {
      metricAvgScore.innerText = "--";
      metricAvgScore.className = "metric-value";
      metricAvgLabel.innerText = "No scan data available";
      metricTopDomain.innerText = "N/A";
      metricDomainScans.innerText = "0 total scans";
      metricTotalIssues.innerText = "0";
      return;
    }

    // Average Score
    const sumScore = scansList.reduce((acc, curr) => acc + (curr.verdict_score || 0), 0);
    const avg = Math.round(sumScore / total);
    metricAvgScore.innerText = `${avg}%`;

    // Style average score indicator color
    metricAvgScore.className = "metric-value";
    if (avg >= 80) {
      metricAvgScore.style.color = "var(--color-success)";
      metricAvgLabel.innerText = "Highly Substantial content";
    } else if (avg >= 50) {
      metricAvgScore.style.color = "var(--color-warning)";
      metricAvgLabel.innerText = "Moderate Jargon & Bias";
    } else {
      metricAvgScore.style.color = "var(--color-danger)";
      metricAvgLabel.innerText = "High BS / Manipulation";
    }

    // Most Scanned Domain
    const domainCounts = {};
    scansList.forEach(scan => {
      const d = scan.hostname || "unknown";
      domainCounts[d] = (domainCounts[d] || 0) + 1;
    });

    let topDomain = "N/A";
    let topCount = 0;
    for (const [domain, count] of Object.entries(domainCounts)) {
      if (count > topCount) {
        topDomain = domain;
        topCount = count;
      }
    }

    metricTopDomain.innerText = topDomain;
    metricDomainScans.innerText = `${topCount} scan${topCount > 1 ? 's' : ''} recorded`;

    // Total Issues Flagged
    let totalIssues = 0;
    scansList.forEach(scan => {
      const b = scan.breakdown || {};
      totalIssues += (b.jargon || 0) + (b.fallacy || 0) + (b.bias || 0) + (b.manipulation || 0) + (b.claim || 0);
    });

    metricTotalIssues.innerText = totalIssues;
  }

  // 3. Render Leaderboard (Domains with LOWEST substance score average - "Most Biased")
  function renderLeaderboard() {
    leaderboardList.innerHTML = "";

    if (scansList.length === 0) {
      leaderboardList.innerHTML = `<li class="empty-state">No scan history recorded.</li>`;
      return;
    }

    // Group scores by domain
    const domainGroup = {};
    scansList.forEach(scan => {
      const d = scan.hostname || "unknown";
      if (!domainGroup[d]) {
        domainGroup[d] = { sum: 0, count: 0 };
      }
      domainGroup[d].sum += (scan.verdict_score || 0);
      domainGroup[d].count += 1;
    });

    // Calculate averages
    const leaderboardData = [];
    for (const [domain, data] of Object.entries(domainGroup)) {
      leaderboardData.push({
        domain: domain,
        avgScore: Math.round(data.sum / data.count)
      });
    }

    // Sort ascending by score (lowest substance score at top = most biased)
    leaderboardData.sort((a, b) => a.avgScore - b.avgScore);

    // Take top 5
    const top5 = leaderboardData.slice(0, 5);

    top5.forEach((item, index) => {
      const li = document.createElement("li");
      
      const goodClass = item.avgScore >= 80 ? "good" : "";
      
      li.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="leaderboard-rank">#${index + 1}</span>
          <span class="leaderboard-domain" title="${item.domain}">${item.domain}</span>
        </div>
        <div class="leaderboard-badge">
          <span class="leaderboard-score ${goodClass}">${item.avgScore}% Substance</span>
        </div>
      `;
      leaderboardList.appendChild(li);
    });
  }

  // 4. Custom Canvas Trend Chart (Self-drawn for CSP compliance and lightweight beauty)
  function drawTrendChart() {
    const ctx = trendCanvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    
    // Setup high-DPI scaling
    const rect = trendCanvas.getBoundingClientRect();
    trendCanvas.width = rect.width * dpr;
    trendCanvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;

    // Clear Canvas
    ctx.clearRect(0, 0, width, height);

    // Get last 15 scans, reversed chronologically (left to right)
    const recentScans = scansList.slice(0, 15).reverse();

    if (recentScans.length < 2) {
      // Empty/not enough data state
      ctx.fillStyle = "rgba(156, 163, 175, 0.4)";
      ctx.font = "14px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Insufficient data. Perform at least 2 scans to render trend line.", width / 2, height / 2);
      return;
    }

    const paddingLeft = 45;
    const paddingRight = 20;
    const paddingTop = 30;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // 1. Draw Grid Lines
    ctx.strokeStyle = "rgba(24, 34, 57, 0.6)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "rgba(156, 163, 175, 0.6)";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    const yLevels = [0, 25, 50, 75, 100];
    yLevels.forEach(level => {
      const y = paddingTop + chartHeight * (1 - level / 100);
      
      // Horizontal grid line
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(width - paddingRight, y);
      ctx.stroke();

      // Label
      ctx.fillText(`${level}%`, paddingLeft - 8, y);
    });

    // Calculate point coordinates
    const points = [];
    const stepX = chartWidth / (recentScans.length - 1);

    recentScans.forEach((scan, idx) => {
      const x = paddingLeft + idx * stepX;
      const y = paddingTop + chartHeight * (1 - (scan.verdict_score || 0) / 100);
      points.push({ x, y, score: scan.verdict_score });
    });

    // 2. Draw Area Gradient
    const areaGrad = ctx.createLinearGradient(0, paddingTop, 0, height - paddingBottom);
    areaGrad.addColorStop(0, "rgba(59, 130, 246, 0.35)");
    areaGrad.addColorStop(1, "rgba(59, 130, 246, 0.0)");

    ctx.beginPath();
    ctx.moveTo(points[0].x, height - paddingBottom);
    points.forEach(pt => ctx.lineTo(pt.x, pt.y));
    ctx.lineTo(points[points.length - 1].x, height - paddingBottom);
    ctx.closePath();
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // 3. Draw Line Connection
    ctx.strokeStyle = "var(--color-accent)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // 4. Draw Data Points and Score labels
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "bold 9px Inter, sans-serif";

    points.forEach((pt, idx) => {
      // Draw outer circle
      ctx.strokeStyle = "var(--color-accent)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = "var(--bg-secondary)";
      ctx.fill();
      ctx.stroke();

      // Draw value text labels
      ctx.fillStyle = "var(--text-main)";
      ctx.fillText(pt.score, pt.x, pt.y - 10);

      // Draw bottom date label (just show scan index/order or tiny date if available)
      const scanDate = new Date(recentScans[idx].timestamp);
      const labelText = `${scanDate.getMonth() + 1}/${scanDate.getDate()}`;
      
      ctx.fillStyle = "var(--text-dimmed)";
      ctx.font = "9px Inter, sans-serif";
      ctx.fillText(labelText, pt.x, height - paddingBottom + 16);
    });
  }

  // 5. Render History Table with search and pagination
  function renderTable() {
    historyTbody.innerHTML = "";

    if (filteredScans.length === 0) {
      historyTbody.innerHTML = `
        <tr>
          <td colspan="6" class="empty-state">No scan records match search filters.</td>
        </tr>
      `;
      paginationControls.classList.add("hidden");
      return;
    }

    // Determine pagination indices
    const totalPages = Math.ceil(filteredScans.length / scansPerPage);
    if (currentPage > totalPages) currentPage = Math.max(1, totalPages);

    const startIndex = (currentPage - 1) * scansPerPage;
    const endIndex = Math.min(startIndex + scansPerPage, filteredScans.length);

    // Setup pagination UI
    if (totalPages > 1) {
      paginationControls.classList.remove("hidden");
      pageIndicator.innerText = `Page ${currentPage} of ${totalPages}`;
      prevPageBtn.disabled = currentPage === 1;
      nextPageBtn.disabled = currentPage === totalPages;
    } else {
      paginationControls.classList.add("hidden");
    }

    // Slice scans
    const pageScans = filteredScans.slice(startIndex, endIndex);

    pageScans.forEach(scan => {
      const tr = document.createElement("tr");

      // Column 1: Date String
      const d = new Date(scan.timestamp);
      const dateString = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      
      // Column 2: Webpage Info
      const domain = scan.hostname || "unknown";
      
      // Column 3: Platform
      const platform = (scan.platform || "news").toUpperCase();

      // Column 4: Substance Score Badge
      const score = scan.verdict_score;
      let scoreClass = "low";
      if (score >= 80) scoreClass = "high";
      else if (score >= 50) scoreClass = "med";

      // Column 5: Breakdown pills
      const b = scan.breakdown || { jargon: 0, fallacy: 0, bias: 0, manipulation: 0, claim: 0 };
      const issueCount = Object.values(b).reduce((x, y) => x + y, 0);

      const jargonActive = b.jargon > 0 ? "active" : "";
      const fallacyActive = b.fallacy > 0 ? "active" : "";
      const biasActive = b.bias > 0 ? "active" : "";

      tr.innerHTML = `
        <td><span class="table-date">${dateString}</span></td>
        <td>
          <div class="table-title-cell">
            <a href="${scan.url}" target="_blank" class="table-title-link" title="${scan.title}">${scan.title}</a>
            <span class="table-domain">${domain}</span>
          </div>
        </td>
        <td><span class="badge">${platform}</span></td>
        <td><span class="score-badge ${scoreClass}">${score}% Substance</span></td>
        <td>
          <div class="issue-pill-container">
            <span class="issue-pill ${jargonActive}">Jargon: ${b.jargon}</span>
            <span class="issue-pill ${fallacyActive}">Fallacies: ${b.fallacy}</span>
            <span class="issue-pill ${biasActive}">Biases: ${b.bias}</span>
          </div>
        </td>
        <td>
          <div class="table-actions-cell">
            <button class="btn secondary inspect-btn" data-id="${scan.timestamp}">🔍 Inspect</button>
            <button class="btn danger delete-btn" data-id="${scan.timestamp}">🗑️ Delete</button>
          </div>
        </td>
      `;

      // Attach actions to buttons
      tr.querySelector(".inspect-btn").addEventListener("click", () => showModal(scan));
      tr.querySelector(".delete-btn").addEventListener("click", () => deleteRecord(scan.timestamp));

      historyTbody.appendChild(tr);
    });
  }

  // 6. Search filtering handler
  function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      filteredScans = [...scansList];
    } else {
      filteredScans = scansList.filter(scan => {
        return (
          (scan.title || "").toLowerCase().includes(query) ||
          (scan.hostname || "").toLowerCase().includes(query) ||
          (scan.platform || "").toLowerCase().includes(query) ||
          (scan.summary || "").toLowerCase().includes(query)
        );
      });
    }
    currentPage = 1;
    renderTable();
  }

  // 7. Delete specific scan record
  function deleteRecord(timestamp) {
    if (confirm("Are you sure you want to delete this scan record?")) {
      chrome.storage.local.get("history", (result) => {
        let history = result.history || [];
        history = history.filter(item => item.timestamp !== timestamp);
        chrome.storage.local.set({ history }, () => {
          loadHistory(); // Reload
        });
      });
    }
  }

  // 8. Clear entire scan history
  function clearHistory() {
    if (confirm("⚠️ WARNING: This will permanently erase ALL scanned pages history. Are you sure you want to proceed?")) {
      chrome.storage.local.set({ history: [] }, () => {
        loadHistory(); // Reload
      });
    }
  }

  // 9. Export history to JSON file
  function exportHistory() {
    if (scansList.length === 0) {
      alert("No history records to export!");
      return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(scansList, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `hypefilter_history_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  // 10. Modal handling: display detailed analysis overlay
  function showModal(scan) {
    modalTitle.innerText = scan.title;
    modalDomain.innerText = scan.hostname;
    
    const d = new Date(scan.timestamp);
    modalDate.innerText = d.toLocaleString();

    modalScore.innerText = `${scan.verdict_score}%`;
    
    // Verdict tag text
    let verdictText = "High BS / Heavy Hype";
    modalScoreVerdict.style.color = "var(--color-danger)";
    if (scan.verdict_score >= 80) {
      verdictText = "Substantial & Fact-based";
      modalScoreVerdict.style.color = "var(--color-success)";
    } else if (scan.verdict_score >= 50) {
      verdictText = "Moderate Jargon & Spin";
      modalScoreVerdict.style.color = "var(--color-warning)";
    }
    modalScoreVerdict.innerText = verdictText;

    modalSummary.innerText = scan.summary;
    modalRoast.innerText = scan.roast;

    // Render offending phrases list
    modalPhrasesList.innerHTML = "";
    const phrases = scan.offending_phrases || [];

    if (phrases.length === 0) {
      modalPhrasesList.innerHTML = `
        <li style="text-align: center; color: var(--text-muted); font-style: italic; border-left: none;">
          No specific offending phrases flagged on this webpage. Excellent substance!
        </li>
      `;
    } else {
      phrases.forEach(phraseItem => {
        const li = document.createElement("li");
        
        const severity = (phraseItem.severity || "medium").toLowerCase();
        li.className = `sev-${severity}`;

        let rewriteHtml = "";
        if (phraseItem.rewrite) {
          rewriteHtml = `<div class="phrase-rewrite"><strong>📝 Suggestion:</strong> "${phraseItem.rewrite}"</div>`;
        }

        li.innerHTML = `
          <div class="phrase-meta-row">
            <span class="phrase-type">${phraseItem.type || 'Jargon'}</span>
            <span class="phrase-severity ${severity}">${severity} severity</span>
          </div>
          <div class="phrase-text">"${phraseItem.phrase}"</div>
          <div class="phrase-explanation">${phraseItem.explanation}</div>
          ${rewriteHtml}
        `;
        modalPhrasesList.appendChild(li);
      });
    }

    detailsModal.classList.remove("hidden");
  }

  function hideModal() {
    detailsModal.classList.add("hidden");
  }
});
