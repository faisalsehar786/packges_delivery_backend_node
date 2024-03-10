/* eslint-disable prefer-const */
const Sentry = require("@sentry/node");
const NeonomicsErrorModel = require("../src/v1/models/neonomicsError.model");

async function logError(errorDetails, user_id) {
  try {
    let nnError = new NeonomicsErrorModel();
    const errorDetailsSimplified = simplifyError(errorDetails);
    if (user_id) {
      nnError.user_id = user_id;
    }
    nnError.message = errorDetails.message;
    nnError.metadata = errorDetailsSimplified;
    nnError.save();
  } catch (error) {
    Sentry.captureException(error);
  }
}

function isAxiosError(error) {
  return error.isAxiosError === true;
}

function simplifyError(error) {
  if (isAxiosError(error)) {
    return simplifyAxiosError(error);
  }
  return {
    message: error.message,
    name: error.name,
    stack: error.stack,
  };
}

function simplifyAxiosError(axiosError) {
  return {
    message: axiosError.message,
    name: axiosError.name,
    response_data: axiosError.response?.data,
    response_headers: axiosError.response?.headers,
    request_config: axiosError?.config,
    status: axiosError.response?.status,
    // Add any other relevant details if need
  };
}

module.exports = {
  logError,
};
