const mongoose = require("mongoose");

const federationSchema = new mongoose.Schema(
  {
    org_id: { type: Number, unique: true, index: true },
    reference_id: { type: String },
    federation_name: { type: String },
    abbreviation: { type: String },
    describing_name: { type: String },
    org_type_id: { type: Number },
    organisation_number: { type: Number },
    email: { type: String },
    home_page: { type: String },
    mobile_phone: { type: String },
    address_line1: { type: String },
    address_line2: { type: String },
    city: { type: String },
    country: { type: String },
    country_id: { type: Number },
    post_code: { type: Number },
    longitude: { type: Number },
    latitude: { type: Number },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [<longitude>, <latitude> ]
      },
    },
    org_logo_base64: { type: String },
    members: { type: Number },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

module.exports = mongoose.model("Federation", federationSchema);
