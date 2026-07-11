// models/AdminWalletTransaction.ts
import mongoose, { Schema, model, models } from "mongoose";

const AdminWalletTransactionSchema = new Schema(
  {
    transactionId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["credit", "debit"], required: true },
    amount: { type: Number, required: true },
    walletType: { type: String, required: true },
    adminRemarks: { type: String, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

if (models.AdminWalletTransaction) {
  delete (models as any).AdminWalletTransaction;
}

export default models.AdminWalletTransaction || model("AdminWalletTransaction", AdminWalletTransactionSchema);
