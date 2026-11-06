import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import FoodLog from '@/lib/FoodLog';
import User from '@/lib/User';
import Recipe from '@/lib/Recipe';
import { generateJSON } from '@/lib/aiClient';
import { getTodayPH } from '@/lib/dateUtils';

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const requestedDate = searchParams.get('date') || getTodayPH();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [todayLogs, availableRecipes] = await Promise.all([
      FoodLog.find({
        userId,
        $or: [{ logDate: requestedDate }, { date: requestedDate }],
      }).lean(),
      Recipe.find({}).limit(30).lean(),
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
    const deficit = Object.fromEntries(
      Object.keys(targets).map((key) => [key, Math.max(0, targets[key] - consumed[key])])
    );

    const profile = {
      goal: user.goal || user.nutritionalStrategy || user.weeklyGoal || 'maintain',
      activityLevel: user.activityLevel || null,
      dietaryPreferences: user.dietaryPreferences || user.dietType || user.dietaryRestrictions || null,
      allergies: user.allergies || user.foodAllergies || null,
      dailyTargets: targets,
    };

    const prompt = `You are NutriAI, a practical meal-planning assistant. Suggest exactly 3 realistic meals or snacks the user could eat next, personalized to their goal, dietary preferences, allergies, foods already eaten today, and remaining macros. Avoid repeating the same main food already logged today. Do not recommend foods listed as allergies. Avoid extreme dieting and do not claim exact nutrition values; estimates are acceptable.

Return ONLY valid JSON in this shape:
{
  "suggestions": [
    {
      "name": "meal name",
      "calories": 350,
      "protein": 25,
      "carbs": 35,
      "fat": 10,
      "mealType": "lunch",
      "reason": "brief reason this fits the user's current needs"
    }
  ]
}

User profile:
${JSON.stringify(profile, null, 2)}

Today's consumed totals:
${JSON.stringify(consumed, null, 2)}

Remaining daily targets:
${JSON.stringify(deficit, null, 2)}

Foods already logged today:
${JSON.stringify(todayLogs.map((log) => ({ food: log.foodName, meal: log.mealType })), null, 2)}

Saved user recipes that may be used when suitable:
${JSON.stringify(availableRecipes.map((recipe) => ({
  name: recipe.name || recipe.recipeName,
  calories: recipe.calories || recipe.totalCalories,
  protein: recipe.protein || recipe.totalProtein,
  carbs: recipe.carbs || recipe.totalCarbs,
  fat: recipe.fat || recipe.totalFat,
})), null, 2)}`;

    const ai = await generateJSON(prompt, { retries: 1 });
    const suggestions = Array.isArray(ai.suggestions)
      ? ai.suggestions
          .filter((item) => item && typeof item.name === 'string')
          .slice(0, 3)
          .map((item) => ({
            name: item.name,
            calories: Math.max(0, Number(item.calories) || 0),
            protein: Math.max(0, Number(item.protein) || 0),
            carbs: Math.max(0, Number(item.carbs) || 0),
            fat: Math.max(0, Number(item.fat) || 0),
            mealType: ['breakfast', 'lunch', 'dinner', 'snacks'].includes(item.mealType)
              ? item.mealType : 'snacks',
            reason: typeof item.reason === 'string' ? item.reason : '',
          }))
      : [];

    if (!suggestions.length) {
      throw new Error('Gemini returned no valid meal suggestions.');
    }

    return NextResponse.json({ success: true, targets, consumed, deficit, suggestions });
  } catch (error) {
    console.error('AI Macro Recommendations Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unable to generate meal recommendations right now.',
    }, { status: 503 });
  }
}
