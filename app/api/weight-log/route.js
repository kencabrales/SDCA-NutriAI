import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import WeightLog from '@/lib/WeightLog';
import User from '@/lib/User';

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const range = searchParams.get('range') || '1M'; // 1M, 3M, 6M, 1Y, ALL

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    let dateFilter = {};

    if (range === '1M') {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 1);
      dateFilter = { $gte: cutoff };
    } else if (range === '3M') {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 3);
      dateFilter = { $gte: cutoff };
    } else if (range === '6M') {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 6);
      dateFilter = { $gte: cutoff };
    } else if (range === '1Y') {
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      dateFilter = { $gte: cutoff };
    }
    // 'ALL' => no date filter

    const query = { userId };
    if (Object.keys(dateFilter).length > 0) {
      query.date = dateFilter;
    }

    const logs = await WeightLog.find(query).sort({ date: -1 }).lean();
    const user = await User.findById(userId).select('startingWeight weight currentWeight weightUnit goalWeight').lean();

    return NextResponse.json({
      logs,
      userSummary: {
        startingWeight: user?.startingWeight || (logs.length ? logs[logs.length - 1].weight : 0),
        currentWeight: user?.currentWeight || user?.weight || (logs.length ? logs[0].weight : 0),
        goalWeight: user?.goalWeight || 0,
        unit: user?.weightUnit || 'kg',
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Weight log GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { userId, weight, unit = 'kg', bodyFat, date, photoUrl, notes } = body;

    if (!userId || !weight || Number(weight) <= 0) {
      return NextResponse.json({ error: 'userId and a valid weight are required' }, { status: 400 });
    }

    const logDate = date ? new Date(date) : new Date();
    if (isNaN(logDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }

    // Reject a weigh-in dated in the future — validated server-side.
    const today = new Date();
    const logDateOnly = new Date(logDate);
    logDateOnly.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    if (logDateOnly.getTime() > today.getTime()) {
      return NextResponse.json({ error: 'Weight entry date cannot be in the future.' }, { status: 400 });
    }

    const newLog = await WeightLog.create({
      userId,
      weight: Number(weight),
      unit,
      bodyFat: bodyFat ? Number(bodyFat) : null,
      date: logDate,
      photoUrl: photoUrl || '',
      notes: notes || '',
    });

    // Only overwrite the user's "current weight" if this new entry is the most
    // recent one on record (a backfilled past-dated entry shouldn't override it).
    const latestLog = await WeightLog.findOne({ userId }).sort({ date: -1 }).lean();
    let updatedUser = null;

    if (latestLog && latestLog._id.toString() === newLog._id.toString()) {
      const updateData = {
        weight: Number(weight),
        currentWeight: Number(weight),
        weightUnit: unit,
        lastWeighInDate: logDate.toISOString().split('T')[0],
      };
      if (bodyFat) updateData.bodyFat = Number(bodyFat);

      // If this is the very first weight-log entry this user has ever made
      // and they don't already have a starting weight on file, use this
      // entry to establish it — no more falling back to placeholder numbers.
      const totalLogsForUser = await WeightLog.countDocuments({ userId });
      const existingUser = await User.findById(userId).select('startingWeight').lean();
      if (totalLogsForUser === 1 && !existingUser?.startingWeight) {
        updateData.startingWeight = Number(weight);
        updateData.startingWeightDate = logDate.toISOString().split('T')[0];
      }

      updatedUser = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true }).lean();
    } else {
      updatedUser = await User.findById(userId).lean();
    }

    return NextResponse.json({
      message: 'Weight logged successfully',
      log: newLog,
      user: updatedUser,
    }, { status: 201 });

  } catch (error) {
    console.error('Weight log POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Log ID is required' }, { status: 400 });
    }

    const deletedLog = await WeightLog.findByIdAndDelete(id);
    if (!deletedLog) {
      return NextResponse.json({ error: 'Log entry not found' }, { status: 404 });
    }

    // If the deleted entry was the user's current "latest" weight, roll the
    // user's current weight back to whatever is now the most recent remaining
    // entry, so Goals/MyProfile/ProfileHeader don't keep showing a deleted value.
    const userId = deletedLog.userId;
    const newLatestLog = await WeightLog.findOne({ userId }).sort({ date: -1 }).lean();

    let updatedUser = null;
    if (newLatestLog) {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            weight: newLatestLog.weight,
            currentWeight: newLatestLog.weight,
            weightUnit: newLatestLog.unit || 'kg',
            lastWeighInDate: new Date(newLatestLog.date).toISOString().split('T')[0],
          },
        },
        { new: true }
      ).lean();
    } else {
      // No entries left at all — clear lastWeighInDate since there's no longer
      // a real weigh-in date to point to. Leave weight/currentWeight as-is
      // (may still be accurate from registration or a manual MyProfile edit).
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: { lastWeighInDate: null } },
        { new: true }
      ).lean();
    }

    return NextResponse.json({
      message: 'Entry deleted successfully',
      user: updatedUser,
    }, { status: 200 });

  } catch (error) {
    console.error('Weight log DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}