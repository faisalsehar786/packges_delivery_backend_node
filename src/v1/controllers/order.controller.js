const OrderModel = require('../models/order.model')
const {
  getPagination,
  getItem,
  softDelete,
  updateItem,
  createItem,
  totalItemsCustomQuery,
} = require('../../../helpers/commonApis') 
  
const createOrder = async (req, res, next) => {
  try { 
    await createItem({
      req,
      res,
      Model: OrderModel,
      itemName: 'Order',
    })
  } catch (err) {
    next(err)
  }
}

const getOrder = async (req, res, next) => {
  try {
    const itemId = req.params.id
    return await getItem({id: itemId, Model: OrderModel, res})
  } catch (err) {
    next(err)
  }
}

const getOrders = async (req, res, next) => {
  try {
    const term = req.query.search
    return await getPagination({
      req,
      res,
      model: OrderModel,
      findOptions: {
        $or: [{order_no: {$regex: term, $options: 'i'}}],
      },
    })
  } catch (err) {
    next(err)
  }
}
     
const deleteOrder = async (req, res, next) => {
  try {
    await softDelete({
      req,
      res,
      Model: OrderModel,
      itemName: 'Order',
    })
  } catch (err) {
    next(err)
  }
}

const updateOrder = async (req, res, next) => {
  try {
    await updateItem({
      req,
      res,
      Model: OrderModel,
      itemName: 'Order',
    })
  } catch (err) {
    next(err)
  }
}

const totalOrders = async (req, res, next) => {
  try {
    await totalItemsCustomQuery({
      req,
      res,
      Model: OrderModel,
      query: {},
      itemName: 'Order',
    })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  createOrder,
  getOrder,
  getOrders,
  deleteOrder,
  updateOrder,
  totalOrders,
}
