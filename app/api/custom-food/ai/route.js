// app/api/custom-food/ai/route.js
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req) {
  try {
    const { foodName, brand } = await req.json();
    
    if (!foodName || foodName.trim() === '') {
      return NextResponse.json({ success: false, error: 'Food name is required.' }, { status: 400 });
    }

    const brandContext = brand && brand.toLowerCase() !== 'generic' ? `Brand reference context: ${brand}.` : '';

    const systemInstruction = "You are an elite fitness database analyzer. You break down food items into realistic preparation variations based on user inputs. You always output valid raw JSON arrays.";
    const targetPrompt = `Generate exactly 3 logical nutritional variations for the input string: "${foodName}". ${brandContext}
    For example, if input is "Chicken Breast", generate variants for "Cooked", "Raw", and "Steamed". 
    If a specific brand name like "Tender Juicy" is present in the context, ensure that brand is explicitly retained in the variation objects. 
    All values must be calculated per 100g standard servings.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: targetPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            variations: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  label: { type: "STRING" }, // e.g., "Chicken Breast (Cooked)"
                  brand: { type: "STRING" },
                  calories: { type: "INTEGER" },
                  carbs: { type: "INTEGER" },
                  protein: { type: "INTEGER" },
                  fat: { type: "INTEGER" }
                },
                required: ["label", "brand", "calories", "carbs", "protein", "fat"]
              }
            }
          },
          required: ["variations"]
        }
      }
    });

    const parsedData = JSON.parse(response.text);
    return NextResponse.json({ success: true, variations: parsedData.variations || [] });

  } catch (error) {
    console.error("AI VARIATION GENERATOR FAILURE:", error);
    return NextResponse.json({ success: false, error: "AI failed to generate options." }, { status: 500 });
  }
}