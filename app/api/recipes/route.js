// api/recipes
import { NextResponse } from 'next/server';
import connectMongo from '@/lib/mongodb';
import Recipe from '@/lib/Recipe';

// Sums one nutrient field across all ingredients
const sumField = (ingredients, field) => ingredients.reduce((acc, item) => acc + (Number(item[field]) || 0), 0);

const NUTRIENT_FIELDS = [
  'calories', 'protein', 'carbs', 'fat',
  'sodium', 'sugar', 'fiber', 'cholesterol', 'potassium',
  'satFat', 'polyFat', 'monoFat', 'transFat',
  'vitaminA', 'vitaminC', 'calcium', 'iron', 'vitaminB12', 'vitaminD'
];

// Capitalizes the first letter — used to build "totalX" / "perServingX" field names
const cap = (str) => str.charAt(0).toUpperCase() + str.slice(1);

// Computes totals + per-serving values from an ingredients array + servings count
function computeNutrition(ingredients, servings) {
  const safeServings = Number(servings) > 0 ? Number(servings) : 1;
  const result = {};

  NUTRIENT_FIELDS.forEach((field) => {
    const total = sumField(ingredients, field);
    result[`total${cap(field)}`] = total;
    result[`perServing${cap(field)}`] = Math.round((total / safeServings) * 10) / 10;
  });

  return result;
}

// GET: Fetch all recipes for a specific user
export async function GET(req) {
  try {
    await connectMongo();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
    }

    // Show the user's own recipes (any privacy) plus everyone else's Public recipes
    const recipes = await Recipe.find({
      $or: [{ userId }, { privacy: 'Public' }]
    }).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, recipes }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create a new recipe
export async function POST(req) {
  try {
    await connectMongo();
    const body = await req.json();

    if (!body.userId || !body.name) {
      return NextResponse.json(
        { success: false, error: 'User ID and Recipe Name are required.' },
        { status: 400 }
      );
    }

    const ingredients = body.ingredients || [];
    const servings = body.servings || 1;

    const recipePayload = {
      ...body,
      servings,
      ingredients,
      directions: body.directions || [],
      ...computeNutrition(ingredients, servings),
    };

    const newRecipe = await Recipe.create(recipePayload);
    return NextResponse.json({ success: true, recipe: newRecipe }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing recipe
export async function PUT(req) {
  try {
    await connectMongo();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const body = await req.json();

    const recipeId = id || body._id || body.recipeId;

    if (!recipeId) {
      return NextResponse.json({ success: false, error: 'Recipe ID required' }, { status: 400 });
    }
    if (!body.userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
    }

    const existing = await Recipe.findById(recipeId).lean();
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Recipe not found' }, { status: 404 });
    }
    if (existing.userId !== body.userId) {
      return NextResponse.json({ success: false, error: 'You do not have permission to edit this recipe' }, { status: 403 });
    }

    // Recalculate totals + per-serving values if ingredients or servings changed
    if (body.ingredients || body.servings) {
      const ingredients = body.ingredients ?? existing.ingredients;
      const servings = body.servings ?? existing.servings;
      Object.assign(body, computeNutrition(ingredients, servings));
    }

    const updatedRecipe = await Recipe.findByIdAndUpdate(recipeId, body, {
      new: true,
      runValidators: true
    });

    return NextResponse.json({ success: true, recipe: updatedRecipe }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Remove a recipe by ID
export async function DELETE(req) {
  try {
    await connectMongo();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Recipe ID required' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 });
    }

    const existing = await Recipe.findById(id).lean();
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Recipe not found' }, { status: 404 });
    }
    if (existing.userId !== userId) {
      return NextResponse.json({ success: false, error: 'You do not have permission to delete this recipe' }, { status: 403 });
    }

    const deletedRecipe = await Recipe.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Recipe deleted successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}