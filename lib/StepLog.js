import mongoose from 'mongoose';

const StepLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  steps: {
    type: Number,
    required: true,
    min: 0,
  },
  // "YYYY-MM-DD", Philippine time — matches the date-string convention
  // used throughout the rest of the app (FoodLog.logDate, water tracking).
  date: {
    type: String,
    required: true,
    index: true,
  },
  notes: {
    type: String,
    default: '',
  },
}, { timestamps: true });

// One entry per user per day — logging again for the same date replaces
// the previous entry (matches the existing mock UI's "replace if date
// exists" behavior in StepsTab.js).
StepLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.models.StepLog || mongoose.model('StepLog', StepLogSchema);