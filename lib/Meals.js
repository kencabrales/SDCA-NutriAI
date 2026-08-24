// lib/Meals.js
import mongoose from 'mongoose';

const MealItemSchema = new mongoose.Schema({
  foodName: { type: String, required: true },
  calories: { type: Number, default: 0 },
  protein: { type: Number, default: 0 },
  carbs: { type: Number, default: 0 },
  fat: { type: Number, default: 0 },
  servingSize: { type: Number, default: 1 },
  unit: { type: String, default: 'g' },
  amount: { type: Number, default: 1 },

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

const MealSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  photoUrl: { type: String, default: '' },
  privacy: { type: String, enum: ['Public', 'Private'], default: 'Public' },
  isVerified: { type: Boolean, default: false },
  items: [MealItemSchema],
  directions: { type: [String], default: [] },
  totalCalories: { type: Number, default: 0 },
  totalProtein: { type: Number, default: 0 },
  totalCarbs: { type: Number, default: 0 },
  totalFat: { type: Number, default: 0 },

  // Aggregate micronutrient totals
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
}, { timestamps: true });

export default mongoose.models.Meal || mongoose.model('Meal', MealSchema);