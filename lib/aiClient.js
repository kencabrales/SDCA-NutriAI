// lib/aiClient.js
import { GoogleGenAI } from '@google/genai';
import { recordAIUsage } from '@/lib/recordAIUsage';

const GEMINI_MODEL_ID = process.env.GEMINI_MODEL_ID || 'gemini-3.6-flash';
const AI_PROVIDER = String(process.env.AI_PROVIDER || 'gemini').trim().toLowerCase();
const GROQ_MODEL_ID = process.env.GROQ_MODEL_ID || 'openai/gpt-oss-20b';

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

  const fence = String.fromCharCode(96).repeat(3);
  const cleaned = value.replace(new RegExp(fence + '(?:json)?', 'gi'), '').trim();
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

function getErrorStatus(error) {
  const providerError = getProviderError(error);
  const status = Number(error?.status || error?.response?.status || providerError?.code);
  return Number.isInteger(status) ? status : null;
}

function isFallbackEligible(error) {
  const providerError = getProviderError(error);
  const status = getErrorStatus(error);
  const providerCode = String(providerError?.status || providerError?.code || error?.code || '').toUpperCase();
  const message = String(error?.message || '').toUpperCase();

  return [408, 429, 500, 502, 503, 504].includes(status) ||
    error?.code === 'INVALID_JSON' ||
    (error?.name === 'TypeError' && !error?.cause?.name?.includes('Abort')) ||
    /RESOURCE_EXHAUSTED|RATE_LIMIT|QUOTA|UNAVAILABLE|SERVICE_UNAVAILABLE|INTERNAL/.test(providerCode) ||
    /RESOURCE_EXHAUSTED|RATE_LIMIT|QUOTA|UNAVAILABLE|SERVICE_UNAVAILABLE|FETCH FAILED|NETWORK ERROR/.test(message);
}

function waitBeforeFallback(delayMs, abortSignal) {
  const delay = Math.max(0, Number(delayMs) || 0);
  if (!delay) return Promise.resolve();

  const makeAbortError = () => {
    const error = abortSignal?.reason instanceof Error
      ? abortSignal.reason
      : new Error('AI provider fallback wait was aborted.');
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

function buildCandidates({ fallbackModel, thinkingLevel, fallbackThinkingLevel }) {
  const candidates = [];
  const useGroq = AI_PROVIDER === 'groq';

  if (useGroq) {
    candidates.push({ provider: 'groq', model: GROQ_MODEL_ID, thinkingLevel: 'low' });
    candidates.push({ provider: 'gemini', model: GEMINI_MODEL_ID, thinkingLevel });
  } else {
    candidates.push({ provider: 'gemini', model: GEMINI_MODEL_ID, thinkingLevel });
  }

  if (fallbackModel) {
    candidates.push({
      provider: 'gemini',
      model: fallbackModel,
      thinkingLevel: fallbackThinkingLevel,
    });
  }

  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = candidate.provider + ':' + candidate.model;
    if (!candidate.model || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function generateWithGemini(prompt, { model, outputLimit, thinkingLevel, abortSignal }) {
  const ai = getAIClient();
  const result = await ai.models.generateContent({
    model,
    contents: prompt,
    config: buildGenerationConfig(model, outputLimit, thinkingLevel, abortSignal),
  });

  return {
    outputText: result.text || '',
    usageMetadata: result.usageMetadata || null,
  };
}

async function generateWithGroq(prompt, { model, outputLimit, abortSignal }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is missing. Add it to your server environment variables.');
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      // GPT-OSS supports JSON Object Mode. Avoid system-role instructions for this reasoning model.
      messages: [{
        role: 'user',
        content: prompt + '\n\nReturn exactly one valid JSON object. Do not include markdown or text outside the JSON object.',
      }],
      response_format: { type: 'json_object' },
      ...( /^openai\/gpt-oss-/i.test(model)
        ? { reasoning_effort: 'low', include_reasoning: false }
        : {}),
      max_completion_tokens: Math.min(2048, Math.max(512, outputLimit * 2)),
    }),
    signal: abortSignal || undefined,
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(JSON.stringify(payload));
    error.name = 'GroqAPIError';
    error.status = response.status;
    error.code = payload?.error?.code || payload?.error?.type || 'GROQ_API_ERROR';
    error.retryAfter = response.headers.get('retry-after') || null;
    throw error;
  }

  const choice = payload?.choices?.[0];
  const outputText = choice?.message?.content || '';
  const usage = payload?.usage || null;

  return {
    outputText,
    usageMetadata: usage ? {
      promptTokenCount: Number(usage.prompt_tokens) || 0,
      candidatesTokenCount: Number(usage.completion_tokens) || 0,
      totalTokenCount: Number(usage.total_tokens) || 0,
    } : null,
  };
}

async function generateWithCandidate(prompt, candidate, options) {
  return candidate.provider === 'groq'
    ? generateWithGroq(prompt, { ...options, model: candidate.model })
    : generateWithGemini(prompt, {
      ...options,
      model: candidate.model,
      thinkingLevel: candidate.thinkingLevel,
    });
}

/**
 * Generate one JSON response using the configured provider chain.
 *
 * AI_PROVIDER=gemini (default): Gemini primary, then the configured Gemini fallback.
 * AI_PROVIDER=groq: Groq primary, then GEMINI_MODEL_ID, then the configured Gemini fallback.
 *
 * Only transient capacity/quota errors trigger provider fallback. Requests are
 * aborted by the calling route's AbortSignal when its generation timeout expires.
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
  const outputLimit = Math.min(1024, Math.max(64, Number(maxOutputTokens) || 400));
  const candidates = buildCandidates({ fallbackModel, thinkingLevel, fallbackThinkingLevel });
  const failures = [];
  let lastError = null;

  for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex++) {
    const candidate = candidates[candidateIndex];

    try {
      if (abortSignal?.aborted) {
        throw abortSignal.reason || new Error('AI generation was aborted.');
      }

      const result = await generateWithCandidate(prompt, candidate, {
        outputLimit,
        thinkingLevel,
        abortSignal,
      });
      const parsed = tryParse(result.outputText);

      if (parsed === null) {
        const parseError = new Error(candidate.provider + ' model ' + candidate.model + ' returned an empty or invalid JSON response.');
        parseError.code = 'INVALID_JSON';
        throw parseError;
      }

      await recordAIUsage({
        userId,
        feature,
        model: candidate.model,
        status: 'success',
        inputText: prompt,
        outputText: result.outputText,
        usageMetadata: result.usageMetadata,
      });

      return parsed;
    } catch (error) {
      lastError = error;
      failures.push({ provider: candidate.provider, model: candidate.model, error });

      const status = getErrorStatus(error);
      const isQuota = status === 429 ||
        /RESOURCE_EXHAUSTED|RATE_LIMIT|QUOTA/.test(String(error?.code || error?.message || '').toUpperCase());

      await recordAIUsage({
        userId,
        feature,
        model: candidate.model,
        status: isQuota ? 'quota' : 'failed',
        inputText: prompt,
        errorCode: status || error?.code || error?.name || 'GENERATION_ERROR',
      });

      console.error(
        'AI request failed (provider ' + candidate.provider + ', model ' + candidate.model +
        ', status ' + (status ?? 'n/a') + '):',
        error?.message || error
      );

      const hasNextCandidate = candidateIndex < candidates.length - 1;
      if (!hasNextCandidate || !isFallbackEligible(error)) {
        break;
      }

      console.warn(
        candidate.provider + ' model ' + candidate.model +
        ' is unavailable or rate-limited; switching to ' +
        candidates[candidateIndex + 1].provider + ' model ' +
        candidates[candidateIndex + 1].model + '.'
      );

      await waitBeforeFallback(fallbackDelayMs, abortSignal);
    }
  }

  if (failures.length > 1) {
    const finalFailure = failures[failures.length - 1];
    const combinedError = new Error(finalFailure.error?.message || 'All configured AI providers failed.');
    combinedError.name = finalFailure.error?.name || 'AIProviderChainError';
    const rateLimitFailure = failures.find((failure) => getErrorStatus(failure.error) === 429);
    const retrySource = rateLimitFailure || finalFailure;
    combinedError.status = rateLimitFailure
      ? 429
      : getErrorStatus(finalFailure.error);
    combinedError.code = retrySource.error?.code || finalFailure.error?.code || 'AI_PROVIDER_CHAIN_FAILED';
    combinedError.retryAfter = retrySource.error?.retryAfter || null;
    combinedError.cause = finalFailure.error;
    combinedError.attemptErrors = failures.map((failure) => ({
      provider: failure.provider,
      model: failure.model,
      status: getErrorStatus(failure.error),
      code: failure.error?.code || null,
    }));
    throw combinedError;
  }

  throw lastError || new Error('AI generation failed.');
}
