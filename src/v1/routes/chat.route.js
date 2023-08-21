const express = require('express')
const chatController = require('../controllers/chat.controller')
const router = express.Router()

router.get('/get_all', chatController.getChats)
router.get('/total_chats', chatController.totalChats)
router.get('/details/:id', chatController.getChat)
router.post('/create_chat', chatController.createChat)
router.delete('/delete_chat/:id', chatController.deleteChat)  
router.patch('/update_chat/:id', chatController.updateChat)

 
module.exports = router 
             