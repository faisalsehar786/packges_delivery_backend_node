const express = require("express");

const router = express.Router();
const organisationController = require("../controllers/organisation.controller");
const { checkUserAuth } = require("../../../middlewares/authMiddleware");
const {
  checkAuthOrigins,
} = require("../../../middlewares/authMiddlewareGenericAll");
const {
  checkOrgUserAuth,
} = require("../../../middlewares/authMiddlewareOrgPanel");
const mediaUpload = require("../../../middlewares/upload-aws-image");
const { checkAuthGuard } = require("../../../middlewares/authGuard");
const {
  verifyAccessRecords,
} = require("../../../middlewares/verifyAccessRecords");
const Roles = require("../../../utils/roles");

// router.get("/get_all", organisationController.getOrganisations);

router.get(
  "/get_top_10",
  checkAuthOrigins,
  checkAuthGuard([Roles.Admin, Roles.Manager, Roles.User]),
  organisationController.getTopTenOrganisations
);
// router.get("/total_companies", organisationController.totalOrganisations);
router.get(
  "/get_org_sport",
  checkAuthOrigins,
  checkAuthGuard([Roles.Admin, Roles.Manager]),
  organisationController.getOrganisationSports
);
router.get(
  "/get_org_sport_app",
  checkAuthOrigins,
  checkAuthGuard([Roles.User]),
  organisationController.getOrganisationSportsApp
);
router.get(
  "/get_sport_list",
  checkAuthOrigins,
  checkAuthGuard([Roles.OrgAdmin, Roles.OrgManager]),
  organisationController.getOrganisationSportsStats
);
// router.get("/get_sports_list", organisationController.getSystemSports);
router.get(
  "/search",
  checkAuthOrigins,
  checkAuthGuard([
    Roles.Admin,
    Roles.OrgAdmin,
    Roles.Manager,
    Roles.OrgManager,
    Roles.User,
  ]),
  organisationController.searchOrganisation
);
router.get("/search_nif_org", organisationController.searchOrganisation);
router.get(
  "/stats/:id",
  checkAuthOrigins,
  checkAuthGuard([Roles.OrgAdmin, Roles.OrgManager]),
  organisationController.getOrganisationStats
);
router.get(
  "/stats_admin/:id",
  checkAuthOrigins,
  checkAuthGuard([Roles.Admin, Roles.Manager]),
  organisationController.getOrganisationStatsAdmin
);
router.get(
  "/sport_stats/",
  checkOrgUserAuth,
  checkAuthGuard([Roles.OrgAdmin, Roles.OrgManager]),
  organisationController.getSportSpecificOrganisationStats
);
router.get(
  "/get_leader/:org_id",
  checkAuthOrigins,
  checkAuthGuard([Roles.Admin, Roles.Manager]),
  organisationController.getOrganisationLeader
);
// this route is used in org panel terms and conditions page
router.get("/detail/:org_no", organisationController.getOrganisationByOrgNo);
router.put(
  "/msn_order/:id",
  checkAuthGuard([Roles.OrgAdmin, Roles.OrgManager]),
  organisationController.msnOrder
);
router.get(
  "/details_user/:id",
  checkUserAuth,
  checkAuthGuard([Roles.User]),
  organisationController.getAllGoalsAndStats
);
router.get(
  "/:id",
  checkAuthOrigins,
  checkAuthGuard([
    Roles.Admin,
    Roles.OrgAdmin,
    Roles.Manager,
    Roles.OrgManager,
  ]),
  organisationController.getOrganisation
);
router.patch(
  "/:id",
  verifyAccessRecords(),
  checkAuthOrigins,
  checkAuthGuard([Roles.Admin, Roles.OrgAdmin, Roles.Manager]),
  mediaUpload.single("logo"),
  organisationController.updateOrganisation
);
// router.post(
//   "/",
//   verifyAccessRecords(),
//   checkOrgUserAuth,
//   checkAuthGuard([Roles.OrgAdmin, Roles.OrgManager]),
//   organisationController.createOrganisation
// );
router.delete(
  "/:id",
  verifyAccessRecords(),
  checkOrgUserAuth,
  checkAuthGuard([Roles.OrgAdmin]),
  organisationController.deleteOrganisation
);

module.exports = router;
