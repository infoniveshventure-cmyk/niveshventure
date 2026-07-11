import { Schema, model, models } from "mongoose";

const WithdrawalSchema = new Schema(
  {
    memberId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    processingCharge: { type: Number, required: true }, // 3%
    netPayable: { type: Number, required: true },
    mode: { type: String, enum: ["INR", "USDT"], required: true },
    bankDetails: {
      bankName: String,
      accountNumber: String,
      ifsc: String,
      accountHolder: String,
    },
    usdtAddress: { type: String, default: "" },
    withdrawalKind: { type: String, enum: ["capital", "earning"], default: "earning" },
    status: { type: String, enum: ["pending", "approved", "rejected", "completed"], default: "pending" },
    walletType: { type: String, default: "main" },
    adminNote: { type: String, default: "" },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default models.Withdrawal || model("Withdrawal", WithdrawalSchema);
