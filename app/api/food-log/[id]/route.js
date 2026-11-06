import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import FoodLog from '@/lib/FoodLog';
import User from '@/lib/User';

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id || id === 'undefined') {
      return NextResponse.json({ error: 'Valid Log ID is required' }, { status: 400 });
    }

    // 1. Find the log to get context before deletion
    const logToDelete = await FoodLog.findById(id);
    if (!logToDelete) {
      return NextResponse.json({ error: 'Log item not found' }, { status: 404 });
    }

    const userId = logToDelete.userId;
    const deletedDate = logToDelete.logDate;

    // 2. Delete the log
    await FoodLog.findByIdAndDelete(id);

    // 3. Recalculate Streak
    // Check if any other logs exist for this user on the same date
    const remainingLogs = await FoodLog.find({ userId, logDate: deletedDate });

    if (remainingLogs.length === 0) {
      const user = await User.findById(userId);
      if (user && user.lastLoggedDate === deletedDate) {
        // Find the most recent log prior to the deleted date to update the streak
        const lastLog = await FoodLog.find({ userId }).sort({ logDate: -1 }).limit(1);
        
        if (lastLog.length > 0) {
          // If the most recent log is older than yesterday, the streak chain is broken
          const lastDateObj = new Date(lastLog[0].logDate + 'T00:00:00');
          const deletedDateObj = new Date(deletedDate + 'T00:00:00');
          const diffDays = Math.round((deletedDateObj - lastDateObj) / (1000 * 60 * 60 * 24));
          
          if (diffDays > 1) {
            user.streak = 0;
            user.lastLoggedDate = null;
          } else {
            user.lastLoggedDate = lastLog[0].logDate;
            // Recalculate streak count based on the new chain (simplified)
            // Note: For perfect precision on big streaks, you would count continuous days here
            user.streak = Math.max(0, user.streak - 1);
          }
        } else {
          // No logs left at all
          user.streak = 0;
          user.lastLoggedDate = null;
        }
        await user.save();
      }
    }

    return NextResponse.json({ message: 'Item deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error("DELETE API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    
    const resolvedParams = await params;
    const { id } = resolvedParams;
    
    const body = await request.json();

    if (!id || id === 'undefined') {
      return NextResponse.json({ error: 'Valid Log ID is required' }, { status: 400 });
    }

    const amount = Number(body.amount);
    const calories = Number(body.calories);
    const protein = Number(body.protein);
    const carbs = Number(body.carbs);
    const fat = Number(body.fat);
    if (!body.foodName || !body.unit || !body.mealType ||
        ![amount, calories, protein, carbs, fat].every(Number.isFinite) ||
        amount <= 0 || calories < 0 || protein < 0 || carbs < 0 || fat < 0) {
      return NextResponse.json({ error: 'Food name, serving, unit, meal type, and valid nutrition values are required.' }, { status: 400 });
    }

    const weightGrams = body.unit === 'kg' ? amount * 1000
      : body.unit === 'lb' ? amount * 453.59237
      : body.unit === 'oz' ? amount * 28.349523125
      : amount;

    const updatedLog = await FoodLog.findByIdAndUpdate(
      id,
      { $set: {
        foodName: body.foodName.trim(),
        amount,
        weightGrams,
        unit: body.unit,
        mealType: body.mealType,
        calories: Math.round(calories),
        carbs: Number(carbs.toFixed(1)),
        protein: Number(protein.toFixed(1)),
        fat: Number(fat.toFixed(1)),
        ...(body.logDate || body.date ? { logDate: body.logDate || body.date, date: body.logDate || body.date } : {}),
      }},
      { new: true, runValidators: true }
    );

    if (!updatedLog) {
      return NextResponse.json({ error: 'Log item not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Item updated successfully', log: updatedLog }, { status: 200 });
  } catch (error) {
    console.error("PUT API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}