import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import StepLog from '@/lib/StepLog';

// GET: Fetch step entries for a user, optionally within a date range
export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
    }

    const query = { userId };
    if (start && end) {
      query.date = { $gte: start, $lte: end };
    }

    const entries = await StepLog.find(query).sort({ date: 1 }).lean();

    return NextResponse.json({ success: true, entries }, { status: 200 });
  } catch (error) {
    console.error('GET Steps API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Log or update a step entry for a given date (upsert — one entry per day)
export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { userId, steps, date, notes } = body;

    if (!userId || steps === undefined || !date) {
      return NextResponse.json(
        { success: false, error: 'userId, steps, and date are required' },
        { status: 400 }
      );
    }

    const numericSteps = Number(steps);
    if (isNaN(numericSteps) || numericSteps < 0) {
      return NextResponse.json(
        { success: false, error: 'steps must be a non-negative number' },
        { status: 400 }
      );
    }

    const entry = await StepLog.findOneAndUpdate(
      { userId, date },
      { steps: numericSteps, notes: notes || '' },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    return NextResponse.json({ success: true, entry }, { status: 201 });
  } catch (error) {
    console.error('POST Steps API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a specific step entry by id
export async function DELETE(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id || !userId) {
      return NextResponse.json({ success: false, error: 'id and userId are required' }, { status: 400 });
    }

    const existing = await StepLog.findById(id).lean();
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Entry not found' }, { status: 404 });
    }
    if (existing.userId.toString() !== userId) {
      return NextResponse.json({ success: false, error: 'You do not have permission to delete this entry' }, { status: 403 });
    }

    await StepLog.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Entry deleted' }, { status: 200 });
  } catch (error) {
    console.error('DELETE Steps API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}