const express = require("express");

const router = express.Router();
const goalSupportController = require("../controllers/goalSupport.controller");
const { checkUserAuth } = require("../../../middlewares/authMiddleware");
const {
  checkAdminUserAuth,
} = require("../../../middlewares/authMiddlewareAdminPanel");
const {
  checkOrgUserAuth,
} = require("../../../middlewares/authMiddlewareOrgPanel");
const { checkAuthGuard } = require("../../../middlewares/authGuard");
const Roles = require("../../../utils/roles");
const {
  checkAuthOrigins,
} = require("../../../middlewares/authMiddlewareGenericAll");

router.get(
  "/get_all_banks",
  checkUserAuth,
  checkAuthGuard([Roles.User]),
  goalSupportController.getAllBanks
);
router.post(
  "/select_bank",
  checkUserAuth,
  checkAuthGuard([Roles.User]),
  goalSupportController.selectBank
);
router.post(
  "/bank_consent_v3",
  checkUserAuth,
  checkAuthGuard([Roles.User]),
  goalSupportController.selectBankV3
);
router.get(
  "/get_accounts",
  checkUserAuth,
  checkAuthGuard([Roles.User]),
  goalSupportController.getAccounts
);
router.post(
  "/select_account_v3",
  checkUserAuth,
  checkAuthGuard([Roles.User]),
  goalSupportController.selectAccountV3
);
router.post(
  "/create_agreement",
  checkUserAuth,
  checkAuthGuard([Roles.User]),
  goalSupportController.createAgreement
);
router.post(
  "/get_agreement_status",
  checkUserAuth,
  checkAuthGuard([Roles.User]),
  goalSupportController.getAgreementStatus
);
router.post(
  "/",
  checkUserAuth,
  checkAuthGuard([Roles.User]),
  goalSupportController.createGoalSupport
);
router.post(
  "/v2",
  checkUserAuth,
  checkAuthGuard([Roles.User]),
  goalSupportController.createGoalSupportV2
);
router.get(
  "/delete_bank_account",
  checkUserAuth,
  checkAuthGuard([Roles.User]),
  goalSupportController.deleteBankAccount
);
// router.get("/by_user", goalSupportController.getGoalSupportByUserId);
router.patch(
  "/:id",
  checkUserAuth,
  checkAuthGuard([Roles.User]),
  goalSupportController.updateGoalSupport
);
router.get(
  "/get_all",
  checkAuthOrigins,
  checkAuthGuard([Roles.Admin, Roles.Manager]),
  goalSupportController.getGoalSupport
);
// router.get(
//   "/get_all_app",
//   checkAuthOrigins,
//   checkAuthGuard([Roles.User]),
//   goalSupportController.getGoalSupportApp
// );
router.get(
  "/get_support_players",
  checkOrgUserAuth,
  checkAuthGuard([Roles.OrgAdmin, Roles.OrgManager]),
  goalSupportController.getSupportPlayersByOrganisation
);
// router.get("/total_goal_support", goalSupportController.totalGoalSupports);
router.get(
  "/get_all_support_players",
  checkAdminUserAuth,
  checkAuthGuard([Roles.Admin, Roles.Manager]),
  goalSupportController.getAllSupportPlayers
);
// router.get("/:id", goalSupportController.getGoalSupport);
// router.delete("/:id", goalSupportController.deleteGoalSupport);

module.exports = router;
