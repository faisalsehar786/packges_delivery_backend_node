const chatModel = require('../models/chat.model')
const {
  getItem,
  updateItem,
  createItem,
  getPaginationWithPopulate,
} = require('../../../helpers/commonApis')
const apiResponse = require('../../../helpers/apiResponse')
const ObjectId = require('mongodb').ObjectId
const createChat = async (req, res, next) => {
  try {
    const {messageType} = req.body
    ;(req.body.imageUrl = messageType === 'image' ? req?.file?.location : null),
      await createItem({
        req,
        res,
        Model: chatModel,
        itemName: 'Chat',
      })
  } catch (err) {
    next(err)
  }
}

const getChat = async (req, res, next) => {
  try {
    const itemId = req.params.id
    return await getItem({id: itemId, Model: chatModel, res})
  } catch (err) {
    next(err)
  }
}

const getChats = async (req, res, next) => {
  try {
    const {senderId, recepientId, tender_id} = req.params
    const term = req.query.search
    return await getPaginationWithPopulate({
      req,
      res,
      model: chatModel,
      findOptions: {
        $and: [{tender_id: tender_id}],
        $or: [
          {senderId: senderId, recepientId: recepientId},
          {senderId: recepientId, recepientId: senderId},
        ],
      },
      populateObject: [
        {
          path: 'senderId',
          select: {
            _id: 1,
            first_name: 1,
            last_name: 1,
            image: 1,
          },
        },
        {
          path: 'recepientId',
          select: {
            _id: 1,
            first_name: 1,
            last_name: 1,
            image: 1,
          },
        },
      ],
    })
  } catch (err) {
    next(err)
  }
}

const getChatsUsers = async (req, res, next) => {
  try {
    const page = req.query.page > 0 ? parseInt(req.query.page, 10) : 1
    const perPage = req.query.limit ? parseInt(req.query.limit, 10) : 10

    const aggregateCondition = [
      {
        $match:
          /**
           * query: The query in MQL.
           */
          {
            senderId: new ObjectId(req?.user?.id),
          },
      },
      {
        $sort:
          /**
           * Provide any number of field/order pairs.
           */
          {
            message_date: 1,
          },
      },
      {
        $group:
          /**
           * _id: The id of the group.
           * fieldN: The first field name.
           */
          {
            _id: '$recepientId',
            notification: {
              $push: '$$ROOT',
            },
          },
      },
      {
        $lookup:
          /**
           * from: The target collection.
           * localField: The local join field.
           * foreignField: The target join field.
           * as: The name for the results.
           * pipeline: Optional pipeline to run on the foreign collection.
           * let: Optional variables to use in the pipeline field stages.
           */
          {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user_details',
          },
      },
      {
        $unwind:
          /**
           * path: Path to the array field.
           * includeArrayIndex: Optional name for index.
           * preserveNullAndEmptyArrays: Optional
           *   toggle to unwind null and empty values.
           */
          {
            path: '$user_details',
            preserveNullAndEmptyArrays: false,
          },
      },
      {
        $addFields:
          /**
           * newField: The new field name.
           * expression: The new field expression.
           */
          {
            first_name: '$user_details.first_name',
            last_name: '$user_details.last_name',
            notification: {
              $last: '$notification',
            },
            notification_count: {
              $size: '$notification',
            },
          },
      },
    ]

    const totalResult = await chatModel.aggregate(aggregateCondition)
    const total = totalResult?.length
    const data = await chatModel.aggregate([
      ...aggregateCondition,
      {
        $skip: perPage * (page - 1),
      },
      {
        $limit: perPage,
      },
    ])

    return apiResponse.successResponseWithPagination(res, page, total, perPage, data)
    // let responseData = []
    // const senderId = req?.user?.id
    // const finddata = await chatModel.find({senderId: senderId}).distinct('recepientId')
    // let doneTask = finddata?.map(async (recepientId) => {
    //   const result = chatModel.find({
    //     senderId: senderId,
    //     recepientId: recepientId,
    //   })
    //   const result2 = chatModel
    //     .find({
    //       senderId: senderId,
    //       recepientId: recepientId,
    //     })
    //     .populate([
    //       {
    //         path: 'senderId',
    //         select: {
    //           _id: 1,
    //           first_name: 1,
    //           last_name: 1,
    //           image: 1,
    //         },
    //       },
    //       {
    //         path: 'recepientId',
    //         select: {
    //           _id: 1,
    //           first_name: 1,
    //           last_name: 1,
    //           image: 1,
    //         },
    //       },
    //     ])

    //   const count = await result.count().exec()
    //   const record = await result2.sort({$natural: -1}).limit(1)
    //   responseData.push({record: record[0], count: count})
    // })

    // Promise.all(doneTask)
    //   .then(async () => {
    //     return apiResponse.successResponseWithData(
    //       res,
    //       'Data innhenting vellykket.',
    //       'Data Fetched Successfully',
    //       responseData
    //     )
    //   })
    //   .catch(function (err) {
    //     return apiResponse.ErrorResponse(
    //       res,
    //       'Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.',
    //       err
    //     )
    //   })
  } catch (err) {
    next(err)
  }
}
const deleteChat = async (req, res, next) => {
  try {
    const {messages} = req.body

    if (!Array.isArray(messages) || messages.length === 0) {
      return apiResponse.validationErrorWithData(
        res,
        'Beklager, det oppstod en valideringsfeil.',
        'Validation Error',
        'Invalid Data'
      )
    }
    await chatModel.deleteMany({_id: {$in: messages}})
    return apiResponse.successResponseWithData(res, 'Deleted', `Message deleted successfully`, {
      deleted: true,
    })
  } catch (error) {
    return apiResponse.ErrorResponse(
      res,
      'Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.',
      'System went wrong, Kindly try again later'
    )
  }
}

const updateChat = async (req, res, next) => {
  try {
    if (req?.file?.location) {
      req.body.imageUrl = req.body.messageType == 'image' ? req?.file?.location : null
    }

    await updateItem({
      req,
      res,
      Model: chatModel,
      itemName: 'Chat',
    })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  createChat,
  getChat,
  getChats,
  deleteChat,
  updateChat,
  getChatsUsers,
}
