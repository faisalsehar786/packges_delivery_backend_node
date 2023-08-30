const express = require('express')
const paymentController = require('../controllers/payment.controller')
const router = express.Router()

router.get('/get_all', paymentController.getPayments)
router.get('/total_payments', paymentController.totalPayments)
router.get('/details/:id', paymentController.getPayment)
router.get('/payments_status_by_order_no', paymentController.checkPaymentStatusofOrder)
router.post('/create_payment', paymentController.createPayment)
router.delete('/delete_payment/:id', paymentController.deletePayment)
router.patch('/update_payment/:id', paymentController.updatePayment)

module.exports = router
