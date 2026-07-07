import { Schema, model, models } from "mongoose";

const WebsiteSettingsSchema = new Schema(
  {
    key: { type: String, default: "singleton", unique: true },
    websiteName: { type: String, default: "NexaChain" },
    logoUrl: { type: String, default: "/logo1.png" },
    contactEmail: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    paymentUsdtAddress: { type: String, default: "" },
    termsUrl: { type: String, default: "" },
    privacyUrl: { type: String, default: "" },
    shareRewardAmount: { type: Number, default: 0 },
    maintenanceMode: { type: Boolean, default: true }, // true = PWA active, false = blocked
    withdrawalsEnabled: { type: Boolean, default: true },
    p2pEnabled: { type: Boolean, default: true },
    websiteEnabled: { type: Boolean, default: true },
    maintenanceMessage: { type: String, default: "System upgrade in progress. Please try again later." },
    secretMaintenanceMessage: { type: String, default: "System upgrade in progress. Please try again later." },
    roiAutoMode: { type: Boolean, default: false },
    roiPercentage: { type: Number, default: 6.0 },
    roiStartDate: { type: String, default: "" },
    roiCreditTime: { type: String, default: "00:00" },
    paymentQrUrl: { type: String, default: "" },
    bankDetails: {
      bankName: String,
      accountNumber: String,
      ifsc: String,
      accountHolder: String,
    },
    pricing: {
      unlockAccessPrice: { type: Number, default: 30 },
      minInvestment: { type: Number, default: 100 },
      minWithdrawal: { type: Number, default: 10 },
    },
    dashboardWelcomeBannerUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

export default models.WebsiteSettings || model("WebsiteSettings", WebsiteSettingsSchema);
