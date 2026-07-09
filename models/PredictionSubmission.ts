import { Schema, model, models } from "mongoose";

const PredictionSubmissionSchema = new Schema(
  {
    memberId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD format
    month: { type: String, required: true, index: true }, // YYYY-MM format
    answer: { type: String, enum: ["yes", "no"], required: true },
    submittedAt: { type: Date, default: Date.now },
    questionId: { type: Schema.Types.ObjectId, ref: "PredictionQuestion", default: null },
    questionText: { type: String, required: true }
  },
  { timestamps: true }
);

// Prevent duplicate submissions per member per day
PredictionSubmissionSchema.index({ memberId: 1, date: 1 }, { unique: true });

export default models.PredictionSubmission || model("PredictionSubmission", PredictionSubmissionSchema);
