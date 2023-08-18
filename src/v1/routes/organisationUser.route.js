const express = require("express");

const organisationUserController = require("../controllers/organisationUser.controller");
const mediaUpload = require("../../../middlewares/upload-aws-image");
const {
  passwordValidation,
  validateRequest,
} = require("./authValidation/authValidation");
const {
  checkOrgUserAuth,
} = require("../../../middlewares/authMiddlewareOrgPanel");
const { checkAuthGuard } = require("../../../middlewares/authGuard");
const Roles = require("../../../utils/roles");

const router = express.Router();
// router.get(
//   "/get_all",
//   checkAuthGuard([Roles.Admin, Roles.Manager]),
//   checkAdminUserAuth,
//   organisationUserController.getOrganisationUsers
// );
router.get("/refresh-token", organisationUserController.refreshingToken);
router.get(
  "/by_org/:id",
  checkOrgUserAuth,
  checkAuthGuard([Roles.OrgAdmin, Roles.OrgManager]),
  organisationUserController.getOrganisationUserByOrgId
);
router.post(
  "/signup",
  checkOrgUserAuth,
  checkAuthGuard([Roles.OrgAdmin]),
  mediaUpload.single("picture"),
  organisationUserController.createOrganisationUser
);
router.post("/login", organisationUserController.loginOrganisationUser);
router.post(
  "/login_verify_otp",
  organisationUserController.loginOrganisationUserVerifyOtp
);
router.post(
  "/login_resend_otp",
  organisationUserController.loginOrganisationUserResendOtp
);
router.get(
  "/logout",
  checkOrgUserAuth,
  checkAuthGuard([Roles.OrgAdmin, Roles.OrgManager]),
  organisationUserController.logoutOrganisationUser
);
router.post("/nif_auth", organisationUserController.nifAuth);
// router.get(
//   "/msn_migration/:orgId",
//   organisationUserController.msnOrgDefaultGoalCreation
// );
router.patch(
  "/update_profile/:id",
  checkOrgUserAuth,
  checkAuthGuard([Roles.OrgAdmin, Roles.OrgManager]),
  mediaUpload.single("picture"),
  organisationUserController.updateOrganisationUserProfile
);
router.patch(
  "/:id",
  checkOrgUserAuth,
  checkAuthGuard([Roles.OrgAdmin]),
  mediaUpload.single("picture"),
  organisationUserController.updateOrganisationUser
);
router.delete(
  "/:id",
  checkOrgUserAuth,
  checkAuthGuard([Roles.OrgAdmin]),
  organisationUserController.deleteOrganisationUser
);
router.post(
  "/send-reset-password-email",
  organisationUserController.sendUserPasswordResetEmail
);
// router.post(
//   "/reset-password/:id/:token",
//   organisationUserController.userPasswordReset
// );
router.get(
  "/reset-password-request-details/:id",
  organisationUserController.getResetPasswordRequestDetails
);

router.post(
  "/change-password",
  passwordValidation,
  validateRequest,
  organisationUserController.changeUserPassword
);
router.get(
  "/loggeduser",
  checkOrgUserAuth,
  checkAuthGuard([Roles.OrgAdmin, Roles.OrgManager]),
  organisationUserController.loggedUser
);
router.get(
  "/",
  checkOrgUserAuth,
  checkAuthGuard([Roles.OrgAdmin, Roles.OrgManager]),
  organisationUserController.getOrganisationUser
);
module.exports = router;
