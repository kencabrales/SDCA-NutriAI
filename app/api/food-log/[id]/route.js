import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import FoodLog from '@/lib/FoodLog';

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id || id === 'undefined') {
      return NextResponse.json({ error: 'Valid Log ID is required' }, { status: 400 });
    }

    const deletedLog = await FoodLog.findByIdAndDelete(id);

    if (!deletedLog) {
      return NextResponse.json({ error: 'Log item not found' }, { status: 404 });
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

    const updatedLog = await FoodLog.findByIdAndUpdate(
      id,
      { 
        $set: {
          foodName: body.foodName,
          amount: parseFloat(body.amount),
          unit: body.unit,
          mealType: body.mealType,
          calories: Math.round(body.calories),
          carbs: parseFloat(body.carbs),
          protein: parseFloat(body.protein),
          fat: parseFloat(body.fat)
        } 
      },
      { new: true } 
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