import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/User';
import FoodLog from '@/lib/FoodLog';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    await dbConnect();
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

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
    const isTodayLogged = loggedDatesSet.has(todayStr);

    let anchor = new Date();
    if (!isTodayLogged) anchor.setDate(anchor.getDate() - 1);

    let streak = 0;
    let cursor = new Date(anchor);
    while (loggedDatesSet.has(getLocalDateString(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    // Read-only: no writes here, purely reporting.
    return NextResponse.json({ streak, isTodayLogged }, { status: 200 });
  } catch (error) {
    console.error('Error fetching streak:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}