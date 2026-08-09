// lib/CustomFood.js
import mongoose from 'mongoose';

const CustomFoodSchema = new mongoose.Schema({
  foodName: { type: String, required: true },
  brand: { type: String, default: 'Generic' },
  calories: { type: Number, required: true },
  carbs: { type: Number, required: true },
  protein: { type: Number, required: true },
  fat: { type: Number, required: true },
  servingSize: { type: Number, default: 100 },
  unit: { type: String, default: 'g' },
  createdBy: { type: String, required: true }, // Store user ID
  isVerified: { type: Boolean, default: false } // Admin checkmark flag
}, { timestamps: true });

export default mongoose.models.CustomFood || mongoose.model('CustomFood', CustomFoodSchema);