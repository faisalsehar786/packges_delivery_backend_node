const express = require('express')
const orderController = require('../controllers/order.controller')
const router = express.Router()
const { checkUserAuth } = require('../../../middlewares/authMiddleware')
const mediaUpload = require('../../../middlewares/upload-aws-image')
const { body } = require('express-validator')

router.get(
  '/track_order_by_id_order_no_or_with_payment_details',
  checkUserAuth,
  orderController.getTrackedOrder_By_Order_No_Id_or_With_Payment_Details
)
router.patch('/update_location/:id', checkUserAuth, orderController.updateOrder)
router.patch(
  '/update_location_order_loaction_when_in_proccess/:driver_id',
  checkUserAuth,
  orderController.trackDriverOrderLocationWhenOnProcess
)
router.patch(
  '/update_location_by_order_no/:order_no',
  checkUserAuth,
  orderController.updateOrderByNo
)
router.patch('/cancel_order_by_order_no/:order_no', checkUserAuth, orderController.cancelOrderByNo)
router.patch('/change_order_status/:order_no', checkUserAuth, orderController.changeOrderStatusByNo)

router.patch(
  '/complete_order_by_order_no/:order_no',
  checkUserAuth,
  orderController.completeOrderByNo
)
module.exports = router
