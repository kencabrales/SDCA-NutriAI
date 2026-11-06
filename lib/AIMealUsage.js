import mongoose from 'mongoose';

const AIMealUsageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  requests: { type: Number, default: 0 },
  lastRequestedAt: { type: Date, default: null },
}, { timestamps: true });

AIMealUsageSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.models.AIMealUsage || mongoose.model('AIMealUsage', AIMealUsageSchema);
