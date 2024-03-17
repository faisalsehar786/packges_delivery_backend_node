const express = require('express')
const adminController = require('../controllers/admin.controller')
const mediaUpload = require('../../../middlewares/upload-aws-image')
const {passwordValidation, validateRequest} = require('./authValidation/authValidation')
const {checkAdminUserAuth} = require('../../../middlewares/authMiddlewareAdminPanel')

require('../../../middlewares/authMiddlewareGenericAll')
const {checkAuthGuard} = require('../../../middlewares/authGuard')
const Roles = require('../../../utils/roles')

const router = express.Router()

router.post(
  '/signup',
  checkAdminUserAuth,
  checkAuthGuard(Roles.Admin),
  mediaUpload.single('picture'),
  adminController.createAdmin
)
router.post('/login', adminController.loginAdmin)
router.post('/login_verify_otp', adminController.loginAdminVerifyOtp)
router.post('/login_resend_otp', adminController.loginAdminResendOtp)
router.get('/logout', checkAdminUserAuth, checkAuthGuard(Roles.Admin), adminController.logoutAdmin)
router.patch(
  '/update_profile/:id',
  checkAdminUserAuth,
  checkAuthGuard(Roles.Admin, Roles.Manager),
  mediaUpload.single('picture'),
  adminController.updateProfile
)
router.patch(
  '/:id',
  checkAdminUserAuth,
  checkAuthGuard(Roles.Admin),
  mediaUpload.single('picture'),
  adminController.updateAdmin
)
router.delete('/:id', checkAdminUserAuth, checkAuthGuard(Roles.Admin), adminController.deleteAdmin)
router.post('/send-reset-password-email', adminController.sendUserPasswordResetEmail)
router.get('/reset-password-request-details/:id', adminController.getResetPasswordRequestDetails)
router.get('/get_all', checkAdminUserAuth, checkAuthGuard(Roles.Admin), adminController.getAdmins)
// router.post("/reset-password/:id/:token", checkAdminUserAuth, adminController.userPasswordReset);
router.get('/refresh-token', adminController.refreshingToken)
router.post(
  '/change-password',
  passwordValidation,
  validateRequest,
  adminController.changeUserPassword
)
router.get(
  '/loggeduser',
  checkAdminUserAuth,
  checkAuthGuard(Roles.Admin),
  adminController.loggedUser
)

router.get(
  '/',
  checkAuthGuard(Roles.Admin, Roles.Manager),
  checkAdminUserAuth,
  adminController.getAdmin
)
router.get(
  '/get_by_id/:id',
  checkAuthGuard(Roles.Admin),
  checkAdminUserAuth,
  adminController.getAdminById
)

router.get('/get_admin_stats', checkAdminUserAuth, adminController.getAdminStats)

router.get('/get_app_users_stats', checkAdminUserAuth, adminController.getAppUsersStats)

module.exports = router
