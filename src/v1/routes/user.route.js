const express = require("express");

const router = express.Router();
const userController = require("../controllers/user.controller");
const mediaUpload = require("../../../middlewares/upload-aws-image");
const { checkUserAuth } = require("../../../middlewares/authMiddleware");
const {
  checkAuthOrigins,
} = require("../../../middlewares/authMiddlewareGenericAll");
const {
  checkAdminUserAuth,
} = require("../../../middlewares/authMiddlewareAdminPanel");
const { checkAuthGuard } = require("../../../middlewares/authGuard");
const Roles = require("../../../utils/roles");

router.get("/get_all", checkAdminUserAuth, userController.getUsers);
router.post("/vipps_login_auth_uri", userController.loginVippsAuthUri);
router.post("/vipps_login", userController.loginVippsUserInfo);
router.get(
  "/detail_profile_app",
  checkAuthOrigins,
  checkAuthGuard([Roles.User]),
  userController.getDetailProfileApp
);
router.get(
  "/detail_profile/:id",
  checkAuthOrigins,
  checkAuthGuard([Roles.Admin, Roles.Manager]),
  userController.getDetailProfile
);
router.get(
  "/transactions/:id",
  checkAdminUserAuth,
  checkAuthGuard([Roles.Admin, Roles.Manager]),
  userController.getUserTransactions
);
router.get(
  "/transactions_app/:id/:year",
  checkUserAuth,
  checkAuthGuard([Roles.User]),
  userController.getUserTransactionsApp
);
router.get(
  "/transactions_app_goal_support/:id/:year",
  checkUserAuth,
  checkAuthGuard([Roles.User]),
  userController.getUserTransactionsAppGoalSupport
);
// router.post("/login", userController.loginUser);
router.get("/refresh_token", userController.refreshTokenUser);
router.get(
  "/logout",
  checkUserAuth,
  checkAuthGuard([Roles.User]),
  userController.logout
);
router.get(
  "/search",
  checkAdminUserAuth,
  checkAuthGuard([Roles.Admin, Roles.Manager]),
  userController.searchUser
);
router.get(
  "/",
  checkUserAuth,
  checkAuthGuard([Roles.User]),
  userController.getUser
);
router.patch(
  "/:id",
  checkUserAuth,
  checkAuthGuard([Roles.User]),
  mediaUpload.single("picture"),
  userController.updateUser
);
// router.delete("/:id", userController.deleteUser);

module.exports = router;
