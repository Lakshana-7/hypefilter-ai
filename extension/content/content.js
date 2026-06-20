console.log("🎨 HypeFilter.ai: Highlight & Tooltip Core Injected.");

let currentOffendingPhrases = [];
let heatmapActive = false;

// Listen for the completed JSON payload coming back from our background service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "apply_analysis") {
    const data = message.data;
    console.log("📦 Received Analysis Data from Backend:", data);

    if (data && data.offending_phrases) {
      currentOffendingPhrases = data.offending_phrases;
      injectHighlightsAndTooltips(data.offending_phrases);
      injectFloatingVerdictBadge(data.verdict_score, data.summary);
      
      // If heatmap mode is active, refresh the paragraph background coloring
      if (heatmapActive) {
        toggleHeatmapMode(true);
      }
    }
    sendResponse({ status: "success" });
  } else if (message.action === "toggle_heatmap") {
    heatmapActive = message.enabled;
    toggleHeatmapMode(heatmapActive);
    sendResponse({ status: "success", enabled: heatmapActive });
  }
});

/**
 * Searches the visible web page for offending phrases and wraps them in highlighted span tags
 */
function injectHighlightsAndTooltips(offendingPhrases) {
  const bodyTextNodes = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  
  let node;
  while (node = walk.nextNode()) {
    // Skip scripts, style blocks, and existing tooltips
    const parent = node.parentNode.tagName.toLowerCase();
    if (parent !== 'script' && parent !== 'style' && parent !== 'noscript' && !node.parentNode.classList.contains('hypefilter-highlight')) {
      bodyTextNodes.push(node);
    }
  }

  offendingPhrases.forEach((item) => {
    const targetPhrase = item.phrase.trim();
    if (!targetPhrase || targetPhrase.length < 3) return;

    bodyTextNodes.forEach((textNode) => {
      const nodeText = textNode.nodeValue;
      const index = nodeText.toLowerCase().indexOf(targetPhrase.toLowerCase());

      if (index !== -1 && textNode.parentNode) {
        const parent = textNode.parentNode;
        
        // Split the text block into before-match, match, and after-match parts
        const beforeText = nodeText.substring(0, index);
        const matchedText = nodeText.substring(index, index + targetPhrase.length);
        const afterText = nodeText.substring(index + targetPhrase.length);

        // Create our custom highlight wrapper
        const highlightSpan = document.createElement("span");
        highlightSpan.className = `hypefilter-highlight hf-${item.severity || 'medium'}`;
        highlightSpan.innerText = matchedText;

        // Attach data parameters for our CSS hover tooltips
        highlightSpan.setAttribute("data-type", item.type.toUpperCase());
        highlightSpan.setAttribute("data-explanation", item.explanation);
        if (item.rewrite) {
          highlightSpan.setAttribute("data-rewrite", item.rewrite);
        }

        // Update the live DOM text node
        const fragment = document.createDocumentFragment();
        fragment.appendChild(document.createTextNode(beforeText));
        fragment.appendChild(highlightSpan);
        fragment.appendChild(document.createTextNode(afterText));

        parent.replaceChild(fragment, textNode);
      }
    });
  });
}

/**
 * Creates and injects a floating score container into the bottom right corner
 */
function injectFloatingVerdictBadge(score, summary) {
  // Remove existing badge if it exists
  const oldBadge = document.getElementById("hypefilter-floating-verdict");
  if (oldBadge) oldBadge.remove();

  const badge = document.createElement("div");
  badge.id = "hypefilter-floating-verdict";
  badge.innerHTML = `
    <div class="hf-badge-header">
      <strong>HypeFilter.ai Score</strong>
      <span class="hf-badge-score">${score}% Substance</span>
    </div>
    <div class="hf-badge-summary">${summary}</div>
  `;
  document.body.appendChild(badge);
}

/**
 * Toggles a paragraph-level background overlay based on the density of offending phrases
 */
function toggleHeatmapMode(enabled) {
  const paragraphs = document.querySelectorAll("p");

  if (!enabled) {
    // Restore original background styles
    paragraphs.forEach(p => {
      if (p.dataset.originalBg !== undefined) {
        p.style.backgroundColor = p.dataset.originalBg;
        delete p.dataset.originalBg;
      }
      p.style.transition = "";
    });
    return;
  }

  if (currentOffendingPhrases.length === 0) return;

  paragraphs.forEach(p => {
    // Store original background if not yet cached
    if (p.dataset.originalBg === undefined) {
      p.dataset.originalBg = p.style.backgroundColor || "";
    }

    const text = p.innerText || p.textContent || "";
    if (text.trim().length === 0) return;

    let offendingCharCount = 0;

    // Calculate density of offending text in the paragraph
    currentOffendingPhrases.forEach(item => {
      const phrase = item.phrase.trim();
      if (!phrase || phrase.length < 3) return;

      let pos = text.toLowerCase().indexOf(phrase.toLowerCase());
      while (pos !== -1) {
        offendingCharCount += phrase.length;
        pos = text.toLowerCase().indexOf(phrase.toLowerCase(), pos + phrase.length);
      }
    });

    const ratio = offendingCharCount / text.length;

    // Color gradient based on the ratio of noise:
    // 0% noise = soft green (clear substance)
    // 1-10% noise = soft yellow
    // 10-20% noise = soft orange
    // >20% noise = soft red
    let bgColor = "rgba(76, 175, 80, 0.08)"; // Soft green
    if (ratio > 0.20) {
      bgColor = "rgba(244, 67, 54, 0.22)"; // Soft red
    } else if (ratio > 0.10) {
      bgColor = "rgba(255, 145, 0, 0.18)"; // Soft orange
    } else if (ratio > 0) {
      bgColor = "rgba(255, 235, 59, 0.15)"; // Soft yellow
    }

    p.style.transition = "background-color 0.4s ease";
    p.style.backgroundColor = bgColor;
  });
}