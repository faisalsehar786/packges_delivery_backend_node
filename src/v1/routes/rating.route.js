const express = require('express')
const ratingReviewController = require('../controllers/ratingreview.controller')
const router = express.Router()
const { checkUserAuth } = require('../../../middlewares/authMiddleware')
router.post('/create_ratingReview', checkUserAuth, ratingReviewController.createRating)

module.exports = router
