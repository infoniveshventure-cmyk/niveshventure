import { Schema, model, models } from "mongoose";

const OtpSchema = new Schema(
  {
    email: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    purpose: {
      type: String,
      enum: ["register", "login_key_change", "access_key_change", "login", "reset_password", "usdt_change", "change_email", "change_mobile"],
      required: true,
    },
    expiresAt: { type: Date, required: true },
    consumed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-delete expired OTP docs.
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default models.Otp || model("Otp", OtpSchema);
