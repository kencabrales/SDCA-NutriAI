// lib/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true },
    username: { type: String, default: '' },
    location: { type: String, default: '' },
    country: { type: String, default: '' },
    timezone: { type: String, default: '' },
    dob: { type: String, default: '' },
    dateOfBirth: { type: String, default: '' },
    age: { type: Number, default: null },
    sex: { type: String, default: '' },
    gender: { type: String, default: '' },

    // Weight & Height Parameters
    startingWeight: { type: Number, default: null },
    startingWeightDate: { type: String, default: null },
    weight: { type: Number, default: null },
    currentWeight: { type: Number, default: null },
    weightUnit: { type: String, default: 'kg' },
    goalWeight: { type: Number, default: null },
    height: { type: Number, default: null }, 
    heightInput: { type: String, default: '' },
    heightUnit: { type: String, default: 'cm' },
    feet: { type: Number, default: null },
    inches: { type: Number, default: null },
    lastWeighInDate: { type: String, default: null },

    // Strategy & Activity
    goal: { type: String, default: '' },
    weeklyGoal: { type: String, default: '' },
    weeklyPace: { type: String, default: '' },
    nutritionalStrategy: { type: String, default: '' },
    activityLevel: { type: String, default: '' },
    bodyFat: { type: Number, default: null },
    bmi: { type: Number, default: null },

    // Macro & Calorie Goals (Removed hardcoded defaults)
    targetCalories: { type: Number, default: null },
    carbsPct: { type: Number, default: null },
    proteinPct: { type: Number, default: null },
    fatPct: { type: Number, default: null },

    // Macro Gram Targets
    carbsGrams: { type: Number, default: null },
    proteinGrams: { type: Number, default: null },
    fatGrams: { type: Number, default: null },
    targetCarbs: { type: Number, default: null },
    targetProtein: { type: Number, default: null },
    targetFat: { type: Number, default: null },

    waterGoalMl: { type: Number, default: null },
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

    // Streak Tracking
    lastLoggedDate: { type: String, default: null },
    streakCount: { type: Number, default: 0 }
  },
  { 
    timestamps: true,
    strict: false 
  }
);

export default mongoose.models.User || mongoose.model('User', UserSchema);