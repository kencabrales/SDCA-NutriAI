//api/ai/insights/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import FoodLog from '@/lib/FoodLog';
import User from '@/lib/User';
import AIInsight from '@/lib/AIInsight';
import { generateJSON } from '@/lib/aiClient';
import { getTodayPH, dateStringToUTCAnchor, addDaysUTC, utcAnchorToDateString } from '@/lib/dateUtils';

const CACHE_FRESH_MS = 20 * 60 * 1000; // serve cached result if under 20 min old
const GENERATION_TIMEOUT_MS = 8000; // never let the client wait more than ~8s

// Builds the last N calendar date strings (YYYY-MM-DD), ending on `endDateStr`,
// via the same shared UTC-anchor helpers the rest of the app uses.
function getLastNDates(n, endDateStr) {
  const endAnchor = dateStringToUTCAnchor(endDateStr);
  const dates = [];
  for (let i = 0; i < n; i++) {
    dates.push(utcAnchorToDateString(addDaysUTC(endAnchor, -i)));
  }
  return dates;
}

// Races a promise against a hard deadline. Note this only stops us from
// *waiting* on the underlying Gemini call past `ms` — it doesn't actually
// cancel the in-flight request (the SDK doesn't expose an abort hook here),
// so the call may still complete in the background. That's fine: we've
// already moved on to the cache fallback below either way.
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('AI generation timed out')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
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

    // "Today" is always computed server-side in Philippine time, never
    // trusted from the client's `date` query param.
    const dateStr = getTodayPH();

    const cached = await AIInsight.findOne({ userId, date: dateStr }).lean();
    const cacheAgeMs = cached ? Date.now() - new Date(cached.generatedAt).getTime() : Infinity;

    // Fresh cache hit — this is the common case for normal page loads and
    // refreshes, and it costs zero Gemini calls.
    if (cached && !forceRefresh && cacheAgeMs < CACHE_FRESH_MS) {
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

    const last7Dates = getLastNDates(7, dateStr);
    const logs = await FoodLog.find({
      userId,
      logDate: { $in: last7Dates }
    }).sort({ logDate: -1, createdAt: -1 }).lean();

    if (logs.length === 0) {
      return NextResponse.json({
        mealSuggestion: null,
        behaviorInsight: null,
        healthRisk: null,
        message: 'Not enough logged food yet to generate insights.'
      });
    }

    const todayLogs = logs.filter((l) => l.logDate === dateStr);

    const strategy = user.nutritionalStrategy || user.weeklyGoal || user.weeklyPace || 'maintain';
    const goalCalories = user.targetCalories || 2000;

    const dailySummaries = last7Dates.map((d) => {
      const dayLogs = logs.filter((l) => l.logDate === d);
      const calories = dayLogs.reduce((acc, l) => acc + (l.calories || 0), 0);
      const protein = dayLogs.reduce((acc, l) => acc + (l.protein || 0), 0);
      const items = dayLogs.map((l) => `${l.foodName} (${l.mealType})`);
      return { date: d, calories, protein: Math.round(protein), items };
    });

    const todaySoFar = {
      calories: todayLogs.reduce((acc, l) => acc + (l.calories || 0), 0),
      protein: Math.round(todayLogs.reduce((acc, l) => acc + (l.protein || 0), 0)),
      carbs: Math.round(todayLogs.reduce((acc, l) => acc + (l.carbs || 0), 0)),
      fat: Math.round(todayLogs.reduce((acc, l) => acc + (l.fat || 0), 0)),
      itemsLogged: todayLogs.map((l) => `${l.foodName} (${l.mealType})`)
    };

    const prompt = `You are a nutrition analysis assistant for a food-tracking app. Analyze the user's data below and return ONLY a JSON object (no markdown, no explanation) with exactly this shape:

{
  "mealSuggestion": "one short, specific, actionable sentence suggesting what to eat next today, tailored to their goal strategy and what they've already eaten today",
  "behaviorInsight": "one or two short sentences observing a real pattern from their last 7 days (repeated foods, meal timing consistency, calorie trend) — be specific, cite an actual food or number from the data, and note if it's helping or hurting their goal",
  "healthRisk": "one short sentence flagging a concrete risk pattern (e.g. repeated caloric surplus, very low or very high calorie days, skipped meals) if one genuinely exists in the data, otherwise return null for this field — do not invent a risk that isn't supported by the data"
}

User's goal strategy: ${strategy}
User's daily calorie target: ${goalCalories} kcal

Today so far (${dateStr}):
${JSON.stringify(todaySoFar, null, 2)}

Last 7 days summary:
${JSON.stringify(dailySummaries, null, 2)}

Remember: return ONLY the JSON object, nothing else.`;

    try {
      // retries: 0 here on purpose — the fallback-to-cache below is a
      // better recovery strategy than an internal retry, especially for
      // 429s where retrying immediately just burns more quota for the
      // same result.
      const aiResult = await withTimeout(generateJSON(prompt, { retries: 0 }), GENERATION_TIMEOUT_MS);

      const saved = await AIInsight.findOneAndUpdate(
        { userId, date: dateStr },
        {
          mealSuggestion: aiResult.mealSuggestion || null,
          behaviorInsight: aiResult.behaviorInsight || null,
          healthRisk: aiResult.healthRisk || null,
          generatedAt: new Date(),
          stale: false,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return NextResponse.json({
        mealSuggestion: saved.mealSuggestion,
        behaviorInsight: saved.behaviorInsight,
        healthRisk: saved.healthRisk,
        cached: false,
      });
    } catch (genErr) {
      console.error('AI generation failed or timed out:', genErr.message);

      // Fall back to the last thing we generated for today, even if it's
      // stale, instead of leaving the user with nothing — this is exactly
      // the "AI is not there" symptom.
      if (cached) {
        return NextResponse.json({
          mealSuggestion: cached.mealSuggestion,
          behaviorInsight: cached.behaviorInsight,
          healthRisk: cached.healthRisk,
          cached: true,
          stale: true,
        });
      }

      // No prior cache to fall back to — a graceful empty state, not a
      // 500, since this is a "try again shortly" situation, not an error
      // the user caused.
      return NextResponse.json({
        mealSuggestion: null,
        behaviorInsight: null,
        healthRisk: null,
        message: 'Insights are temporarily unavailable — please try again shortly.',
      });
    }
  } catch (error) {
    console.error('AI Insights Error:', error);
    return NextResponse.json({ error: 'Failed to generate insights' }, { status: 500 });
  }
}