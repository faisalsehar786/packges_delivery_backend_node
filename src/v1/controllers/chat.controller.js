const chatModel = require('../models/chat.model')  
const {
  getPagination,
  getItem,  
  softDelete,
  updateItem,
  createItem,
  totalItemsCustomQuery,    
} = require('../../../helpers/commonApis')   
  
const createChat = async (req, res, next) => {
  try { 
    await createItem({
      req,
      res,
      Model: chatModel,
      itemName: 'Chat',
    })
  } catch (err) {
    next(err)
  }
}

const getChat = async (req, res, next) => {
  try {
    const itemId = req.params.id
    return await getItem({id: itemId, Model: chatModel, res})
  } catch (err) {
    next(err)
  }
}

const getChats = async (req, res, next) => {
  try {
    const term = req.query.search
    return await getPagination({
      req,
      res,
      model: chatModel,
      findOptions: {
        $or: [{Chat_no: {$regex: term, $options: 'i'}}],
      },
    })
  } catch (err) {
    next(err)
  }
}
        
const deleteChat = async (req, res, next) => {
  try {
    await softDelete({
      req,
      res,
      Model: chatModel,
      itemName: 'Chat',
    })
  } catch (err) {
    next(err)
  }
}

const updateChat = async (req, res, next) => {
  try {
    await updateItem({
      req,
      res,
      Model: chatModel,
      itemName: 'Chat',
    })
  } catch (err) {
    next(err)
  }
}

const totalChats = async (req, res, next) => {
  try {
    await totalItemsCustomQuery({
      req,
      res,
      Model: chatModel,
      query: {},
      itemName: 'Chat',
    })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  createChat,
  getChat,
  getChats,
  deleteChat,
  updateChat,
  totalChats,
}
