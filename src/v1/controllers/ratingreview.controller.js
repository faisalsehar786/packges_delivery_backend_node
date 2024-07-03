const RatingReview = require('../models/ratingReview.model')
const UserModal = require('../models/user.model')
const apiResponse = require('../../../helpers/apiResponse')
const { createItemReturnData, updateItemReturnData } = require('../../../helpers/commonApis')

const createRating = async (req, res, next) => {
  const user_id = req?.body?.driver_id
  req.body.user_id = user_id

  try {
    const status = await createItemReturnData({
      req,
      res,
      Model: RatingReview,
      itemName: 'Rating Review',
    })
    if (status) {
      const ratings = await RatingReview.find({ user_id: user_id }).exec()
      let totalRating = 0
      ratings.forEach((r) => {
        totalRating += r.rating
      })
      const avgRating = totalRating / ratings.length
      // const totalRatingOutOf5 = avgRating / 5

      await updateItemReturnData({
        Model: UserModal,
        cond: {
          _id: user_id,
        },
        updateobject: {
          rating: avgRating,
        },
        req,
        res,
      })

      return apiResponse.successResponseWithData(
        res,
        'Oppretting vellykket.',
        `Rating Review Successfully`,
        status
      )
    } else {
      return apiResponse.ErrorResponse(
        res,
        'Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.',
        'System went wrong, Kindly try again later'
      )
    }
  } catch (err) {
    next(err)
  }
}

module.exports = { createRating }
