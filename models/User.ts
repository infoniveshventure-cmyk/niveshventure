import mongoose, { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    memberId: { type: String, required: true, unique: true, index: true },
    firebaseUid: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    country: { type: String, required: true },
    profilePhotoUrl: { type: String, default: "" },

    sponsorId: { type: String, default: null, index: true }, // referring member's memberId
    position: { type: String, enum: ["left", "right", null], default: null },
    parentId: { type: String, default: null, index: true }, // placement parent in binary tree
    accessKeyHash: { type: String, required: true },
    loginKeyHash: { type: String, required: true },

    rank: { type: String, default: "Unranked" },
    isActive: { type: Boolean, default: false }, // Unlock Access status
    accessExpiresAt: { type: Date, default: null },
    role: { type: String, enum: ["member", "admin"], default: "member" },

    walletBalance: { type: Number, default: 0 },
    boosterWalletBalance: { type: Number, default: 0 },
    nivshWalletBalance: { type: Number, default: 0 },
    usdtWalletBalance: { type: Number, default: 0 },
    usdtWalletAddress: { type: String, default: "" },
    bankDetails: {
      bankName: String,
      accountNumber: String,
      ifsc: String,
      accountHolder: String,
    },

    kycStatus: {
      type: String,
      enum: ["not_submitted", "pending", "under_review", "approved", "rejected"],
      default: "not_submitted",
    },
    kycDocs: {
      aadhaarUrl: String,
      panUrl: String,
      bankProofUrl: String,
    },

    totalReferralIncome: { type: Number, default: 0 },
    totalMatchingIncome: { type: Number, default: 0 },
    totalReturnsIncome: { type: Number, default: 0 },
    totalLevelIncome: { type: Number, default: 0 },
    totalRewardIncome: { type: Number, default: 0 },
    totalInvestment: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
    dailyReturnPending: { type: Number, default: 0 },       // accumulates each day, not withdrawable
    totalDailyReturnSettled: { type: Number, default: 0 },  // lifetime total settled to wallet
    monthlyMissCount: { type: Number, default: 0 },
    lastMissResetMonth: { type: String, default: "" }, // YYYY-MM format
    currentReturnPlan: { type: Number, default: 7 },
    investmentCompleted: { type: Boolean, default: false },
    predictionLocked: { type: Boolean, default: false },
    predictionSubmitted: { type: Boolean, default: false },
    lastPredictionDate: { type: String, default: "" },
    productionStatus: { type: String, enum: ["active", "closed"], default: "active" },

    leftCarryForward: { type: Number, default: 0 },
    rightCarryForward: { type: Number, default: 0 },
    leftCurrentBusiness: { type: Number, default: 0 },
    rightCurrentBusiness: { type: Number, default: 0 },
    leftTotalBusiness: { type: Number, default: 0 },
    rightTotalBusiness: { type: Number, default: 0 },
    accessPinHash: { type: String, default: null },
    firstDepositRewarded: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    isPinned: { type: Boolean, default: false },
    withdrawalsEnabled: { type: Boolean, default: true },
    isBlocked: { type: Boolean, default: false }, // Hard block — prevents login
    isPremium: { type: Boolean, default: false },
    premiumActivatedAt: { type: Date, default: null },
    premiumExpiresAt: { type: Date, default: null },
    languagePreference: { type: String, enum: ["en", "hi"], default: "en" },
    activatedByFreePin: { type: Boolean, default: false },

    // Returns Level Income Fields
    pendingReturnsLevelIncome: { type: Number, default: 0 },
    totalReturnsLevelIncomeEarned: { type: Number, default: 0 },
    lastReturnsLevelClosing: { type: String, default: "" },
    lastReturnsLevelCalculationDate: { type: String, default: "" },

    // Monthly Returns Income Closing Fields
    returnsDailyEarnings: { type: Number, default: 0 },
    lastReturnsClosingPeriod: { type: String, default: "" },
    lastReturnsClosingAt: { type: Date, default: null },

    // 7 Days Booster Income Fields
    boosterQualified: { type: Boolean, default: false },
    boosterRewardClaimed: { type: Boolean, default: false },
    boosterRewardAmount: { type: Number, default: 0 },
    boosterQualificationExpiry: { type: Date, default: null },
    boosterRewardDate: { type: Date, default: null },
    totalBoosterIncome: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default models.User || model("User", UserSchema);

