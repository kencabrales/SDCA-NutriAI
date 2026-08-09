import mongoose from 'mongoose';

const FoodLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  foodName: { type: String, required: true, trim: true },
  mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snacks'], required: true },
  amount: { type: Number, required: true }, 
  unit: { type: String, enum: ['g', 'ml', 'oz'], required: true },
  calories: { type: Number, required: true },
  protein: { type: Number, default: 0 }, // in grams
  carbs: { type: Number, default: 0 },   // in grams
  fat: { type: Number, default: 0 },     // in grams
  logDate: { type: String, required: true } 
}, { timestamps: true });

export default mongoose.models.FoodLog || mongoose.model('FoodLog', FoodLogSchema);