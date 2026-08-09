import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/User';

export async function POST(request) {
  try {
    await dbConnect();
    const data = await request.json();
    
    if (data.isBiometricsStep) {
      const { email, age, sex, weight, weightUnit, heightInput, heightUnit, goal, activityLevel, bodyFat } = data;

      if (!email || !age || !sex || !weight || !weightUnit || !heightInput || !heightUnit || !goal || !activityLevel) {
        return NextResponse.json({ error: 'Required biometric fields are missing' }, { status: 400 });
      }

      let standardizedWeight = parseFloat(weight);
      if (weightUnit === 'lbs') {
        standardizedWeight = parseFloat((weight * 0.45359237).toFixed(2));
      }

      let standardizedHeight = parseFloat(heightInput);
      if (heightUnit === 'ft') {
        standardizedHeight = parseFloat((heightInput * 2.54).toFixed(1));
      }

      const heightInMeters = standardizedHeight / 100;
      const bmi = parseFloat((standardizedWeight / (heightInMeters * heightInMeters)).toFixed(1));

      let bmr = 0;
      const numericBodyFat = bodyFat ? parseFloat(bodyFat) : null;

      if (numericBodyFat && numericBodyFat > 0) {
        // Advanced Track: Katch-McArdle Formula (Requires Body Fat %)
        const leanBodyMass = standardizedWeight * (1 - (numericBodyFat / 100));
        bmr = 370 + (21.6 * leanBodyMass);
      } else {
        // Standard Track: Mifflin-St Jeor Formula
        bmr = (10 * standardizedWeight) + (6.25 * standardizedHeight) - (5 * age);
        if (sex === 'male') bmr += 5;
        else bmr -= 161;
      }

      const activityMultipliers = {
        sedentary: 1.2,        
        light: 1.375,         
        moderate: 1.55,      
        active: 1.725,        
        vactive: 1.9         
      };

      const multiplier = activityMultipliers[activityLevel] || 1.2;
      let targetCalories = Math.round(bmr * multiplier);

      if (goal === 'cutting') {
        targetCalories -= 500;
      } else if (goal === 'bulking') {
        targetCalories += 300;
      }

      const updatedUser = await User.findOneAndUpdate(
        { email },
        { 
          age: Number(age), 
          sex, 
          weight: standardizedWeight, 
          height: standardizedHeight, 
          goal,
          activityLevel,
          bodyFat: numericBodyFat,
          bmi, 
          targetCalories 
        },
        { new: true }
      );

      return NextResponse.json({ message: 'Profile completed successfully!', user: updatedUser }, { status: 200 });
    }

    const { firstName, lastName, email, password } = data;
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: 'All credentials are required' }, { status: 400 });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return NextResponse.json({ error: 'Email already registered' }, { status: 400 });

    const newUser = await User.create({ firstName, lastName, email, password });
    return NextResponse.json({ message: 'Step 1 complete', email: newUser.email }, { status: 201 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}