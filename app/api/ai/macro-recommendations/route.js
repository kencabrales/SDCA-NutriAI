import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import connectToDatabase from '@/lib/mongodb';
import FoodLog from '@/lib/FoodLog';
import User from '@/lib/User';
import Recipe from '@/lib/Recipe';
import AIMealRecommendation from '@/lib/AIMealRecommendation';
import AIMealUsage from '@/lib/AIMealUsage';
import { generateJSON } from '@/lib/aiClient';
import { getTodayPH } from '@/lib/dateUtils';

const DAILY_GENERATION_LIMIT = 3;
const COOLDOWN_MS = 60 * 1000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const VALID_MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'];

function usageInfo(requests = 0) {
  return {
    dailyLimit: DAILY_GENERATION_LIMIT,
    used: requests,
    remaining: Math.max(0, DAILY_GENERATION_LIMIT - requests),
  };
}

async function reserveGeneration(userId, date) {
  const now = new Date();
  const usageFilter = {
    userId,
    date,
    requests: { $lt: DAILY_GENERATION_LIMIT },
    $or: [
      { lastRequestedAt: null },
      { lastRequestedAt: { $lte: new Date(now.getTime() - COOLDOWN_MS) } },
    ],
  };

  try {
    const updated = await AIMealUsage.findOneAndUpdate(
      usageFilter,
      { $inc: { requests: 1 }, $set: { lastRequestedAt: now } },
      { new: true }
    );
    if (updated) return { allowed: true, usage: usageInfo(updated.requests) };

    let current = await AIMealUsage.findOne({ userId, date }).lean();
    if (!current) {
      try {
        current = await AIMealUsage.create({ userId, date, requests: 1, lastRequestedAt: now });
        return { allowed: true, usage: usageInfo(current.requests) };
      } catch (error) {
        if (error?.code !== 11000) throw error;
        current = await AIMealUsage.findOne({ userId, date }).lean();
      }
    }

    const count = Number(current?.requests) || 0;
    const lastRequest = current?.lastRequestedAt ? new Date(current.lastRequestedAt).getTime() : 0;
    if (count >= DAILY_GENERATION_LIMIT) {
      return { allowed: false, status: 429, error: 'You have reached the 3 AI meal generations allowed today.', usage: usageInfo(count) };
    }
    if (lastRequest && now.getTime() - lastRequest < COOLDOWN_MS) {
      return { allowed: false, status: 429, error: 'Please wait 60 seconds before requesting another new AI suggestion.', usage: usageInfo(count) };
    }
    return { allowed: false, status: 429, error: 'Another suggestion request is being processed. Please try again shortly.', usage: usageInfo(count) };
  } catch (error) {
    if (error?.code === 11000) {
      return { allowed: false, status: 429, error: 'Another suggestion request is being processed. Please try again shortly.', usage: usageInfo(1) };
    }
    throw error;
  }
}

export async function POST(req) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const userId = body.userId;
    const requestedDate = body.date || getTodayPH();
    const mealType = String(body.mealType || '').toLowerCase();

    if (!userId || !/^[a-f\d]{24}$/i.test(String(userId))) {
      return NextResponse.json({ success: false, error: 'A valid userId is required.' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate) || !VALID_MEALS.includes(mealType)) {
      return NextResponse.json({ success: false, error: 'Choose a valid date and meal type.' }, { status: 400 });
    }

    const user = await User.findById(userId).lean();
    if (!user) return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });

    const [todayLogs, availableRecipes] = await Promise.all([
      FoodLog.find({ userId, $or: [{ logDate: requestedDate }, { date: requestedDate }] }).lean(),
      Recipe.find({ $or: [{ userId: String(userId) }, { privacy: 'Public' }] }).limit(12).lean(),
    ]);

    const total = (field) => todayLogs.reduce((sum, log) => sum + (Number(log[field]) || 0), 0);
    const targets = {
      calories: Number(user.targetCalories) || 2000,
      protein: Number(user.targetProtein || user.proteinGrams) || 0,
      carbs: Number(user.targetCarbs || user.carbsGrams) || 0,
      fat: Number(user.targetFat || user.fatGrams) || 0,
    };
    const consumed = {
      calories: Math.round(total('calories')),
      protein: Math.round(total('protein')),
      carbs: Math.round(total('carbs')),
      fat: Math.round(total('fat')),
    };
    const deficit = Object.fromEntries(Object.keys(targets).map((key) => [key, Math.max(0, targets[key] - consumed[key])]));
    const profile = {
      goal: user.goal || user.nutritionalStrategy || user.weeklyGoal || 'maintain',
      activityLevel: user.activityLevel || null,
      dietaryPreferences: user.dietaryPreferences || user.dietType || user.dietaryRestrictions || null,
      allergies: user.allergies || user.foodAllergies || null,
      dailyTargets: targets,
    };
    const foodHistory = todayLogs.map((log) => ({ food: log.foodName, meal: log.mealType }));
    const recipes = availableRecipes.map((recipe) => ({
      name: recipe.name || recipe.recipeName,
      calories: recipe.perServingCalories || recipe.totalCalories || 0,
      protein: recipe.perServingProtein || recipe.totalProtein || 0,
      carbs: recipe.perServingCarbs || recipe.totalCarbs || 0,
      fat: recipe.perServingFat || recipe.totalFat || 0,
    }));
    const fingerprint = createHash('sha256').update(JSON.stringify({ requestedDate, mealType, profile, consumed, deficit, foodHistory, recipes })).digest('hex');

    const cached = await AIMealRecommendation.findOne({ userId, date: requestedDate, mealType, fingerprint }).lean();
    if (cached && Date.now() - new Date(cached.generatedAt).getTime() < CACHE_TTL_MS) {
      const usage = await AIMealUsage.findOne({ userId, date: requestedDate }).lean();
      return NextResponse.json({
        success: true, cached: true, targets: cached.targets, consumed: cached.consumed,
        deficit: cached.deficit, suggestions: cached.suggestions,
        usage: usageInfo(usage?.requests || 0),
      });
    }

    const reservation = await reserveGeneration(userId, requestedDate);
    if (!reservation.allowed) {
      return NextResponse.json({ success: false, error: reservation.error, usage: reservation.usage }, {
        status: reservation.status,
        headers: { 'Retry-After': '60' },
      });
    }

    const prompt = `You are NutriAI, a practical nutrition assistant. Suggest exactly 3 realistic ${mealType} meal ideas for this user. Personalize to their goal, dietary preferences, allergies, today's remaining macros, and foods already logged. Do not repeat foods already logged or include allergens. Nutrition values are estimates, not exact measurements. Keep reasons under 20 words.

Return only JSON:
{"suggestions":[{"name":"meal name","calories":350,"protein":25,"carbs":35,"fat":10,"reason":"brief reason"}]}

Profile: ${JSON.stringify(profile)}
Consumed today: ${JSON.stringify(consumed)}
Remaining targets: ${JSON.stringify(deficit)}
Foods logged: ${JSON.stringify(foodHistory)}
Possible saved recipes (per serving): ${JSON.stringify(recipes)}`;

    const ai = await generateJSON(prompt, { retries: 0 });
    const suggestions = Array.isArray(ai.suggestions)
      ? ai.suggestions.filter((item) => item && typeof item.name === 'string').slice(0, 3).map((item) => ({
          name: item.name.trim(),
          calories: Math.max(0, Number(item.calories) || 0),
          protein: Math.max(0, Number(item.protein) || 0),
          carbs: Math.max(0, Number(item.carbs) || 0),
          fat: Math.max(0, Number(item.fat) || 0),
          reason: typeof item.reason === 'string' ? item.reason : '',
        }))
      : [];
    if (!suggestions.length) throw new Error('Gemini returned no valid meal suggestions.');

    await AIMealRecommendation.findOneAndUpdate(
      { userId, date: requestedDate, mealType },
      { $set: { fingerprint, targets, consumed, deficit, suggestions, generatedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      success: true, cached: false, targets, consumed, deficit, suggestions,
      usage: reservation.usage,
    });
  } catch (error) {
    console.error('AI Macro Recommendations Error:', error?.message || error);
    return NextResponse.json({ success: false, error: 'Unable to generate meal recommendations right now. Please try again later.' }, { status: 503 });
  }
}
