const mongoose = require("mongoose");
const mongooseDelete = require("mongoose-delete");

const organisationGoalSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organisation",
    },
    organisation_sports_category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrganisationSport",
    },
    status: {
      type: String,
      enum: ["active", "completed", "paused", "canceled"],
      default: "active",
    },
    banner_image: { type: String, default: "" },
    image: { type: String, default: "" },
    title: { type: String },
    short_description: { type: String },
    target_amount: { type: Number },
    start_date: { type: Date },
    due_date: { type: Date },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);
organisationGoalSchema.plugin(mongooseDelete, { overrideMethods: "all" });

module.exports = mongoose.model("Goal", organisationGoalSchema);
