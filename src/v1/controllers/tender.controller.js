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

const createTender = async (req, res, next) => {
  const images = req?.files?.map((item) => ({path: item?.location}))
  req.body.files = images?.length > 0 ? images : req.body.files
  req.body.slug = slugify(req.body.title)
  req.body.customer_id = req.user.id
  req.body.order = {
    order_no: uuidv4(),
  }
  try {
    const status = await createItemReturnData({
      req,
      res,
      Model: TenderModel,
      itemName: 'Tender',
    })
    if (status) {
      const updateRecord = await updateItemReturnData({
        Model: TenderModel,
        cond: {
          _id: status._id,
        },
        updateobject: {
          'order.order_current_location': {
            order_address: status?.location_from?.address,
            type: 'Point',
            coordinates: status?.location_from?.coordinates,
          },
        },
        req,
        res,
      })
      return apiResponse.successResponseWithData(
        res,
        'Oppretting vellykket.',
        `Tender Successfully`,
        updateRecord
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

const getTender = async (req, res, next) => {
  try {
    const itemId = req.params.id
    getItemWithPopulate({
      query: {_id: itemId},
      Model: TenderModel,
      populateObject: [
        {
          path: 'customer_id',
          select: {
            first_name: 1,
            last_name: 1,
            email: 1,
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
            mobile_number: 1,
            current_location: 1,
            image: 1,
          },
        },
      ],
      res,
    })
  } catch (err) {
    next(err)
  }
}

const updateTender = async (req, res, next) => {
  try {
    const images = req?.files?.map((item) => ({path: item?.location}))
    images?.length > 0 ? (req.body.files = images) : req?.body.files
    req.body.slug = slugify(req.body.title)
    await updateItem({
      req,
      res,
      Model: TenderModel,
      itemName: 'Tender',
    })
  } catch (err) {
    next(err)
  }
}

const deleteTender = async (req, res, next) => {
  try {
    await softDelete({
      req,
      res,
      Model: TenderModel,
      itemName: 'Tender',
    })
  } catch (err) {
    next(err)
  }
}

const getTenders = async (req, res, next) => {
  try {
    const term = req?.query?.search
    const filter = getFilterOptions(req)
    const user_id = req.user.id
    return await getPaginationWithPopulate({
      req,
      res,
      model: TenderModel,
      findOptions: {
        $and: [{customer_id: user_id}],
        $or: [{title: {$regex: term, $options: 'i'}}],
        ...filter,
      },

      populateObject: [
        {
          path: 'customer_id',
          select: {
            first_name: 1,
            last_name: 1,
            email: 1,
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
            mobile_number: 1,
            current_location: 1,
            image: 1,
          },
        },
      ],
    })
  } catch (err) {
    next(err)
  }
}

///////////////////////// Driver requests///////////////////////////

const createDriverReuest = async (req, res, next) => {
  try {
    await createItem({
      req,
      res,
      Model: DriverReuest,
      itemName: 'Driver Request',
    })
  } catch (err) {
    next(err)
  }
}

const availableDriversForTender = async (req, res, next) => {
  try {
    const customer_id = req.query.customer_id
    const tender_id = req.query.tender_id
    const term = req.query.search
    const filter = getFilterOptions(req)
    return await getPaginationWithPopulate({
      req,
      res,
      model: DriverReuest,
      findOptions: {
        $and: [{customer_id: customer_id}, {tender_id: tender_id}],
        $or: [{title: {$regex: term, $options: 'i'}}],
        ...filter,
      },

      populateObject: [
        {
          path: 'customer_id',
          select: {
            first_name: 1,
            last_name: 1,
            email: 1,
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
            mobile_number: 1,
            current_location: 1,
            image: 1,
          },
        },
        {
          path: 'tender_id',
        },
      ],
    })
  } catch (err) {
    next(err)
  }
}

const acceptDriverRequestForTender = async (req, res, next) => {
  try {
    const {tender_id, order_no} = req.body
    const foundItem = await PaymentModal.findOne({
      $and: [{status: 'completed'}],
      $or: [{tender_id: tender_id}, {order_no: order_no}],
    })
    if (!foundItem) {
      await DriverReuest.updateMany({tender_id: tender_id}, {status: 'published'})
      const updateRecord = await updateItemReturnData({
        Model: DriverReuest,
        cond: {
          _id: req.params.id,
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
          },
          req,
          res,
        })
      }
      return apiResponse.successResponseWithData(
        res,
        'oppdatert',
        `your payment  done against this order or tender`,
        {payment: false, status: 'accepted'}
      )
    } else {
      await DriverReuest.updateMany({tender_id: tender_id}, {status: 'published'})
      const updateRecord = await updateItemReturnData({
        Model: DriverReuest,
        cond: {
          _id: req.params.id,
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
          },
          req,
          res,
        })
      }

      return apiResponse.successResponseWithData(
        res,
        'oppdatert',
        `your payment  done against this order or tender`,
        {payment: true, status: 'accepted'}
      )
    }
  } catch (err) {
    next(err)
  }
}

////////////////////////////end driver requests///////////////////////////////

///////////////////////// Order requests///////////////////////////

const createOrderofTender = async (req, res, next) => {
  try {
    await createItem({
      req,
      res,
      Model: DriverReuest,
      itemName: 'Driver Request',
    })
  } catch (err) {
    next(err)
  }
}

const updateOrderofTender = async (req, res, next) => {
  try {
    const {tender_id, order_no} = req.body
    const foundItem = await PaymentModal.findOne({
      $and: [{status: 'completed'}],
      $or: [{tender_id: tender_id}, {order_no: order_no}],
    })
    if (!foundItem) {
      await DriverReuest.updateMany({tender_id: tender_id}, {status: 'published'})
      const updateRecord = await updateItemReturnData({
        Model: DriverReuest,
        cond: {
          _id: req.params.id,
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
          },
          req,
          res,
        })
      }
      return apiResponse.successResponseWithData(
        res,
        'oppdatert',
        `your payment  done against this order or tender`,
        {payment: false, status: 'accepted'}
      )
    } else {
      await DriverReuest.updateMany({tender_id: tender_id}, {status: 'published'})
      const updateRecord = await updateItemReturnData({
        Model: DriverReuest,
        cond: {
          _id: req.params.id,
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
          },
          req,
          res,
        })
      }

      return apiResponse.successResponseWithData(
        res,
        'oppdatert',
        `your payment  done against this order or tender`,
        {payment: true, status: 'accepted'}
      )
    }
  } catch (err) {
    next(err)
  }
}

////////////////////////////end order requests///////////////////////////////

module.exports = {
  createTender,
  getTender,
  getTenders,
  deleteTender,
  updateTender,
  createDriverReuest,
  availableDriversForTender,
  acceptDriverRequestForTender,
}
