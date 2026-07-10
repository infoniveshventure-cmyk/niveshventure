import { Schema, model, models } from "mongoose";

const DailyQuestionSchema = new Schema(
  {
    date: { type: String, required: true, unique: true, index: true }, // YYYY-MM-DD format
    questionId: { type: Schema.Types.ObjectId, ref: "PredictionQuestion", default: null },
    questionText: { type: String, required: true }, // Snapshot of the question text
    isManual: { type: Boolean, default: false },
    autoScheduled: { type: Boolean, default: false },
    scheduledFor: { type: String, default: "" },
    sentAt: { type: Date, default: null },
    selectedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default models.DailyQuestion || model("DailyQuestion", DailyQuestionSchema);
