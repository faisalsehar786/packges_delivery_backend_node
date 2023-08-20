const express = require('express')
const orderController = require('../controllers/order.controller')
const router = express.Router()

router.get('/get_all', orderController.getOrders)
router.get('/total_orders', orderController.totalOrders)
router.get('/details/:id', orderController.getOrder)
router.post('/create_order', orderController.createOrder)
router.delete('/delete_order/:id', orderController.deleteOrder)  
router.patch('/update_order/:id', orderController.updateOrder)

 
module.exports = router 
    