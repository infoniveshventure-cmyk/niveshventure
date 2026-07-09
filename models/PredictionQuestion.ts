import { Schema, model, models } from "mongoose";

const PredictionQuestionSchema = new Schema(
  {
    questionText: { type: String, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    lastUsedDate: { type: String, default: null }, // YYYY-MM-DD format
    createdBy: { type: String, default: "system" }
  },
  { timestamps: true }
);

export default models.PredictionQuestion || model("PredictionQuestion", PredictionQuestionSchema);
