const mongoose = require("mongoose");

const organisationDetailSchema = new mongoose.Schema(
  {
    org_id: { type: Number, unique: true, index: true },
    reference_id: { type: String },
    org_name: { type: String },
    abbreviation: { type: String },
    describing_name: { type: String },
    org_type_id: { type: String },
    organisation_number: { type: String },
    email: { type: String },
    home_page: { type: String },
    mobile_phone: { type: String },
    address_line1: { type: String },
    address_line2: { type: String },
    city: { type: String },
    country: { type: String },
    country_id: { type: String },
    post_code: { type: String },
    longitude: { type: Number },
    latitude: { type: Number },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [<longitude>, <latitude> ]
      },
    },
    org_logo_base64: { type: String },
    members: { type: Number },
    description: { type: String, default: "" },
    logo: { type: String, default: "" },
    login_email: { type: String },
    login_password: { type: String },
    last_login: { type: String },
    account_created: { type: Boolean, default: false }, // when organisation signup we will mark this as true
    registration_date: { type: Date }, // date on which the organisation signup
    organisation_sport_list: { type: Array },
    organisation_sport_count: { type: Number },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

module.exports = mongoose.model(
  "organisation-details",
  organisationDetailSchema
);
