const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");

const paymentTransferSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organisation",
    },
    organisation_sports_category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrganisationSport",
    },
    goal_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal",
    },
    goal_support_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GoalSupport",
    },
    charge_id: { type: String },
    agreement_id: { type: String },
    amount: { type: Number },
    max_amount: { type: Number },
    charge_date: { type: Date },
    no_of_transactions: { type: Number, default: 0 },
    invoice_status: { type: Boolean, default: false },
    invoice_id: { type: String, default: "" },
    status: {
      type: String,
      enum: ["paid", "reserved", "charged", "pending", "due", "failed", "cancelled", "processing","partially_captured", "partially_refunded"],
      default: "reserved",
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);
paymentTransferSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("PaymentTransfer", paymentTransferSchema);
