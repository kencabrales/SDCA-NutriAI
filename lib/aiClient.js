// lib/aiClient.js
import { GoogleGenAI } from '@google/genai';
import { recordAIUsage } from '@/lib/recordAIUsage';

const MODEL_ID = 'gemini-3.6-flash';

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing. Add it to your server environment variables.');
  }
  return new GoogleGenAI({ apiKey });
}

function extractJSONBlock(value) {
  const start = value.indexOf('{');
  const end = value.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  return value.slice(start, end + 1);
}

function tryParse(value) {
  if (typeof value !== 'string' || !value.trim()) return null;

  const cleaned = value.replace(/```json\s*|```/gi, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const block = extractJSONBlock(cleaned);
    if (!block) return null;
    try {
      return JSON.parse(block);
    } catch {
      return null;
    }
  }
}

/**
 * Generate a JSON response using Google's current @google/genai SDK.
 * The API key is read at request time so a missing key produces a useful
 * server-side error instead of breaking module initialization.
 */
export async function generateJSON(prompt, { retries = 1, userId = null, feature = 'unknown' } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const ai = getAIClient();
      const result = await ai.models.generateContent({
        model: MODEL_ID,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const parsed = tryParse(result.text || '');
      if (parsed !== null) {
        await recordAIUsage({ userId, feature, status: 'success', inputText: prompt, outputText: result.text || '' });
        return parsed;
      }

      lastError = new Error('Gemini returned an empty or invalid JSON response.');
    } catch (error) {
      lastError = error;
      const status = error?.status || error?.response?.status || error?.code;
      await recordAIUsage({
        userId, feature,
        status: Number(status) === 429 || String(status).includes('RESOURCE_EXHAUSTED') ? 'quota' : 'failed',
        inputText: prompt,
        errorCode: status || error?.name || 'GENERATION_ERROR',
      });
      console.error(
        `Gemini request failed (attempt ${attempt + 1}/${retries + 1}, status ${status ?? 'n/a'}):`,
        error?.message || error
      );

      // Retrying quota errors immediately does not help and can consume more quota.
      if (status === 429) break;
    }
  }

  throw lastError || new Error('Gemini request failed.');
}
