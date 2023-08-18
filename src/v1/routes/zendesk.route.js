const express = require("express");
const zendeskController = require("../controllers/zendesk.controller");
const { checkUserAuth } = require("../../../middlewares/authMiddleware");
const {
  checkOrgUserAuth,
} = require("../../../middlewares/authMiddlewareOrgPanel");
const {
  checkAdminUserAuth,
} = require("../../../middlewares/authMiddlewareAdminPanel");
const { checkAuthGuard } = require("../../../middlewares/authGuard");
const Roles = require("../../../utils/roles");

const router = express.Router();

router.post(
  "/user_create_ticket",
  checkAuthGuard([Roles.User]),
  checkUserAuth,
  zendeskController.createTicketUser
);

router.post(
  "/org_create_ticket",
  checkAuthGuard([Roles.OrgAdmin, Roles.OrgManager]),
  checkOrgUserAuth,
  zendeskController.createTicketOrg
);

router.post(
  "/admin_create_ticket",
  checkAuthGuard([Roles.Admin, Roles.Manager]),
  checkAdminUserAuth,
  zendeskController.createTicketAdmin
);

module.exports = router;
