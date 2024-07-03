const paymentModel = require('../models/payment.model')
const TenderModel = require('../models/tender.model')
const { slugify } = require('../../../utils/customfunctions')
const apiResponse = require('../../../helpers/apiResponse')
const { v1: uuidv1, v4: uuidv4 } = require('uuid')
const {
  getPagination,
  getItem,
  softDelete,
  updateItem,
  createItem,
  totalItemsCustomQuery,
  getFilterOptions,
  getPaginationWithPopulate,
  getItemWithPopulate,
  updateItemReturnData,
} = require('../../../helpers/commonApis')

const createPayment = async (req, res, next) => {
  const check = await TenderModel.findOne({ _id: req?.body?.tender_id })

  if (!check) {
    return apiResponse.notFoundResponse(
      res,
      'Beklager, vi finner ikke dataen du ser etter.',
      'Tedner Not found IN DB!'
    )
  }

  req.body.order_no = check?.order.order_no
  req.body.customer_id = check?.customer_id
  req.body.driver_id = check?.driver_id
  req.body.tender_id = check?._id

  try {
    await createItem({
      req,
      res,
      Model: paymentModel,
      itemName: 'Payment',
    })
  } catch (err) {
    next(err)
  }
}

const getPayment = async (req, res, next) => {
  try {
    const itemId = req.params.id
    getItemWithPopulate({
      query: { _id: itemId },
      Model: paymentModel,
      populateObject: [
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
        {
          path: 'tender_id',
        },
      ],
      res,
    })
  } catch (err) {
    next(err)
  }
}

const getPayments = async (req, res, next) => {
  try {
    const order_no = req.query.order_no ? req.query.order_no : ''
    const status = req.query.status ? req.query.status : 'all'
    const filter = getFilterOptions(req)
    let andCod = []
    let orCod = []
    if (order_no) {
      andCod.push({ order_no: order_no })
    }
    if (status != 'all' && status) {
      andCod.push({ status: status })
    }

    return await getPaginationWithPopulate({
      req,
      res,
      model: paymentModel,
      findOptions: {
        $and: andCod.length > 0 ? andCod : [{}],
        $or: orCod.length > 0 ? orCod : [{}],
        ...filter,
      },
      populateObject: [
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
        {
          path: 'tender_id',
        },
      ],
    })
  } catch (err) {
    next(err)
  }
}

const deletePayment = async (req, res, next) => {
  try {
    await softDelete({
      req,
      res,
      Model: paymentModel,
      itemName: 'Payment',
    })
  } catch (err) {
    next(err)
  }
}

const updatePayment = async (req, res, next) => {
  try {
    const { ...itemDetails } = req.body
    const resp = await updateItemReturnData({
      Model: paymentModel,
      cond: {
        _id: req?.params?.id,
      },
      updateobject: itemDetails,
      req,
      res,
    })

    if (!resp) {
      return apiResponse.ErrorResponse(
        res,
        'Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.',
        'System went wrong, Kindly try again later'
      )
    }

    return apiResponse.successResponseWithData(
      res,
      'oppdatert',
      `payment updated Successfully`,
      resp
    )
  } catch (err) {
    next(err)
  }
}

const checkPaymentStatusofOrder = async (req, res, next) => {
  try {
    const { order_no, customer_id } = req?.query
    let andCod = [{ status: 'completed' }]
    if (order_no) {
      andCod.push({ order_no: order_no })
    }
    if (customer_id) {
      andCod.push({ customer_id: customer_id })
    }

    const findOptions = {
      $and: andCod.length > 0 ? andCod : [{}],
    }
    const check = await paymentModel.count(findOptions).exec()
    return apiResponse.successResponseWithData(
      res,
      'Data innhenting vellykket.',
      'Data Fetched Successfully',
      {
        payment: check ? true : false,
      }
    )
  } catch (err) {
    next(err)
  }
}

const totalPayments = async (req, res, next) => {
  try {
    await totalItemsCustomQuery({
      req,
      res,
      Model: paymentModel,
      query: {},
      itemName: 'Payment',
    })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  createPayment,
  getPayment,
  getPayments,
  deletePayment,
  updatePayment,
  totalPayments,
  checkPaymentStatusofOrder,
}
