import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly point to the backend root directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log("-----------------------------------------");
console.log("🔍 Key Loaded Check:", process.env.GEMINI_API_KEY ? "YES" : "NO ❌");
console.log("-----------------------------------------");

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: (process.env.GEMINI_API_KEY || '').trim(),
});

export async function queryLLM(prompt) {
  try {
    const response = await openai.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 4000
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("No content received from LLM response.");
    }

    let cleaned = rawContent.trim();

    // 1. Strip markdown wraps if present
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, "");
      cleaned = cleaned.replace(/\n?```$/, "");
      cleaned = cleaned.trim();
    }

    // 2. Try standard JSON parse first
    try {
      return JSON.parse(cleaned);
    } catch (parseError) {
      console.warn("Standard JSON parse failed, attempting sanitization...", parseError.message);
      
      // 3. Attempt robust cleanup (strip comments and trailing commas)
      const sanitized = cleaned
        // Remove single-line comments (//...) that don't belong to URLs
        .replace(/(?:^|[^:])\/\/.*$/gm, "")
        // Remove trailing commas in objects or arrays
        .replace(/,\s*([\]}])/g, "$1")
        .trim();

      try {
        return JSON.parse(sanitized);
      } catch (sanitizedError) {
        console.error("❌ Failed parsing sanitized LLM response. Raw output was:\n", rawContent);
        throw new Error(`JSON Parsing Error: ${sanitizedError.message}`);
      }
    }
  } catch (error) {
    console.error("LLM Service Error:", error);
    throw error;
  }
}