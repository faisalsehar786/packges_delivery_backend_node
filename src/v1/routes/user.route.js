const express = require('express')

const router = express.Router()
const userController = require('../controllers/user.controller')
const mediaUpload = require('../../../middlewares/upload-aws-image')
const {checkUserAuth} = require('../../../middlewares/authMiddleware')
const {checkAuthOrigins} = require('../../../middlewares/authMiddlewareGenericAll')
const {checkAdminUserAuth} = require('../../../middlewares/authMiddlewareAdminPanel')
const {checkAuthGuard} = require('../../../middlewares/authGuard')
const Roles = require('../../../utils/roles')
const {passwordValidation, validateRequest} = require('./authValidation/authValidation')

router.get('/get_all', checkAdminUserAuth, userController.getUsers)
router.post('/vipps_login_auth_uri', userController.loginVippsAuthUri)
router.post('/vipps_login', userController.loginVippsUserInfo)

router.get(
  '/detail_profile/:id',
  checkAuthOrigins,
  // checkAuthGuard([Roles.Admin, Roles.Manager]),
  userController.getDetailProfile
)

router.get(
  '/detail_profile_driver/:id',
  checkAuthOrigins,
  // checkAuthGuard([Roles.Admin, Roles.Manager]),
  userController.getDetailProfileDriver
)

router.get(
  '/detail_profile_customer/:id',
  checkAuthOrigins,
  // checkAuthGuard([Roles.Admin, Roles.Manager]),
  userController.getDetailProfileCustomer
)

router.get('/detail_profile_stats', checkAuthOrigins, userController.getDetailProfileStatsData)

router.post('/login_test', userController.loginUser)
//////////////////////////////////////////////////////////////

router.post('/login', userController.loginFrontEnd)

router.post('/login_verify_otp', userController.loginFrontEndVerifyOtp)

router.post('/login_resend_otp', userController.loginFrontEndResendOtp)

router.post(
  '/register',
  // checkAuthGuard([Roles.OrgAdmin]),
  mediaUpload.single('picture'),
  userController.createUserFrontEnd
)

router.post('/send-reset-password-email', userController.sendUserFrontEndPasswordResetEmail)

router.get(
  '/reset-password-request-details/:id',
  userController.getUserFrontEndResetPasswordRequestDetails
)

router.post(
  '/change-password',
  passwordValidation,
  validateRequest,
  userController.changeUserFrontEndUserPassword
)
//////////////////////////////////////////////////////////////////////

router.get('/refresh_token', userController.refreshTokenUser)
router.get('/logout', checkUserAuth, checkAuthGuard([Roles.User]), userController.logout)
router.get(
  '/search',
  checkAdminUserAuth,
  checkAuthGuard([Roles.Admin, Roles.Manager]),
  userController.searchUser
)
router.get('/', checkUserAuth, checkAuthGuard([Roles.User]), userController.getUser)
router.patch('/:id', checkUserAuth, mediaUpload.single('picture'), userController.updateUser)
router.delete('/:id', checkAdminUserAuth, userController.deleteUser)

module.exports = router
