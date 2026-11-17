// app/api/custom-food/ai/route.js
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { recordAIUsage } from '@/lib/recordAIUsage';

const MODEL_ID = 'gemini-2.5-flash';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req) {
  let requestUserId = null;
  let requestPrompt = '';
  try {
    const { foodName, brand, userId } = await req.json();
    requestUserId = userId || null;
    
    if (!foodName || foodName.trim() === '') {
      return NextResponse.json({ success: false, error: 'Food name is required.' }, { status: 400 });
    }

    const brandContext = brand && brand.toLowerCase() !== 'generic' ? `Brand reference context: ${brand}.` : '';

    const systemInstruction = `You are an elite fitness database analyzer and nutritionist. 
    You break down food items into realistic preparation variations based on user inputs and output valid raw JSON.

    CRITICAL CALIBRATION RULES:
    1. BRANDED / PACKAGED ITEMS: If a specific brand or item is known (e.g. "Purefoods Tender Juicy Hotdog", "Century Tuna"), calculate macros for ONE STANDARD PIECE or SINGLE SERVING (e.g., 1 piece/34g = ~100 kcal), NOT 100g raw bulk density.
    2. WHOLE / UNBRANDED FOODS: If it is an unbranded generic food (e.g. "Chicken Breast"), calculate macros for 100g standard servings.
    3. VARIATION TYPES: Provide 3 logical preparation variants (e.g., Boiled, Pan-fried, Grilled). Adjust fats/calories for added cooking oils if applicable.
    4. ACCURATE SERVING & UNIT: Always specify the realistic serving amount and unit (e.g., servingSize: 34, unit: "g" or "pc").`;

    const targetPrompt = `Generate exactly 3 logical nutritional variations for input: "${foodName}". ${brandContext}
    Ensure the brand is explicitly retained. Fill precise servingSize and unit fields matching real product guidelines.`;
    requestPrompt = targetPrompt;

    const response = await ai.models.generateContent({
      model: MODEL_ID,
      contents: targetPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        maxOutputTokens: 520,
        responseSchema: {
          type: "OBJECT",
          properties: {
            variations: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  label: { type: "STRING" },
                  brand: { type: "STRING" },
                  servingSize: { type: "NUMBER" },
                  unit: { type: "STRING" }, // e.g. "g", "oz", "pc", "serving"
                  calories: { type: "INTEGER" },
                  carbs: { type: "INTEGER" },
                  protein: { type: "INTEGER" },
                  fat: { type: "INTEGER" }
                },
                required: ["label", "brand", "servingSize", "unit", "calories", "carbs", "protein", "fat"]
              }
            }
          },
          required: ["variations"]
        }
      }
    });

    const parsedData = JSON.parse(response.text);
    await recordAIUsage({
      userId, feature: 'custom-food-variations', model: MODEL_ID, status: 'success',
      inputText: targetPrompt, outputText: response.text || '',
      usageMetadata: response.usageMetadata || null,
    });
    return NextResponse.json({ success: true, variations: parsedData.variations || [] });

  } catch (error) {
    const status = error?.status || error?.response?.status || error?.code;
    await recordAIUsage({
      userId: requestUserId, feature: 'custom-food-variations', model: MODEL_ID,
      status: Number(status) === 429 || String(status).includes('RESOURCE_EXHAUSTED') ? 'quota' : 'failed',
      inputText: requestPrompt, errorCode: status || error?.name || 'GENERATION_ERROR',
    });
    console.error("AI VARIATION GENERATOR FAILURE:", error);
    return NextResponse.json({ success: false, error: "AI failed to generate options." }, { status: 500 });
  }
}