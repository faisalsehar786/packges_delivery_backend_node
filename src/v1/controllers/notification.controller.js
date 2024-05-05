const mongoose = require('mongoose')
const { ObjectId } = require('mongodb')
const notification = require('../models/notification.model')
const userModel = require('../models/user.model')
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
    const term = req?.query?.search ? req?.query?.search : ''
    const withOrCond = req?.query?.withOrCond ? req?.query?.withOrCond : 'no'
    const noti_type = req?.query?.noti_type ? req?.query?.noti_type : 'all'
    const read = req?.query?.read ? req?.query?.read : 'all'
    const noti_for = req?.query?.noti_for ? req?.query?.noti_for : 'for_app'
    const filter = getFilterOptions(req)

    let andCod = []
    let orCod = []

    if (withOrCond == 'no') {
      if (term) {
        orCod.push({ title: { $regex: term, $options: 'i' } })
      }
      if (noti_type != 'all' && noti_type) {
        andCod.push({ noti_type: noti_type })
      }
      if (read != 'all' && read) {
        andCod.push({ read: read })
      }
      if (noti_for != 'all' && noti_for) {
        andCod.push({ noti_for: noti_for })
      }
    } else {
      if (term) {
        orCod.push({ title: { $regex: term, $options: 'i' } })
      }
      if (noti_type != 'all' && noti_type) {
        orCod.push({ noti_type: noti_type })
      }
      if (read != 'all' && read) {
        orCod.push({ read: read })
      }
      if (noti_for != 'all' && noti_for) {
        orCod.push({ noti_for: noti_for })
      }
    }

    if (noti_for == 'for_admin') {
    } else {
      andCod.push({ receiver_id: req.user.id })
    }

    return await getPaginationWithPopulate({
      req,
      res,
      model: notification,
      findOptions: {
        $and: andCod.length > 0 ? andCod : [{}],
        $or: orCod.length > 0 ? orCod : [{}],
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
    if (req?.query?.noti_for == 'admin') {
      await notification.updateMany(
        { noti_for: 'for_admin' },
        {
          $set: { read: true },
        }
      )
    } else {
      const fetchId = req.user.id
      await notification.updateMany(
        { receiver_id: new ObjectId(fetchId) },
        {
          $set: { read: true },
        }
      )
    }

    return apiResponse.successResponseWithData(res, 'Operasjonssuksess', 'Operation success')
  } catch (err) {
    next(err)
  }
}

const totalnotificationUnRead = async (req, res, next) => {
  try {
    if (req?.query?.noti_for == 'admin') {
      const totalItems = await notification
        .count({
          $and: [{ noti_for: 'for_admin' }, { read: false }],
        })
        .exec()

      return res.status(200).json({ success: true, unread_notifications_count: totalItems })
    } else {
      const fetchId = req.user.id
      const totalItems = await notification
        .count({
          $and: [{ receiver_id: new ObjectId(fetchId) }, { read: false }],
        })
        .exec()

      return res.status(200).json({ success: true, unread_notifications_count: totalItems })
    }
  } catch (err) {
    next(err)
  }
}

const sendOnesignalNotifications = async (req, res, next) => {
  try {
    // eslint-disable-next-line no-unsafe-optional-chaining
    const { noti_type, noti_for, title, message, send_to, send_to_array } = req?.body

    if (!title || !send_to || !noti_for || !Array.isArray(send_to_array)) {
      return apiResponse.validationErrorWithData(
        res,
        'Beklager, det oppstod en valideringsfeil.',
        'Validation Error',
        'Invalid Data'
      )
    }
    const notiType = noti_type ? noti_type : 'other'
    const sendToType = send_to || 'all'
    const createNotificationArray = []
    const loged_User = req?.user?.id
    const users = await userModel.find(sendToType === 'single' ? { _id: send_to_array } : {})
    users?.forEach((item) => {
      createNotificationArray.push({
        sender_id: loged_User,
        receiver_id: item?._id,
        noti_type: notiType,
        noti_for,
        title,
        message,
      })
    })

    if (createNotificationArray?.length > 0) {
      if (await notification.insertMany(createNotificationArray)) {
        return apiResponse.successResponseWithData(
          res,
          'varsling Oppretting vellykket.',
          'Notification  Created Successfully',
          createNotificationArray
        )
      }
      return apiResponse.ErrorResponse(
        res,
        'Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.',
        'System went wrong, Kindly try again later'
      )
    }
    return apiResponse.ErrorResponse(
      res,
      'Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.',
      'System went wrong, Kindly try again later'
    )
  } catch (err) {
    console.log(err)
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
  sendOnesignalNotifications,
}
