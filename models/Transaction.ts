import { Schema, model, models } from "mongoose";

const TransactionSchema = new Schema(
  {
    memberId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: [
        "referral_income",
        "matching_income",
        "returns_income",
        "daily_return",
        "level_income",
        "reward_income",
        "investment",
        "deposit",
        "withdrawal",
        "unlock_access",
        "p2p_transfer_in",
        "p2p_transfer_out",
        "share_reward",
        "refund",
        "premium_activation",
        "premium_renewal",
        "wallet_transfer",
        "booster_income",
      ],
      required: true,
    },
    direction: { type: String, enum: ["credit", "debit"], required: true },
    amount: { type: Number, required: true },
    currency: { type: String, enum: ["INR", "USDT"], default: "USDT" },
    status: { type: String, enum: ["pending", "completed", "failed"], default: "completed" },
    note: { type: String, default: "" },
    description: { type: String, default: "" }, // human-readable remark
    walletType: { type: String, default: "main" }, // main | booster | nivesh | usdt
    referenceId: { type: String, default: "" },
    senderMemberId: { type: String, default: "" }, // for p2p transfers
    receiverMemberId: { type: String, default: "" }, // for p2p transfers
    senderName: { type: String, default: "" },
    receiverName: { type: String, default: "" },

    // Binary matching metadata
    leftActiveCount: { type: Number, default: 0 },
    rightActiveCount: { type: Number, default: 0 },
    matchedPairs: { type: Number, default: 0 },
    perPairIncome: { type: Number, default: 0 },
    carryForwardLeft: { type: Number, default: 0 },
    carryForwardRight: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default models.Transaction || model("Transaction", TransactionSchema);
