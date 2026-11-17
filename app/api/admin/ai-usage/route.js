import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/User';
import AIUsageEvent from '@/lib/AIUsageEvent';
import AIUsageSetting from '@/lib/AIUsageSetting';

function getPacificDayStart(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  const date = `${part('year')}-${part('month')}-${part('day')}`;
  const offsetLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles', timeZoneName: 'shortOffset', hour: '2-digit',
  }).formatToParts(now).find((item) => item.type === 'timeZoneName')?.value || 'GMT-8';
  const match = offsetLabel.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  const sign = match?.[1] === '+' ? 1 : -1;
  const offsetMinutes = match ? sign * (Number(match[2]) * 60 + Number(match[3] || 0)) : -480;
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) - offsetMinutes * 60000);
}

function tokensFor(event) {
  return Number(event.actualTotalTokens ?? event.estimatedTotalTokens ?? 0) || 0;
}

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'Admin user is required.' }, { status: 400 });

    const admin = await User.findById(userId).select('role isAdmin').lean();
    if (!admin || !(admin.role === 'admin' || admin.isAdmin === true)) {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
    }

    const now = new Date();
    const historyStart = new Date(now.getTime() - 29 * 86400000);
    const minuteStart = new Date(now.getTime() - 60000);
    const pacificDayStart = getPacificDayStart(now);
    const events = await AIUsageEvent.find({ createdAt: { $gte: historyStart } })
      .sort({ createdAt: -1 }).limit(10000).lean();

    const scopes = new Map();
    const days = new Map();
    const users = new Map();
    let cachedResponses = 0;
    let failedRequests = 0;
    let quotaErrors = 0;
    let estimatedTokens = 0;
    let actualTokens = 0;
    let actualTokenEvents = 0;

    for (const event of events) {
      const projectLabel = event.projectLabel || 'legacy / unlabelled';
      const model = event.model || 'unknown';
      const scopeKey = `${projectLabel}::${model}`;
      const scope = scopes.get(scopeKey) || {
        key: scopeKey, projectLabel, model, requests: 0, tokens: 0,
        rpm: 0, tpm: 0, rpd: 0, actualTokenEvents: 0,
      };
      const isCached = event.status === 'cached';
      const tokens = tokensFor(event);
      if (!isCached) {
        scope.requests++;
        scope.tokens += tokens;
      }
      if (event.actualTotalTokens !== null && event.actualTotalTokens !== undefined) scope.actualTokenEvents++;
      if (event.createdAt >= minuteStart && !isCached) {
        scope.rpm++;
        scope.tpm += tokens;
      }
      if (event.createdAt >= pacificDayStart && !isCached) scope.rpd++;
      scopes.set(scopeKey, scope);

      const day = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date(event.createdAt));
      const bucket = days.get(day) || { date: day, requests: 0, cached: 0, failed: 0, quota: 0, tokens: 0 };
      bucket.requests += isCached ? 0 : 1;
      bucket.cached += isCached ? 1 : 0;
      bucket.failed += event.status === 'failed' ? 1 : 0;
      bucket.quota += event.status === 'quota' ? 1 : 0;
      bucket.tokens += tokens;
      days.set(day, bucket);

      if (isCached) cachedResponses++;
      if (event.status === 'failed') failedRequests++;
      if (event.status === 'quota') quotaErrors++;
      estimatedTokens += Number(event.estimatedTotalTokens) || 0;
      if (event.actualTotalTokens !== null && event.actualTotalTokens !== undefined) {
        actualTokens += Number(event.actualTotalTokens) || 0;
        actualTokenEvents++;
      }

      const key = event.userId ? String(event.userId) : 'unknown';
      const user = users.get(key) || { userId: key, requests: 0, cached: 0, failed: 0, tokens: 0 };
      if (isCached) user.cached++;
      else user.requests++;
      if (event.status === 'failed' || event.status === 'quota') user.failed++;
      user.tokens += tokens;
      users.set(key, user);
    }

    const userIds = [...users.keys()].filter((id) => id !== 'unknown');
    const profiles = userIds.length
      ? await User.find({ _id: { $in: userIds } }).select('firstName lastName email').lean()
      : [];
    const profileMap = new Map(profiles.map((profile) => [String(profile._id), profile]));
    const perUser = [...users.values()].map((item) => ({
      ...item,
      user: profileMap.has(item.userId)
        ? [profileMap.get(item.userId).firstName, profileMap.get(item.userId).lastName].filter(Boolean).join(' ') || profileMap.get(item.userId).email
        : 'Unassigned / system',
    })).sort((a, b) => b.requests - a.requests);

    const settings = await AIUsageSetting.find({}).sort({ projectLabel: 1, model: 1 }).lean();
    const scopesWithSettings = [...scopes.values()].map((scope) => {
      const setting = settings.find((item) => item.projectLabel === scope.projectLabel && item.model === scope.model);
      return {
        ...scope,
        limits: {
          rpm: setting?.rpmLimit ?? null,
          tpm: setting?.tpmLimit ?? null,
          rpd: setting?.rpdLimit ?? null,
        },
      };
    });

    return NextResponse.json({
      summary: {
        requests: events.filter((event) => event.status !== 'cached').length,
        cachedResponses, failedRequests, quotaErrors,
        estimatedTokens, actualTokens, actualTokenEvents,
      },
      daily: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
      perUser,
      scopes: scopesWithSettings,
      settings,
      windows: {
        rpmWindowStartedAt: minuteStart.toISOString(),
        rpdWindowStartedAt: pacificDayStart.toISOString(),
        asOf: now.toISOString(),
      },
      range: { start: historyStart.toISOString(), end: now.toISOString() },
    });
  } catch (error) {
    console.error('Admin AI usage error:', error);
    return NextResponse.json({ error: 'Unable to load AI usage metrics.' }, { status: 500 });
  }
}
