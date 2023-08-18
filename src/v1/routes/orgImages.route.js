const express = require("express");

const router = express.Router();
const orgImagesController = require("../controllers/orgImages.controller");
const {
  checkOrgUserAuth,
} = require("../../../middlewares/authMiddlewareOrgPanel");
const {
  checkAuthOrigins,
} = require("../../../middlewares/authMiddlewareGenericAll");
const { checkAuthGuard } = require("../../../middlewares/authGuard");
const Roles = require("../../../utils/roles");

router
  .post(
    "/",
    checkOrgUserAuth,
    checkAuthGuard(Roles.OrgAdmin),
    orgImagesController.createOrgImages
  )
  .get(
    "/",
    checkAuthOrigins,
    checkAuthGuard([
      Roles.OrgAdmin,
      Roles.OrgManager,
      Roles.Admin,
      Roles.Manager,
    ]),
    orgImagesController.getAllOrgImages
  );
router.get(
  "/:type",
  checkAuthOrigins,
  checkAuthGuard([
    Roles.OrgAdmin,
    Roles.OrgManager,
    Roles.Admin,
    Roles.Manager,
  ]),
  orgImagesController.getOrgImages
);

module.exports = router;
