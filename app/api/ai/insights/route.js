import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import FoodLog from '@/lib/FoodLog';
import User from '@/lib/User';
import AIInsight from '@/lib/AIInsight';
import { generateJSON } from '@/lib/aiClient';
import { getTodayPH, dateStringToUTCAnchor, addDaysUTC, utcAnchorToDateString } from '@/lib/dateUtils';

const CACHE_FRESH_MS = 5 * 60 * 1000;
const GENERATION_TIMEOUT_MS = 30000;

function getLastNDates(count, endDate) {
  const anchor = dateStringToUTCAnchor(endDate);
  return Array.from({ length: count }, (_, index) =>
    utcAnchorToDateString(addDaysUTC(anchor, -index))
  );
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Gemini generation timed out')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function sum(logs, field) {
  return Math.round(logs.reduce((total, log) => total + (Number(log[field]) || 0), 0) * 10) / 10;
}

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const dateStr = getTodayPH();
    const cached = await AIInsight.findOne({ userId, date: dateStr }).lean();
    const cacheAge = cached ? Date.now() - new Date(cached.generatedAt).getTime() : Infinity;

    if (cached && !forceRefresh && cacheAge < CACHE_FRESH_MS) {
      return NextResponse.json({
        mealSuggestion: cached.mealSuggestion,
        behaviorInsight: cached.behaviorInsight,
        healthRisk: cached.healthRisk,
        cached: true,
      });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const dates = getLastNDates(7, dateStr);
    const logs = await FoodLog.find({
      userId,
      $or: [
        { logDate: { $in: dates } },
        { date: { $in: dates } },
      ],
    }).sort({ logDate: -1, createdAt: -1 }).lean();

    if (!logs.length) {
      return NextResponse.json({
        mealSuggestion: null,
        behaviorInsight: null,
        healthRisk: null,
        message: 'Log some meals to unlock personalized nutrition insights.',
        cached: false,
      });
    }

    const getLogDate = (log) => String(log.logDate || log.date || '').slice(0, 10);
    const todayLogs = logs.filter((log) => getLogDate(log) === dateStr);

    const dailySummaries = dates.map((date) => {
      const dayLogs = logs.filter((log) => getLogDate(log) === date);
      return {
        date,
        calories: sum(dayLogs, 'calories'),
        protein: sum(dayLogs, 'protein'),
        carbs: sum(dayLogs, 'carbs'),
        fat: sum(dayLogs, 'fat'),
        meals: dayLogs.map((log) => ({
          food: log.foodName,
          meal: log.mealType,
          calories: Number(log.calories) || 0,
          protein: Number(log.protein) || 0,
          carbs: Number(log.carbs) || 0,
          fat: Number(log.fat) || 0,
        })),
      };
    });

    const todayTotals = {
      calories: sum(todayLogs, 'calories'),
      protein: sum(todayLogs, 'protein'),
      carbs: sum(todayLogs, 'carbs'),
      fat: sum(todayLogs, 'fat'),
      foods: todayLogs.map((log) => ({
        name: log.foodName,
        meal: log.mealType,
        calories: Number(log.calories) || 0,
        protein: Number(log.protein) || 0,
        carbs: Number(log.carbs) || 0,
        fat: Number(log.fat) || 0,
      })),
    };

    const profile = {
      age: user.age || null,
      sex: user.sex || user.gender || null,
      height: user.height || user.heightInput || null,
      currentWeight: user.currentWeight || user.weight || null,
      weightUnit: user.weightUnit || 'kg',
      goalWeight: user.goalWeight || null,
      goal: user.goal || user.nutritionalStrategy || user.weeklyGoal || 'maintain',
      nutritionalStrategy: user.nutritionalStrategy || user.weeklyPace || user.weeklyGoal || 'maintain',
      activityLevel: user.activityLevel || null,
      dailyTargets: {
        calories: user.targetCalories || null,
        protein: user.targetProtein || user.proteinGrams || null,
        carbs: user.targetCarbs || user.carbsGrams || null,
        fat: user.targetFat || user.fatGrams || null,
      },
      dietaryPreferences: user.dietaryPreferences || user.dietType || user.dietaryRestrictions || null,
    };

    const prompt = `You are NutriAI, a careful and supportive nutrition coach inside a food-tracking app.
Use ONLY the supplied user profile and food logs. Personalize recommendations to the user's goals, body metrics, activity level, dietary preferences, foods already eaten today, and patterns across the last seven days.

Return ONLY valid JSON with exactly these keys:
{
  "mealSuggestion": "A practical next-meal or snack suggestion that complements today's logged foods and remaining nutrition needs. Name suitable foods and explain briefly why they fit.",
  "behaviorInsight": "One or two sentences describing a specific, evidence-based pattern from the last seven days. Refer to actual foods or numbers.",
  "healthRisk": null
}

Set healthRisk to a short, non-alarmist observation ONLY when repeated logged data supports a meaningful nutrition concern; otherwise use null. Do not diagnose disease, infer medical conditions, shame the user, or invent missing information. If there are no logs today, suggest a reasonable next meal based on their goals and recent history. Do not recommend extreme restriction or unsafe calorie targets.

User profile and goals:
${JSON.stringify(profile, null, 2)}

Today's food log (${dateStr}, Philippine time):
${JSON.stringify(todayTotals, null, 2)}

Food log history (last seven days):
${JSON.stringify(dailySummaries, null, 2)}`;

    try {
      const result = await withTimeout(generateJSON(prompt, { retries: 1 }), GENERATION_TIMEOUT_MS);

      const insight = {
        mealSuggestion: typeof result.mealSuggestion === 'string' ? result.mealSuggestion : null,
        behaviorInsight: typeof result.behaviorInsight === 'string' ? result.behaviorInsight : null,
        healthRisk: typeof result.healthRisk === 'string' ? result.healthRisk : null,
      };

      if (!insight.mealSuggestion || !insight.behaviorInsight) {
        throw new Error('Gemini response is missing required insight fields.');
      }

      const saved = await AIInsight.findOneAndUpdate(
        { userId, date: dateStr },
        { ...insight, generatedAt: new Date(), stale: false },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return NextResponse.json({
        mealSuggestion: saved.mealSuggestion,
        behaviorInsight: saved.behaviorInsight,
        healthRisk: saved.healthRisk,
        cached: false,
      });
    } catch (generationError) {
      console.error('NutriAI insight generation failed:', generationError?.message || generationError);

      if (cached) {
        return NextResponse.json({
          mealSuggestion: cached.mealSuggestion,
          behaviorInsight: cached.behaviorInsight,
          healthRisk: cached.healthRisk,
          cached: true,
          stale: true,
          warning: 'Showing the last available AI insight because a fresh response could not be generated.',
        });
      }

      return NextResponse.json({
        mealSuggestion: null,
        behaviorInsight: null,
        healthRisk: null,
        cached: false,
        warning: 'AI insights are temporarily unavailable. Check the server log and GEMINI_API_KEY configuration.',
      }, { status: 503 });
    }
  } catch (error) {
    console.error('AI Insights API Error:', error);
    return NextResponse.json({ error: 'Failed to generate nutrition insights.' }, { status: 500 });
  }
}
