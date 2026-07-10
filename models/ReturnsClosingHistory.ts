import mongoose, { Schema, model, models } from "mongoose";

const ReturnsClosingHistorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    memberId: { type: String, required: true, index: true },
    closingPeriod: { type: String, required: true, index: true }, // Format: YYYY-MM
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    activeDays: { type: Number, required: true },
    totalReturn: { type: Number, required: true },
    closingDate: { type: Date, required: true },
    walletCredited: { type: Boolean, default: true },
    transactionId: { type: String, default: null },
    status: {
      type: String,
      enum: ["Success", "Failed"],
      default: "Success",
      index: true,
    },
  },
  { timestamps: true }
);

// Add unique constraint: User + Closing Period
ReturnsClosingHistorySchema.index(
  { memberId: 1, closingPeriod: 1 },
  { unique: true }
);

export default models.ReturnsClosingHistory || model("ReturnsClosingHistory", ReturnsClosingHistorySchema);
