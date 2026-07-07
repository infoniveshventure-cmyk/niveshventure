import { Schema, model, models } from "mongoose";

const DeletedRuleLogSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    deletedByAdminId: { type: String, required: true },
    deletedByAdminName: { type: String, required: true },
    previousData: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default models.DeletedRuleLog || model("DeletedRuleLog", DeletedRuleLogSchema);
