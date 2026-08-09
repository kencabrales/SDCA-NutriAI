// app/api/food-log/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import FoodLog from '@/lib/FoodLog';

// 1. GET: Fetch all food logs for a specific user and date
export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    // Read any variant of the date string sent by your various layout clients
    const targetDate = searchParams.get('date') || searchParams.get('logDate');

    if (!userId || !targetDate) {
      return NextResponse.json({ error: 'Missing parameters (userId and date required)' }, { status: 400 });
    }

    // Query across both fields with an $or gate to safeguard compatibility 
    // .lean() strips off heavy Mongoose document wrappers for instantaneous dashboard response times
    const logs = await FoodLog.find({
      userId,
      $or: [
        { logDate: targetDate },
        { date: targetDate }
      ]
    }).lean();

    return NextResponse.json({ logs: logs || [] }, { status: 200 });
  } catch (error) {
    console.error("GET Food-Log API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. POST: Create a brand new food log entry
export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { userId, foodName, mealType, amount, unit, date } = body;

    // Direct extraction fallback if the field alias was sent over differently
    const targetedDateString = date || body.logDate;

    if (!userId || !foodName || !mealType || !amount || !unit || !targetedDateString) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const numericAmount = parseFloat(amount);
    let standardizedWeightGrams = numericAmount;

    // Standardize to grams for fallback macro calculations if unit is in ounces
    if (unit === 'oz') {
      standardizedWeightGrams = numericAmount * 28.3495;
    }

    // Capture explicit macro weights passed from form state fields (with fallback math patterns)
    const calories = body.calories !== undefined && body.calories !== null && body.calories !== '' 
      ? Math.round(parseFloat(body.calories)) 
      : Math.round(standardizedWeightGrams * 1.5);

    const protein = body.protein !== undefined && body.protein !== null && body.protein !== '' 
      ? parseFloat(parseFloat(body.protein).toFixed(1)) 
      : parseFloat((standardizedWeightGrams * 0.12).toFixed(1));

    const carbs = body.carbs !== undefined && body.carbs !== null && body.carbs !== '' 
      ? parseFloat(parseFloat(body.carbs).toFixed(1)) 
      : parseFloat((standardizedWeightGrams * 0.18).toFixed(1));

    const fat = body.fat !== undefined && body.fat !== null && body.fat !== '' 
      ? parseFloat(parseFloat(body.fat).toFixed(1)) 
      : parseFloat((standardizedWeightGrams * 0.03).toFixed(1));

    const newLog = await FoodLog.create({
      userId,
      foodName,
      mealType: mealType.toLowerCase(), 
      unit,
      calories,
      protein,
      carbs,
      fat,
      logDate: targetedDateString,
      date: targetedDateString 
    });

    return NextResponse.json({ message: 'Logged successfully', log: newLog }, { status: 201 });
  } catch (error) {
    console.error("POST Food-Log API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}