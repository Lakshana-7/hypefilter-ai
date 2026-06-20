/**
 * Splits input text into smaller, safe character lengths
 */
export function chunkText(text, maxChars = 4000) {
  const chunks = [];
  let currentChunk = "";
  const sentences = text.split(/[.!?]\s+/);

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxChars) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = sentence + ". ";
    } else {
      currentChunk += sentence + ". ";
    }
  }
  
  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
}