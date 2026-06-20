# HypeFilter.ai - AI-Powered Cognitive Bias & Jargon Shield

HypeFilter.ai is a browser extension and AI backend microservice built to help you cut through the noise, detect corporate buzzwords, identify logical fallacies, expose cognitive biases (like FOMO and appeal to authority), highlight emotional manipulation tactics, and flag unsourced or exaggerated claims in real-time.

---

## 🚀 Unique Features

1. **Live Substance Score**: Scans page text and awards an overall substance rating from 0% (pure BS/hype) to 100% (highly factual and clear).
2. **Bias Heatmap Mode**: Colors webpage paragraphs dynamically on a color gradient (green → yellow → orange → red) based on the density of bias/jargon detected.
3. **Platform Personality Modes**: Automatically adapts scanning lenses based on the webpage domain (e.g., LinkedIn corporate hype, Twitter rage-bait, Reddit echo chamber, Generic news sensationalism).
4. **Sarcastic AI Roast**: Provides a witty, satirical AI roast summarizing the fluff level of the content.
5. **Scan History Analytics Dashboard**: A full-page, clean statistics dashboard that displays average scores, domain leaders, historical score trends via an animated HTML5 Canvas chart, and a paginated/searchable history archive.
6. **Export Report**: One-click download of the complete scan history logs as a machine-readable JSON structure.

---

## 🛠️ System Architecture

- **Layer 1: Chrome Extension Frontend**
  - Content scripts (`content.js`, `tooltip.css`) for DOM scraping, live highlight wraps, styling, hover tooltips, and floating verdict badges.
  - Extension dashboard popup (`popup.html`, `popup.css`, `popup.js`) with toggles for Heatmap Mode, Roast Mode, and selection for target context profiles.
- **Layer 2: Local Node.js Express Backend**
  - Handles API requests via `/analyze` endpoint, text chunking for long articles, and structures well-engineered prompt instructions targeting Gemini LLM.
- **Layer 3: Chrome Local Storage API**
  - Caches scan history results offline for persistence across browser sessions and analytical dashboards.

---

## 📦 Installation & Setup

### 1. Start the Backend Microservice
Navigate to the `backend` directory, set up your env variables, and spin up the Express server:
```bash
cd backend
# Create a .env file and set:
# GEMINI_API_KEY=your_openrouter_api_key
# PORT=3000

npm install
npm start
```
The server will start running at `http://localhost:3000`.

### 2. Load the Chrome Extension
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle **Developer mode** in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the `extension` folder inside this project directory.
5. HypeFilter.ai is now active! Pin it to your toolbar.

---

## 💡 Tech Stack

- **Frontend**: HTML5, Vanilla CSS3, Vanilla JavaScript, Chrome Extension API (MV3), Chrome Local Storage.
- **Backend**: Node.js, Express, dotenv, CORS, OpenRouter SDK.
- **AI Core**: Gemini LLM via OpenRouter.
