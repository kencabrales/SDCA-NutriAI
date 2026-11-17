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

    const insightsFingerprint = createHash('sha256').update(JSON.stringify(dailySummaries)).digest('hex');
    const cached = await AIInsight.findOne({ userId, date: today }).lean();
    const cacheAgeMs = cached ? Date.now() - new Date(cached.generatedAt).getTime() : Infinity;
    if (cached && !forceRefresh && cached.insightsFingerprint === insightsFingerprint && cacheAgeMs < CACHE_FRESH_MS) {
      await recordAIUsage({ userId, feature: 'daily-insights-cache', status: 'cached' });
      return NextResponse.json(toPayload(cached, { cached: true }));
    }

    const analysisDayStart = new Date(today + 'T00:00:00+08:00');
    const generationsToday = await AIUsageEvent.countDocuments({
      userId, feature: 'daily-insights', status: { $in: ['success', 'failed', 'quota'] },
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
    const prompt = [
      'You are NutriAI, a careful and supportive nutrition coach inside a food-tracking app.',
      'Use ONLY the supplied user profile and food logs. Personalize recommendations to the user goals, body metrics, activity level, dietary preferences, foods already eaten today, and patterns across the last seven days.',
      'Return ONLY valid JSON with exactly these keys:',
      '{"mealSuggestion":"A practical next-meal or snack suggestion that complements today logged foods and remaining nutrition needs. Name suitable foods and explain briefly why they fit.","behaviorInsight":"One or two sentences describing a specific, evidence-based pattern from the last seven days. Refer to actual foods or numbers.","healthRisk":null}',
      'Set healthRisk to a short, non-alarmist observation only when repeated logged data supports a meaningful nutrition concern; otherwise use null. Do not diagnose disease, infer medical conditions, shame the user, or invent missing information. If there are no logs today, suggest a reasonable next meal based on goals and recent history. Do not recommend extreme restriction or unsafe calorie targets.',
      'User profile and goals:', JSON.stringify(profile, null, 2),
      'Today food log (' + today + ', Philippine time):', JSON.stringify(todayTotals, null, 2),
      'Food log history (last seven days):', JSON.stringify(dailySummaries, null, 2),
    ].join('\n\n');

    try {
      const result = await withTimeout(generateJSON(prompt, { retries: 0, userId, feature: 'daily-insights' }), GENERATION_TIMEOUT_MS);
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
      if (cached) return NextResponse.json(toPayload(cached, { cached: true, stale: true, warning: 'A fresh AI analysis could not be generated. Showing your last saved analysis.' }));
      const detail = String(generationError?.message || '');
      const warning = /GEMINI_API_KEY is missing/i.test(detail)
        ? 'NutriAI is not configured on the server yet. Please contact the administrator.'
        : /429|quota|RESOURCE_EXHAUSTED/i.test(detail)
          ? 'Gemini is temporarily out of free usage. Please try again later.'
          : 'NutriAI is temporarily unavailable. Your food logs and nutrition tracking are unaffected.';
      return NextResponse.json({ mealSuggestion: null, behaviorInsight: null, healthRisk: null, warning }, { status: 503 });
    }
  } catch (error) {
    console.error('AI Insights API Error:', error);
    return NextResponse.json({ error: 'Failed to load NutriAI analysis. Please try again later.' }, { status: 500 });
  }
}
