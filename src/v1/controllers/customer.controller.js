const TenderModel = require('../models/tender.model')
const DriverReuest = require('../models/driverRequests.model')
const PaymentModal = require('../models/payment.model')
const {slugify} = require('../../../utils/customfunctions')
const apiResponse = require('../../../helpers/apiResponse')
const {v1: uuidv1, v4: uuidv4} = require('uuid')
const {
  getPagination,
  softDelete,
  getPaginationWithPopulate,
  getItemWithPopulate,
  updateItem,
  createItem,
  getFilterOptions,
  createItemReturnData,
  updateItemReturnData,
} = require('../../../helpers/commonApis')

const acceptDriverRequestForTender = async (req, res, next) => {
  try {
    const {tender_id, request_id} = req.params
    const foundItem = await PaymentModal.findOne({
      $and: [{status: 'completed'}, {tender_id: tender_id}],
    })

    // const check = await TenderModel.findOne({
    //   _id: tender_id,
    //   tender_status: 'accepted',
    // })

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
      const check = await TenderModel.findOne({
        _id: updateRecord?.tender_id,
        'order_awarded.awarded_to_driver': updateRecord?.driver_id,
      })

      if (check) {
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
          {new: true}
        )
      } else {
        await TenderModel.findOneAndUpdate(
          {_id: updateRecord?.tender_id},
          {
            $addToSet: {
              order_awarded: {
                awarded_to_driver: updateRecord?.driver_id,
                order_awarded_status: 'accepted',
              },
            },
          },
          {new: true}
        )
      }

      await updateItemReturnData({
        Model: TenderModel,
        cond: {
          _id: updateRecord?.tender_id,
        },
        updateobject: {
          tender_status: 'accepted',
          driver_id: updateRecord?.driver_id,
          'order.order_status': foundItem ? 'payment_done' : 'awaiting_for_payment',
        },
        req,
        res,
      })
      await DriverReuest.updateMany(
        {_id: {$ne: request_id}, tender_id: updateRecord?.tender_id},
        {
          status: 'published',
        }
      )
    }

    return apiResponse.successResponseWithData(
      res,
      'oppdatert',
      `your payment  done against this order or tender`,
      {payment: foundItem ? true : false, status: 'accepted'}
    )
  } catch (err) {
    next(err)
  }
}

module.exports = {
  acceptDriverRequestForTender,
}
