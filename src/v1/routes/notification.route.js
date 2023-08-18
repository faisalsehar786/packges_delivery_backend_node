const express = require("express");

const { body } = require("express-validator");
const notificationController = require("../controllers/notification.controller");
const { checkUserAuth } = require("../../../middlewares/authMiddleware");

const router = express.Router();
const { checkAuthGuard } = require("../../../middlewares/authGuard");
const Roles = require("../../../utils/roles");

router.get(
  "/get_all",
  checkAuthGuard([Roles.User]),
  checkUserAuth,
  notificationController.getnotifications
);
// router.get(
//   "/total_notification",
//   checkAuthGuard([Roles.User]),
//   checkUserAuth,
//   notificationController.totalnotification
// );
router.get(
  "/app",
  checkAuthGuard([Roles.User]),
  checkUserAuth,
  notificationController.getOneSignalNotification
);
router.get(
  "/app/markAsRead",
  checkAuthGuard([Roles.User]),
  checkUserAuth,
  notificationController.notificationMarkAsRead
);
// router.get(
//   "/sender/get_all",
//   checkAuthGuard([Roles.User]),
//   checkUserAuth,
//   notificationController.getnotificationSender
// );
// router.get(
//   "/receiver/get_all",
//   checkAuthGuard([Roles.User]),
//   checkUserAuth,
//   notificationController.getnotificationReceiver
// );

// router.post(
//   "/",
//   [
//     body("sender_id", "sender_id must not be empty.")
//       .isLength({ min: 1 })
//       .trim(),
//     body("receiver_id", "receiver_id must not be empty.")
//       .isLength({ min: 1 })
//       .trim(),
//     body("title", "company_id must not be empty.").isLength({ min: 1 }).trim(),
//   ],
//   checkAuthGuard([Roles.User]),
//   checkUserAuth,
//   notificationController.createnotification
// );
// router.put(
//   "/:id",
//   checkAuthGuard([Roles.User]),
//   checkUserAuth,
//   notificationController.updatenotification
// );
// router.delete(
//   "/:id",
//   checkAuthGuard([Roles.User]),
//   checkUserAuth,
//   notificationController.deletenotification
// );
router.get(
  "/:id",
  checkAuthGuard([Roles.User]),
  checkUserAuth,
  notificationController.getnotification
);

module.exports = router;
