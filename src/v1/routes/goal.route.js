const express = require("express");

const router = express.Router();
const goalController = require("../controllers/goal.controller");
const { checkUserAuth } = require("../../../middlewares/authMiddleware");
const {
  checkAuthOrigins,
} = require("../../../middlewares/authMiddlewareGenericAll");
const {
  checkAdminUserAuth,
} = require("../../../middlewares/authMiddlewareAdminPanel");
const { checkAuthGuard } = require("../../../middlewares/authGuard");
const Roles = require("../../../utils/roles");

router.post(
  "/",
  checkAuthOrigins,
  checkAuthGuard([Roles.OrgAdmin, Roles.OrgManager]),
  goalController.createGoal
);
router.get(
  "/by_organisation",
  checkAuthOrigins,
  checkAuthGuard([Roles.OrgAdmin, Roles.OrgManager]),
  goalController.getOrganisationSportGoals
);

router.get(
  "/by_organisation_app",
  checkAuthOrigins,
  checkAuthGuard([Roles.User]),
  goalController.getOrganisationSportGoalsApp
);
router.get(
  "/by_sport_user",
  checkUserAuth,
  checkAuthGuard([Roles.User]),
  goalController.getOrganisationSportGoalsByUser
);
router.get(
  "/all_organisation",
  checkAdminUserAuth,
  checkAuthGuard([Roles.Admin, Roles.Manager]),
  goalController.getOrganisationAllGoals
);
router.get(
  "/all_list",
  checkAdminUserAuth,
  checkAuthGuard([Roles.Admin, Roles.Manager]),
  goalController.getAllGoals
);
// router.get(
//   "/get_all",
//   checkAuthGuard([Roles.Admin, Roles.Manager]),
//   checkAdminUserAuth,
//   goalController.getGoals
// );
router.get(
  "/monthly_stats/:id",
  checkUserAuth,
  checkAuthGuard([Roles.User]),
  goalController.monthlyStats
);
router.get(
  "/search",
  checkAdminUserAuth,
  checkAuthGuard([Roles.Admin, Roles.Manager]),
  goalController.searchGoals
);
router.get(
  "/:id",
  checkAuthOrigins,
  checkAuthGuard([Roles.OrgAdmin, Roles.OrgManager]),
  goalController.getGoal
);
router.get(
  "/get_goal_admin/:id",
  checkAuthOrigins,
  checkAuthGuard([Roles.Admin, Roles.Manager]),
  goalController.getGoalAdmin
);
router.get(
  "/get_goal_app/:id",
  checkAuthOrigins,
  checkAuthGuard([Roles.User]),
  goalController.getGoalApp
);
router.delete(
  "/:id",
  checkAuthOrigins,
  checkAuthGuard([Roles.OrgAdmin, Roles.OrgManager]),
  goalController.deleteGoal
);

router.delete(
  "/delete_goal_admin/:id",
  checkAuthOrigins,
  checkAuthGuard([Roles.Admin, Roles.Manager]),
  goalController.deleteGoalAdmin
);
router.patch(
  "/:id",
  checkAuthOrigins,
  checkAuthGuard([Roles.OrgAdmin, Roles.OrgManager]),
  goalController.updateGoal
);

router.patch(
  "/update_goal_admin/:id",
  checkAuthOrigins,
  checkAuthGuard([Roles.Admin, Roles.Manager]),
  goalController.updateGoalAdmin
);

module.exports = router;
