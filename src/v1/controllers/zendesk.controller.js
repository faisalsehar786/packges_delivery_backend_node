const apiResponse = require("../../../helpers/apiResponse");
const zendeskHelper = require("../../../helpers/zendesk.helper");
const OrganisationModel = require("../models/organisation.model");

const createTicketUser = async (req, res, next) => {
  try {
    const subject = `[APP]: ${req.body?.subject}`;
    const body = req.body?.body;
    const fullName = `${req.user?.first_name || ""} ${
      req.user?.last_name || ""
    }`;
    if (!subject || !body) {
      return apiResponse.ErrorResponse(
        res,
        "emne og kropp er nødvendige variabler",
        "subject and body are required variables"
      );
    }
    const data = await zendeskHelper.createTicket(
      subject,
      body,
      fullName,
      req.user.email
    );

    return apiResponse.successResponseWithData(
      res,
      "Billett Oppretting vellykket.",
      "Ticket Created Successfully",
      data
    );
  } catch (err) {
    next(err);
  }
};

const createTicketOrg = async (req, res, next) => {
  try {
    const orgDetails = await OrganisationModel.findById(
      req.user.organisation_id
    );
    const subject = `[ORG]: ${orgDetails?.org_name}: ${req.body?.subject}`;
    const body = req.body?.body;
    const fullName = `${req.user?.first_name || ""} ${
      req.user?.last_name || ""
    }`;
    if (!subject || !body) {
      return apiResponse.ErrorResponse(
        res,
        "emne og kropp er nødvendige variabler",
        "subject and body are required variables"
      );
    }
    const data = await zendeskHelper.createTicket(
      subject,
      body,
      fullName,
      req.user.email
    );

    return apiResponse.successResponseWithData(
      res,
      "Billett Oppretting vellykket.",
      "Ticket Created Successfully",
      data
    );
  } catch (err) {
    next(err);
  }
};

const createTicketAdmin = async (req, res, next) => {
  try {
    const subject = `[ADMIN]: ${req.body?.subject}`;
    const body = req.body?.body;
    const fullName = `${req.user?.first_name || ""} ${
      req.user?.last_name || ""
    }`;
    if (!subject || !body) {
      return apiResponse.ErrorResponse(
        res,
        "emne og kropp er nødvendige variabler",
        "subject and body are required variables"
      );
    }
    const data = await zendeskHelper.createTicket(
      subject,
      body,
      fullName,
      req.user.email
    );

    return apiResponse.successResponseWithData(
      res,
      "Billett Oppretting vellykket.",
      "Ticket Created Successfully",
      data
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createTicketUser,
  createTicketOrg,
  createTicketAdmin,
};
