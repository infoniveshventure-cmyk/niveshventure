import { Schema, model, models } from "mongoose";

const MonthlyClosingSchema = new Schema(
  {
    month: { type: String, required: true, unique: true, index: true }, // Format: YYYY-MM
    status: {
      type: String,
      enum: ["open", "closing_in_progress", "closed"],
      default: "open",
    },
    monthlyReturnPercentage: { type: Number, default: 6, min: 5, max: 7 },
    distributionPercentage: { type: Number, default: 100, min: 0, max: 100 },
    totalMonthlyBusiness: { type: Number, default: 0 },
    calculatedIncomes: [
      {
        memberId: { type: String, required: true },
        referralIncome: { type: Number, default: 0 },
        matchingIncome: { type: Number, default: 0 },
        boosterIncome: { type: Number, default: 0 },
        rewardIncome: { type: Number, default: 0 },
        returnsLevelIncome: { type: Number, default: 0 },
        monthlyReturns: { type: Number, default: 0 },
      },
    ],
    releasedTypes: [{ type: String }], // 'referral_income', 'matching_income', 'booster_income', 'reward_income', 'level_income', 'returns_income'
    releaseLogs: [
      {
        incomeType: { type: String, required: true },
        releasedAt: { type: Date, default: Date.now },
        releasedBy: { type: String, required: true },
        amount: { type: Number, required: true },
      },
    ],
    frozenAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    // Manual override fields (additive — backward compatible)
    pausedAt: { type: Date, default: null },
    pauseReason: { type: String, default: "" },
    manualClosingStatus: {
      type: String,
      enum: ["active", "paused", "cancelled"],
      default: "active",
    },
    lastManualActionBy: { type: String, default: "" },
    lastManualActionAt: { type: Date, default: null },
    
    // Admin closing report fields
    users7ClosedCount: { type: Number, default: 0 },
    users5ClosedCount: { type: Number, default: 0 },
    totalDailyReturnClosed: { type: Number, default: 0 },
    totalReturnsLevelClosed: { type: Number, default: 0 },
    closedByAdminName: { type: String, default: "" },
  },
  { timestamps: true }
);

export default models.MonthlyClosing || model("MonthlyClosing", MonthlyClosingSchema);
