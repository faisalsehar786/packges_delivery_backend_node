const mongoose = require('mongoose')
const { ObjectId } = require('mongodb')
const notification = require('../models/notification.model')
const apiResponse = require('../../../helpers/apiResponse')
const {
  softDelete,
  updateItem,
  createItem,
  getFilterOptions,
  getPaginationWithPopulate,
} = require('../../../helpers/commonApis')

const createnotification = async (req, res, next) => {
  if (typeof req.body.data_object === 'object' && req.body.data_object) {
    req.body.data_object = req.body.data_object
  } else {
    return apiResponse.validationErrorWithData(
      res,
      'Beklager, det oppstod en valideringsfeil.',
      'Validation Error',
      'Invalid Data'
    )
  }

  try {
    await createItem({
      req,
      res,
      Model: notification,
      itemName: 'notification',
    })
  } catch (err) {
    next(err)
  }
}

const updatenotification = async (req, res, next) => {
  try {
    if (typeof req.body.data_object === 'object' && req.body.data_object !== null) {
      req.body.data_object = req.body.data_object
    } else {
      return apiResponse.validationErrorWithData(
        res,
        'Beklager, det oppstod en valideringsfeil.',
        'Validation Error',
        'Invalid Data'
      )
    }
    await updateItem({
      req,
      res,
      Model: notification,
      itemName: 'notification',
    })
  } catch (err) {
    next(err)
  }
}

const getnotification = async (req, res, next) => {
  try {
    const fetchId = req.params.id
    if (!mongoose.Types.ObjectId.isValid(fetchId)) {
      return apiResponse.validationErrorWithData(
        res,
        'Beklager, det oppstod en valideringsfeil.',
        'Validation Error',
        'Invalid Data'
      )
    }
    const item = await notification.findById(fetchId).populate('sender_id').populate('receiver_id')

    if (!item) {
      return apiResponse.ErrorResponse(
        res,
        'Beklager, vi finner ikke dataen du ser etter.',
        'Not found!'
      )
    }

    return apiResponse.successResponseWithData(res, 'Operasjonssuksess', 'Operation success', item)
  } catch (err) {
    next(err)
  }
}

const deletenotification = async (req, res, next) => {
  try {
    await softDelete({
      req,
      res,
      Model: notification,
      itemName: 'notification ',
    })
  } catch (err) {
    next(err)
  }
}

const getnotifications = async (req, res, next) => {
  try {
    const noti_type = req.query.type
      ? {
          noti_type: req.query.type,
        }
      : {}
    const read = req.query.read
      ? {
          read: req.query.read,
        }
      : {}
    const fetchId = req.user.id
    const filter = getFilterOptions(req)
    return await getPaginationWithPopulate({
      req,
      res,
      model: notification,
      findOptions: {
        $and: [{ receiver_id: fetchId }, noti_type, read],
        ...filter,
      },
      populateObject: [
        {
          path: 'sender_id',
          select: {
            _id: 1,
            first_name: 1,
            last_name: 1,
            image: 1,
          },
        },
        {
          path: 'receiver_id',
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

const notificationMarkAsRead = async (req, res, next) => {
  try {
    const fetchId = req.user.id
    await notification.updateMany(
      { receiver_id: new ObjectId(fetchId) },
      {
        $set: { read: true },
      }
    )

    return apiResponse.successResponseWithData(res, 'Operasjonssuksess', 'Operation success')
  } catch (err) {
    next(err)
  }
}

const totalnotificationUnRead = async (req, res, next) => {
  try {
    const fetchId = req.user.id
    const totalItems = await notification
      .count({
        $and: [{ receiver_id: new ObjectId(fetchId) }, { read: false }],
      })
      .exec()

    return res.status(200).json({ success: true, unread_notifications_count: totalItems })
  } catch (err) {
    next(err)
  }
}
module.exports = {
  createnotification,
  updatenotification,
  getnotification,
  deletenotification,
  getnotifications,
  notificationMarkAsRead,
  totalnotificationUnRead,
}
