const express = require('express')
const notificationController = require('../controllers/notification.controller')
const { checkUserAuth } = require('../../../middlewares/authMiddleware')
const router = express.Router()
const { checkAuthGuard } = require('../../../middlewares/authGuard')
const Roles = require('../../../utils/roles')

router.get('/get_all', checkUserAuth, notificationController.getnotifications)
router.get('/markAsRead', checkUserAuth, notificationController.notificationMarkAsRead)
router.post('/', checkUserAuth, notificationController.createnotification)
router.post(
  '/send_one_signal_notifications',
  checkUserAuth,
  notificationController.sendOnesignalNotifications
)

router.patch('/:id', checkUserAuth, notificationController.updatenotification)
router.get('/app/unread/count', checkUserAuth, notificationController.totalnotificationUnRead)
router.delete('/:id', checkUserAuth, notificationController.deletenotification)
router.get('/:id', checkAuthGuard([Roles.User]), notificationController.getnotification)

module.exports = router
