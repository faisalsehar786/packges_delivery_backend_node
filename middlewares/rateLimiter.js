const rateLimit = require("express-rate-limit");
const apiResponse = require("../helpers/apiResponse");

const rateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 70,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    console.log("Rate limit exceeded");
    return apiResponse.rateLimitResponse(
      res,
      "Beklager, det ble utført for mange forespørsler. Vennligst prøv igjen senere.",
      "Too many requests, please try again later."
    );
  },
  keyGenerator: (req) => req.headers["x-forwarded-for"] || req.ip, // if behind a proxy
});

module.exports = {
  rateLimiter,
};
