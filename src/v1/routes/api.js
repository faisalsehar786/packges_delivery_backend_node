const express = require('express')

const app = express()
const userRoute = require('./user.route')
const adminRoute = require('./admin.route')
const tenderRoute = require('./tender.route')
const orderRoute = require('./order.route')
const filehandlingRoute = require('./filehandling.route')
const notificationRoute = require('./notification.route')
const zendeskRoute = require('./zendesk.route')

// End Points of Api
app.use('/user/', userRoute)
app.use('/admin/', adminRoute)
app.use('/tender/', tenderRoute)
app.use('/order/', orderRoute)
app.use('/fileupload/', filehandlingRoute)
app.use('/notification/', notificationRoute)
app.use('/zendesk/', zendeskRoute)

module.exports = app 
