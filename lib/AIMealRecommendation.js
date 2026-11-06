import mongoose from 'mongoose';

const AIMealRecommendationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snacks'], required: true },
  fingerprint: { type: String, required: true },
  targets: { type: mongoose.Schema.Types.Mixed, default: {} },
  consumed: { type: mongoose.Schema.Types.Mixed, default: {} },
  deficit: { type: mongoose.Schema.Types.Mixed, default: {} },
  suggestions: { type: [mongoose.Schema.Types.Mixed], default: [] },
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

AIMealRecommendationSchema.index({ userId: 1, date: 1, mealType: 1 }, { unique: true });

export default mongoose.models.AIMealRecommendation ||
  mongoose.model('AIMealRecommendation', AIMealRecommendationSchema);
