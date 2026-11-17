import mongoose from 'mongoose';

const AIUsageSettingSchema = new mongoose.Schema({
  projectLabel: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  rpmLimit: { type: Number, default: null, min: 1 },
  tpmLimit: { type: Number, default: null, min: 1 },
  rpdLimit: { type: Number, default: null, min: 1 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

AIUsageSettingSchema.index({ projectLabel: 1, model: 1 }, { unique: true });

export default mongoose.models.AIUsageSetting ||
  mongoose.model('AIUsageSetting', AIUsageSettingSchema);
