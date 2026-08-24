import mongoose from 'mongoose';

const WeightLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  weight: {
    type: Number,
    required: true,
  },
  unit: {
    type: String,
    enum: ['kg', 'lbs'],
    default: 'kg',
  },
  bodyFat: {
    type: Number,
    default: null,
  },
  date: {
    type: Date,
    default: Date.now,
    index: true,
  },
  photoUrl: {
    type: String,
    default: '',
  },
  notes: {
    type: String,
    default: '',
  },
}, { timestamps: true });

export default mongoose.models.WeightLog || mongoose.model('WeightLog', WeightLogSchema);