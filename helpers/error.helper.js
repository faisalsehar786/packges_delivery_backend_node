/* eslint-disable prefer-const */
const Sentry = require('@sentry/node')
const ErrorMessageModel = require('../src/v1/models/errors.model')

async function createErrorMessage(message, user_id, route) {
  try {
    let errorMsg = new ErrorMessageModel()
    errorMsg.user_id = user_id
    errorMsg.error_message = message
    errorMsg.route = route
    errorMsg.save()
  } catch (error) {
    Sentry.captureException(error)
  }
}

module.exports = {
  createErrorMessage,
}
