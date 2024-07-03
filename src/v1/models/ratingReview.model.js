const mongoose = require('mongoose')
const mongooseDelete = require('mongoose-delete')

const ratingReviewSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    tender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tender', default: null },
    text: { type: String },
    rating: { type: Number, default: 0 },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
)
ratingReviewSchema.plugin(mongooseDelete, { overrideMethods: 'all' })

module.exports = mongoose.model('RatingReview', ratingReviewSchema)
