// lib/CustomFood.js
import mongoose from 'mongoose';

const CustomFoodSchema = new mongoose.Schema({
  foodName: { type: String, required: true },
  brandName: { type: String, default: null },
  servingSize: { type: String, required: true },
  amount: { type: String },
  unit: { type: String },
  servingsPerContainer: { type: Number, default: 1 },
  
  // Core Macros & Calories (Matched to your app's display components)
  calories: { type: Number, required: true },
  protein: { type: Number, required: true },
  carbs: { type: Number, required: true },
  fat: { type: Number, required: true },

  // Detailed Micronutrients (Optional / Analytical Data)
  satFatGoal: { type: Number, default: null },
  polyFatGoal: { type: Number, default: null },
  monoFatGoal: { type: Number, default: null },
  transFatGoal: { type: Number, default: null },
  cholesterolGoal: { type: Number, default: null },
  sodiumGoal: { type: Number, default: null },
  potassiumGoal: { type: Number, default: null },
  fiberGoal: { type: Number, default: null },
  sugarGoal: { type: Number, default: null },
  vitaminAGoal: { type: Number, default: null },
  vitaminCGoal: { type: Number, default: null },
  calciumGoal: { type: Number, default: null },
  ironGoal: { type: Number, default: null },
  vitaminB12Goal: { type: Number, default: null },
  vitaminDGoal: { type: Number, default: null },

  createdBy: { type: String, required: true },
  privacy: { type: String, enum: ['Public', 'Private'], default: 'Public' },
  isVerified: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.models.CustomFood || mongoose.model('CustomFood', CustomFoodSchema);