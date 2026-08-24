import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import FoodLog from "@/lib/FoodLog";
import User from "@/lib/User";
import Recipe from "@/lib/Recipe";

export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Pull daily goals using your exact User.js schema defaults
    const targets = {
      calories: user.targetCalories || 2000,
      protein: user.targetProtein || 150,
      carbs: user.targetCarbs || 250,
      fat: user.targetFat || 44,
    };

    // Format today as "YYYY-MM-DD" to match FoodLog's logDate string schema
    const todayStr = new Date().toISOString().split("T")[0];

    const todayLogs = await FoodLog.find({
      userId,
      logDate: todayStr,
    });

    // Sum consumed totals matching FoodLog's field names (fat)
    const consumed = todayLogs.reduce(
      (acc, log) => ({
        calories: acc.calories + (log.calories || 0),
        protein: acc.protein + (log.protein || 0),
        carbs: acc.carbs + (log.carbs || 0),
        fat: acc.fat + (log.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    // Calculate remaining macro deficits
    const deficit = {
      calories: Math.max(0, targets.calories - consumed.calories),
      protein: Math.max(0, targets.protein - consumed.protein),
      carbs: Math.max(0, targets.carbs - consumed.carbs),
      fat: Math.max(0, targets.fat - consumed.fat),
    };

    // Query high-protein meal suggestions matching the calorie deficit window
    const query = {};
    if (deficit.protein > 20) {
      query.protein = { $gte: 15 };
    }
    if (deficit.calories > 0) {
      query.calories = { $lte: deficit.calories + 100 };
    }

    const suggestions = await Recipe.find(query).limit(3);

    return NextResponse.json({
      success: true,
      targets,
      consumed,
      deficit,
      suggestions,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}