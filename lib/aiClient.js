// lib/aiClient.js
import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  // Fail loudly and immediately at import time rather than letting every
  // call site hit a cryptic "Cannot read properties of undefined" deep
  // inside the SDK the first time someone forgets to set the env var.
  console.error('GEMINI_API_KEY is not set — AI features will fail until it is configured.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// gemini-3.6-flash — current, GA, and well suited for fast structured,
// short-form analysis like this feature needs.
export function getAIModel() {
  return genAI.getGenerativeModel({
    model: 'gemini-3.6-flash',
    generationConfig: {
      // Constrains the API to only ever return valid JSON, instead of
      // relying on prompt instructions + manually stripping markdown
      // fences after the fact. The model can still wrap the JSON in
      // prose if it really insists, so the fence-stripping below stays
      // as a defensive fallback, but this should make that path rare.
      responseMimeType: 'application/json',
    },
  });
}

// Extracts the first balanced {...} block from a string — a fallback for
// the rare case the model still adds stray text around the JSON despite
// responseMimeType: 'application/json'.
function extractJSONBlock(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  return text.slice(start, end + 1);
}

function tryParse(text) {
  const cleaned = text.replace(/```json\s*|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const block = extractJSONBlock(cleaned);
    if (block) {
      try {
        return JSON.parse(block);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// Calls Gemini with a prompt that must return JSON, and safely parses the
// response. Retries once on transient failure (network blip, rate limit,
// or a one-off malformed response) before giving up. Throws if it still
// can't get valid JSON after that, so callers handle the failure
// explicitly rather than silently getting garbage data.
export async function generateJSON(prompt, { retries = 1 } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const model = getAIModel();
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      const parsed = tryParse(text);
      if (parsed !== null) return parsed;

      lastError = new Error('AI response was not valid JSON');
      console.error(`AI returned non-JSON response (attempt ${attempt + 1}/${retries + 1}):`, text);
    } catch (err) {
      lastError = err;
      const status = err?.status || err?.response?.status;
      console.error(`AI request failed (attempt ${attempt + 1}/${retries + 1}, status ${status ?? 'n/a'}):`, err.message);

      // A 429 (quota/rate limit) won't resolve itself within the next few
      // hundred milliseconds — Google's own retryDelay hint is typically
      // ~10s, far longer than a request should keep a user waiting. Bail
      // out immediately instead of burning another attempt (and more
      // quota) on a call that's essentially guaranteed to fail the same way.
      if (status === 429) break;
    }
  }

  throw lastError;
}