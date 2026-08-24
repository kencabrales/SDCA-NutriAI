// app/api/custom-food/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CustomFood from '@/lib/CustomFood';

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    // Show the user's own foods (any privacy) plus everyone else's Public foods
    const filter = userId
      ? { $or: [{ createdBy: userId }, { privacy: 'Public' }] }
      : { privacy: 'Public' };

    const foods = await CustomFood.find(filter).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, foods: foods || [] }, { status: 200 });
  } catch (error) {
    console.error("GET Custom-Food API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();

    if (
      !body.foodName || 
      !body.userId || 
      body.calories === undefined || 
      body.protein === undefined || 
      body.carbs === undefined || 
      body.fat === undefined
    ) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields.' },
        { status: 400 }
      );
    }

    const newCustomFood = await CustomFood.create({
      foodName: body.foodName,
      brandName: body.brandName || null,
      servingSize: body.servingSize,
      amount: body.amount,
      unit: body.unit,
      servingsPerContainer: body.servingsPerContainer,
      
      calories: body.calories,
      protein: body.protein,
      carbs: body.carbs,
      fat: body.fat,

      satFatGoal: body.satFatGoal,
      polyFatGoal: body.polyFatGoal,
      monoFatGoal: body.monoFatGoal,
      transFatGoal: body.transFatGoal,
      cholesterolGoal: body.cholesterolGoal,
      sodiumGoal: body.sodiumGoal,
      potassiumGoal: body.potassiumGoal,
      fiberGoal: body.fiberGoal,
      sugarGoal: body.sugarGoal,
      vitaminAGoal: body.vitaminAGoal,
      vitaminCGoal: body.vitaminCGoal,
      calciumGoal: body.calciumGoal,
      ironGoal: body.ironGoal,
      vitaminB12Goal: body.vitaminB12Goal,
      vitaminDGoal: body.vitaminDGoal,

      createdBy: body.userId
    });

    return NextResponse.json({ success: true, food: newCustomFood }, { status: 201 });
  } catch (error) {
    console.error("POST Custom-Food API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT handler to make custom food editable after creation
export async function PUT(req) {
  try {
    await dbConnect();
    const body = await req.json();
    const { id, userId, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Food ID is required for updates.' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required.' }, { status: 400 });
    }

    const existingFood = await CustomFood.findById(id).lean();
    if (!existingFood) {
      return NextResponse.json({ success: false, message: 'Custom food not found.' }, { status: 404 });
    }
    if (existingFood.createdBy !== userId) {
      return NextResponse.json({ success: false, message: 'You do not have permission to edit this food.' }, { status: 403 });
    }

    const updatedFood = await CustomFood.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });

    return NextResponse.json({ success: true, food: updatedFood }, { status: 200 });
  } catch (error) {
    console.error("PUT Custom-Food API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE handler to remove custom food from database
export async function DELETE(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Food ID is required for deletion.' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required.' }, { status: 400 });
    }

    const existingFood = await CustomFood.findById(id).lean();
    if (!existingFood) {
      return NextResponse.json({ success: false, message: 'Custom food not found.' }, { status: 404 });
    }
    if (existingFood.createdBy !== userId) {
      return NextResponse.json({ success: false, message: 'You do not have permission to delete this food.' }, { status: 403 });
    }

    const deletedFood = await CustomFood.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: 'Custom food deleted successfully.' }, { status: 200 });
  } catch (error) {
    console.error("DELETE Custom-Food API Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}