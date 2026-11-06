import mongoose from 'mongoose';

const AIUsageEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  feature: { type: String, default: 'unknown', index: true },
  status: { type: String, enum: ['success', 'cached', 'failed', 'quota'], required: true, index: true },
  estimatedInputTokens: { type: Number, default: 0 },
  estimatedOutputTokens: { type: Number, default: 0 },
  estimatedTotalTokens: { type: Number, default: 0 },
  errorCode: { type: String, default: null },
  createdAt: { type: Date, default: Date.now, index: true },
}, { versionKey: false });

AIUsageEventSchema.index({ createdAt: -1, status: 1 });
export default mongoose.models.AIUsageEvent || mongoose.model('AIUsageEvent', AIUsageEventSchema);
