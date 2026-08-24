// app/api/nutrition-analytics/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import FoodLog from '@/lib/FoodLog';
import { dateStringToUTCAnchor, utcAnchorToDateString, addDaysUTC, getWeekdayLabel } from '@/lib/dateUtils';

// FoodLog entries store mealType as whatever the client sent (POST defaults to
// 'snacks', plural), while the UI works in singular buckets. Normalize both.
function normalizeMealType(raw) {
  const t = (raw || '').toLowerCase();
  if (t.startsWith('break')) return 'breakfast';
  if (t.startsWith('lunch')) return 'lunch';
  if (t.startsWith('din')) return 'dinner';
  return 'snack'; // covers 'snack' and 'snacks'
}

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!userId || !start || !end) {
      return NextResponse.json({ error: 'userId, start, and end are required' }, { status: 400 });
    }

    const logs = await FoodLog.find({
      userId,
      $or: [
        { logDate: { $gte: start, $lte: end } },
        { date: { $gte: start, $lte: end } },
      ],
    }).lean();

    // Pre-build an empty bucket for every day in [start, end] inclusive, so
    // the chart always renders a full window even on days with nothing
    // logged — no gaps, no fallback to fake data.
    //
    // Built via UTC-anchored calendar math (lib/dateUtils.js) rather than
    // `new Date(start + 'T00:00:00')` + `.toLocaleDateString()` — that
    // pairing only stays correct as long as this server's runtime timezone
    // happens to be UTC. This version is correct regardless of server tz,
    // and matches exactly how the frontend re-derives its own labels now.
    const dayBuckets = {};
    let cursor = dateStringToUTCAnchor(start);
    const endAnchor = dateStringToUTCAnchor(end);
    while (cursor.getTime() <= endAnchor.getTime()) {
      const key = utcAnchorToDateString(cursor);
      dayBuckets[key] = {
        day: getWeekdayLabel(key),
        date: String(cursor.getUTCDate()),
        fullDate: key,
        calories: 0, carbs: 0, fat: 0, protein: 0,
        breakfast: 0, lunch: 0, dinner: 0, snack: 0,
        fiber: 0, sugar: 0, potassium: 0, sodium: 0, satFat: 0, transFat: 0, cholesterol: 0,
        vitaminA: 0, vitaminC: 0, calcium: 0, iron: 0, vitaminB12: 0, vitaminD: 0,
        mealMacros: {
          breakfast: { protein: 0, carbs: 0, fat: 0 },
          lunch: { protein: 0, carbs: 0, fat: 0 },
          dinner: { protein: 0, carbs: 0, fat: 0 },
          snack: { protein: 0, carbs: 0, fat: 0 },
        },
      };
      cursor = addDaysUTC(cursor, 1);
    }

    logs.forEach((log) => {
      const key = (log.logDate || log.date || '').split('T')[0];
      const bucket = dayBuckets[key];
      if (!bucket) return; // defensive: shouldn't happen given the query range

      const meal = normalizeMealType(log.mealType);

      bucket.calories += log.calories || 0;
      bucket.carbs += log.carbs || 0;
      bucket.fat += log.fat || 0;
      bucket.protein += log.protein || 0;
      bucket.fiber += log.fiber || 0;
      bucket.sugar += log.sugar || 0;
      bucket.potassium += log.potassium || 0;
      bucket.sodium += log.sodium || 0;
      bucket.satFat += log.satFat || 0;
      bucket.transFat += log.transFat || 0;
      bucket.cholesterol += log.cholesterol || 0;
      bucket.vitaminA += log.vitaminA || 0;
      bucket.vitaminC += log.vitaminC || 0;
      bucket.calcium += log.calcium || 0;
      bucket.iron += log.iron || 0;
      bucket.vitaminB12 += log.vitaminB12 || 0;
      bucket.vitaminD += log.vitaminD || 0;

      bucket[meal] += log.calories || 0;
      bucket.mealMacros[meal].protein += log.protein || 0;
      bucket.mealMacros[meal].carbs += log.carbs || 0;
      bucket.mealMacros[meal].fat += log.fat || 0;
    });

    const analyticsData = Object.values(dayBuckets)
      .sort((a, b) => (a.fullDate < b.fullDate ? -1 : 1))
      .map((d) => ({
        day: d.day,
        date: d.date,
        fullDate: d.fullDate,
        calories: Math.round(d.calories),
        carbs: Math.round(d.carbs),
        fat: Math.round(d.fat),
        protein: Math.round(d.protein),
        breakfast: Math.round(d.breakfast),
        lunch: Math.round(d.lunch),
        dinner: Math.round(d.dinner),
        snack: Math.round(d.snack),
        fiber: Math.round(d.fiber),
        sugar: Math.round(d.sugar),
        potassium: Math.round(d.potassium),
        sodium: Math.round(d.sodium),
        satFat: Math.round(d.satFat),
        transFat: Math.round(d.transFat * 10) / 10,
        cholesterol: Math.round(d.cholesterol),
        vitaminA: Math.round(d.vitaminA),
        vitaminC: Math.round(d.vitaminC),
        calcium: Math.round(d.calcium),
        iron: Math.round(d.iron * 10) / 10,
        vitaminB12: Math.round(d.vitaminB12 * 10) / 10,
        vitaminD: Math.round(d.vitaminD * 10) / 10,
        mealMacros: {
          breakfast: {
            protein: Math.round(d.mealMacros.breakfast.protein),
            carbs: Math.round(d.mealMacros.breakfast.carbs),
            fat: Math.round(d.mealMacros.breakfast.fat),
          },
          lunch: {
            protein: Math.round(d.mealMacros.lunch.protein),
            carbs: Math.round(d.mealMacros.lunch.carbs),
            fat: Math.round(d.mealMacros.lunch.fat),
          },
          dinner: {
            protein: Math.round(d.mealMacros.dinner.protein),
            carbs: Math.round(d.mealMacros.dinner.carbs),
            fat: Math.round(d.mealMacros.dinner.fat),
          },
          snack: {
            protein: Math.round(d.mealMacros.snack.protein),
            carbs: Math.round(d.mealMacros.snack.carbs),
            fat: Math.round(d.mealMacros.snack.fat),
          },
        },
      }));

    return NextResponse.json({ analyticsData }, { status: 200 });
  } catch (error) {
    console.error('Nutrition analytics GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}