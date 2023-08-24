const express = require('express')
const chatController = require('../controllers/chat.controller')
const router = express.Router()
const mediaUpload = require('../../../middlewares/upload-aws-image')
router.get('/get_all', chatController.getChats)
router.get('/details/:id', chatController.getChat)
router.post('/create_chat', mediaUpload.single('picture'), chatController.createChat)
router.delete('/delete_chat', chatController.deleteChat)
router.patch('/update_chat/:id', mediaUpload.single('picture'), chatController.updateChat)

module.exports = router
