const TenderModel = require('../models/tender.model')
const DriverReuest = require('../models/driverRequests.model')
const PaymentModal = require('../models/payment.model')
const { slugify } = require('../../../utils/customfunctions')
const apiResponse = require('../../../helpers/apiResponse')
const { v1: uuidv1, v4: uuidv4 } = require('uuid')
const { updateItemReturnData } = require('../../../helpers/commonApis')

const acceptDriverRequestForTender = async (req, res, next) => {
  try {
    const { tender_id, request_id } = req.params

    const updateRecord = await updateItemReturnData({
      Model: DriverReuest,
      cond: {
        _id: request_id,
      },
      updateobject: {
        status: 'accepted',
      },
      req,
      res,
    })

    if (updateRecord) {
      await updateItemReturnData({
        Model: TenderModel,
        cond: {
          _id: updateRecord?.tender_id,
        },
        updateobject: {
          tender_status: 'accepted',
          driver_id: updateRecord?.driver_id,
        },
        req,
        res,
      })
      await updateItemReturnData({
        Model: PaymentModal,
        cond: {
          $and: [{ tender_id: tender_id }],
        },
        updateobject: {
          driver_id: updateRecord?.driver_id?._id,
        },
        req,
        res,
      })

      await TenderModel.findOneAndUpdate(
        {
          _id: updateRecord?.tender_id,

          'order_awarded.awarded_to_driver': updateRecord?.driver_id,
        },
        {
          $set: {
            'order_awarded.$.awarded_to_driver': updateRecord?.driver_id,
            'order_awarded.$.order_awarded_status': 'accepted',
          },
        },
        { new: true }
      )
    }

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


    return apiResponse.successResponseWithData(res, 'oppdatert', `Record updated Successfully`, {
      status: 'accepted',
    })

  } catch (err) {
    next(err)
  }
}

module.exports = {
  acceptDriverRequestForTender,
}
