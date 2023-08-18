const mongoose = require("mongoose");

const federationSchema = new mongoose.Schema(
  {
    nif_sports_category_id: { type: Number }, // the sports id provided by NIF
    organisation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organisation",
    },
    sports_category_name: { type: String }, // football, basketball, etc,
    description: { type: String },
    related_org_id: { type: Number },
    parent_activity_id: { type: Number },
    activity_code: { type: String },
    is_valid_for_reporting: { type: Boolean },
    is_available_for_bedrift: { type: Boolean },
    federation_name: { type: String }, // Norweigan Football Club
    federation_org_id: { type: Number }, // the org_id we get from sports data, this is federation id not sports club id
    is_main_activity: { type: String },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

module.exports = mongoose.model("OrganisationSport", federationSchema);
