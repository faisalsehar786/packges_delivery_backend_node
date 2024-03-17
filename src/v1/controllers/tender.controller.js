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
  if (req?.files) {
    const images = req?.files?.map((item) => ({path: item?.location}))
    req.body.files = images?.length > 0 ? images : []
  }
  console.log(req?.body)
  // return apiResponse.ErrorResponse(
  //   res,
  //   'Du har ikke tilgang til å oppdatere andre brukeres data',
  //   "You are not allowed to update other user's data"
  // )
  req.body.slug = slugify(req?.body?.title)
  req.body.customer_id = req?.user?.id
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
    if (req?.files) {
      const images = req?.files?.map((item) => ({path: item?.location}))
      req.body.files = images?.length > 0 ? images : []
    }
    if (req.body.title) {
      req.body.slug = slugify(req.body.title)
    }

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
    const term = req?.query?.search ? req?.query?.search : ''
    const status = req?.query?.status ? req?.query?.status : 'all'
    const order_status = req?.query?.order_status ? req?.query?.order_status : 'all'
    const filter = getFilterOptions(req)
    const user_id = req.user.id

    let andCod = [{customer_id: user_id}]
    let orCod = []

    if (term) {
      orCod.push({title: {$regex: term, $options: 'i'}})
    }
    if (status != 'all' && status) {
      andCod.push({tender_status: status})
    }
    if (order_status != 'all' && order_status) {
      andCod.push({'order.order_status': order_status})
    }

    return await getPaginationWithPopulate({
      req,
      res,
      model: TenderModel,
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

const getTendersAdmin = async (req, res, next) => {
  try {
    const term = req?.query?.search ? req?.query?.search : ''
    const status = req?.query?.status ? req?.query?.status : 'all'
    const order_status = req?.query?.order_status ? req?.query?.order_status : 'all'
    const filter = getFilterOptions(req)

    let andCod = []
    let orCod = []

    if (term) {
      orCod.push(
        {title: {$regex: term, $options: 'i'}},
        {'order.order_no': {$regex: term, $options: 'i'}}
      )
    }
    if (status != 'all' && status) {
      andCod.push({tender_status: status})
    }
    if (order_status != 'all' && order_status) {
      andCod.push({'order.order_status': order_status})
    }

    return await getPaginationWithPopulate({
      req,
      res,
      model: TenderModel,
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

module.exports = {
  createTender,
  getTender,
  getTenders,
  deleteTender,
  updateTender,
  getTendersAdmin,
}
