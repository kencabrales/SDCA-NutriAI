// lib/AIInsight.js
import mongoose from 'mongoose';

// One cached insight doc per user per day (PH-anchored date string). This
// is what lets the /api/ai/insights route serve most requests instantly
// from the DB instead of hitting the Gemini API (and its rate limit) on
// every page load or refresh.
const AIInsightSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD", Philippine time
    mealSuggestion: { type: String, default: null },
    behaviorInsight: { type: String, default: null },
    healthRisk: { type: String, default: null },
    generatedAt: { type: Date, default: Date.now },
    // true when this doc is being served as a fallback after a failed
    // regeneration attempt, rather than reflecting the latest data
    stale: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AIInsightSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.models.AIInsight || mongoose.model('AIInsight', AIInsightSchema);