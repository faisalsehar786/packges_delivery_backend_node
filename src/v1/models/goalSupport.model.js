const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");

const goalSupportSchema = new mongoose.Schema(
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
    support_amount: { type: Number },
    session_id: { type: String },
    session_id_date: { type: Date },
    accounts: [
      {
        id: { type: String },
        iban: { type: String },
        bban: { type: String },
        accountName: { type: String },
        accountType: { type: String },
        ownerName: { type: String },
        displayName: { type: String },
        balances: { type: Array },
        status: {
          type: String,
          enum: ["active", "expired", "pause"],
          default: "active",
        },
      },
    ], // the detail account list payload for which we have consent to charge
    agreement_id: { type: String }, // Vipps agreement Id,
    agreement_payload: { type: Object },
    status: {
      type: String,
      enum: ["active", "completed", "paused", "canceled"],
      default: "active",
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);
goalSupportSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("GoalSupport", goalSupportSchema);
