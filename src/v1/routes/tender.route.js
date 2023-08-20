const express = require('express')
const tenderController = require('../controllers/tender.controller')
const router = express.Router()

router.get('/get_all', tenderController.getTenders)
router.get('/total_tenders', tenderController.totalTenders)
router.get('/details/:id', tenderController.getTender)
router.post('/create_tender', tenderController.createTender)
// router.put('/:id', tenderController.updatemedia)
router.delete('/delete_tender/:id', tenderController.deleteTender)
router.patch('/update_tender/:id', tenderController.updateTender)
router.delete('delete_tender_order_payments/:id', tenderController.deleteTenderOrderPayments)

module.exports = router
    