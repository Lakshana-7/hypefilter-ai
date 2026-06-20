import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import analyzeRouter from './routes/analyze.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, './.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS so your Chrome extension can communicate with localhost cleanly
app.use(cors());

// Increase payload parsing limits so large text extraction strings transfer safely
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug logging middleware to verify requests are reaching the backend
app.use((req, res, next) => {
  console.log(`📥 Inbound [${req.method}] request received at path: ${req.url}`);
  next();
});

// Primary route declaration pointing to our new OpenRouter analysis service module
app.use('/analyze', analyzeRouter);

// Global fallback handler to gracefully catch structural network exceptions
app.use((err, req, res, next) => {
  console.error("💥 Global Server Exception:", err.message);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

app.listen(PORT, () => {
  console.log("-----------------------------------------");
  console.log(`🚀 HypeFilter.ai Server running at http://localhost:${PORT}`);
  console.log("-----------------------------------------");
});