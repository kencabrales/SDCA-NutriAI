import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import dbConnect from '@/lib/mongodb';
import FoodLog from '@/lib/FoodLog';
import User from '@/lib/User';
import AIInsight from '@/lib/AIInsight';
import AIUsageEvent from '@/lib/AIUsageEvent';
import { generateJSON } from '@/lib/aiClient';
import { recordAIUsage } from '@/lib/recordAIUsage';
import { getTodayPH, dateStringToUTCAnchor, addDaysUTC, utcAnchorToDateString } from '@/lib/dateUtils';

const CACHE_FRESH_MS = 24 * 60 * 60 * 1000;
const GENERATION_TIMEOUT_MS = 30000;
const DAILY_GENERATION_LIMIT = 3;
export const maxDuration = 45;

function getLastNDates(count, endDate) {
  const anchor = dateStringToUTCAnchor(endDate);
  return Array.from({ length: count }, (_, index) => utcAnchorToDateString(addDaysUTC(anchor, -index)));
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Gemini generation timed out')), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function sum(logs, field) {
  return Math.round(logs.reduce((total, log) => total + (Number(log[field]) || 0), 0) * 10) / 10;
}

function toPayload(insight, extra = {}) {
  return { mealSuggestion: insight?.mealSuggestion || null, behaviorInsight: insight?.behaviorInsight || null, healthRisk: insight?.healthRisk || null, ...extra };
}

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const generateRequested = searchParams.get('generate') === 'true';
    const forceRefresh = false;
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

    const insightsFingerprint = createHash('sha256').update(JSON.stringify(dailySummaries)).digest('hex');
    const cached = await AIInsight.findOne({ userId, date: today }).lean();
    const cacheAgeMs = cached ? Date.now() - new Date(cached.generatedAt).getTime() : Infinity;
    if (cached && !forceRefresh && cached.insightsFingerprint === insightsFingerprint && cacheAgeMs < CACHE_FRESH_MS) {
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

    const analysisDayStart = new Date(today + 'T00:00:00+08:00');
    const generationsToday = await AIUsageEvent.countDocuments({
      userId, feature: 'daily-insights', status: 'success',
      createdAt: { $gte: analysisDayStart },
    });
    if (generationsToday >= DAILY_GENERATION_LIMIT) {
      if (cached) return NextResponse.json(toPayload(cached, { cached: true, stale: true, message: 'Your daily AI analyst limit has been reached. Showing your last saved analysis.' }));
      return NextResponse.json({
        mealSuggestion: null, behaviorInsight: null, healthRisk: null,
        message: 'You have used all ' + DAILY_GENERATION_LIMIT + ' AI analyst generations for today. Your food diary and nutrition tracking remain available.',
      }, { status: 429 });
    }

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
    ].join('\\n\\n');

    try {
      const result = await withTimeout(generateJSON(prompt, { retries: 0, userId, feature: 'daily-insights', maxOutputTokens: 260 }), GENERATION_TIMEOUT_MS);
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
      console.error('NutriAI insight generation failed:', generationError?.message || generationError);

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
      const detail = String(generationError?.message || '');
      const code = String(generationError?.code || '').toUpperCase();
      const providerStatus = Number(generationError?.status || generationError?.response?.status);
      const diagnostic = code + ' ' + detail.toUpperCase();
      const warning = /GEMINI_API_KEY is missing/i.test(detail)
        ? 'NutriAI is not configured on the server yet. Please contact the administrator.'
        : providerStatus === 401 || providerStatus === 403 || /API_KEY_INVALID|INVALID_API_KEY|PERMISSION_DENIED/.test(diagnostic)
          ? 'The Gemini API key is invalid or does not have permission. Please contact the administrator.'
          : providerStatus === 404 || /MODEL_NOT_FOUND|NOT_FOUND/.test(diagnostic)
            ? 'The configured Gemini model is unavailable. Please contact the administrator.'
            : providerStatus === 429 || /RESOURCE_EXHAUSTED|QUOTA|RATE_LIMIT/.test(diagnostic)
              ? 'The shared Gemini free quota or rate limit has been reached. Please try again later.'
              : providerStatus >= 500 || /SERVICE_UNAVAILABLE|INTERNAL/.test(diagnostic)
                ? 'Gemini is temporarily busy. Please try again in a little while.'
                : 'NutriAI could not complete the analysis. Please ask the administrator to check the Vercel function logs.';
      return NextResponse.json({ mealSuggestion: null, behaviorInsight: null, healthRisk: null, warning }, { status: 503 });
    }
  } catch (error) {
    console.error('AI Insights API Error:', error);
    return NextResponse.json({ error: 'Failed to load NutriAI analysis. Please try again later.' }, { status: 500 });
  }
}
