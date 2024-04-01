const express = require('express')
const chatController = require('../controllers/chat.controller')
const router = express.Router()
const { checkUserAuth } = require('../../../middlewares/authMiddleware')
const mediaUpload = require('../../../middlewares/upload-aws-image')
router.get('/get_all', chatController.getChats)
router.get('/get_chats_users', checkUserAuth, chatController.getChatsUsers)
router.get('/details/:id', chatController.getChat)
router.post('/create_chat', mediaUpload.single('picture'), chatController.createChat)
router.post('/delete_chat', chatController.deleteChat)
router.patch('/update_chat/:id', mediaUpload.single('picture'), chatController.updateChat)
router.get('/chat_mark_as_Read', checkUserAuth, chatController.chatMarkAsRead)

module.exports = router
