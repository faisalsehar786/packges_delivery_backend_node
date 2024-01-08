const express = require('express')
const tenderController = require('../controllers/tender.controller')
const router = express.Router()
const {checkUserAuth} = require('../../../middlewares/authMiddleware')
const mediaUpload = require('../../../middlewares/upload-aws-image')
const {body} = require('express-validator')
router.get('/get_all', checkUserAuth, tenderController.getTenders)
router.get('/details/:id', checkUserAuth, tenderController.getTender)
router.post(
  '/create_tender',
  checkUserAuth,
  // mediaUpload.array('files', 5),
  [
    // body('total_price', 'Price must not be empty.').isLength({min: 1}).isNumeric().trim(),
    // body('title', 'title must not be empty.').isLength({min: 1}).trim(),
    // body('location_to').isLength({min: 1}).trim(),
    // body('location_from').isLength({min: 1}).trim(),
    // body('delivery_date').isLength({min: 1}).trim(),
    // body('pickup_date').isLength({min: 1}).trim(),
    // body('tender_variations').isArray(),
    // body('*.weight').isNumeric().not().isEmpty(),
    // body('*.height').isNumeric().not().isEmpty(),
    // body('*.width').isNumeric().not().isEmpty(),
  ],
  tenderController.createTender
)
router.delete('/delete_tender/:id', checkUserAuth, tenderController.deleteTender)
router.patch(
  '/update_tender/:id',
  mediaUpload.array('files', 5),
  checkUserAuth,
  tenderController.updateTender
)

module.exports = router
