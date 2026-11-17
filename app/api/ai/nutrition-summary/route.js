import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import dbConnect from '@/lib/mongodb';
import FoodLog from '@/lib/FoodLog';
import User from '@/lib/User';
import AIInsight from '@/lib/AIInsight';
import { generateJSON } from '@/lib/aiClient';
import { recordAIUsage } from '@/lib/recordAIUsage';
import { dateStringToUTCAnchor, utcAnchorToDateString, addDaysUTC } from '@/lib/dateUtils';

const GENERATION_TIMEOUT_MS = 20000;

function getProviderStatus(error) {
  const rawStatus = Number(error?.status || error?.response?.status);
  if (rawStatus) return rawStatus;
  const message = String(error?.message || '');
  try {
    const parsed = JSON.parse(message);
    return Number(parsed?.error?.code || parsed?.code) || null;
  } catch {
    return null;
  }
}

function getProviderRetryAfter(error) {
  const message = String(error?.message || '');
  try {
    const parsed = JSON.parse(message);
    const details = parsed?.error?.details || [];
    const retryInfo = details.find((item) => String(item?.['@type'] || '').includes('RetryInfo'));
    const retryDelay = retryInfo?.retryDelay;
    if (retryDelay) {
      const seconds = Number.parseFloat(String(retryDelay).replace(/s$/, ''));
      if (Number.isFinite(seconds) && seconds > 0) return new Date(Date.now() + seconds * 1000);
    }
  } catch {
    // Use conservative defaults when the provider omits RetryInfo.
  }
  const status = getProviderStatus(error);
  if (status === 429) return new Date(Date.now() + 60 * 60 * 1000);
  if (status === 503) return new Date(Date.now() + 60 * 1000);
  return null;
}

function getProviderCode(error) {
  const message = String(error?.message || '');
  try {
    const parsed = JSON.parse(message);
    return String(parsed?.error?.status || error?.code || error?.name || 'GENERATION_ERROR');
  } catch {
    return String(error?.code || error?.name || 'GENERATION_ERROR');
  }
}

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
    if (bucket.items.length < 5) bucket.items.push(`${log.foodName} (${normalizeMealType(log.mealType)})`);
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
    const generateRequested = searchParams.get('generate') === 'true';

    if (!userId || !start || !end) {
      return NextResponse.json({ error: 'userId, start, and end are required' }, { status: 400 });
    }

    const rangeKey = `${start}_${end}`;
    const cached = await AIInsight.findOne({ userId, rangeKey }).lean();

    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const dailyTotals = await buildRangeSummary(userId, start, end);
    const summaryFingerprint = createHash('sha256').update(JSON.stringify(dailyTotals)).digest('hex');

    if (cached && cached.summaryFingerprint === summaryFingerprint && cached.nutritionSummary) {
      await recordAIUsage({ userId, feature: 'nutrition-summary-cache', status: 'cached' });
      return NextResponse.json({ nutritionSummary: cached.nutritionSummary, cached: true });
    }
    if (!generateRequested) {
      const retryAt = cached?.summaryFailureFingerprint === summaryFingerprint
        ? cached?.summaryRetryAfter
        : null;
      const cooldownActive = retryAt && new Date(retryAt).getTime() > Date.now();
      return NextResponse.json({
        nutritionSummary: cached?.nutritionSummary || null,
        cached: Boolean(cached?.nutritionSummary),
        message: cached?.nutritionSummary
          ? 'Showing the saved analysis. Select Analyze this period only when you want a new review.'
          : cooldownActive
            ? `AI analysis is temporarily paused until ${new Date(retryAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}.`
            : 'Select Analyze this period when you are ready to use AI.',
        ...(cooldownActive ? { retryAfter: new Date(retryAt).toISOString() } : {}),
      });
    }

    const retryAt = cached?.summaryFailureFingerprint === summaryFingerprint
      ? cached?.summaryRetryAfter
      : null;
    if (retryAt && new Date(retryAt).getTime() > Date.now()) {
      const retrySeconds = Math.max(1, Math.ceil((new Date(retryAt).getTime() - Date.now()) / 1000));
      return NextResponse.json({
        nutritionSummary: cached?.nutritionSummary || null,
        cached: Boolean(cached?.nutritionSummary),
        stale: Boolean(cached?.nutritionSummary),
        warning: cached?.nutritionSummary
          ? 'A new analysis is temporarily unavailable. Showing your last saved analysis.'
          : `Gemini quota or availability limit reached. Please try again in about ${Math.ceil(retrySeconds / 3600)} hour(s).`,
        retryAfter: new Date(retryAt).toISOString(),
      }, { status: cached?.nutritionSummary ? 200 : 429 });
    }

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
      const fallbackModel = process.env.GEMINI_FALLBACK_MODEL_ID || null;
      const aiResult = await withTimeout(generateJSON(prompt, {
        retries: 0,
        userId,
        feature: 'nutrition-summary',
        maxOutputTokens: 180,
        fallbackModel,
        fallbackDelayMs: 1000,
      }), GENERATION_TIMEOUT_MS);

      const saved = await AIInsight.findOneAndUpdate(
        { userId, rangeKey },
        {
          rangeKey,
          rangeStart: start,
          rangeEnd: end,
          nutritionSummary: aiResult.nutritionSummary || null,
          summaryFingerprint,
          generatedAt: new Date(),
          stale: false,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return NextResponse.json({ nutritionSummary: saved.nutritionSummary, cached: false });
    } catch (genErr) {
      console.error('Nutrition summary generation failed or timed out:', genErr?.message || genErr);
      const providerStatus = getProviderStatus(genErr);
      const retryAfter = getProviderRetryAfter(genErr);
      const errorCode = getProviderCode(genErr);
      const quotaFailure = providerStatus === 429 || /RESOURCE_EXHAUSTED|QUOTA/.test(errorCode.toUpperCase());

      if (retryAfter) {
        await AIInsight.findOneAndUpdate(
          { userId, rangeKey },
          {
            $set: {
              rangeKey,
              rangeStart: start,
              rangeEnd: end,
              summaryRetryAfter: retryAfter,
              summaryErrorCode: errorCode,
              summaryFailureFingerprint: summaryFingerprint,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }

      if (cached?.nutritionSummary) {
        return NextResponse.json({
          nutritionSummary: cached.nutritionSummary,
          cached: true,
          stale: true,
          warning: quotaFailure
            ? 'The Gemini free-tier quota for this model has been reached. Showing your last saved analysis.'
            : 'A fresh analysis could not be generated. Showing your last saved analysis.',
          ...(retryAfter ? { retryAfter: retryAfter.toISOString() } : {}),
        });
      }

      const message = quotaFailure
        ? 'The Gemini free-tier daily quota has been reached for the configured model. Please wait until the quota resets or configure an available fallback model.'
        : providerStatus === 503
          ? 'Gemini is temporarily experiencing high demand. Please try again later.'
          : 'The period analysis could not be generated right now. Your nutrition charts and reports remain available.';
      return NextResponse.json({
        nutritionSummary: null,
        warning: message,
        ...(retryAfter ? { retryAfter: retryAfter.toISOString() } : {}),
      }, { status: quotaFailure ? 429 : providerStatus === 503 ? 503 : 502 });
    }
  } catch (error) {
    console.error('Nutrition Summary AI Error:', error);
    return NextResponse.json({ error: 'Failed to generate nutrition summary' }, { status: 500 });
  }
}