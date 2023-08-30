const express = require('express')
const driverController = require('../controllers/driver.controller')
const router = express.Router()
const {checkUserAuth} = require('../../../middlewares/authMiddleware')
const mediaUpload = require('../../../middlewares/upload-aws-image')
const {body} = require('express-validator')

router.get('/drivers_requests_for_tender', checkUserAuth, driverController.driversRequestForTender)
router.get('/get_nearest_tender', checkUserAuth, driverController.getNearestTender)
router.get(
  '/get_nearest_driver_for_tender',
  checkUserAuth,
  driverController.getNearestDriverForTender
)
router.get('/get_driver_tenders', checkUserAuth, driverController.getdriverTenders)
router.get('/get_driver_requests_history', driverController.driversRequestHistoryForTenders)

router.post(
  '/driver_request_to_customer_for_tender',
  checkUserAuth,

  [
    body('customer_id').not().isEmpty(),
    body('driver_id').not().isEmpty(),
    body('tender_id').not().isEmpty(),
  ],
  driverController.createDriverReuest
)

module.exports = router
