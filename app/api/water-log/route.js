import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import WaterLog from '@/lib/WaterLog';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return NextResponse.json({ error: 'A valid userId is required.' }, { status: 400 });
    }

    if (date) {
      if (!DATE_PATTERN.test(date)) return NextResponse.json({ error: 'Invalid date. Use YYYY-MM-DD.' }, { status: 400 });
      const log = await WaterLog.findOne({ userId, date }).lean();
      return NextResponse.json({ log: log || null, totalMl: log?.amountMl || 0 }, { status: 200 });
    }

    if (!start || !end || !DATE_PATTERN.test(start) || !DATE_PATTERN.test(end) || start > end) {
      return NextResponse.json({ error: 'A valid start and end date are required.' }, { status: 400 });
    }

    const logs = await WaterLog.find({ userId, date: { $gte: start, $lte: end } }).sort({ date: 1 }).lean();
    return NextResponse.json({ logs }, { status: 200 });
  } catch (error) {
    console.error('Water log GET error:', error);
    return NextResponse.json({ error: 'Unable to load water logs.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { userId, date, mode = 'increment' } = body;
    const amountMl = Number(body.amountMl);

    if (!userId || !mongoose.isValidObjectId(userId)) {
      return NextResponse.json({ error: 'A valid userId is required.' }, { status: 400 });
    }
    if (!date || !DATE_PATTERN.test(date)) {
      return NextResponse.json({ error: 'A valid date in YYYY-MM-DD format is required.' }, { status: 400 });
    }
    if (!Number.isFinite(amountMl) || amountMl < 0 || amountMl > 10000) {
      return NextResponse.json({ error: 'Water amount must be between 0 and 10,000 ml.' }, { status: 400 });
    }
    if (!['increment', 'set'].includes(mode)) {
      return NextResponse.json({ error: 'Unsupported water log operation.' }, { status: 400 });
    }

    const update = mode === 'increment'
      ? { $inc: { amountMl } }
      : { $set: { amountMl } };

    const log = await WaterLog.findOneAndUpdate(
      { userId, date },
      update,
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json({ message: 'Water intake saved.', log, totalMl: log.amountMl }, { status: 200 });
  } catch (error) {
    console.error('Water log POST error:', error);
    return NextResponse.json({ error: 'Unable to save water intake.' }, { status: 500 });
  }
}
