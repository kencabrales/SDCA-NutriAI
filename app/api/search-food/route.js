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

    // CustomFood stores its micronutrient fields with a `*Goal` suffix (a
    // naming leftover from sharing a field list with the user's personal
    // Goals) — re-keyed here to the plain names /api/food-log's POST handler
    // and the rest of the app actually read (item.fiber, item.sodium, ...).
    // Without this, a custom food's fiber/sodium/etc. gets silently dropped
    // the moment it's searched, even though it was saved correctly.
    //
    // NOTE: servingSize/amount in the CustomFood schema are stored as
    // Strings (e.g. "80" or "80g"), not Numbers. We parse the leading
    // number out so downstream consumers (LogFoodModal/FoodDetailModal)
    // get a real numeric grams value instead of NaN-ing out to the 100
    // fallback.
    const parseGramsFromString = (val) => {
      if (val === undefined || val === null) return null;
      const match = String(val).match(/([\d.]+)/);
      if (match) {
        const num = Number(match[1]);
        return isNaN(num) ? null : num;
      }
      return null;
    };

    const cleanDbProducts = dbMatches.map((item) => {
      const parsedAmount = parseGramsFromString(item.amount) || parseGramsFromString(item.servingSize) || 100;

      return {
        foodName: item.foodName,
        brand: item.brandName || 'Custom',
        calories: item.calories,
        carbs: item.carbs,
        protein: item.protein,
        fat: item.fat,
        servingSize: parsedAmount,
        amount: parsedAmount,
        defaultServingAmount: parsedAmount,
        unit: item.unit || 'g',
        isVerified: item.isVerified || false,
        satFat: item.satFatGoal || 0,
        polyFat: item.polyFatGoal || 0,
        monoFat: item.monoFatGoal || 0,
        transFat: item.transFatGoal || 0,
        cholesterol: item.cholesterolGoal || 0,
        sodium: item.sodiumGoal || 0,
        potassium: item.potassiumGoal || 0,
        fiber: item.fiberGoal || 0,
        sugar: item.sugarGoal || 0,
        vitaminA: item.vitaminAGoal || 0,
        vitaminC: item.vitaminCGoal || 0,
        calcium: item.calciumGoal || 0,
        iron: item.ironGoal || 0,
        vitaminB12: item.vitaminB12Goal || 0,
        vitaminD: item.vitaminDGoal || 0,
      };
    });

    let cleanApiProducts = [];
    try {
      // Bias toward Philippines relevance, and sort by popularity (unique_scans_n)
      // so well-known/commonly-logged products (which tend to have the most
      // complete community-filled nutrition data) rank higher.
      const targetUrl = `https://ph.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&sort_by=unique_scans_n`;
      const apiRes = await fetch(targetUrl, {
        method: 'GET',
        headers: { 'User-Agent': 'NutriAI-StudentCapstone - NextJS-v16 - WebClient' }
      });

      if (apiRes.ok) {
        const data = await apiRes.json();
        const gToMg = (val) => Math.round((Number(val) || 0) * 1000 * 10) / 10;
        const gToMcg = (val) => Math.round((Number(val) || 0) * 1000000 * 10) / 10;

        // Open Food Facts's *_100g nutriment fields are always defined
        // "per 100 grams" — that reference basis must stay 100 or the
        // math breaks. But OFF separately exposes the manufacturer's real
        // serving size (serving_quantity, or a parseable serving_size
        // string like "30 g"). We surface that as defaultServingAmount —
        // a display-only default — without touching the 100g calculation
        // basis (servingSize/amount stay 100).
        const parseServingGrams = (product) => {
          if (product.serving_quantity && !isNaN(product.serving_quantity)) {
            return Math.round(Number(product.serving_quantity));
          }
          if (product.serving_size) {
            const match = String(product.serving_size).match(/([\d.]+)/);
            if (match) return Math.round(Number(match[1]));
          }
          return null;
        };

        const rawProducts = (data.products || [])
          // Drop junk entries with no usable name or zero everything
          .filter((product) => {
            const name = product.product_name || product.generic_name;
            const n = product.nutriments || {};
            const hasName = name && name.trim().length > 0;
            const hasSomeData = (n['energy-kcal_100g'] || n['proteins_100g'] || n['carbohydrates_100g'] || n['fat_100g']);
            return hasName && hasSomeData;
          })
          .map((product) => {
            const n = product.nutriments || {};
            const name = product.product_name || product.generic_name || "Unknown Item";
            const brand = product.brands ? product.brands.split(',')[0].trim() : "Generic";

            const micronutrients = {
              sodium: gToMg(n['sodium_100g']),
              sugar: Math.round((n['sugars_100g'] || 0) * 10) / 10,
              fiber: Math.round((n['fiber_100g'] || 0) * 10) / 10,
              cholesterol: gToMg(n['cholesterol_100g']),
              potassium: gToMg(n['potassium_100g']),
              satFat: Math.round((n['saturated-fat_100g'] || 0) * 10) / 10,
              transFat: Math.round((n['trans-fat_100g'] || 0) * 10) / 10,
              vitaminA: gToMcg(n['vitamin-a_100g']),
              vitaminC: gToMg(n['vitamin-c_100g']),
              calcium: gToMg(n['calcium_100g']),
              iron: gToMg(n['iron_100g']),
              vitaminB12: gToMcg(n['vitamin-b12_100g']),
              vitaminD: gToMcg(n['vitamin-d_100g']),
            };

            // Count how many micronutrient fields actually have real data —
            // used below to rank fuller entries above sparse ones.
            const completeness = Object.values(micronutrients).filter((v) => v > 0).length;

            return {
              foodName: name,
              brand,
              calories: Math.round(n['energy-kcal_100g'] || 0),
              carbs: Math.round(n['carbohydrates_100g'] || 0),
              protein: Math.round(n['proteins_100g'] || 0),
              fat: Math.round(n['fat_100g'] || 0),
              ...micronutrients,
              servingSize: 100,           // reference basis for the *_100g values — do not change
              amount: 100,                // reference basis for the *_100g values — do not change
              unit: 'g',
              defaultServingAmount: parseServingGrams(product) || 100, // real-world serving, display-only
              isVerified: false,
              _completeness: completeness,
              _dedupeKey: `${name.trim().toLowerCase()}|${brand.trim().toLowerCase()}`
            };
          });

        // Deduplicate: keep only the most complete entry per name+brand combo
        const bestByKey = new Map();
        for (const p of rawProducts) {
          const existing = bestByKey.get(p._dedupeKey);
          if (!existing || p._completeness > existing._completeness) {
            bestByKey.set(p._dedupeKey, p);
          }
        }

        cleanApiProducts = Array.from(bestByKey.values())
          .sort((a, b) => b._completeness - a._completeness)
          .slice(0, 8)
          .map(({ _completeness, _dedupeKey, ...rest }) => rest); // strip internal fields before returning
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