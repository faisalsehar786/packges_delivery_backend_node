const mongoose = require("mongoose");

const organisationLoginOtpSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "OrganisationUser",
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
    expires: 300, // Expires after 5 minutes (300 in seconds)
  },
});

const OrganisationLoginOtp = mongoose.model(
  "OrganisationLoginOtp",
  organisationLoginOtpSchema
);

module.exports = OrganisationLoginOtp;
