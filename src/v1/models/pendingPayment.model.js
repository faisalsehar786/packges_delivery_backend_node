/* eslint-disable arrow-body-style */
const mongoose = require('mongoose')
const mongooseDelete = require('mongoose-delete')

const pendingPaymentSchema = new mongoose.Schema(
  {
    goal_support_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GoalSupport",
    },
    payment_transfer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentTransfer",
    },
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
    support_amount: { type: Number },
    max_amount: { type: Number },
    billed: { type: Boolean, default: false },
    billed_date: { type: Date },
    transaction_fetch_date: { type: Date },
    no_of_transactions: { type: Number, default: 0 }, // the number of transactions to be charged
    amount: { type: Number }, // the amount to be charged = no of transactions x support_amount
    status: {
      type: String,
      enum: ["pending", "charged", "paid", "failed", "canceled"],
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

pendingPaymentSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("PendingPayment", pendingPaymentSchema);
