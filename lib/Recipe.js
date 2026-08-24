// lib/Recipe.js
import mongoose from 'mongoose';

const RecipeIngredientSchema = new mongoose.Schema({
  foodName: { type: String, required: true },
  calories: { type: Number, default: 0 },
  protein: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  fat: { type: Number, default: 0 },
  amount: { type: Number, default: 1 },
  unit: { type: String, default: 'g' },

  // Micronutrients
  sodium: { type: Number, default: 0 },
  sugar: { type: Number, default: 0 },
  fiber: { type: Number, default: 0 },
  cholesterol: { type: Number, default: 0 },
  potassium: { type: Number, default: 0 },
  satFat: { type: Number, default: 0 },
  polyFat: { type: Number, default: 0 },
  monoFat: { type: Number, default: 0 },
  transFat: { type: Number, default: 0 },
  vitaminA: { type: Number, default: 0 },
  vitaminC: { type: Number, default: 0 },
  calcium: { type: Number, default: 0 },
  iron: { type: Number, default: 0 },
  vitaminB12: { type: Number, default: 0 },
  vitaminD: { type: Number, default: 0 },
});

const RecipeSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  photoUrl: { type: String, default: '' },
  privacy: { type: String, enum: ['Public', 'Private'], default: 'Public' },
  isVerified: { type: Boolean, default: false },
  servings: { type: Number, default: 1, min: 1 },
  ingredients: [RecipeIngredientSchema],  
  directions: { type: [String], default: [] },

  // TOTAL values (sum across all ingredients, whole recipe)
  totalCalories: { type: Number, default: 0 },
  totalProtein: { type: Number, default: 0 },
  totalCarbs: { type: Number, default: 0 },
  totalFat: { type: Number, default: 0 },
  totalSodium: { type: Number, default: 0 },
  totalSugar: { type: Number, default: 0 },
  totalFiber: { type: Number, default: 0 },
  totalCholesterol: { type: Number, default: 0 },
  totalPotassium: { type: Number, default: 0 },
  totalSatFat: { type: Number, default: 0 },
  totalPolyFat: { type: Number, default: 0 },
  totalMonoFat: { type: Number, default: 0 },
  totalTransFat: { type: Number, default: 0 },
  totalVitaminA: { type: Number, default: 0 },
  totalVitaminC: { type: Number, default: 0 },
  totalCalcium: { type: Number, default: 0 },
  totalIron: { type: Number, default: 0 },
  totalVitaminB12: { type: Number, default: 0 },
  totalVitaminD: { type: Number, default: 0 },

  // PER-SERVING values (total ÷ servings) — what gets shown/logged as "1 serving"
  perServingCalories: { type: Number, default: 0 },
  perServingProtein: { type: Number, default: 0 },
  perServingCarbs: { type: Number, default: 0 },
  perServingFat: { type: Number, default: 0 },
  perServingSodium: { type: Number, default: 0 },
  perServingSugar: { type: Number, default: 0 },
  perServingFiber: { type: Number, default: 0 },
  perServingCholesterol: { type: Number, default: 0 },
  perServingPotassium: { type: Number, default: 0 },
  perServingSatFat: { type: Number, default: 0 },
  perServingPolyFat: { type: Number, default: 0 },
  perServingMonoFat: { type: Number, default: 0 },
  perServingTransFat: { type: Number, default: 0 },
  perServingVitaminA: { type: Number, default: 0 },
  perServingVitaminC: { type: Number, default: 0 },
  perServingCalcium: { type: Number, default: 0 },
  perServingIron: { type: Number, default: 0 },
  perServingVitaminB12: { type: Number, default: 0 },
  perServingVitaminD: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.Recipe || mongoose.model('Recipe', RecipeSchema);