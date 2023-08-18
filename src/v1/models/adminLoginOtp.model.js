const mongoose = require("mongoose");

const adminLoginOtpSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
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

const AdminLoginOtp = mongoose.model("AdminLoginOtp", adminLoginOtpSchema);

module.exports = AdminLoginOtp;
