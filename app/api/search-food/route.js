// app/api/search-food/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CustomFood from '@/lib/CustomFood';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (!query || query.trim() === '') {
      return NextResponse.json({ success: true, products: [] });
    }

    await dbConnect();
    const dbMatches = await CustomFood.find({
      foodName: { $regex: query, $options: 'i' }
    }).limit(5).lean();

    const cleanDbProducts = dbMatches.map((item) => ({
      foodName: item.foodName,
      brand: item.brand,
      calories: item.calories,
      carbs: item.carbs,
      protein: item.protein,
      fat: item.fat,
      servingSize: item.servingSize || 100,
      unit: item.unit || 'g',
      isVerified: item.isVerified || false 
    }));

    let cleanApiProducts = [];
    try {
      const targetUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=6`;
      const apiRes = await fetch(targetUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'NutriAI-StudentCapstone - NextJS-v16 - WebClient' }
      });

      if (apiRes.ok) {
        const data = await apiRes.json();
        cleanApiProducts = (data.products || []).map((product) => {
          const nutriments = product.nutriments || {};
          return {
            foodName: product.product_name || product.generic_name || "Unknown Item",
            brand: product.brands ? product.brands.split(',')[0] : "Generic", 
            calories: Math.round(nutriments['energy-kcal_100g'] || 0),
            carbs: Math.round(nutriments['carbohydrates_100g'] || 0),
            protein: Math.round(nutriments['proteins_100g'] || 0),
            fat: Math.round(nutriments['fat_100g'] || 0),
            servingSize: 100,
            unit: 'g',
            isVerified: false 
          };
        });
      }
    } catch (apiErr) {
      console.error("Skipping external API failure gracefully:", apiErr);
    }

    const combinedProducts = [...cleanDbProducts, ...cleanApiProducts];

    return NextResponse.json({ success: true, products: combinedProducts });

  } catch (error) {
    console.error("Unified Search Error:", error);
    return NextResponse.json({ success: false, error: "Failed compiling search vectors." }, { status: 500 });
  }
}