import { Schema, model, models } from "mongoose";

const InvestmentSchema = new Schema(
  {
    memberId: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 100 },
    status: { type: String, enum: ["active", "matured", "withdrawn"], default: "active" },
    lockInEndsAt: { type: Date, required: true }, // 11 months from creation
    paymentMode: { type: String, default: "wallet" },
    walletUsed: { type: String, default: "main" },
  },
  { timestamps: true }
);

export default models.Investment || model("Investment", InvestmentSchema);
