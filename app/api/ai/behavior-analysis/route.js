import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import FoodLog from '@/lib/FoodLog';

export async function GET(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing parameter: userId is required' }, { status: 400 });
    }

    // Fetch user's food logs from the last 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const dateStringLimit = fourteenDaysAgo.toISOString().split('T')[0];

    const logs = await FoodLog.find({
      userId,
      logDate: { $gte: dateStringLimit }
    }).sort({ createdAt: -1 }).lean();

    if (!logs || logs.length === 0) {
      return NextResponse.json({
        insight: {
          title: "Awaiting More Data",
          description: "Log your meals regularly so NutriAI can detect your behavioral patterns and provide tailored nutritional nudges.",
          type: "neutral",
          tag: "CALIBRATING"
        }
      }, { status: 200 });
    }

    // --- BEHAVIOR PATTERN ANALYSIS ALGORITHMS ---
    let lateNightCount = 0;
    let totalLogs = logs.length;

    logs.forEach(log => {
      const logHour = new Date(log.createdAt).getHours();
      // Check if logged late at night (e.g., 9 PM to 4 AM)
      if (logHour >= 21 || logHour < 4) {
        lateNightCount++;
      }
    });

    const lateNightPercentage = Math.round((lateNightCount / totalLogs) * 100);

    let insight = {
      title: "Optimal Consistency",
      description: "Your meal timing and caloric distribution are well-balanced across your daily schedule.",
      type: "positive",
      tag: "STEADY PROGRESS"
    };

    if (lateNightPercentage >= 25) {
      insight = {
        title: "Late-Night Intake Detected",
        description: `NutriAI noticed ~${lateNightPercentage}% of your recent logs occur late at night. Shifting your final meal earlier can improve digestion and metabolic recovery.`,
        type: "warning",
        tag: "BEHAVIORAL NUDGE"
      };
    } else {
      const snackLogs = logs.filter(l => l.mealType === 'snacks').length;
      if ((snackLogs / totalLogs) > 0.4) {
        insight = {
          title: "High Snack Frequency",
          description: "Snacks make up a large portion of your entries. Try incorporating more nutrient-dense whole meals for stable energy levels.",
          type: "warning",
          tag: "MACRO ADVICE"
        };
      }
    }

    return NextResponse.json({ insight, stats: { totalLogs, lateNightPercentage } }, { status: 200 });
  } catch (error) {
    console.error("Behavior Analysis API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}