const express = require('express')
const notificationController = require('../controllers/notification.controller')
const {checkUserAuth} = require('../../../middlewares/authMiddleware')
const router = express.Router()
const {checkAuthGuard} = require('../../../middlewares/authGuard')
const Roles = require('../../../utils/roles')



router.get(
  '/app',
  checkUserAuth,
  notificationController.getOneSignalNotification
)
router.get(
  '/app/markAsRead',
  checkUserAuth,
  notificationController.notificationMarkAsRead
)
router.get(
  '/sender/get_all',
  checkUserAuth,
  notificationController.getnotificationSender
)
router.get(
  '/receiver/get_all',
  checkUserAuth,
  notificationController.getnotificationReceiver
)

router.post('/', checkUserAuth, notificationController.createnotification)
router.patch(
  '/:id',
  checkUserAuth,
  notificationController.updatenotification
)
router.get(
  '/app/unread/count',
  checkUserAuth,
  notificationController.totalnotificationUnRead
);
router.delete('/:id', checkUserAuth, notificationController.deletenotification)
router.get('/:id', checkAuthGuard([Roles.User]), notificationController.getnotification)

module.exports = router
