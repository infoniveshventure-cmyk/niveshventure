import mongoose, { Schema, model, models } from "mongoose";

const ReturnsLevelIncomeSchema = new Schema(
  {
    recipientMemberId: { type: String, required: true, index: true },
    recipientUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    downlineMemberId: { type: String, required: true, index: true },
    downlineUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    level: { type: Number, required: true, min: 1, max: 10 },
    percentage: { type: Number, required: true },
    investmentAmount: { type: Number, required: true },
    calculatedAmount: { type: Number, required: true },
    calculationDate: { type: String, required: true, index: true }, // Format: YYYY-MM-DD
    closingMonth: { type: String, required: true, index: true }, // Format: YYYY-MM
    status: {
      type: String,
      enum: ["Pending", "Credited"],
      default: "Pending",
      index: true,
    },
    creditedAt: { type: Date, default: null },
    transactionId: { type: String, default: null },
  },
  { timestamps: true }
);

// Prevent duplicate calculations per recipient, downline, level, and date
ReturnsLevelIncomeSchema.index(
  { recipientMemberId: 1, downlineMemberId: 1, level: 1, calculationDate: 1 },
  { unique: true }
);

export default models.ReturnsLevelIncome || model("ReturnsLevelIncome", ReturnsLevelIncomeSchema);
