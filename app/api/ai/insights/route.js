import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import dbConnect from '@/lib/mongodb';
import FoodLog from '@/lib/FoodLog';
import User from '@/lib/User';
import AIInsight from '@/lib/AIInsight';
import { generateJSON } from '@/lib/aiClient';
import { recordAIUsage } from '@/lib/recordAIUsage';
import { getTodayPH, dateStringToUTCAnchor, addDaysUTC, utcAnchorToDateString } from '@/lib/dateUtils';

const GENERATION_TIMEOUT_MS = 25000;
export const maxDuration = 45;

function getLastNDates(count, endDate) {
  const anchor = dateStringToUTCAnchor(endDate);
  return Array.from({ length: count }, (_, index) => utcAnchorToDateString(addDaysUTC(anchor, -index)));
}

function withTimeout(task, ms) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      const error = new Error('Gemini generation timed out');
      error.code = 'AI_GENERATION_TIMEOUT';
      reject(error);
    }, ms);
  });

  const generation = Promise.resolve()
    .then(() => task(controller.signal))
    .catch((error) => {
      // The timeout controller aborts the SDK request. Normalize that SDK
      // AbortError so it cannot hide the route's own timeout classification.
      if (controller.signal.aborted) {
        const timeoutError = new Error('Gemini generation timed out');
        timeoutError.code = 'AI_GENERATION_TIMEOUT';
        timeoutError.cause = error;
        throw timeoutError;
      }
      throw error;
    });

  return Promise.race([generation, timeout]).finally(() => clearTimeout(timer));
}

function sum(logs, field) {
  return Math.round(logs.reduce((total, log) => total + (Number(log[field]) || 0), 0) * 10) / 10;
}

function toPayload(insight, extra = {}) {
  return { mealSuggestion: insight?.mealSuggestion || null, behaviorInsight: insight?.behaviorInsight || null, healthRisk: insight?.healthRisk || null, ...extra };
}

function getGenerationErrorDetails(error) {
  const message = String(error?.message || '');
  let parsedMessage = null;

  try {
    parsedMessage = JSON.parse(message);
  } catch {
    // The SDK may expose a plain-text message instead of a JSON error body.
  }

  const providerError = parsedMessage?.error || error?.error || error?.response?.data?.error || {};
  const statusCandidates = [
    error?.status,
    error?.response?.status,
    error?.cause?.status,
    providerError?.code,
    typeof error?.code === 'number' ? error.code : null,
  ];

  const status = statusCandidates
    .map((value) => Number(value))
    .find((value) => Number.isInteger(value) && value >= 400 && value <= 599) || null;

  const code = String(
    error?.code || error?.status || providerError?.status || error?.name || ''
  ).toUpperCase();
  const diagnostic = [
    code,
    String(error?.status || ''),
    String(providerError?.status || ''),
    String(error?.statusText || ''),
    message,
    String(error?.cause?.message || ''),
  ].join(' ').toUpperCase();

  return {
    status,
    code,
    diagnostic,
    isTimeout: code === 'AI_GENERATION_TIMEOUT' ||
      /GEMINI GENERATION TIMED OUT|REQUESTTIMEOUT|DEADLINE_EXCEEDED|TIMEOUT/.test(diagnostic),
    isAbort: error?.name === 'AbortError' || Number(error?.code) === 20 ||
      /THIS OPERATION WAS ABORTED|ABORT_ERR/.test(diagnostic),
  };
}

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const generateRequested = searchParams.get('generate') === 'true';
    const forceRefresh = searchParams.get('refresh') === 'true';
    if (!userId || !/^[a-f\d]{24}$/i.test(userId)) {
      return NextResponse.json({ error: 'A valid userId is required.' }, { status: 400 });
    }

    const user = await User.findById(userId).lean();
    if (!user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    const today = getTodayPH();
    const dates = getLastNDates(7, today);
    const logs = await FoodLog.find({
      userId,
      $or: [{ logDate: { $in: dates } }, { date: { $in: dates } }],
    }).sort({ logDate: -1, createdAt: -1 }).lean();

    if (!logs.length) {
      return NextResponse.json({
        mealSuggestion: null, behaviorInsight: null, healthRisk: null, cached: false,
        message: 'No food logs were found in the last seven days. Log a meal to unlock your personalized AI analyst.',
      });
    }

    const getLogDate = (log) => String(log.logDate || log.date || '').slice(0, 10);
    const todayLogs = logs.filter((log) => getLogDate(log) === today);
    const dailySummaries = dates.map((date) => {
      const dayLogs = logs.filter((log) => getLogDate(log) === date);
      return {
        date, calories: sum(dayLogs, 'calories'), protein: sum(dayLogs, 'protein'),
        carbs: sum(dayLogs, 'carbs'), fat: sum(dayLogs, 'fat'),
        meals: dayLogs.map((log) => ({
          food: log.foodName, meal: log.mealType, calories: Number(log.calories) || 0,
          protein: Number(log.protein) || 0, carbs: Number(log.carbs) || 0, fat: Number(log.fat) || 0,
        })),
      };
    });
    const todayTotals = {
      calories: sum(todayLogs, 'calories'), protein: sum(todayLogs, 'protein'),
      carbs: sum(todayLogs, 'carbs'), fat: sum(todayLogs, 'fat'),
      foods: todayLogs.map((log) => ({
        name: log.foodName, meal: log.mealType, calories: Number(log.calories) || 0,
        protein: Number(log.protein) || 0, carbs: Number(log.carbs) || 0, fat: Number(log.fat) || 0,
      })),
    };

    const profile = {
      age: user.age || null, sex: user.sex || user.gender || null,
      height: user.height || user.heightInput || null,
      currentWeight: user.currentWeight || user.weight || null, weightUnit: user.weightUnit || 'kg',
      goalWeight: user.goalWeight || null,
      goal: user.goal || user.nutritionalStrategy || user.weeklyGoal || 'maintain',
      nutritionalStrategy: user.nutritionalStrategy || user.weeklyPace || user.weeklyGoal || 'maintain',
      activityLevel: user.activityLevel || null,
      dailyTargets: { calories: user.targetCalories || null, protein: user.targetProtein || user.proteinGrams || null, carbs: user.targetCarbs || user.carbsGrams || null, fat: user.targetFat || user.fatGrams || null },
      dietaryPreferences: user.dietaryPreferences || user.dietType || user.dietaryRestrictions || null,
    };

    // Include the nutrition profile in the cache key so profile edits invalidate old advice.
    const insightsFingerprint = createHash('sha256')
      .update(JSON.stringify({ dailySummaries, profile }))
      .digest('hex');
    const cached = await AIInsight.findOne({ userId, date: today }).lean();
    if (!forceRefresh && cached && cached.insightsFingerprint === insightsFingerprint) {
      await recordAIUsage({ userId, feature: 'daily-insights-cache', status: 'cached' });
      return NextResponse.json(toPayload(cached, { cached: true }));
    }

    if (!generateRequested) {
      return NextResponse.json(toPayload(cached, {
        cached: Boolean(cached),
        message: cached
          ? 'Showing your saved analysis. Generate again only when you want a new review.'
          : 'Select Generate Analysis when you are ready to use AI.',
      }));
    }

    const compactHistory = dailySummaries.map(({ date, calories, protein, carbs, fat, meals }) => ({
      date, calories, protein, carbs, fat,
      foods: meals.slice(0, 8).map(({ food, meal }) => ({ food, meal })),
    }));
    const prompt = [
      'You are NutriAI, a careful nutrition coach. Use only the supplied data; do not invent facts or diagnose.',
      'Return ONLY JSON: {"mealSuggestion":"one concise next-meal idea with a brief reason","behaviorInsight":"one concise evidence-based observation using actual numbers","healthRisk":null}. Set healthRisk only for a repeated, clearly supported nutrition concern; otherwise null.',
      'Profile and daily targets:', JSON.stringify(profile),
      'Today totals and foods:', JSON.stringify(todayTotals),
      'Last seven days (daily totals and up to eight food names per day):', JSON.stringify(compactHistory),
    ].join('\n\n');

    try {
      const result = await withTimeout(
        (abortSignal) => generateJSON(prompt, {
          retries: 0, userId, feature: 'daily-insights',
          maxOutputTokens: 260, thinkingLevel: 'minimal', abortSignal,
        }),
        GENERATION_TIMEOUT_MS
      );
      const insight = {
        mealSuggestion: typeof result.mealSuggestion === 'string' ? result.mealSuggestion : null,
        behaviorInsight: typeof result.behaviorInsight === 'string' ? result.behaviorInsight : null,
        healthRisk: typeof result.healthRisk === 'string' ? result.healthRisk : null,
      };
      if (!insight.mealSuggestion || !insight.behaviorInsight) throw new Error('Gemini returned an incomplete daily insight response.');
      const saved = await AIInsight.findOneAndUpdate(
        { userId, date: today },
        { ...insight, insightsFingerprint, generatedAt: new Date(), stale: false },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return NextResponse.json(toPayload(saved, { cached: false }));
    } catch (generationError) {
      const errorDetails = getGenerationErrorDetails(generationError);
      console.error('NutriAI insight generation failed:', {
        name: generationError?.name || null,
        code: generationError?.code || null,
        status: errorDetails.status,
        message: generationError?.message || String(generationError),
        cause: generationError?.cause?.message || null,
      });

      // Dashboard and Diary can request the same daily analysis close together.
      // If the other request saved it first, reuse that matching result.
      try {
        const latest = await AIInsight.findOne({ userId, date: today }).lean();
        if (latest?.insightsFingerprint === insightsFingerprint) {
          return NextResponse.json(toPayload(latest, {
            cached: true,
            message: 'Showing the latest analysis for your current food logs.',
          }));
        }
      } catch (cacheReadError) {
        console.error('Could not check the latest NutriAI cache:', cacheReadError?.message || cacheReadError);
      }

      if (cached) return NextResponse.json(toPayload(cached, { cached: true, stale: true, warning: 'A fresh AI analysis could not be generated. Showing your last saved analysis.' }));
      const { status: providerStatus, diagnostic, isTimeout, isAbort } = errorDetails;
      const warning = /GEMINI_API_KEY is missing/i.test(diagnostic)
        ? 'NutriAI is not configured on the server yet. Please contact the administrator.'
        : isTimeout
          ? 'Gemini is taking longer than expected to respond. Please wait a minute before trying again.'
          : providerStatus === 401 || providerStatus === 403 || /API_KEY_INVALID|INVALID_API_KEY|PERMISSION_DENIED/.test(diagnostic)
            ? 'The Gemini API key is invalid or does not have permission. Please contact the administrator.'
            : providerStatus === 404 || /MODEL_NOT_FOUND|NOT_FOUND/.test(diagnostic)
              ? 'The configured Gemini model is unavailable. Please contact the administrator.'
              : providerStatus === 400 || /INVALID_ARGUMENT|FAILED_PRECONDITION/.test(diagnostic)
                ? 'Gemini rejected the generation settings. Please ask the administrator to verify the model and its supported options.'
                : providerStatus === 429 || /RESOURCE_EXHAUSTED|QUOTA|RATE_LIMIT/.test(diagnostic)
                  ? 'The shared Gemini free quota or rate limit has been reached. Please try again later.'
                  : providerStatus === 504 || /DEADLINE_EXCEEDED/.test(diagnostic)
                    ? 'Gemini could not finish the request in time. Please try again later.'
                    : providerStatus === 503 || /UNAVAILABLE|SERVICE_UNAVAILABLE|INTERNAL/.test(diagnostic)
                      ? 'Gemini is temporarily unavailable. Please try again in a little while.'
                      : isAbort
                        ? 'The Gemini request was interrupted before it completed. Please try again.'
                        : providerStatus >= 500
                          ? 'Gemini is temporarily busy. Please try again in a little while.'
                          : 'NutriAI could not complete the analysis. Please ask the administrator to check the server logs.';
      return NextResponse.json({ mealSuggestion: null, behaviorInsight: null, healthRisk: null, warning }, { status: 503 });
    }
  } catch (error) {
    console.error('AI Insights API Error:', error);
    return NextResponse.json({ error: 'Failed to load NutriAI analysis. Please try again later.' }, { status: 500 });
  }
}
