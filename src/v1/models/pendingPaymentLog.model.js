/* eslint-disable arrow-body-style */
const mongoose = require("mongoose");

const pendingPaymentLogSchema = new mongoose.Schema(
  {
    pending_payment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PendingPayment",
    },
    goal_support_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GoalSupport",
    },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    pre_filter_transactions: { type: Array },
    post_filter_transactions: { type: Array },
    amount: { type: Number },
    transaction_fetch_date: { type: Date },
    no_of_transactions: { type: Number, default: 0 }, // the number of transactions to be charged
    no_of_transactions_all: { type: Number, default: 0 }, // the number of transactions to be charged
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

module.exports = mongoose.model("PendingPaymentLog", pendingPaymentLogSchema);
