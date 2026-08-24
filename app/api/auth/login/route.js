// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/User';

export async function POST(request) {
  try {
    await dbConnect();
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail }).lean();
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
    }

    if (user.password !== password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
    }

    return NextResponse.json({
      message: 'Login successful',
      user: { 
        id: user._id.toString(), 
        _id: user._id.toString(),
        username: user.username || '',
        firstName: user.firstName || '', 
        lastName: user.lastName || '', 
        email: user.email,
        height: user.height || user.heightInput || 0,
        heightUnit: user.heightUnit || 'cm',
        weight: user.weight || user.weightInput || user.currentWeight || 0,
        weightUnit: user.weightUnit || 'kg',
        sex: user.sex || user.gender || 'male',
        dob: user.dob || user.dateOfBirth || '',
        location: user.location || user.country || '',
        timezone: user.timezone || '',
        bmi: user.bmi || 0,
        targetCalories: user.targetCalories || 2339,
        goal: user.goal || '',
        activityLevel: user.activityLevel || '',
        bodyFat: user.bodyFat || 0
      }
    }, { status: 200 });
  } catch (error) {
    console.error("Login API Core Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}