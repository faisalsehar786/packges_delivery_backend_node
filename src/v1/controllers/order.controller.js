const TenderModel = require('../models/tender.model')
const PaymentModal = require('../models/payment.model')
const { slugify } = require('../../../utils/customfunctions')
const apiResponse = require('../../../helpers/apiResponse')
const { v1: uuidv1, v4: uuidv4 } = require('uuid')
const {
  updateItemReturnData,
  createItemNotificationWithPush,
} = require('../../../helpers/commonApis')

const trackDriverOrderLocationWhenOnProcess = async (req, res, next) => {
  try {
    const updateRecord = await TenderModel.updateMany(
      {
        driver_id: req.params.driver_id,
        'order.order_status': 'processing',
      },
      {
        $set: {
          'order.order_current_location.order_address': req?.body?.address,
          'order.order_current_location.coordinates': [
            Number(req?.body?.longitude),
            Number(req?.body?.latitude),
          ],
        },
      }
    )

    if (updateRecord) {
      return apiResponse.successResponseWithData(
        res,
        'oppdatert',
        `Order updated Successfully`,
        updateRecord
      )
    } else {
      return apiResponse.ErrorResponse(
        res,
        'Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.',
        'System went wrong, Kindly try again later or you pass wrong parameters'
      )
    }
  } catch (err) {
    console.log(err)
    next(err)
  }
}

const updateOrder = async (req, res, next) => {
  try {
    const updateRecord = await updateItemReturnData({
      Model: TenderModel,
      cond: {
        _id: req.params.id,
      },
      updateobject: {
        'order.order_current_location.order_address': req?.body?.address,
        'order.order_current_location.coordinates': [
          Number(req?.body?.longitude),
          Number(req?.body?.latitude),
        ],
        'order.order_status': req?.body?.order_status,
      },
      req,
      res,
    })
    if (updateRecord) {
      return apiResponse.successResponseWithData(
        res,
        'oppdatert',
        `Order updated Successfully`,
        updateRecord
      )
    } else {
      return apiResponse.ErrorResponse(
        res,
        'Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.',
        'System went wrong, Kindly try again later or you pass wrong parameters'
      )
    }
  } catch (err) {
    console.log(err)
    next(err)
  }
}
const updateOrderByNo = async (req, res, next) => {
  try {
    const updateRecord = await updateItemReturnData({
      Model: TenderModel,
      cond: {
        'order.order_no': req.params.order_no,
      },
      updateobject: {
        'order.order_current_location.order_address': req?.body?.address,
        'order.order_current_location.coordinates': [
          Number(req?.body?.longitude),
          Number(req?.body?.latitude),
        ],
        'order.order_status': req?.body?.order_status,
      },
      req,
      res,
    })
    if (updateRecord) {
      return apiResponse.successResponseWithData(
        res,
        'oppdatert',
        `Order updated Successfully`,
        updateRecord
      )
    } else {
      return apiResponse.ErrorResponse(
        res,
        'Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.',
        'System went wrong, Kindly try again later or you pass wrong parameters'
      )
    }
  } catch (err) {
    console.log(err)
    next(err)
  }
}

const changeOrderStatusByNo = async (req, res, next) => {
  try {
    const updateRecord = await updateItemReturnData({
      Model: TenderModel,
      cond: {
        'order.order_no': req.params.order_no,
      },
      updateobject: {
        'order.order_status': req?.body?.order_status,
      },
      req,
      res,
    })
    if (updateRecord) {
      // await createItemNotificationWithPush({
      //   itemDetails: {
      //     sender_id: req.user.id,
      //     receiver_id: item?.receiver_id,
      //     noti_type: item?.notiType,
      //     noti_for: item?.noti_for,
      //     title: item?.title,
      //     message: item?.message,
      //   },
      //   pushNotification: true,
      // })

      return apiResponse.successResponseWithData(
        res,
        'oppdatert',
        `Order updated Successfully`,
        updateRecord
      )
    } else {
      return apiResponse.ErrorResponse(
        res,
        'Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.',
        'System went wrong, Kindly try again later or you pass wrong parameters'
      )
    }
  } catch (err) {
    console.log(err)
    next(err)
  }
}

const cancelOrderByNo = async (req, res, next) => {
  try {
    const updateRecord = await updateItemReturnData({
      Model: TenderModel,
      cond: {
        'order.order_no': req.params.order_no,
      },
      updateobject: {
        tender_status: 'cancel',
        'order.order_status': 'cancel',
      },
      req,
      res,
    })
    if (updateRecord) {
      // await createItemNotificationWithPush({
      //   itemDetails: {
      //     sender_id: req.user.id,
      //     receiver_id: item?.receiver_id,
      //     noti_type: item?.notiType,
      //     noti_for: item?.noti_for,
      //     title: item?.title,
      //     message: item?.message,
      //   },
      //   pushNotification: true,
      // })
      await TenderModel.findOneAndUpdate(
        {
          _id: updateRecord?._id,
          'order_awarded.awarded_to_driver': updateRecord?.driver_id,
        },
        {
          $set: {
            'order_awarded.$.order_awarded_status': 'cancel',
          },
        },
        { new: true }
      )
      return apiResponse.successResponseWithData(
        res,
        'oppdatert',
        `Order updated Successfully`,
        updateRecord
      )
    } else {
      return apiResponse.ErrorResponse(
        res,
        'Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.',
        'System went wrong, Kindly try again later or you pass wrong parameters'
      )
    }
  } catch (err) {
    console.log(err)
    next(err)
  }
}

const completeOrderByNo = async (req, res, next) => {
  try {
    if (req?.body?.for_approval) {
      const updateRecord = await updateItemReturnData({
        Model: TenderModel,
        cond: {
          'order.order_no': req.params.order_no,
        },
        updateobject: {
          tender_status: 'awaiting_for_approval',
          'order.order_status': 'awaiting_for_approval',
        },
        req,
        res,
      })
      // await createItemNotificationWithPush({
      //   itemDetails: {
      //     sender_id: req.user.id,
      //     receiver_id: item?.receiver_id,
      //     noti_type: item?.notiType,
      //     noti_for: item?.noti_for,
      //     title: item?.title,
      //     message: item?.message,
      //   },
      //   pushNotification: true,
      // })
      if (updateRecord) {
        // await createItemNotificationWithPush({
        //   itemDetails: {
        //     sender_id: req.user.id,
        //     receiver_id: item?.receiver_id,
        //     noti_type: item?.notiType,
        //     noti_for: item?.noti_for,
        //     title: item?.title,
        //     message: item?.message,
        //   },
        //   pushNotification: true,
        // })
        await TenderModel.findOneAndUpdate(
          {
            _id: updateRecord?._id,
            'order_awarded.awarded_to_driver': updateRecord?.driver_id,
          },
          {
            $set: {
              'order_awarded.$.order_awarded_status': 'completed',
            },
          },
          { new: true }
        )
        return apiResponse.successResponseWithData(
          res,
          'oppdatert',
          `Order updated Successfully`,
          updateRecord
        )
      } else {
        return apiResponse.ErrorResponse(
          res,
          'Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.',
          'System went wrong, Kindly try again later or you pass wrong parameters'
        )
      }
    } else {
      const updateRecord = await updateItemReturnData({
        Model: TenderModel,
        cond: {
          'order.order_no': req.params.order_no,
        },
        updateobject: {
          tender_status: 'completed',
          'order.order_status': 'completed',
        },
        req,
        res,
      })

      if (updateRecord) {
        // await createItemNotificationWithPush({
        //   itemDetails: {
        //     sender_id: req.user.id,
        //     receiver_id: item?.receiver_id,
        //     noti_type: item?.notiType,
        //     noti_for: item?.noti_for,
        //     title: item?.title,
        //     message: item?.message,
        //   },
        //   pushNotification: true,
        // })
        await TenderModel.findOneAndUpdate(
          {
            _id: updateRecord?._id,
            'order_awarded.awarded_to_driver': updateRecord?.driver_id,
          },
          {
            $set: {
              'order_awarded.$.order_awarded_status': 'completed',
            },
          },
          { new: true }
        )
        return apiResponse.successResponseWithData(
          res,
          'oppdatert',
          `Order updated Successfully`,
          updateRecord
        )
      } else {
        return apiResponse.ErrorResponse(
          res,
          'Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.',
          'System went wrong, Kindly try again later or you pass wrong parameters'
        )
      }
    }
  } catch (err) {
    console.log(err)
    next(err)
  }
}

const getTrackedOrder_By_Order_No_Id_or_With_Payment_Details = async (req, res, next) => {
  try {
    const order_no = req?.query?.order_no
      ? { $and: [{ 'order.order_no': req?.query?.order_no }] }
      : null
    const order_id = req?.query?.order_id ? { $and: [{ _id: req?.query?.order_id }] } : null
    const query = order_no ? order_no : order_id
    const payments_record = req?.query?.payments_record ? req?.query?.payments_record : false

    const Model = TenderModel
    const populateObject = [
      {
        path: 'customer_id',
        select: {
          first_name: 1,
          last_name: 1,
          email: 1,
          rating: 1,
          mobile_number: 1,
          current_location: 1,
          image: 1,
        },
      },
      {
        path: 'driver_id',
        select: {
          first_name: 1,
          last_name: 1,
          email: 1,
          rating: 1,
          mobile_number: 1,
          current_location: 1,
          image: 1,
        },
      },
    ]

    try {
      const item = await Model.findOne(query).populate(populateObject)
      if (!item) {
        return apiResponse.notFoundResponse(
          res,
          'Beklager, vi finner ikke dataen du ser etter.',
          'Not found!'
        )
      }
      let payment_record_list = []

      if (payments_record) {
        const paymentpopulateObject = [
          {
            path: 'customer_id',
            select: {
              first_name: 1,
              last_name: 1,
              email: 1,
              rating: 1,
              mobile_number: 1,
              current_location: 1,
              image: 1,
            },
          },
          {
            path: 'driver_id',
            select: {
              first_name: 1,
              last_name: 1,
              email: 1,
              rating: 1,
              mobile_number: 1,
              current_location: 1,
              image: 1,
            },
          },
        ]

        console.log(item?.order?.order_no)
        const paymentsList = await PaymentModal.find({
          $or: [{ tender_id: item?._id }, { order_no: item?.order?.order_no }],
        }).populate(paymentpopulateObject)
        payment_record_list = paymentsList
      }
      return apiResponse.successResponseWithData(
        res,
        'Data innhenting vellykket.',
        'Data Fetched Successfully',
        {
          order_details: item,
          payment_record_list: payment_record_list,
        }
      )
    } catch (err) {
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
module.exports = {
  updateOrderByNo,
  updateOrder,
  getTrackedOrder_By_Order_No_Id_or_With_Payment_Details,
  cancelOrderByNo,
  completeOrderByNo,
  changeOrderStatusByNo,
  trackDriverOrderLocationWhenOnProcess,
}
