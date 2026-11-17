// lib/aiClient.js
import { GoogleGenAI } from '@google/genai';
import { recordAIUsage } from '@/lib/recordAIUsage';

const MODEL_ID = process.env.GEMINI_MODEL_ID || 'gemini-3.6-flash';

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

function isGemini3OrNewer(model) {
  return /^gemini-(?:3|4)(?:[.-]|$)/i.test(model);
}

function supportsMinimalThinking(model) {
  return /^gemini-(?:3\.6-flash|3\.5-flash(?:-lite)?|3\.1-flash-lite|3-flash-preview)$/i.test(model);
}

function buildGenerationConfig(model, outputLimit, thinkingLevel, abortSignal) {
  const effectiveThinkingLevel =
    thinkingLevel === 'minimal' && !supportsMinimalThinking(model)
      ? null
      : thinkingLevel;

  return {
    responseMimeType: 'application/json',
    // Gemini 3.x/4.x use model-managed sampling; do not override temperature.
    ...(!isGemini3OrNewer(model) ? { temperature: 0.3 } : {}),
    maxOutputTokens: outputLimit,
    ...(effectiveThinkingLevel ? { thinkingConfig: { thinkingLevel: effectiveThinkingLevel } } : {}),
    ...(abortSignal ? { abortSignal } : {}),
  };
}

function getProviderError(error) {
  const message = String(error?.message || '');
  try {
    return JSON.parse(message)?.error || error?.error || {};
  } catch {
    return error?.error || {};
  }
}

function isFallbackEligible(error) {
  const providerError = getProviderError(error);
  const status = Number(error?.status || error?.response?.status || providerError?.code);
  const providerCode = String(providerError?.status || error?.statusText || '').toUpperCase();
  const message = String(error?.message || '').toUpperCase();

  // These statuses may be model-specific. Try one explicitly configured alternate model.
  return status === 429 || status === 503 ||
    providerCode === 'RESOURCE_EXHAUSTED' ||
    providerCode === 'UNAVAILABLE' ||
    /RESOURCE_EXHAUSTED|\bUNAVAILABLE\b|SERVICE_UNAVAILABLE/.test(message);
}

function waitBeforeFallback(delayMs, abortSignal) {
  const delay = Math.max(0, Number(delayMs) || 0);
  if (!delay) return Promise.resolve();

  const makeAbortError = () => {
    const error = abortSignal?.reason instanceof Error
      ? abortSignal.reason
      : new Error('Gemini fallback wait was aborted.');
    if (!error.name || error.name === 'Error') error.name = 'AbortError';
    return error;
  };

  if (abortSignal?.aborted) return Promise.reject(makeAbortError());

  return new Promise((resolve, reject) => {
    let timer;
    const cleanup = () => abortSignal?.removeEventListener('abort', onAbort);
    const onAbort = () => {
      clearTimeout(timer);
      cleanup();
      reject(makeAbortError());
    };

    timer = setTimeout(() => {
      cleanup();
      resolve();
    }, delay);

    abortSignal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Generate a JSON response conservatively:
 * - no automatic same-model retries by default
 * - optional one-time alternate-model fallback for provider 503/UNAVAILABLE only
 * - bounded output tokens and usage tracking per model attempt
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
    fallbackModel = null,
    fallbackThinkingLevel = 'low',
    fallbackDelayMs = 1000,
  } = {}
) {
  let lastError;
  let primaryCapacityError = null;
  const outputLimit = Math.min(1024, Math.max(64, Number(maxOutputTokens) || 400));
  const candidates = [{ model: MODEL_ID, thinkingLevel }];

  if (fallbackModel && fallbackModel !== MODEL_ID) {
    candidates.push({ model: fallbackModel, thinkingLevel: fallbackThinkingLevel });
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
      const candidate = candidates[candidateIndex];

      try {
        const ai = getAIClient();
        const result = await ai.models.generateContent({
          model: candidate.model,
          contents: prompt,
          config: buildGenerationConfig(
            candidate.model,
            outputLimit,
            candidate.thinkingLevel,
            abortSignal
          ),
        });

        const outputText = result.text || '';
        const usageMetadata = result.usageMetadata || null;
        const parsed = tryParse(outputText);

        if (parsed !== null) {
          await recordAIUsage({
            userId, feature, model: candidate.model, status: 'success',
            inputText: prompt, outputText, usageMetadata,
          });
          return parsed;
        }

        lastError = new Error(`Gemini model ${candidate.model} returned an empty or invalid JSON response.`);
        await recordAIUsage({
          userId, feature, model: candidate.model, status: 'failed',
          inputText: prompt, outputText, usageMetadata,
          errorCode: 'INVALID_JSON',
        });
        // A valid provider response with invalid JSON is not a capacity failure.
        break;
      } catch (error) {
        lastError = error;
        const status = error?.status || error?.response?.status || error?.code;
        const numericStatus = Number(status);

        await recordAIUsage({
          userId,
          feature,
          model: candidate.model,
          status: numericStatus === 429 || String(status).includes('RESOURCE_EXHAUSTED') ? 'quota' : 'failed',
          inputText: prompt,
          errorCode: status || error?.name || 'GENERATION_ERROR',
        });

        console.error(
          `Gemini request failed (attempt ${attempt + 1}/${retries + 1}, model ${candidate.model}, status ${status ?? 'n/a'}):`,
          error?.message || error
        );

        // Try a different model once only when the primary model is at capacity.
        if (candidateIndex === 0 && candidates.length > 1 && isFallbackEligible(error)) {
          console.warn(
            `Gemini model ${candidate.model} returned a capacity/quota error; waiting ${fallbackDelayMs}ms before trying fallback model ${candidates[1].model} once.`
          );
          primaryCapacityError = error;
          await waitBeforeFallback(fallbackDelayMs, abortSignal);
          continue;
        }

        // Do not retry quota errors or repeat an overloaded model.
        if (candidateIndex > 0 && primaryCapacityError) {
          const combinedError = new Error(error?.message || 'Both Gemini models failed.');
          combinedError.name = error?.name || 'Error';
          combinedError.status = error?.status || error?.response?.status || null;
          combinedError.code = error?.code ?? null;
          combinedError.cause = error;
          combinedError.primaryError = primaryCapacityError;
          lastError = combinedError;
        }

        if (
          numericStatus === 429 ||
          numericStatus === 503 ||
          String(status).includes('RESOURCE_EXHAUSTED') ||
          isFallbackEligible(error)
        ) {
          throw lastError || error;
        }
        break;
      }
    }

    // This function defaults to zero retries. If retries are explicitly enabled,
    // retry only non-quota, non-capacity failures.
    if (lastError && (
      isFallbackEligible(lastError) ||
      isFallbackEligible(lastError?.primaryError)
    )) {
      break;
    }
  }

  throw lastError || new Error('Gemini request failed.');
}
