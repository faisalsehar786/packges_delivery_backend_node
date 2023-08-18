const otpGenerator = require("otp-generator");
const { OTP_LENGTH, OTP_CONFIG } = require("../config/otp.config");

module.exports.generateOTP = () => {
  const OTP = otpGenerator.generate(OTP_LENGTH, OTP_CONFIG);
  return OTP;
};
