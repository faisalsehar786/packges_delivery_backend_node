const express = require('express')
const tenderController = require('../controllers/tender.controller')
const router = express.Router()
const {checkUserAuth} = require('../../../middlewares/authMiddleware')
const {body, check} = require('express-validator')

router.get('/get_all', checkUserAuth, tenderController.getTenders)
router.get('/total_tenders', checkUserAuth, tenderController.totalTenders)
router.get('/details/:id', checkUserAuth, tenderController.getTender)
router.post(
  '/create_tender',
  [
    body('total_price', 'Price id must not be empty.').isLength({min: 1}).isNumeric().trim(),
    body('title', 'title must not be empty.').isLength({min: 1}).trim(),
    // body('tender_variations').isArray(),
    // body('*.weight').isNumeric().not().isEmpty(),
    // body('*.height').isNumeric().not().isEmpty(),
    // body('*.width').isNumeric().not().isEmpty(),
  ],
  checkUserAuth,  
  tenderController.createTender
)
router.delete('/delete_tender/:id', checkUserAuth, tenderController.deleteTender)
router.put('/update_tender/:id', checkUserAuth, tenderController.updateTender)
router.delete(
  'delete_tender_order_payments/:id',
  checkUserAuth,
  tenderController.deleteTenderOrderPayments
)
  
module.exports = router
