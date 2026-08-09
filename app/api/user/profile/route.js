import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/User';

export async function PUT(req) {
  try {
    await dbConnect();
    const body = await req.json();
    
    const { userId, email, currentWeight, weeklyPace, ...restFields } = body;

    const query = userId ? { _id: userId } : { email };

    if (!userId && !email) {
      return NextResponse.json({ error: 'User identifier is required' }, { status: 400 });
    }

    const updatePayload = {
      ...restFields, 
      ...(currentWeight !== undefined && { weight: Number(currentWeight) }),
      ...(weeklyPace !== undefined && { weeklyGoal: weeklyPace }),
    };

    const updatedUser = await User.findOneAndUpdate(
      query,
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Profile updated successfully', 
      user: updatedUser 
    }, { status: 200 });

  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}