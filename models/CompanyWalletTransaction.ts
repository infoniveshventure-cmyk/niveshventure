// models/CompanyWalletTransaction.ts
import mongoose, { Schema, model, models } from "mongoose";

const CompanyWalletTransactionSchema = new Schema(
  {
    memberId: { type: String, required: true, index: true },
    userName: { type: String, default: "" },
    walletType: { type: String, enum: ["main", "revenue"], required: true, index: true },
    type: { type: String, enum: ["credit", "debit"], required: true },
    transactionType: { type: String, required: true, index: true }, // deposit, withdrawal, unlock_access, withdrawal_fee, payout_referral, payout_matching, payout_returns, payout_level, payout_booster, payout_reward
    amount: { type: Number, required: true },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

if (models.CompanyWalletTransaction) {
  delete (models as any).CompanyWalletTransaction;
}

export default models.CompanyWalletTransaction || model("CompanyWalletTransaction", CompanyWalletTransactionSchema);
