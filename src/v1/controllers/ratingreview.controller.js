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
      // const ratings = await RatingReview.find({ user_id: user_id }).exec()
      // let totalRating = 0
      // ratings.forEach((r) => {
      //   totalRating += r.rating
      // })
      // const avgRating = totalRating / ratings.length
      // const totalRatingOutOf5 = avgRating / 5

      const ratings5 = await RatingReview.find({ user_id: user_id, rating: 5 }).count()
      const ratings4 = await RatingReview.find({ user_id: user_id, rating: 4 }).count()
      const ratings3 = await RatingReview.find({ user_id: user_id, rating: 3 }).count()
      const ratings2 = await RatingReview.find({ user_id: user_id, rating: 2 }).count()
      const ratings1 = await RatingReview.find({ user_id: user_id, rating: 1 }).count()
      const makeRate5 = ratings5 * 5
      const makeRate4 = ratings4 * 4
      const makeRate3 = ratings3 * 3
      const makeRate2 = ratings2 * 2
      const makeRate1 = ratings1 * 1

      const totalRating = makeRate5 + makeRate4 + makeRate3 + makeRate2 + makeRate1
      console.log({ ratings5, ratings4, ratings3, ratings2, ratings1 })

      const ratinOutof5 = totalRating / 5

      await updateItemReturnData({
        Model: UserModal,
        cond: {
          _id: user_id,
        },
        updateobject: {
          rating: ratinOutof5.toFixed(1) >= 5 ? 5 : ratinOutof5.toFixed(1),
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
