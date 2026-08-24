import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/User';

export async function POST(request) {
  try {
    await dbConnect();
    const data = await request.json();

    const {
      firstName,
      lastName,
      email,
      password,
      dob,
      sex,
      weight,
      weightUnit,
      heightCm,
      height, // Fallback for frontend passing 'height'
      heightUnit,
      feet,
      inches,
      goal,
      activityLevel,
      bodyFat,
      targetCalories,
      carbsPct,
      proteinPct,
      fatPct,
      carbsGrams,
      targetCarbs, // Fallback for frontend passing 'targetCarbs'
      proteinGrams,
      targetProtein, // Fallback for frontend passing 'targetProtein'
      fatGrams,
      targetFat // Fallback for frontend passing 'targetFat'
    } = data;

    // Use heightCm or fallback to height
    const rawHeight = heightCm ?? height;

    // Required fields check (bodyFat is NOT listed here, keeping it completely optional)
        if (!firstName || !lastName || !email || !password || !dob || !sex || !weight || !rawHeight || !goal || !activityLevel) {
      return NextResponse.json({ error: 'All required fields must be filled out.' }, { status: 400 });
    }

    // Reject a date of birth set in the future (never trust the client clock alone)
    const dobCheck = new Date(dob);
    const serverToday = new Date();
    dobCheck.setHours(0, 0, 0, 0);
    serverToday.setHours(0, 0, 0, 0);
    if (isNaN(dobCheck.getTime()) || dobCheck.getTime() > serverToday.getTime()) {
      return NextResponse.json({ error: 'Date of birth cannot be in the future.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Verify existing email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    // Format DOB and Age
    const formattedDob = typeof dob === 'string' ? dob.split('T')[0] : new Date(dob).toISOString().split('T')[0];
    const birthDate = new Date(formattedDob);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }

    // Standardize metric weight and height
    const standardizedWeight = parseFloat(weight);
    const standardizedHeight = parseFloat(rawHeight);
    const heightInMeters = standardizedHeight / 100;
    const bmi = parseFloat((standardizedWeight / (heightInMeters * heightInMeters)).toFixed(1));
    const todayIso = new Date().toISOString().split('T')[0];

    // Safely parse optional body fat
    const parsedBodyFat = bodyFat !== null && bodyFat !== undefined && bodyFat !== '' ? parseFloat(bodyFat) : null;

    // Resolve macro property fallbacks
    const resolvedCarbs = carbsGrams || targetCarbs || 250;
    const resolvedProtein = proteinGrams || targetProtein || 150;
    const resolvedFat = fatGrams || targetFat || 44;

    // Create user in single MongoDB query
    const newUser = await User.create({
      firstName,
      lastName,
      email: normalizedEmail,
      password,
      username: `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
      dob: formattedDob,
      age: calculatedAge,
      sex,
      weight: standardizedWeight,
      weightUnit: weightUnit || 'kg',
      startingWeight: standardizedWeight,
      startingWeightDate: todayIso,
      height: standardizedHeight,
      heightUnit: heightUnit || 'cm',
      feet: feet || 0,
      inches: inches || 0,
      goal,
      weeklyGoal: goal,
      activityLevel,
      bodyFat: parsedBodyFat,
      bmi,
      targetCalories: targetCalories || 2000,
      carbsGrams: resolvedCarbs,
      proteinGrams: resolvedProtein,
      fatGrams: resolvedFat,
      targetCarbs: resolvedCarbs,
      targetProtein: resolvedProtein,
      targetFat: resolvedFat,
      carbsPct: carbsPct ?? 40,
      proteinPct: proteinPct ?? 30,
      fatPct: fatPct ?? 30
    });

    return NextResponse.json({
      message: 'Account created successfully!',
      user: {
        ...newUser.toObject(),
        id: newUser._id.toString(),
        _id: newUser._id.toString()
      }
    }, { status: 201 });

  } catch (error) {
    console.error("Signup API Core Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}