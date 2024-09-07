const TenderModel = require('../models/tender.model')
const DriverReuest = require('../models/driverRequests.model')
const PaymentModal = require('../models/payment.model')
const UserModal = require('../models/user.model')
const { slugify } = require('../../../utils/customfunctions')
const apiResponse = require('../../../helpers/apiResponse')
const { v1: uuidv1, v4: uuidv4 } = require('uuid')
const {
  getPagination,
  softDelete,
  getPaginationWithPopulate,
  getItemWithPopulate,
  updateItem,
  createItem,
  createItemNotificationWithPush,
  getFilterOptions,
  createItemReturnData,
  updateItemReturnData,
} = require('../../../helpers/commonApis')

const driversRequestForTender = async (req, res, next) => {
  try {
    const customer_id = req.query.customer_id ? req.query.customer_id : ''
    const tender_id = req.query.tender_id ? req.query.tender_id : ''
    const term = req?.query?.search ? req?.query?.search : ''
    const status = req?.query?.status ? req?.query?.status : 'all'
    const filter = getFilterOptions(req)

    let andCod = []
    let orCod = []

    if (term) {
      orCod.push({ title: { $regex: term, $options: 'i' } })
    }
    if (status != 'all' && status) {
      andCod.push({ status: status })
    }

    if (customer_id) {
      andCod.push({ customer_id: customer_id })
    }
    if (tender_id) {
      andCod.push({ tender_id: tender_id })
    }

    return await getPaginationWithPopulate({
      req,
      res,
      model: DriverReuest,
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
const createDriverReuest = async (req, res, next) => {
  try {
    const { tender_id, customer_id, driver_id } = req.body
    const check = await TenderModel.findOne({
      _id: tender_id,
    })

    if (check) {
      await createItemNotificationWithPush({
        itemDetails: {
          sender_id: req.user.id,
          receiver_id: check?.customer_id,
          noti_type: 'tender',
          noti_for: 'for_app',
          data_id: check?._id,
          title: `Sjåførforespørsel om forsendelse ${check?.title} `,
          message: 'Sjåførtilbud for plukkeforsendelse. For detaljer, se forsendelsesdetaljene',
        },
        pushNotification: true,
        insertInDb: true,
      })
    }

    if (check?.tender_status == 'accepted') {
      return apiResponse.successResponseWithData(
        res,
        'Oppretting vellykket.',
        `Tender is not availbe for Request because already has been assigned`,
        { request_send: false }
      )
    }

    const found = await DriverReuest.findOne({
      customer_id: customer_id,
      tender_id: tender_id,
      driver_id: driver_id,
    })

    if (found) {
      await updateItemReturnData({
        Model: DriverReuest,
        cond: {
          _id: found._id,
        },
        updateobject: {
          status: 'awaiting',
        },
        req,
        res,
      })
      return apiResponse.successResponseWithData(
        res,
        'Oppretting vellykket.',
        ` Driver Reuest For Tender send Successfully`,
        { request_send: true }
      )
    } else {
      await createItemReturnData({
        req,
        res,
        Model: DriverReuest,
        itemName: 'Driver Request',
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
      return apiResponse.successResponseWithData(
        res,
        'Oppretting vellykket.',
        ` Driver Reuest For Tender send Successfully`,
        { request_send: true }
      )
    }
  } catch (err) {
    next(err)
  }
}

const getdriverTenders = async (req, res, next) => {
  try {
    const term = req?.query?.search ? req?.query?.search : ''
    const status = req?.query?.status ? req?.query?.status : 'all'
    const order_status = req?.query?.order_status ? req?.query?.order_status : 'all'
    const order_awarded = req?.query?.order_awarded ? req?.query?.order_awarded : 'all'
    const withOrCond = req?.query?.withOrCond ? req?.query?.withOrCond : 'no'
    const driver_id = req?.query?.driver_id ? req?.query?.driver_id : req.user.id
    const filter = getFilterOptions(req)

    let andCod = [{ driver_id: driver_id }]
    let orCod = []

    if (withOrCond == 'no') {
      if (term) {
        orCod.push({ title: { $regex: term, $options: 'i' } })
      }
      if (status != 'all' && status) {
        andCod.push({ tender_status: status })
      }
      if (order_status != 'all' && order_status) {
        andCod.push({ 'order.order_status': order_status })
      }

      if (order_awarded != 'all' && order_awarded) {
        andCod.push(
          { 'order_awarded.awarded_to_driver': driver_id },
          { 'order_awarded.order_awarded_status': order_awarded }
        )
      }
    } else {
      if (term) {
        orCod.push({ title: { $regex: term, $options: 'i' } })
      }
      if (status != 'all' && status) {
        orCod.push({ tender_status: status })
      }
      if (order_status != 'all' && order_status) {
        orCod.push({ 'order.order_status': order_status })
      }

      if (order_awarded != 'all' && order_awarded) {
        andCod.push(
          { 'order_awarded.awarded_to_driver': driver_id },
          { 'order_awarded.order_awarded_status': order_awarded }
        )
      }
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

const driversRequestHistoryForTenders = async (req, res, next) => {
  try {
    const user_id = req?.user?.id
    const driver_id = req.query.driver_id ? req.query.driver_id : user_id
    const tender_id = req.query.tender_id ? req.query.tender_id : ''
    const term = req?.query?.search ? req?.query?.search : ''
    const status = req?.query?.status ? req?.query?.status : 'all'
    const filter = getFilterOptions(req)

    let andCod = [{ driver_id: driver_id }]
    let orCod = []

    if (term) {
      orCod.push({ title: { $regex: term, $options: 'i' } })
    }
    if (status != 'all' && status) {
      andCod.push({ status: status })
    }

    if (tender_id) {
      andCod.push({ tender_id: tender_id })
    }

    return await getPaginationWithPopulate({
      req,
      res,
      model: DriverReuest,
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
        {
          path: 'tender_id',
        },
      ],
    })
  } catch (err) {
    next(err)
  }
}

const getNearestTender = async (req, res, next) => {
  try {
    const term = req?.query?.search ? req?.query?.search : ''
    const status = req?.query?.status ? req?.query?.status : 'all'
    const latitude = req.query.latitude ? Number(req.query.latitude) : 0
    const longitude = req.query.longitude ? Number(req.query.longitude) : 0
    const kilometters = req.query.kilometters ? Number(req.query.kilometters) : 1
    const unitValue = req.query.unitValue ? Number(req.query.unitValue) : 1000
    const order_status = req?.query?.order_status ? req?.query?.order_status : 'all'
    const removeOwn = req?.query?.remove_own ? 'yes' : 'no'

    const filter = getFilterOptions(req)
    const maxDistance = kilometters * unitValue

    let andCod = []
    let orCod = []
    if (removeOwn == 'yes') {
      orCod.push({ customer_id: { $ne: req.user.id } })
    }

    if (term) {
      orCod.push({ title: { $regex: term, $options: 'i' } })
    }

    if (status != 'all' && status) {
      andCod.push({ tender_status: status })
    }
    if (order_status != 'all' && order_status) {
      andCod.push({ 'order.order_status': order_status })
    }

    if (latitude && longitude) {
      andCod.push({
        location_from: {
          $near: {
            $maxDistance: maxDistance, // distance in meters
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
          },
        },
      })
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

const getNearestDriverForTender = async (req, res, next) => {
  try {
    const order = req.query.order ? req.query.order : 'desc'
    const sortBy = req.query.sortBy ? req.query.sortBy : '_id'
    const page = req.query.page > 0 ? req.query.page : 1
    const perPage = req.query.limit ? parseInt(req.query.limit, 10) : 10
    const term = req?.query?.search ? req?.query?.search : ''
    const latitude = req.query.tender_latitude ? Number(req.query.tender_latitude) : 0
    const longitude = req.query.tender_longitude ? Number(req.query.tender_longitude) : 0
    const kilometters = req.query.kilometters ? Number(req.query.kilometters) : 1
    const unitValue = req.query.unitValue ? Number(req.query.unitValue) : 1000
    const filter = getFilterOptions(req)
    const maxDistance = kilometters * unitValue

    let andCod = []
    let orCod = []

    if (term) {
      orCod.push({
        first_name: { $regex: term, $options: 'i' },
        last_name: { $regex: term, $options: 'i' },
        email: { $regex: term, $options: 'i' },
      })
    }

    if (latitude && longitude) {
      andCod.push({
        current_location: {
          $near: {
            $maxDistance: maxDistance, // distance in meters
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude],
            },
          },
        },
      })
    }

    const findOptions = {
      $and: andCod.length > 0 ? andCod : [{}],
      $or: orCod.length > 0 ? orCod : [{}],
      ...filter,
    }
    const total = await UserModal.count(findOptions).exec()

    console.log(total)

    UserModal.find(findOptions)
      .select({
        first_name: 1,
        last_name: 1,
        email: 1,
        mobile_number: 1,
        current_location: 1,
        image: 1,
      })
      .limit(perPage)
      .skip(perPage * (+page - 1))
      .sort([[sortBy, order]])
      .exec((err, data) => {
        if (err) {
          return apiResponse.ErrorResponse(
            res,
            'Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.',
            'System went wrong, Kindly try again later'
          )
        }
        return apiResponse.successResponseWithPagination(res, page, total, perPage, data)
      })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  createDriverReuest,
  driversRequestForTender,
  getNearestTender,
  getdriverTenders,
  driversRequestHistoryForTenders,
  getNearestDriverForTender,
}
