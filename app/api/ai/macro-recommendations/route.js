import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import connectToDatabase from '@/lib/mongodb';
import FoodLog from '@/lib/FoodLog';
import User from '@/lib/User';
import Recipe from '@/lib/Recipe';
import AIMealRecommendation from '@/lib/AIMealRecommendation';
import { generateJSON } from '@/lib/aiClient';
import { recordAIUsage } from '@/lib/recordAIUsage';
import { getTodayPH } from '@/lib/dateUtils';

const VALID_MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'];
export const maxDuration = 45;

function publicAIError(error) {
  const status = Number(error?.status || error?.response?.status);
  const code = String(error?.code || '').toUpperCase();
  const message = String(error?.message || '');

  if (/GEMINI_API_KEY is missing/i.test(message)) {
    return 'NutriAI is not configured on the server. Please contact the administrator.';
  }
  if (status === 401 || status === 403 || /API_KEY_INVALID|INVALID_API_KEY|PERMISSION_DENIED/.test(code + ' ' + message.toUpperCase())) {
    return 'The Gemini API key is invalid or does not have permission. Please contact the administrator.';
  }
  if (status === 404 || /MODEL_NOT_FOUND|NOT_FOUND/.test(code + ' ' + message.toUpperCase())) {
    return 'The configured Gemini model is unavailable. Please contact the administrator.';
  }
  if (status === 429 || /RESOURCE_EXHAUSTED|QUOTA|RATE_LIMIT/.test(code + ' ' + message.toUpperCase())) {
    return 'The shared Gemini free quota or rate limit has been reached. Please try again later.';
  }
  if (status >= 500 || /SERVICE_UNAVAILABLE|INTERNAL/.test(code + ' ' + message.toUpperCase())) {
    return 'Gemini is temporarily busy. Please try again in a little while.';
  }
  return 'The AI request failed. Please ask the administrator to check the Vercel function logs.';
}

export async function POST(req) {
  let failedStep = 'database connection';
  try {
    await connectToDatabase();
    failedStep = 'reading the user and food-log data';
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
    if (cached) {
      await recordAIUsage({ userId, feature: 'meal-recommendations-cache', status: 'cached' });
      return NextResponse.json({
        success: true, cached: true, targets: cached.targets, consumed: cached.consumed,
        deficit: cached.deficit, suggestions: cached.suggestions,
      });
    }

    failedStep = 'Gemini generation';
    const prompt = `You are NutriAI, a practical nutrition assistant. Suggest exactly 3 realistic ${mealType} meal ideas for this user. Personalize to their goal, dietary preferences, allergies, today's remaining macros, and foods already logged. Do not repeat foods already logged or include allergens. Nutrition values are estimates, not exact measurements. Keep reasons under 20 words.

Return only JSON:
{"suggestions":[{"name":"meal name","calories":350,"protein":25,"carbs":35,"fat":10,"reason":"brief reason"}]}

Profile: ${JSON.stringify(profile)}
Consumed today: ${JSON.stringify(consumed)}
Remaining targets: ${JSON.stringify(deficit)}
Foods logged: ${JSON.stringify(foodHistory)}
Possible saved recipes (per serving): ${JSON.stringify(recipes)}`;

    const ai = await generateJSON(prompt, { retries: 0, userId, feature: 'meal-recommendations', maxOutputTokens: 420 });
    failedStep = 'saving the generated recommendations';
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
    });
  } catch (error) {
    console.error('AI Macro Recommendations Error:', { step: failedStep, status: error?.status || error?.response?.status, code: error?.code, message: error?.message || error });
    const message = failedStep === 'Gemini generation'
      ? publicAIError(error)
      : 'NutriAI could not complete ' + failedStep + '. Please try again later.';
    return NextResponse.json({ success: false, error: message }, { status: 503 });
  }
}
