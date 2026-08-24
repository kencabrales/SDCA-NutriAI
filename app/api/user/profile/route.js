// app/api/user/profile/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/User';

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    if (!userId && !email) {
      return NextResponse.json(
        { error: 'User identifier (userId or email) is required' },
        { status: 400 }
      );
    }

    const query = userId ? { _id: userId } : { email };
    const user = await User.findOne(query).lean();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    await dbConnect();
    const body = await req.json();

    const {
      _id,
      id,
      userId,
      email,
      username,
      firstName,
      lastName,
      heightInput,
      height,
      sex,
      gender,
      dob,
      dateOfBirth,
      location,
      country,
      timezone,
      currentWeight,
      weight,
      goalWeight,
      bodyFat,
      nutritionalStrategy,
      weeklyPace,
      weeklyGoal,
      activityLevel,
      weightUnit,
      startingWeight,
      startingWeightDate,
      targetCalories,
      carbsGrams,
      proteinGrams,
      fatGrams,
      targetCarbs,
      targetProtein,
      targetFat,
      carbsPct,
      proteinPct,
      fatPct,
      waterGoalMl,
      satFatGoal,
      polyFatGoal,
      monoFatGoal,
      transFatGoal,
      cholesterolGoal,
      sodiumGoal,
      potassiumGoal,
      fiberGoal,
      sugarGoal,
      vitaminAGoal,
      vitaminCGoal,
      calciumGoal,
      ironGoal,
      vitaminB12Goal,
      vitaminDGoal,
      workoutsPerWeek,
      minutesPerWorkout,
      ...restFields
    } = body;

    const targetId = _id || id || userId;
    const query = {};

    if (targetId) {
      query._id = targetId;
    } else if (email) {
      query.email = email;
    } else {
      return NextResponse.json(
        { error: 'User identifier (_id, userId, or email) is required' },
        { status: 400 }
      );
    }

    const effectiveWeight = currentWeight ?? weight;
    const effectiveStrategy = nutritionalStrategy ?? weeklyPace ?? weeklyGoal ?? 'cut';

    // Flexible parser that converts valid numbers, preserves explicit nulls (for clearing fields), or returns undefined
    const parseNum = (val) => {
      if (val === null || val === '') return null;
      if (val !== undefined && !isNaN(val)) return Number(val);
      return undefined;
    };

    const numericFields = {
      ...(parseNum(effectiveWeight) !== undefined && { weight: parseNum(effectiveWeight) }),
      ...(parseNum(startingWeight) !== undefined && { startingWeight: parseNum(startingWeight) }),
      ...(parseNum(goalWeight) !== undefined && { goalWeight: parseNum(goalWeight) }),
      ...(parseNum(bodyFat) !== undefined && { bodyFat: parseNum(bodyFat) }),
      ...(parseNum(targetCalories) !== undefined && { targetCalories: parseNum(targetCalories) }),

      // Macros
      ...((carbsGrams !== undefined || targetCarbs !== undefined) && {
        carbsGrams: parseNum(carbsGrams ?? targetCarbs),
        targetCarbs: parseNum(carbsGrams ?? targetCarbs),
      }),
      ...((proteinGrams !== undefined || targetProtein !== undefined) && {
        proteinGrams: parseNum(proteinGrams ?? targetProtein),
        targetProtein: parseNum(proteinGrams ?? targetProtein),
      }),
      ...((fatGrams !== undefined || targetFat !== undefined) && {
        fatGrams: parseNum(fatGrams ?? targetFat),
        targetFat: parseNum(fatGrams ?? targetFat),
      }),

      ...(parseNum(carbsPct) !== undefined && { carbsPct: parseNum(carbsPct) }),
      ...(parseNum(proteinPct) !== undefined && { proteinPct: parseNum(proteinPct) }),
      ...(parseNum(fatPct) !== undefined && { fatPct: parseNum(fatPct) }),

      // Micronutrients
      ...(parseNum(waterGoalMl) !== undefined && { waterGoalMl: parseNum(waterGoalMl) }),
      ...(parseNum(satFatGoal) !== undefined && { satFatGoal: parseNum(satFatGoal) }),
      ...(parseNum(polyFatGoal) !== undefined && { polyFatGoal: parseNum(polyFatGoal) }),
      ...(parseNum(monoFatGoal) !== undefined && { monoFatGoal: parseNum(monoFatGoal) }),
      ...(parseNum(transFatGoal) !== undefined && { transFatGoal: parseNum(transFatGoal) }),
      ...(parseNum(cholesterolGoal) !== undefined && { cholesterolGoal: parseNum(cholesterolGoal) }),
      ...(parseNum(sodiumGoal) !== undefined && { sodiumGoal: parseNum(sodiumGoal) }),
      ...(parseNum(potassiumGoal) !== undefined && { potassiumGoal: parseNum(potassiumGoal) }),
      ...(parseNum(fiberGoal) !== undefined && { fiberGoal: parseNum(fiberGoal) }),
      ...(parseNum(sugarGoal) !== undefined && { sugarGoal: parseNum(sugarGoal) }),
      ...(parseNum(vitaminAGoal) !== undefined && { vitaminAGoal: parseNum(vitaminAGoal) }),
      ...(parseNum(vitaminCGoal) !== undefined && { vitaminCGoal: parseNum(vitaminCGoal) }),
      ...(parseNum(calciumGoal) !== undefined && { calciumGoal: parseNum(calciumGoal) }),
      ...(parseNum(ironGoal) !== undefined && { ironGoal: parseNum(ironGoal) }),
      ...(parseNum(vitaminB12Goal) !== undefined && { vitaminB12Goal: parseNum(vitaminB12Goal) }),
      ...(parseNum(vitaminDGoal) !== undefined && { vitaminDGoal: parseNum(vitaminDGoal) }),

      // Activity
      ...(parseNum(workoutsPerWeek) !== undefined && { workoutsPerWeek: parseNum(workoutsPerWeek) }),
      ...(parseNum(minutesPerWorkout) !== undefined && { minutesPerWorkout: parseNum(minutesPerWorkout) }),
    };

    const updatePayload = {
      ...restFields,
      ...numericFields,
      ...(username !== undefined && { username }),
      ...(firstName !== undefined && { firstName }),
      ...(lastName !== undefined && { lastName }),
      ...((heightInput !== undefined || height !== undefined) && {
        heightInput: heightInput || height,
        height: parseNum(heightInput || height),
      }),
      ...((sex !== undefined || gender !== undefined) && { sex: sex || gender }),
      ...((dob !== undefined || dateOfBirth !== undefined) && { dob: dob || dateOfBirth }),
      ...((location !== undefined || country !== undefined) && { location: location || country }),
      ...(timezone !== undefined && { timezone }),
      ...(weightUnit !== undefined && { weightUnit }),
      ...(activityLevel !== undefined && { activityLevel }),
      nutritionalStrategy: effectiveStrategy,
      weeklyGoal: effectiveStrategy,
      weeklyPace: effectiveStrategy,
      ...(startingWeightDate !== undefined && { startingWeightDate }),
      updatedAt: new Date(),
    };

    const updatedUser = await User.findOneAndUpdate(
      query,
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: 'Profile updated successfully',
        user: updatedUser,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}