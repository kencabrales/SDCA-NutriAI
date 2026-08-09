// app/api/custom-food/save/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CustomFood from '@/lib/CustomFood';

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();

    const { foodName, brand, calories, carbs, protein, fat, createdBy } = body;

    if (!foodName || !calories) {
      return NextResponse.json({ error: 'Missing required layout parameters' }, { status: 400 });
    }

    const newFood = await CustomFood.create({
      foodName,
      brand: brand || 'Generic',
      calories: Number(calories),
      carbs: Number(carbs) || 0,
      protein: Number(protein) || 0,
      fat: Number(fat) || 0,
      createdBy
    });

    return NextResponse.json({ success: true, food: newFood });
  } catch (error) {
    console.error("Save Food Route Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}