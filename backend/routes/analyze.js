import express from 'express';
import { queryLLM } from '../services/llm.js';
import { buildPrompt } from '../services/promptBuilder.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { text, platform } = req.body;
    console.log(`🤖 Processing OpenRouter payload for platform: [${platform || 'news'}]...`);

    if (!text) {
      return res.status(400).json({ error: "No webpage text extracted." });
    }

    const prompt = buildPrompt(platform || 'news', text);
    const rawAnalysisResult = await queryLLM(prompt);
    return res.json(rawAnalysisResult);

  } catch (error) {
    console.error("Routing Exception:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;