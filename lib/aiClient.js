// lib/aiClient.js
import { GoogleGenAI } from '@google/genai';
import { recordAIUsage } from '@/lib/recordAIUsage';

const MODEL_ID = process.env.GEMINI_MODEL_ID || 'gemini-3.6-flash';

// Gemini 3.x/4.x use model-managed sampling. Do not send a custom temperature.
const USE_MODEL_DEFAULT_TEMPERATURE = /^gemini-(?:3|4)(?:[.-]|$)/i.test(MODEL_ID);

// The Daily Analyst currently requests minimal thinking. Only enable that value
// for model families where Google's Gemini API documents support for it.
const SUPPORTS_MINIMAL_THINKING =
  /^gemini-(?:3\.6-flash|3\.5-flash(?:-lite)?|3\.1-flash-lite|3-flash-preview)$/i.test(MODEL_ID);

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
 * Generate a JSON response with conservative defaults:
 * - no automatic retries (a retry can consume more free-tier usage)
 * - a bounded output token limit for short nutrition responses
 * - actual Gemini token metadata recorded when the SDK supplies it
 */
export async function generateJSON(
  prompt,
  {
    retries = 0,
    userId = null,
    feature = 'unknown',
    maxOutputTokens = 400,
    thinkingLevel = null,
    abortSignal = null,
  } = {}
) {
  let lastError;
  const outputLimit = Math.min(1024, Math.max(64, Number(maxOutputTokens) || 400));

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const ai = getAIClient();
      const result = await ai.models.generateContent({
        model: MODEL_ID,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          // Gemini 3.x/4.x should use their default sampling configuration.
          ...(!USE_MODEL_DEFAULT_TEMPERATURE ? { temperature: 0.3 } : {}),
          maxOutputTokens: outputLimit,
          ...(thinkingLevel && (thinkingLevel !== 'minimal' || SUPPORTS_MINIMAL_THINKING)
            ? { thinkingConfig: { thinkingLevel } }
            : {}),
          ...(abortSignal ? { abortSignal } : {}),
        },
      });

      const outputText = result.text || '';
      const usageMetadata = result.usageMetadata || null;
      const parsed = tryParse(outputText);

      if (parsed !== null) {
        await recordAIUsage({
          userId, feature, model: MODEL_ID, status: 'success',
          inputText: prompt, outputText, usageMetadata,
        });
        return parsed;
      }

      lastError = new Error('Gemini returned an empty or invalid JSON response.');
      await recordAIUsage({
        userId, feature, model: MODEL_ID, status: 'failed',
        inputText: prompt, outputText, usageMetadata,
        errorCode: 'INVALID_JSON',
      });
    } catch (error) {
      lastError = error;
      const status = error?.status || error?.response?.status || error?.code;
      const numericStatus = Number(status);
      await recordAIUsage({
        userId,
        feature,
        model: MODEL_ID,
        status: numericStatus === 429 || String(status).includes('RESOURCE_EXHAUSTED') ? 'quota' : 'failed',
        inputText: prompt,
        errorCode: status || error?.name || 'GENERATION_ERROR',
      });
      console.error(
        `Gemini request failed (attempt ${attempt + 1}/${retries + 1}, status ${status ?? 'n/a'}):`,
        error?.message || error
      );

      // Do not retry quota or provider errors by default; retries are opt-in.
      if (numericStatus === 429 || String(status).includes('RESOURCE_EXHAUSTED')) break;
    }
  }

  throw lastError || new Error('Gemini request failed.');
}
