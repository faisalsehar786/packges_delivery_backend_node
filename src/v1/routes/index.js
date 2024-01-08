const express = require("express");

const router = express.Router();
const apiResponse = require("../../../helpers/apiResponse");

/* GET home page. */
router.get("/", (req, res) =>
  apiResponse.successResponse(res, "HMHY Søknad", "HMHY Application")
);

module.exports = router;
  