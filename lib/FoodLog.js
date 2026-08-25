//lib/FoodLog
import mongoose from 'mongoose';

const FoodLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  foodName: { type: String, required: true, trim: true },
  mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snacks'], required: true },
  amount: { type: Number, required: true }, 
  unit: { type: String, enum: ['g', 'ml', 'oz', 'meal', 'serving'], required: true },
  calories: { type: Number, required: true },
  protein: { type: Number, default: 0 }, // in grams
  carbs: { type: Number, default: 0 },   // in grams
  fat: { type: Number, default: 0 },     // in grams

  // Micronutrients
  sodium: { type: Number, default: 0 },      // mg
  sugar: { type: Number, default: 0 },       // g
  fiber: { type: Number, default: 0 },       // g
  cholesterol: { type: Number, default: 0 }, // mg
  potassium: { type: Number, default: 0 },   // mg
  satFat: { type: Number, default: 0 },      // g
  polyFat: { type: Number, default: 0 },     // g
  monoFat: { type: Number, default: 0 },     // g
  transFat: { type: Number, default: 0 },    // g
  vitaminA: { type: Number, default: 0 },    // mcg
  vitaminC: { type: Number, default: 0 },    // mg
  calcium: { type: Number, default: 0 },     // mg
  iron: { type: Number, default: 0 },        // mg
  vitaminB12: { type: Number, default: 0 },  // mcg
  vitaminD: { type: Number, default: 0 },    // mcg

  logDate: { type: String, required: true } 
}, { timestamps: true });

export default mongoose.models.FoodLog || mongoose.model('FoodLog', FoodLogSchema);