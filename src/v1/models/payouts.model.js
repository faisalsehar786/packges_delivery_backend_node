const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");

const meetingSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organisation",
    },
    total_amount: { type: Number },
    org_amount: { type: Number },
    company_fee_amount: { type: Number },
    payment_picture: { type: String },
    status: {
      type: String,
      enum: ["paid", "dispute", "pending"],
      default: "pending",
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);
meetingSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("Meeting", meetingSchema);
