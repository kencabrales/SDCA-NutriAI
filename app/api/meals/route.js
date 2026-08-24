// api/meals/route.js
import { NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import Meal from '@/lib/Meals';

// GET: Fetch all meals for a specific user
export async function GET(req) {
  try {
    await connectMongo();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
    }

    // Show the user's own meals (any privacy) plus everyone else's Public meals
    const meals = await Meal.find({
      $or: [{ userId }, { privacy: 'Public' }]
    }).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, meals }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

const sumField = (items, field) => items.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);

// POST: Create a new meal entry
export async function POST(req) {
  try {
    await connectMongo();
    const body = await req.json();

    if (!body.userId || !body.name) {
      return NextResponse.json(
        { success: false, error: 'User ID and Meal Name are required.' }, 
        { status: 400 }
      );
    }

    // Auto-compute total macros + micronutrients if items are present
    const items = body.items || [];

    const mealPayload = {
      ...body,
      totalCalories: body.totalCalories ?? sumField(items, 'calories'),
      totalCarbs: body.totalCarbs ?? sumField(items, 'carbs'),
      totalFat: body.totalFat ?? sumField(items, 'fat'),
      totalProtein: body.totalProtein ?? sumField(items, 'protein'),
      totalSodium: sumField(items, 'sodium'),
      totalSugar: sumField(items, 'sugar'),
      totalFiber: sumField(items, 'fiber'),
      totalCholesterol: sumField(items, 'cholesterol'),
      totalPotassium: sumField(items, 'potassium'),
      totalSatFat: sumField(items, 'satFat'),
      totalPolyFat: sumField(items, 'polyFat'),
      totalMonoFat: sumField(items, 'monoFat'),
      totalTransFat: sumField(items, 'transFat'),
      totalVitaminA: sumField(items, 'vitaminA'),
      totalVitaminC: sumField(items, 'vitaminC'),
      totalCalcium: sumField(items, 'calcium'),
      totalIron: sumField(items, 'iron'),
      totalVitaminB12: sumField(items, 'vitaminB12'),
      totalVitaminD: sumField(items, 'vitaminD'),
      directions: body.directions || [],
    };

    const newMeal = await Meal.create(mealPayload);
    return NextResponse.json({ success: true, meal: newMeal }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing meal
// PUT: Update an existing meal
export async function PUT(req) {
  try {
    await connectMongo();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const body = await req.json();

    const mealId = id || body._id || body.mealId;

    if (!mealId) {
      return NextResponse.json({ success: false, error: 'Meal ID required' }, { status: 400 });
    }

    if (!body.userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
    }

    const existingMeal = await Meal.findById(mealId).lean();
    if (!existingMeal) {
      return NextResponse.json({ success: false, error: 'Meal not found' }, { status: 404 });
    }
    if (existingMeal.userId !== body.userId) {
      return NextResponse.json({ success: false, error: 'You do not have permission to edit this meal' }, { status: 403 });
    }

    // Recalculate macros + micronutrients if items list is updated
    if (body.items) {
      body.totalCalories = sumField(body.items, 'calories');
      body.totalCarbs = sumField(body.items, 'carbs');
      body.totalFat = sumField(body.items, 'fat');
      body.totalProtein = sumField(body.items, 'protein');
      body.totalSodium = sumField(body.items, 'sodium');
      body.totalSugar = sumField(body.items, 'sugar');
      body.totalFiber = sumField(body.items, 'fiber');
      body.totalCholesterol = sumField(body.items, 'cholesterol');
      body.totalPotassium = sumField(body.items, 'potassium');
      body.totalSatFat = sumField(body.items, 'satFat');
      body.totalPolyFat = sumField(body.items, 'polyFat');
      body.totalMonoFat = sumField(body.items, 'monoFat');
      body.totalTransFat = sumField(body.items, 'transFat');
      body.totalVitaminA = sumField(body.items, 'vitaminA');
      body.totalVitaminC = sumField(body.items, 'vitaminC');
      body.totalCalcium = sumField(body.items, 'calcium');
      body.totalIron = sumField(body.items, 'iron');
      body.totalVitaminB12 = sumField(body.items, 'vitaminB12');
      body.totalVitaminD = sumField(body.items, 'vitaminD');
    }

    const updatedMeal = await Meal.findByIdAndUpdate(mealId, body, { 
      new: true, 
      runValidators: true 
    });

    if (!updatedMeal) {
      return NextResponse.json({ success: false, error: 'Meal not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, meal: updatedMeal }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a meal by ID
export async function DELETE(req) {
  try {
    await connectMongo();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Meal ID required' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
    }

    const existingMeal = await Meal.findById(id).lean();
    if (!existingMeal) {
      return NextResponse.json({ success: false, error: 'Meal not found' }, { status: 404 });
    }
    if (existingMeal.userId !== userId) {
      return NextResponse.json({ success: false, error: 'You do not have permission to delete this meal' }, { status: 403 });
    }

    const deletedMeal = await Meal.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Meal deleted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}