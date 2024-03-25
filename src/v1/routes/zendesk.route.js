const express = require("express");
const zendeskController = require("../controllers/zendesk.controller");
const { checkUserAuth } = require("../../../middlewares/authMiddleware");

const router = express.Router();
router.post(
  "/user_create_ticket",

  checkUserAuth,
  zendeskController.createTicketUser
);

module.exports = router;
