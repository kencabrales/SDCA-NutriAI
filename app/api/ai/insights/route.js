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

// Coalesce identical concurrent requests in this Node process.
const activeDailyInsightGenerations =
  globalThis.__nutriAIDailyInsightGenerations ||
  (globalThis.__nutriAIDailyInsightGenerations = new Map());
const TRANSIENT_FAILURE_COOLDOWN_MS = 30_000;

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

function buildNutritionObservation(dailySummaries, profile) {
  const loggedDays = dailySummaries.filter((day) => day.meals.length > 0);
  if (!loggedDays.length) return null;

  const highSugarEntries = loggedDays.flatMap((day) =>
    day.meals
      .filter((meal) => Number(meal.sugar) >= 15)
      .map((meal) => ({ ...meal, date: day.date }))
  );
  const sugarReference = Number(profile.dailyTargets?.sugar) > 0
    ? Number(profile.dailyTargets.sugar)
    : 50;
  const highSugarDays = loggedDays.filter((day) => Number(day.sugar) >= sugarReference);

  if (highSugarDays.length >= 2) {
    return `Your food logs recorded at least ${sugarReference} g of total sugar on ${highSugarDays.length} of ${loggedDays.length} logged days. Try limiting the frequency and portions of foods or drinks with added/free sugars. Repeatedly high added/free sugar intake can contribute to unhealthy weight gain and is associated with type 2 diabetes risk. Your food records show total sugar and cannot distinguish added sugar from naturally occurring sugar, so this is a pattern to review—not a diagnosis or a prediction that you will develop diabetes.`;
  }

  if (highSugarEntries.length) {
    const entry = highSugarEntries[0];
    return `The logged serving of ${String(entry.food || 'this food').slice(0, 80)} contains ${Number(entry.sugar).toFixed(1)} g of recorded total sugar. Keep an eye on serving size and how often you choose foods or drinks with added/free sugars. This value may include naturally occurring sugar, and one food does not mean you have or will develop diabetes.`;
  }

  const highSodiumDays = loggedDays.filter((day) => Number(day.sodium) >= 2300);
  if (highSodiumDays.length >= 2) {
    return `Your food logs recorded 2,300 mg or more of sodium on ${highSodiumDays.length} of ${loggedDays.length} logged days. Frequently high sodium intake can contribute to high blood pressure. Check packaged-food labels and seasonings, and compare your portions. This observation is based only on nutrient values recorded in NutriAI.`;
  }

  const highSatFatDays = loggedDays.filter((day) => Number(day.satFat) >= 20);
  if (highSatFatDays.length >= 2) {
    return `Your food logs recorded 20 g or more of saturated fat on ${highSatFatDays.length} of ${loggedDays.length} logged days. Consider balancing foods high in saturated fat with options containing unsaturated fats. This is a nutrition pattern to review, not a medical diagnosis.`;
  }

  return null;
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
        sugar: sum(dayLogs, 'sugar'), sodium: sum(dayLogs, 'sodium'),
        fiber: sum(dayLogs, 'fiber'), satFat: sum(dayLogs, 'satFat'),
        meals: dayLogs.map((log) => ({
          food: log.foodName, meal: log.mealType, calories: Number(log.calories) || 0,
          protein: Number(log.protein) || 0, carbs: Number(log.carbs) || 0, fat: Number(log.fat) || 0,
          sugar: Number(log.sugar) || 0, sodium: Number(log.sodium) || 0,
          fiber: Number(log.fiber) || 0, satFat: Number(log.satFat) || 0,
          amount: Number(log.amount) || null, unit: log.unit || null,
        })),
      };
    });
    const todayTotals = {
      calories: sum(todayLogs, 'calories'), protein: sum(todayLogs, 'protein'),
      carbs: sum(todayLogs, 'carbs'), fat: sum(todayLogs, 'fat'),
      sugar: sum(todayLogs, 'sugar'), sodium: sum(todayLogs, 'sodium'),
      fiber: sum(todayLogs, 'fiber'), satFat: sum(todayLogs, 'satFat'),
      foods: todayLogs.map((log) => ({
        name: log.foodName, meal: log.mealType, calories: Number(log.calories) || 0,
        protein: Number(log.protein) || 0, carbs: Number(log.carbs) || 0, fat: Number(log.fat) || 0,
        sugar: Number(log.sugar) || 0, sodium: Number(log.sodium) || 0,
        fiber: Number(log.fiber) || 0, satFat: Number(log.satFat) || 0,
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
      dailyTargets: {
        calories: user.targetCalories || null,
        protein: user.targetProtein || user.proteinGrams || null,
        carbs: user.targetCarbs || user.carbsGrams || null,
        fat: user.targetFat || user.fatGrams || null,
        sugar: user.sugarGoal || null,
        sodium: user.sodiumGoal || null,
        fiber: user.fiberGoal || null,
        satFat: user.satFatGoal || null,
      },
      dietaryPreferences: user.dietaryPreferences || user.dietType || user.dietaryRestrictions || null,
    };

    // Include the nutrition profile in the cache key so profile edits invalidate old advice.
    const insightsFingerprint = createHash('sha256')
      .update(JSON.stringify({ dailySummaries, profile }))
      .digest('hex');
    const nutritionObservation = buildNutritionObservation(dailySummaries, profile);
    const cached = await AIInsight.findOne({ userId, date: today }).lean();
    if (!forceRefresh && cached && cached.insightsFingerprint === insightsFingerprint) {
      await recordAIUsage({ userId, feature: 'daily-insights-cache', status: 'cached' });
      return NextResponse.json(toPayload(cached, { cached: true, healthRisk: cached.healthRisk || nutritionObservation }));
    }

    if (
      generateRequested &&
      cached?.generationFingerprint === insightsFingerprint &&
      cached?.generationRetryAfter &&
      new Date(cached.generationRetryAfter).getTime() > Date.now()
    ) {
      const retryAfterSeconds = Math.max(1, Math.ceil((new Date(cached.generationRetryAfter).getTime() - Date.now()) / 1000));
      const warning = `Gemini is temporarily busy. NutriAI paused new generation attempts for ${retryAfterSeconds} more seconds to protect your usage allowance.`;
      if (cached.mealSuggestion || cached.behaviorInsight || cached.healthRisk) {
        return NextResponse.json(toPayload(cached, {
          cached: true,
          healthRisk: cached.healthRisk || nutritionObservation,
          stale: cached.insightsFingerprint !== insightsFingerprint,
          warning,
          retryAfterSeconds,
        }));
      }
      return NextResponse.json({
        mealSuggestion: null, behaviorInsight: null, healthRisk: nutritionObservation, warning, retryAfterSeconds,
      }, { status: 503, headers: { 'Retry-After': String(retryAfterSeconds) } });
    }

    if (!generateRequested) {
      const hasSavedInsight = Boolean(
        cached?.mealSuggestion || cached?.behaviorInsight || cached?.healthRisk || nutritionObservation
      );
      const cooldownActive = Boolean(
        cached?.generationFingerprint === insightsFingerprint &&
        cached?.generationRetryAfter &&
        new Date(cached.generationRetryAfter).getTime() > Date.now()
      );
      const retryAfterSeconds = cooldownActive
        ? Math.max(1, Math.ceil((new Date(cached.generationRetryAfter).getTime() - Date.now()) / 1000))
        : null;

      return NextResponse.json(toPayload(hasSavedInsight ? cached : null, {
        healthRisk: cached?.healthRisk || nutritionObservation,
        cached: hasSavedInsight,
        message: hasSavedInsight
          ? 'Showing your saved analysis. Generate again only when you want a new review.'
          : cooldownActive
            ? `Gemini is temporarily busy. You can try generating again in ${retryAfterSeconds} seconds.`
            : 'Select Generate Analysis when you are ready to use AI.',
        ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
      }));
    }

    const compactHistory = dailySummaries.map(({ date, calories, protein, carbs, fat, sugar, sodium, fiber, satFat, meals }) => ({
      date, calories, protein, carbs, fat, sugar, sodium, fiber, satFat,
      foods: meals.slice(0, 8),
    }));
    const prompt = [
      'You are NutriAI, a careful nutrition coach. Use only the supplied data; do not invent facts or diagnose.',
      'Return ONLY JSON: {"mealSuggestion":"one concise next-meal idea with a brief reason","behaviorInsight":"one concise evidence-based observation using actual numbers","healthRisk":"a concise Nutrition Observation or null"}.',
      'For healthRisk, look at recorded sugar, sodium and saturated-fat amounts across the logged days. When the data supports a concern, give one specific, non-alarmist observation with actual amounts and a practical suggestion. Do not say a single food causes diabetes, do not predict that this user will develop a disease, and do not diagnose. Distinguish total sugar in the food records from added/free sugar; the values may include naturally occurring sugar. If the logged nutrients are incomplete or no pattern is supported, return null.',
      'Profile and daily targets:', JSON.stringify(profile),
      'Today totals and foods:', JSON.stringify(todayTotals),
      'Last seven days (daily totals and up to eight food names per day):', JSON.stringify(compactHistory),
    ].join('\n\n');

    const generationKey = `${userId}:${today}:${insightsFingerprint}`;
    let generationPromise = activeDailyInsightGenerations.get(generationKey);
    const joinedExistingGeneration = Boolean(generationPromise);

    if (!generationPromise) {
      generationPromise = (async () => {
        const result = await withTimeout(
          (abortSignal) => generateJSON(prompt, {
            retries: 0,
            userId,
            feature: 'daily-insights',
            maxOutputTokens: 260,
            thinkingLevel: 'minimal',
            fallbackModel: process.env.GEMINI_DAILY_INSIGHTS_FALLBACK_MODEL || null,
            fallbackThinkingLevel: 'low',
            fallbackDelayMs: 1000,
            abortSignal,
          }),
          GENERATION_TIMEOUT_MS
        );

        const insight = {
          mealSuggestion: typeof result.mealSuggestion === 'string' ? result.mealSuggestion : null,
          behaviorInsight: typeof result.behaviorInsight === 'string' ? result.behaviorInsight : null,
          healthRisk: typeof result.healthRisk === 'string' && result.healthRisk.trim() ? result.healthRisk.trim() : nutritionObservation,
        };
        if (!insight.mealSuggestion || !insight.behaviorInsight) {
          throw new Error('Gemini returned an incomplete daily insight response.');
        }

        return AIInsight.findOneAndUpdate(
          { userId, date: today },
          {
            $set: { ...insight, insightsFingerprint, generatedAt: new Date(), stale: false },
            $unset: {
              generationRetryAfter: 1,
              generationErrorCode: 1,
              generationFingerprint: 1,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      })();
      activeDailyInsightGenerations.set(generationKey, generationPromise);
    }

    try {
      const saved = await generationPromise;
      if (activeDailyInsightGenerations.get(generationKey) === generationPromise) {
        activeDailyInsightGenerations.delete(generationKey);
      }
      return NextResponse.json(toPayload(saved, joinedExistingGeneration
        ? { cached: true, message: 'A matching analysis was generated by another request.' }
        : { cached: false }));
    } catch (generationError) {
      if (activeDailyInsightGenerations.get(generationKey) === generationPromise) {
        activeDailyInsightGenerations.delete(generationKey);
      }

      const errorDetails = getGenerationErrorDetails(generationError);
      console.error('NutriAI insight generation failed:', {
        name: generationError?.name || null,
        code: generationError?.code || null,
        status: errorDetails.status,
        message: generationError?.message || String(generationError),
        cause: generationError?.cause?.message || null,
      });

      try {
        const latest = await AIInsight.findOne({ userId, date: today }).lean();
        if (latest?.insightsFingerprint === insightsFingerprint) {
          return NextResponse.json(toPayload(latest, {
            cached: true,
            healthRisk: latest.healthRisk || nutritionObservation,
            message: 'Showing the latest analysis for your current food logs.',
          }));
        }
      } catch (cacheReadError) {
        console.error('Could not check the latest NutriAI cache:', cacheReadError?.message || cacheReadError);
      }

      const { status: providerStatus, diagnostic, isTimeout, isAbort } = errorDetails;
      const cooldownMs = providerStatus === 429
        ? 60_000
        : (isTimeout || [500, 502, 503, 504].includes(providerStatus) ? TRANSIENT_FAILURE_COOLDOWN_MS : 0);

      if (cooldownMs > 0) {
        try {
          await AIInsight.findOneAndUpdate(
            { userId, date: today },
            {
              $set: {
                generationRetryAfter: new Date(Date.now() + cooldownMs),
                generationErrorCode: String(providerStatus || (isTimeout ? 'TIMEOUT' : 'TRANSIENT_ERROR')).slice(0, 80),
                generationFingerprint: insightsFingerprint,
              },
              $setOnInsert: { userId, date: today },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        } catch (cooldownError) {
          console.error('Could not save the NutriAI retry cooldown:', cooldownError?.message || cooldownError);
        }
      }

      if (cached && (cached.mealSuggestion || cached.behaviorInsight || cached.healthRisk)) {
        return NextResponse.json(toPayload(cached, {
          cached: true,
          healthRisk: cached.healthRisk || nutritionObservation,
          stale: cached.insightsFingerprint !== insightsFingerprint,
          warning: 'A fresh AI analysis could not be generated. Showing your last saved analysis.',
        }));
      }

      const warning = /GEMINI_API_KEY is missing/i.test(diagnostic)
        ? 'NutriAI is not configured on the server yet. Please contact the administrator.'
        : isTimeout
          ? 'Gemini is taking longer than expected to respond. Your last saved analysis is kept when available. Please try again after a short pause.'
          : providerStatus === 401 || providerStatus === 403 || /API_KEY_INVALID|INVALID_API_KEY|PERMISSION_DENIED/.test(diagnostic)
            ? 'The Gemini API key is invalid or does not have permission. Please contact the administrator.'
            : providerStatus === 404 || /MODEL_NOT_FOUND|NOT_FOUND/.test(diagnostic)
              ? 'The configured Gemini model is unavailable. Please contact the administrator.'
              : providerStatus === 400 || /INVALID_ARGUMENT|FAILED_PRECONDITION/.test(diagnostic)
                ? 'Gemini rejected the generation settings. Please ask the administrator to verify the model and its supported options.'
                : providerStatus === 429 || /RESOURCE_EXHAUSTED|QUOTA|RATE_LIMIT/.test(diagnostic)
                  ? 'The shared Gemini free quota or rate limit has been reached. NutriAI has paused new attempts briefly to avoid repeated requests.'
                  : providerStatus === 504 || /DEADLINE_EXCEEDED/.test(diagnostic)
                    ? 'Gemini could not finish the request in time. Please try again later.'
                    : providerStatus === 503 || /UNAVAILABLE|SERVICE_UNAVAILABLE|INTERNAL/.test(diagnostic)
                      ? 'Gemini is temporarily unavailable. NutriAI has paused new attempts briefly to protect your usage allowance.'
                      : isAbort
                        ? 'The Gemini request was interrupted before it completed. Please try again.'
                        : providerStatus >= 500
                          ? 'Gemini is temporarily busy. Please try again in a little while.'
                          : 'NutriAI could not complete the analysis. Please ask the administrator to check the server logs.';

      return NextResponse.json({
        mealSuggestion: null,
        behaviorInsight: null,
        healthRisk: nutritionObservation,
        warning,
        retryAfterSeconds: cooldownMs ? Math.ceil(cooldownMs / 1000) : null,
      }, {
        status: 503,
        ...(cooldownMs ? { headers: { 'Retry-After': String(Math.ceil(cooldownMs / 1000)) } } : {}),
      });
    }
  } catch (error) {
    console.error('AI Insights API Error:', error);
    return NextResponse.json({ error: 'Failed to load NutriAI analysis. Please try again later.' }, { status: 500 });
  }
}
