export function buildPrompt(platform, textChunk) {
  let platformLensDescription = "";

  switch (platform) {
    case "academic":
      platformLensDescription = `Evaluate this content through an ACADEMIC lens. Focus on detecting:
- Logical fallacies (especially appeal to authority, circular reasoning, false equivalence).
- Unverified research claims (e.g., "studies show...", "science proves...") that lack citations or links. Flag them as 'unverified' and explain with 'Which studies? No source found.'.
- Overly dense, convoluted academic jargon used to obscure simple concepts.`;
      break;
    case "editor":
      platformLensDescription = `Evaluate this content through an EDITOR/PLAIN ENGLISH lens. Focus on detecting:
- Unnecessary fluff, wordy sentences, and passive voice.
- Complex corporate buzzwords, empty jargon, and unnecessarily complex terminology.
- Make sure to provide a direct, concise plain-English rewrite in the 'rewrite' field for every flagged phrase.`;
      break;
    case "linkedin":
      platformLensDescription = `Evaluate this content through a LINKEDIN CORPORATE HYPE lens. Focus on detecting:
- Corporate buzzwords, empty jargon, toxic positivity, humblebrags, and excessive hype.
- Artificial emotional urgency, growth hacking jargon, and buzzword salad.`;
      break;
    case "crypto":
      platformLensDescription = `Evaluate this content through a WEB3 / CRYPTO FOMO lens. Focus on detecting:
- Extreme hype, FOMO, get-rich-quick claims, and speculative market buzzwords.
- Technical jargon used to confuse readers or disguise high risks.`;
      break;
    case "marketing":
      platformLensDescription = `Evaluate this content through a SALES COPY / LANDING PAGE lens. Focus on detecting:
- Aggressive sales copy, artificial scarcity (e.g., "only 5 left!"), false urgency, and exaggerated product claims.
- Manipulative copywriting patterns designed to exploit emotional triggers.`;
      break;
    case "news":
    default:
      platformLensDescription = `Evaluate this content through a GENERIC NEWS / ARTICLES lens. Focus on detecting:
- Sensationalism, clickbait, emotional manipulation, biased framing, and unsourced claims.
- Fallacies like appeal to emotion or false balance.`;
      break;
  }

  return `You are HypeFilter.ai, an expert cognitive bias, jargon, and misinformation detector.
Analyze the following text.

${platformLensDescription}

Important instructions:
1. The "verdict_score" must be an integer from 0 to 100, where 100 = pure substance (factual, clear, well-sourced) and 0 = pure BS (jargon, hype, biases, fallacies).
2. The "could_have_been_shorter_score" must be an integer from 0 to 100, representing the fluff ratio (where 0% = extremely concise and direct, and 100% = complete fluff that adds no value and could have been entirely omitted).
3. If you detect unsourced claims like "Studies show...", "Research says...", or "Experts agree..." without a specific source or link cited, you MUST flag it as "unverified" type, and set the explanation to question it, e.g., "Which studies? No source found." or "Which experts? No source cited."
4. For each offending phrase, especially those representing buzzwords, jargon, or complex fluff, provide a simplified, clear, plain-English alternative in the "rewrite" field. If no rewrite is applicable, omit or leave the field blank.

Return ONLY a valid JSON object matching this schema precisely without any markdown wraps, comment blocks, or formatting text. Limit the "offending_phrases" list to the top 5 most significant instances found in the text:
{
  "verdict_score": 50,
  "could_have_been_shorter_score": 30,
  "platform_detected": "${platform}",
  "summary": "A witty sentence summary.",
  "roast": "A sarcastic one-liner.",
  "offending_phrases": [
    {
      "phrase": "exact text segment",
      "type": "buzzword",
      "severity": "medium",
      "explanation": "why this is problematic",
      "rewrite": "simplified plain English alternative"
    }
  ]
}

Text chunk to analyze:
"${textChunk}"`;
}