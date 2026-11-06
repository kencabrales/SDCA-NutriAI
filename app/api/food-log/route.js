// api/food-log/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import FoodLog from '@/lib/FoodLog';
import User from '@/lib/User';

function getStoredAmount(amount, unit) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return null;
  if (unit === 'kg') return value * 1000;
  if (unit === 'lb') return value * 453.59237;
  if (unit === 'oz') return value * 28.349523125;
  // ml, pieces, and servings are kept in their own declared unit.
  return value;
}

// Helper to check and update streak
async function handleStreakUpdate(userId) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    const logs = await FoodLog.find({ userId }).select('date logDate').lean();
    const loggedDatesSet = new Set(
      logs.map(l => (l.date || l.logDate || '').split('T')[0]).filter(Boolean)
    );

    const getLocalDateString = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = getLocalDateString(new Date());

    // Anchor on today if logged, otherwise yesterday (grace period)
    let anchor = new Date();
    if (!loggedDatesSet.has(todayStr)) {
      anchor.setDate(anchor.getDate() - 1);
    }

    let streak = 0;
    let cursor = new Date(anchor);
    while (loggedDatesSet.has(getLocalDateString(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    user.streakCount = streak;
    user.lastLoggedDate = todayStr; // now just informational, not used in calculation
    await user.save();
  } catch (err) {
    console.error("Streak Update Error:", err);
  }
}

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const targetDate = searchParams.get('date') || searchParams.get('logDate');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!userId) {
      return NextResponse.json({ error: 'Missing parameter: userId is required' }, { status: 400 });
    }

    const query = { userId };
    if (targetDate) {
      query.$or = [{ logDate: targetDate }, { date: targetDate }];
    }

    const logs = await FoodLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ logs: logs || [] }, { status: 200 });
  } catch (error) {
    console.error("GET Food-Log API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { userId, items } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // --- BATCH INSERTION ---
    if (items && Array.isArray(items) && items.length > 0) {
      const invalidItem = items.find((item) => !item.foodName && !item.name ||
        ![item.amount, item.calories, item.protein, item.carbs, item.fat].every((value) => value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value))) ||
        Number(item.amount) <= 0 || ['calories','protein','carbs','fat'].some((field) => Number(item[field]) < 0));
      if (invalidItem) return NextResponse.json({ error: 'Every food entry must include a name, serving amount, and valid calories and macro values.' }, { status: 400 });
      const targetedDateString = body.date || body.logDate || new Date().toISOString().split('T')[0];

            const logsToInsert = items.map((item) => {
        const foodName = item.foodName || item.name || 'Logged Item';
        const mealType = (item.mealType || 'snacks').toLowerCase();
        const unit = item.unit || 'g';
        const numericAmount = parseFloat(item.amount) || 100;
        const weightGrams = getStoredAmount(numericAmount, unit);

        return {
          userId,
          foodName,
          mealType,
          amount: numericAmount,
          weightGrams,
          unit,
          calories: item.calories !== undefined ? Math.round(parseFloat(item.calories)) : 0,
          protein: item.protein !== undefined ? parseFloat(parseFloat(item.protein).toFixed(1)) : 0,
          carbs: item.carbs !== undefined ? parseFloat(parseFloat(item.carbs).toFixed(1)) : 0,
          fat: item.fat !== undefined ? parseFloat(parseFloat(item.fat).toFixed(1)) : 0,
          sodium: parseFloat(item.sodium) || 0,
          sugar: parseFloat(item.sugar) || 0,
          fiber: parseFloat(item.fiber) || 0,
          cholesterol: parseFloat(item.cholesterol) || 0,
          potassium: parseFloat(item.potassium) || 0,
          satFat: parseFloat(item.satFat) || 0,
          polyFat: parseFloat(item.polyFat) || 0,
          monoFat: parseFloat(item.monoFat) || 0,
          transFat: parseFloat(item.transFat) || 0,
          vitaminA: parseFloat(item.vitaminA) || 0,
          vitaminC: parseFloat(item.vitaminC) || 0,
          calcium: parseFloat(item.calcium) || 0,
          iron: parseFloat(item.iron) || 0,
          vitaminB12: parseFloat(item.vitaminB12) || 0,
          vitaminD: parseFloat(item.vitaminD) || 0,
          logDate: targetedDateString,
          date: targetedDateString,
          createdAt: new Date()
        };
      });

      const createdLogs = await FoodLog.insertMany(logsToInsert);
      await handleStreakUpdate(userId);
      return NextResponse.json({ message: 'Batch logged successfully', logs: createdLogs }, { status: 201 });
    }

    // --- SINGLE ITEM INSERTION ---
    const foodName = body.foodName || body.name;
    const mealType = (body.mealType || 'snacks').toLowerCase();
    const targetedDateString = body.date || body.logDate;
    const unit = body.unit || 'g';
    const numericAmount = parseFloat(body.amount) || 100;

    if (!foodName || !targetedDateString ||
        ![body.amount, body.calories, body.protein, body.carbs, body.fat].every((value) => value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value))) ||
        Number(body.amount) <= 0 || ['calories','protein','carbs','fat'].some((field) => Number(body[field]) < 0)) {
      return NextResponse.json({ error: 'Food name, date, serving amount, calories, protein, carbs, and fat are required and must be valid numbers' }, { status: 400 });
    }

    const weightGrams = getStoredAmount(numericAmount, unit);

    const calories = (body.calories !== undefined && body.calories !== null && body.calories !== '') 
      ? Math.round(parseFloat(body.calories)) 
      : 0;

    const protein = (body.protein !== undefined && body.protein !== null && body.protein !== '') 
      ? parseFloat(parseFloat(body.protein).toFixed(1)) 
      : 0;

    const carbs = (body.carbs !== undefined && body.carbs !== null && body.carbs !== '') 
      ? parseFloat(parseFloat(body.carbs).toFixed(1)) 
      : 0;

    const fat = (body.fat !== undefined && body.fat !== null && body.fat !== '') 
      ? parseFloat(parseFloat(body.fat).toFixed(1)) 
      : 0;

        const newLog = await FoodLog.create({
      userId,
      foodName,
      mealType,
      amount: numericAmount,
      weightGrams,
      unit,
      calories,
      protein,
      carbs,
      fat,
      sodium: parseFloat(body.sodium) || 0,
      sugar: parseFloat(body.sugar) || 0,
      fiber: parseFloat(body.fiber) || 0,
      cholesterol: parseFloat(body.cholesterol) || 0,
      potassium: parseFloat(body.potassium) || 0,
      satFat: parseFloat(body.satFat) || 0,
      polyFat: parseFloat(body.polyFat) || 0,
      monoFat: parseFloat(body.monoFat) || 0,
      transFat: parseFloat(body.transFat) || 0,
      vitaminA: parseFloat(body.vitaminA) || 0,
      vitaminC: parseFloat(body.vitaminC) || 0,
      calcium: parseFloat(body.calcium) || 0,
      iron: parseFloat(body.iron) || 0,
      vitaminB12: parseFloat(body.vitaminB12) || 0,
      vitaminD: parseFloat(body.vitaminD) || 0,
      logDate: targetedDateString,
      date: targetedDateString
    });

    await handleStreakUpdate(userId);

    return NextResponse.json({ message: 'Logged successfully', log: newLog }, { status: 201 });

  } catch (error) {
    console.error("POST Food-Log API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}