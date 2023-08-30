const express = require('express')
const customerController = require('../controllers/customer.controller')
const router = express.Router()
const {checkUserAuth} = require('../../../middlewares/authMiddleware')
const mediaUpload = require('../../../middlewares/upload-aws-image')
const {body} = require('express-validator')


router.patch(
  '/accept_driver_request_for_tender/:request_id/:tender_id',
  checkUserAuth,
  customerController.acceptDriverRequestForTender
)
module.exports = router
    