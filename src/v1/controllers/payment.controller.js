const TenderModel = require('../models/tender.model')
const {
  getPagination,
  getItem,
  softDelete,
  updateItem,
  createItem,
  totalItemsCustomQuery,
} = require('../../../helpers/commonApis')

const createTender = async (req, res, next) => {
  try {
    await createItem({
      req,
      res,
      Model: TenderModel,
      itemName: 'Tender',
    })
  } catch (err) {
    next(err)
  }
}

const getTender = async (req, res, next) => {
  try {
    const itemId = req.params.id
    return await getItem({id: itemId, Model: TenderModel, res})
  } catch (err) {
    next(err)
  }
}

const getTenders = async (req, res, next) => {
  try {
    const term = req.query.search
    return await getPagination({
      req,
      res,
      model: TenderModel,
      findOptions: {
        $or: [{title: {$regex: term, $options: 'i'}}],
      },
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

const deleteTenderOrderPayments = async (req, res, next) => {
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

const updateTender = async (req, res, next) => {
  try {
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

const totalTenders = async (req, res, next) => {
  try {
    await totalItemsCustomQuery({
      req,
      res,
      Model: TenderModel,
      query: {},
      itemName: 'Tender',
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
  totalTenders,
  deleteTenderOrderPayments,
}
