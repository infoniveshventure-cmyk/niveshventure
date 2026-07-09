import { Schema, model, models } from "mongoose";

const DailyReturnSchema = new Schema(
  {
    memberId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true }, // "YYYY-MM-DD"
    investmentAmount: { type: Number, required: true },
    dailyPct: { type: Number, required: true }, // e.g. 0.2 (meaning 0.2%)
    profit: { type: Number, required: true },
    runningTotal: { type: Number, default: 0 }, // cumulative pending for this member as of this entry
    month: { type: String, required: true }, // "YYYY-MM" for easy monthly queries
    settled: { type: Boolean, default: false },
    settledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Compound unique index — prevents duplicate daily records per user per date
DailyReturnSchema.index({ memberId: 1, date: 1 }, { unique: true });

export default models.DailyReturn || model("DailyReturn", DailyReturnSchema);
