const mongoose = require("mongoose");

const organisationUserPasswordResetSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "OrganisationUser",
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
    expires: 1800, // Expires after 30 minutes (1800 in seconds)
  },
});

const OrganisationUserPasswordReset = mongoose.model(
  "OrganisationUserPasswordReset",
  organisationUserPasswordResetSchema
);

module.exports = OrganisationUserPasswordReset;
