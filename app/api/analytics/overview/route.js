// app/api/analytics/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import FoodLog from '@/lib/FoodLog';

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const days = parseInt(searchParams.get('days') || '7', 10);
    const endDateStr = searchParams.get('endDate') || new Date().toISOString().split('T')[0];

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    const endDate = new Date(endDateStr);
    const startDate = new Date(endDateStr);
    startDate.setDate(endDate.getDate() - (days - 1));

    const startDateStr = startDate.toISOString().split('T')[0];

    const logs = await FoodLog.find({
      userId,
      $or: [
        { date: { $gte: startDateStr, $lte: endDateStr } },
        { logDate: { $gte: startDateStr, $lte: endDateStr } }
      ]
    }).lean();

    return NextResponse.json({ success: true, data: logs }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}