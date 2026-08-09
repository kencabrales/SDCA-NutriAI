// lib/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  firstName: { 
    type: String, 
    required: true, 
    trim: true 
  },
  lastName: { 
    type: String, 
    required: true, 
    trim: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    trim: true,
    index: true
  },
  password: { 
    type: String, 
    required: true 
  },
  age: { 
    type: Number, 
    default: 0 
  },
  sex: { 
    type: String, 
    default: 'male' 
  },

  // Parameters
  startingWeight: { 
    type: Number, 
    default: 0 
  },
  weight: { // Current weight
    type: Number, 
    default: 0 
  }, 
  goalWeight: { 
    type: Number, 
    default: 0 
  },
  height: { 
    type: Number, 
    default: 0 
  }, 
  goal: { 
    type: String, 
    default: 'maintenance' 
  },
  weeklyGoal: { 
    type: String, 
    default: 'maintain' 
  },
  activityLevel: { 
    type: String, 
    default: 'sedentary' 
  },
  bodyFat: { 
    type: Number, 
    default: null 
  },
  bmi: { 
    type: Number, 
    default: 0 
  },

  targetCalories: { 
    type: Number, 
    default: 2000 
  },
  carbsPct: { 
    type: Number, 
    default: 50 
  },
  proteinPct: { 
    type: Number, 
    default: 30 
  },
  fatPct: { 
    type: Number, 
    default: 20 
  },

  carbsGrams: { 
    type: Number, 
    default: 250 
  },
  proteinGrams: { 
    type: Number, 
    default: 150 
  },
  fatGrams: { 
    type: Number, 
    default: 44 
  },

  workoutsPerWeek: { 
    type: Number, 
    default: 4 
  },
  minutesPerWorkout: { 
    type: Number, 
    default: 45 
  },

  // --- Real Streak Tracking ---
  lastLoggedDate: { 
    type: String, 
    default: null 
  }, // Format: "YYYY-MM-DD"
  streakCount: { 
    type: Number, 
    default: 0 
  }

}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);