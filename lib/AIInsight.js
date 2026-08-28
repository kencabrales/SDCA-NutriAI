import mongoose from 'mongoose';

const AIInsightSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // ── Daily insight (Diary/Dashboard feature) ──
    date: { type: String, default: null }, // "YYYY-MM-DD", Philippine time
    mealSuggestion: { type: String, default: null },
    behaviorInsight: { type: String, default: null },
    healthRisk: { type: String, default: null },

    // ── Range-based nutrition summary (NutritionTab feature) ──
    // rangeKey = `${rangeStart}_${rangeEnd}` — one cached doc per user per
    // viewed range, so switching Weekly/Monthly/Yearly or paging through
    // past periods only ever costs a new Gemini call the FIRST time that
    // specific range is viewed.
    rangeKey: { type: String, default: null },
    rangeStart: { type: String, default: null },
    rangeEnd: { type: String, default: null },
    nutritionSummary: { type: String, default: null },

    generatedAt: { type: Date, default: Date.now },
    stale: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Daily insight lookups (existing feature) — only enforced when `date` is set.
AIInsightSchema.index(
  { userId: 1, date: 1 },
  { unique: true, partialFilterExpression: { date: { $type: 'string' } } }
);

// Range-summary lookups (new feature) — only enforced when `rangeKey` is set.
AIInsightSchema.index(
  { userId: 1, rangeKey: 1 },
  { unique: true, partialFilterExpression: { rangeKey: { $type: 'string' } } }
);

export default mongoose.models.AIInsight || mongoose.model('AIInsight', AIInsightSchema);