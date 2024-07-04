/* eslint-disable no-console */
const express = require('express')
const helmet = require('helmet')
const path = require('path')
const bodyParser = require('body-parser')
require('dotenv').config()
const logger = require('morgan')
const cors = require('cors')
const socketIo = require('socket.io')
const http = require('http')
const chatModel = require('./src/v1/models/chat.model')
const { rateLimiter } = require('./middlewares/rateLimiter')
const { sanitize } = require('./middlewares/sanitizerMiddleware')
const errorMesageMiddleware = require('./helpers/error.helper')

const app = express()

// Apply the rate limiting middleware to all requests
app.use(rateLimiter)

app.disable('x-powered-by')

// Apply security headers using helmet middleware
app.use(
  helmet({
    xssFilter: true,
  })
)

// Middleware to remove excessive headers
app.use((req, res, next) => {
  res.removeHeader('Server')
  res.removeHeader('X-Powered-By')
  res.removeHeader('X-RateLimit-Limit')
  res.removeHeader('X-RateLimit-Remaining')
  res.removeHeader('X-RateLimit-Reset')
  next()
})

// don't show the log when it is test
if (process.env.NODE_ENV !== 'test') {
  app.use(logger('dev'))
}

// Increase the request body size limit
app.use(bodyParser.urlencoded({ extended: true, limit: '16mb' }))

// Parse request body as JSON
app.use(bodyParser.json())

// Attach sanitizer middleware
app.use(sanitize)

app.use('/public', express.static(path.join(__dirname, 'public')))

const corsConfig = {
  credentials: true,
  origin: true,
  exposedHeaders: ['Authorization'],
}
app.use(cors(corsConfig))

const { connectDB } = require('./config/connectDB.config')
const indexRouter = require('./src/v1/routes')
const apiRouter = require('./src/v1/routes/api')
const apiResponse = require('./helpers/apiResponse')

connectDB()

app.use('/', indexRouter)
app.use('/api/v1/', apiRouter)

app.all('*', (req, res) => apiResponse.notFoundResponse(res, 'Rute ikke funnet', 'Route not found'))
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Send an appropriate error response
  const statusCode = err.status || 500
  const message = err.message || 'Internal Server Error'

  errorMesageMiddleware.createErrorMessage(
    message,
    req.user?._id,
    req._reconstructedRoute,
    statusCode
  )

  return apiResponse.ErrorResponse(
    res,
    'Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.',
    'Something went wrong, Kindly try again later'
  )
})

const server = http.createServer(app)
const io = socketIo(server)
let onlineUsers = []
io.on('connection', (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`)

  socket.on('new-user-add', async (newUserId) => {
    console.log(newUserId)
    if (!onlineUsers.some((user) => user?.userId === newUserId)) {
      // if user is not added before
      onlineUsers.push({ userId: newUserId, socketId: socket?.id })
      console.log('new user is here!', onlineUsers)
    }

    io.emit('get-users', onlineUsers)
  })

  socket.on('conect_user_chat_unread_Count', async (newUserId) => {
    const unreadChatCount = await chatModel.count({
      $and: [{ recepientId: newUserId, read: false }],
    })
    socket.join(newUserId)
    // Send initial unread message count to the client
    io.to(socket.id).emit('chatUnreadCount', unreadChatCount)
  })

  socket.on('newMessage', async (data) => {
    const { messageType, message, senderId, recepientId, tender_id } = data
    const newMessage = new chatModel({ messageType, message, senderId, recepientId, tender_id })
    await newMessage.save()
    io.emit('receiveMessage', newMessage)

    const unreadChatCount = await chatModel.count({
      $and: [{ recepientId: recepientId, read: false }],
    })

    // Send initial unread message count to the client
    io.to(recepientId).emit('chatUnreadCount', unreadChatCount)
    console.log('New Message', newMessage)
  })

  socket.on('chatMessageMarkRead', async (data) => {
    const { senderId, recepientId, tender_id } = data
    let updateObje = {
      $and: [{ senderId: recepientId, recepientId: senderId }],
    }
    if (tender_id) {
      updateObje = {
        $and: [{ senderId: recepientId, recepientId: senderId, tender_id: tender_id }],
      }
    }
    const dataRes = await chatModel.updateMany(updateObje, {
      $set: { read: true },
    })

    if (dataRes) {
      const unreadChatCount = await chatModel.count({
        $and: [{ recepientId: recepientId, read: false }],
      })

      // Send initial unread message count to the client
      io.to(recepientId).emit('chatUnreadCount', unreadChatCount)
    }
  })

  socket.on('disconnect', () => {
    onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id)
    socket.leave(socket.id)
    console.log('user disconnected', onlineUsers)
    // send all online users to all users
    io.emit('get-users', onlineUsers)
    socket.disconnect()
    console.log('🔥: A user disconnected')
  })
})

const port = process.env.PORT
server.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`)
})
