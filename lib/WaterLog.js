import mongoose from 'mongoose';

const WaterLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  // Calendar date in Philippine time, matching FoodLog and StepLog conventions.
  date: { type: String, required: true, match: /^\\d{4}-\\d{2}-\\d{2}$/, index: true },
  amountMl: { type: Number, required: true, min: 0, default: 0 },
}, { timestamps: true });

WaterLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.models.WaterLog || mongoose.model('WaterLog', WaterLogSchema);
