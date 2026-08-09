// app/api/recipes/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb'; // Adjust path based on your setup
import Recipe from '@/lib/Recipe';

export async function POST(req) {
  await dbConnect();
  try {
    const body = await req.json();
    const { userId, recipeName, totalServings, ingredients } = body;

    if (!recipeName || !ingredients || ingredients.length === 0) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Step 1: Compute aggregated macro distributions dynamically
    let calculatedWeight = 0;
    let calculatedCal = 0;
    let calculatedPro = 0;
    let calculatedCarb = 0;
    let calculatedFat = 0;

    ingredients.forEach(ing => {
      calculatedWeight += Number(ing.weightGrams || 0);
      calculatedCal += Number(ing.calories || 0);
      calculatedPro += Number(ing.protein || 0);
      calculatedCarb += Number(ing.carbs || 0);
      calculatedFat += Number(ing.fat || 0);
    });

    // Step 2: Build entry document
    const newRecipe = await Recipe.create({
      userId,
      recipeName,
      totalServings: Number(totalServings || 1),
      totalWeightGrams: calculatedWeight,
      totalNutrients: {
        calories: Math.round(calculatedCal),
        protein: Math.round(calculatedPro),
        carbs: Math.round(calculatedCarb),
        fat: Math.round(calculatedFat)
      },
      ingredients
    });

    return NextResponse.json({ success: true, data: newRecipe }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET endpoint to fetch a user's saved recipes to display inside the food diary list
export async function GET(req) {
  await dbConnect();
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    const userRecipes = await Recipe.find({ userId }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: userRecipes });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}