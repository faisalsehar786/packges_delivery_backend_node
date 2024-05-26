const express = require('express')

const app = express()
const userRoute = require('./user.route')
const adminRoute = require('./admin.route')
const tenderRoute = require('./tender.route')
const paymentRoute = require('./payment.route')
const driverRoute = require('./driver.route')
const orderRoute = require('./order.route')
const customerRoute = require('./customer.route')
const chatRoute = require('./chat.route')
const filehandlingRoute = require('./filehandling.route')
const notificationRoute = require('./notification.route')
const zendeskRoute = require('./zendesk.route')
const ratingReviewRoute = require('./rating.route')
// End Points of Api

app.use('/admin/', adminRoute)
///////////////////////////////////////////
app.use('/user/', userRoute)
app.use('/tender/', tenderRoute)
app.use('/driver/', driverRoute)
app.use('/customer/', customerRoute)
app.use('/order/', orderRoute)
app.use('/payment/', paymentRoute)
app.use('/chat/', chatRoute)
///////////////////////////////////////////////////////
app.use('/fileupload/', filehandlingRoute)
app.use('/notification/', notificationRoute)
app.use('/zendesk/', zendeskRoute)
app.use('/rating_reviews/', ratingReviewRoute)

module.exports = app
