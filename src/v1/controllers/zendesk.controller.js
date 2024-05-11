const apiResponse = require('../../../helpers/apiResponse')
const zendeskHelper = require('../../../helpers/zendesk.helper')
const { createItemNotificationWithPush } = require('../../../helpers/commonApis')
const createTicketUser = async (req, res, next) => {
  try {
    const subject = `[APP]: ${req.body?.subject}`
    const body = req.body?.body
    const fullName = `${req.user?.first_name || ''} ${req.user?.last_name || ''}`
    if (!subject || !body) {
      return apiResponse.ErrorResponse(
        res,
        'emne og kropp er nødvendige variabler',
        'subject and body are required variables'
      )
    }

    await createItemNotificationWithPush({
      itemDetails: {
        sender_id: req.user.id,
        noti_type: 'app_support',
        noti_for: 'for_admin',
        title: `${fullName} - ${subject} - ${req.user.email}`,
        message: body,
      },
      pushNotification: false,
      insertInDb: true,
    })
    // const data = await zendeskHelper.createTicket(subject, body, fullName, req.user.email)

    return apiResponse.successResponseWithData(
      res,
      'Billett Oppretting vellykket.',
      'Ticket Created Successfully',
      { inserted: true }
    )
  } catch (err) {
    next(err)
  }
}

module.exports = {
  createTicketUser,
}
