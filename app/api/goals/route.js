//api/goals/route.js
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import UserGoal from '@/lib/User';

export async function GET(req) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const goalData = await UserGoal.findOne({ _id: userId });
    
    return NextResponse.json({ success: true, data: goalData }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();
    
    const { 
      userId, 
      goal, 
      targetCalories, 
      proteinGrams, 
      carbGrams, 
      fatGrams, 
      weight, 
      height, 
      activityLevel 
    } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
    }

    const updatedGoal = await UserGoal.findOneAndUpdate(
      { _id: userId },
      { 
        $set: {
          goal, 
          targetCalories, 
          proteinGrams, 
          carbGrams, 
          fatGrams, 
          weight, 
          height, 
          activityLevel, 
          updatedAt: new Date() 
        }
      },
      { upsert: true, returnDocument: 'after' }
    );

    return NextResponse.json({ success: true, data: updatedGoal }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}