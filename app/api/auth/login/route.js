// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/User';
import { comparePassword, hashPassword, isBcryptPasswordHash } from '@/lib/passwords';

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

    if (!(await comparePassword(password, user.password))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
    }

    // Upgrade existing plaintext accounts after a successful login without
    // interrupting access for users registered before password hashing.
    if (!isBcryptPasswordHash(user.password)) {
      const upgradedHash = await hashPassword(password);
      await User.updateOne({ _id: user._id, password: user.password }, { $set: { password: upgradedHash } });
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
        profilePhoto: user.profilePhoto || '',
        role: user.role || 'user',
        isAdmin: user.isAdmin === true || user.role === 'admin',
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