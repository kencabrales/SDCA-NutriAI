import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/User';
import AIUsageEvent from '@/lib/AIUsageEvent';
import { getTodayPH } from '@/lib/dateUtils';

function phDayStart(dateString) {
  return new Date(`${dateString}T00:00:00+08:00`);
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

    const today = getTodayPH();
    const start = new Date(phDayStart(today).getTime() - 29 * 86400000);
    const events = await AIUsageEvent.find({ createdAt: { $gte: start } })
      .sort({ createdAt: -1 }).limit(5000).lean();

    const days = new Map();
    const users = new Map();
    let cachedResponses = 0;
    let failedRequests = 0;
    let quotaErrors = 0;
    let estimatedTokens = 0;

    for (const event of events) {
      const day = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date(event.createdAt));
      const bucket = days.get(day) || { date: day, requests: 0, cached: 0, failed: 0, quota: 0, tokens: 0 };
      bucket.requests += event.status === 'cached' ? 0 : 1;
      bucket.cached += event.status === 'cached' ? 1 : 0;
      bucket.failed += event.status === 'failed' ? 1 : 0;
      bucket.quota += event.status === 'quota' ? 1 : 0;
      bucket.tokens += Number(event.estimatedTotalTokens) || 0;
      days.set(day, bucket);

      if (event.status === 'cached') cachedResponses++;
      if (event.status === 'failed') failedRequests++;
      if (event.status === 'quota') quotaErrors++;
      estimatedTokens += Number(event.estimatedTotalTokens) || 0;

      const key = event.userId ? String(event.userId) : 'unknown';
      const user = users.get(key) || { userId: key, requests: 0, cached: 0, failed: 0, tokens: 0 };
      if (event.status === 'cached') user.cached++;
      else user.requests++;
      if (event.status === 'failed' || event.status === 'quota') user.failed++;
      user.tokens += Number(event.estimatedTotalTokens) || 0;
      users.set(key, user);
    }

    const userIds = [...users.keys()].filter((id) => id !== 'unknown');
    const profiles = userIds.length ? await User.find({ _id: { $in: userIds } }).select('firstName lastName email').lean() : [];
    const profileMap = new Map(profiles.map((profile) => [String(profile._id), profile]));
    const perUser = [...users.values()].map((item) => ({
      ...item,
      user: profileMap.has(item.userId)
        ? [profileMap.get(item.userId).firstName, profileMap.get(item.userId).lastName].filter(Boolean).join(' ') || profileMap.get(item.userId).email
        : 'Unassigned / system',
    })).sort((a, b) => b.requests - a.requests);

    return NextResponse.json({
      summary: {
        requests: events.filter((event) => event.status !== 'cached').length,
        cachedResponses,
        failedRequests,
        quotaErrors,
        estimatedTokens,
      },
      daily: [...days.values()].sort((a, b) => a.date.localeCompare(b.date)),
      perUser,
      range: { start: start.toISOString(), end: new Date().toISOString() },
    });
  } catch (error) {
    console.error('Admin AI usage error:', error);
    return NextResponse.json({ error: 'Unable to load AI usage metrics.' }, { status: 500 });
  }
}
