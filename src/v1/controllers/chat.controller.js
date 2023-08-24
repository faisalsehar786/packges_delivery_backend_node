const chatModel = require('../models/chat.model')
const {
  getItem,
  updateItem,
  createItem,
  getPaginationWithPopulate,
} = require('../../../helpers/commonApis')
const apiResponse = require('../../../helpers/apiResponse')

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
}
