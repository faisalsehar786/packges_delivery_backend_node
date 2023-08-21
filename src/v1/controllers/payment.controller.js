const paymentModel = require('../models/payment.model')  
const {
  getPagination,
  getItem,
  softDelete,
  updateItem,
  createItem,
  totalItemsCustomQuery,  
} = require('../../../helpers/commonApis')   
  
const createPayment = async (req, res, next) => {
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
    return await getItem({id: itemId, Model: paymentModel, res})
  } catch (err) {
    next(err)
  }
}

const getPayments = async (req, res, next) => {
  try {
    const term = req.query.search
    return await getPagination({
      req,
      res,
      model: paymentModel,
      findOptions: {
        $or: [{Payment_no: {$regex: term, $options: 'i'}}],
      },
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
    await updateItem({
      req,
      res,
      Model: paymentModel,
      itemName: 'Payment',
    })
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
}
