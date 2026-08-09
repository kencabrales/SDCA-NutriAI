// lib/Recipe.js
import mongoose from 'mongoose';

const IngredientSchema = new mongoose.Schema({
  foodName: { type: String, required: true },
  weightGrams: { type: Number, required: true },
  calories: { type: Number, required: true }, // per this ingredient's weight
  protein: { type: Number, required: true },
  carbs: { type: Number, required: true },
  fat: { type: Number, required: true }
});

const RecipeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipeName: { type: String, required: true, trim: true },
  totalServings: { type: Number, default: 1 },
  totalWeightGrams: { type: Number, required: true }, // Auto-sum of ingredient weights
  
  // Total raw nutrient pool across the entire batch
  totalNutrients: {
    calories: { type: Number, required: true },
    protein: { type: Number, required: true },
    carbs: { type: Number, required: true },
    fat: { type: Number, required: true }
  },
  ingredients: [IngredientSchema],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Recipe || mongoose.model('Recipe', RecipeSchema);