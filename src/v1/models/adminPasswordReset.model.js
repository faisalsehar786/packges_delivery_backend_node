const mongoose = require("mongoose");

const adminPasswordResetSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
    expires: 1800, // Expires after 30 minutes (1800 in seconds)
  },
});

const OrganisationUserPasswordReset = mongoose.model(
  "AdminPasswordReset",
  adminPasswordResetSchema
);

module.exports = OrganisationUserPasswordReset;
