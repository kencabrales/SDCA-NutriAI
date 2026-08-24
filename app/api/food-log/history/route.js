// app/api/food-log/history/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import FoodLog from '@/lib/FoodLog';

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    let start = searchParams.get('start');
    let end = searchParams.get('end');

    if (!userId) {
      return NextResponse.json({ error: 'Missing required parameter: userId' }, { status: 400 });
    }

    if (!start || !end) {
      const today = new Date();
      
      const defaultStart = new Date(today);
      defaultStart.setDate(today.getDate() - 30);
      
      const defaultEnd = new Date(today);
      defaultEnd.setDate(today.getDate() + 7);

      start = start || defaultStart.toISOString().split('T')[0];
      end = end || defaultEnd.toISOString().split('T')[0];
    }

    const logs = await FoodLog.find({
      userId,
      $or: [
        { logDate: { $gte: start, $lte: end } },
        { date: { $gte: start, $lte: end } }
      ]
    })
    .select('logDate date') // Select only date fields for better performance
    .lean();

    const loggedDatesSet = new Set();
    logs.forEach(log => {
      if (log.logDate) loggedDatesSet.add(log.logDate.split('T')[0]);
      if (log.date) loggedDatesSet.add(log.date.split('T')[0]);
    });

    return NextResponse.json({ loggedDates: Array.from(loggedDatesSet) }, { status: 200 });
  } catch (error) {
    console.error("GET Food-Log History API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}