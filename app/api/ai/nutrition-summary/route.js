import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import FoodLog from '@/lib/FoodLog';
import User from '@/lib/User';
import AIInsight from '@/lib/AIInsight';
import { generateJSON } from '@/lib/aiClient';
import { dateStringToUTCAnchor, utcAnchorToDateString, addDaysUTC, getWeekdayLabel } from '@/lib/dateUtils';

const CACHE_FRESH_MS = 24 * 60 * 60 * 1000; // a range's summary is valid for a full day once generated
const GENERATION_TIMEOUT_MS = 8000;

function normalizeMealType(raw) {
  const t = (raw || '').toLowerCase();
  if (t.startsWith('break')) return 'breakfast';
  if (t.startsWith('lunch')) return 'lunch';
  if (t.startsWith('din')) return 'dinner';
  return 'snack';
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('AI generation timed out')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Builds the same day-bucketed totals api/nutrition-analytics produces,
// then rolls them into range-level sums — reusing one query instead of
// hitting FoodLog twice for the same window.
async function buildRangeSummary(userId, start, end) {
  const logs = await FoodLog.find({
    userId,
    $or: [{ logDate: { $gte: start, $lte: end } }, { date: { $gte: start, $lte: end } }],
  }).lean();

  const dayTotals = {};
  let cursor = dateStringToUTCAnchor(start);
  const endAnchor = dateStringToUTCAnchor(end);
  while (cursor.getTime() <= endAnchor.getTime()) {
    const key = utcAnchorToDateString(cursor);
    dayTotals[key] = { date: key, calories: 0, protein: 0, carbs: 0, fat: 0, items: [] };
    cursor = addDaysUTC(cursor, 1);
  }

  logs.forEach((log) => {
    const key = (log.logDate || log.date || '').split('T')[0];
    const bucket = dayTotals[key];
    if (!bucket) return;
    bucket.calories += log.calories || 0;
    bucket.protein += log.protein || 0;
    bucket.carbs += log.carbs || 0;
    bucket.fat += log.fat || 0;
    bucket.items.push(`${log.foodName} (${normalizeMealType(log.mealType)})`);
  });

  return Object.values(dayTotals)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((d) => ({
      date: d.date,
      calories: Math.round(d.calories),
      protein: Math.round(d.protein),
      carbs: Math.round(d.carbs),
      fat: Math.round(d.fat),
      items: d.items,
    }));
}

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const periodLabel = searchParams.get('periodLabel') || ''; // e.g. "weekly" — just for prompt phrasing
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!userId || !start || !end) {
      return NextResponse.json({ error: 'userId, start, and end are required' }, { status: 400 });
    }

    const rangeKey = `${start}_${end}`;
    const cached = await AIInsight.findOne({ userId, rangeKey }).lean();
    const cacheAgeMs = cached ? Date.now() - new Date(cached.generatedAt).getTime() : Infinity;

    if (cached && !forceRefresh && cacheAgeMs < CACHE_FRESH_MS) {
      return NextResponse.json({ nutritionSummary: cached.nutritionSummary, cached: true });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const dailyTotals = await buildRangeSummary(userId, start, end);
    const daysWithData = dailyTotals.filter((d) => d.calories > 0);

    if (daysWithData.length === 0) {
      return NextResponse.json({
        nutritionSummary: null,
        message: 'Not enough logged food in this period to generate a summary.',
      });
    }

    const strategy = user.nutritionalStrategy || user.weeklyGoal || user.weeklyPace || 'maintain';
    const goalCalories = user.targetCalories || 2000;

    const prompt = `You are a nutrition analysis assistant. Analyze this user's ${periodLabel || ''} food log data below and return ONLY a JSON object (no markdown) with exactly this shape:

{
  "nutritionSummary": "two to three short sentences summarizing calorie/macro trends over this period compared to their goal — cite specific numbers or days, note whether the trend is helping or hurting their ${strategy} goal, and mention one concrete, specific thing they could adjust"
}

User's goal strategy: ${strategy}
User's daily calorie target: ${goalCalories} kcal
Period: ${start} to ${end}

Daily totals for this period:
${JSON.stringify(dailyTotals, null, 2)}

Remember: return ONLY the JSON object.`;

    try {
      const aiResult = await withTimeout(generateJSON(prompt, { retries: 0 }), GENERATION_TIMEOUT_MS);

      const saved = await AIInsight.findOneAndUpdate(
        { userId, rangeKey },
        {
          rangeKey,
          rangeStart: start,
          rangeEnd: end,
          nutritionSummary: aiResult.nutritionSummary || null,
          generatedAt: new Date(),
          stale: false,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return NextResponse.json({ nutritionSummary: saved.nutritionSummary, cached: false });
    } catch (genErr) {
      console.error('Nutrition summary generation failed or timed out:', genErr.message);

      if (cached) {
        return NextResponse.json({ nutritionSummary: cached.nutritionSummary, cached: true, stale: true });
      }

      return NextResponse.json({
        nutritionSummary: null,
        message: 'Summary temporarily unavailable — please try again shortly.',
      });
    }
  } catch (error) {
    console.error('Nutrition Summary AI Error:', error);
    return NextResponse.json({ error: 'Failed to generate nutrition summary' }, { status: 500 });
  }
}