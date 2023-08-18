const axios = require("axios");
const Sentry = require("@sentry/node");
const logger = require("../utils/logger");

async function createNeonomicsToken() {
  const config = {
    method: "post",
    url: process.env.NEONOMICS_TOKEN_URL,
    data: {
      grant_type: "client_credentials",
      scope: "openid",
      client_id: process.env.NEONOMICS_CLIENT_ID,
      client_secret: process.env.NEONOMICS_CLIENT_SECRET,
    },
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };
  const authPayload = await axios(config);
  return authPayload.data.access_token;
}

async function getNeonomicsBanks() {
  const accessToken = await createNeonomicsToken();
  const config = {
    method: "get",
    url: `${process.env.NEONOMICS_BASE_URL}/banks?countryCode=NO`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-device-id": "any_x_device_id",
      "Content-Type": "application/json",
    },
  };
  const bankPayload = await axios(config);
  return bankPayload?.data;
}

async function createNeonomicsSession(bankId) {
  const accessToken = await createNeonomicsToken();
  const config = {
    method: "post",
    url: `${process.env.NEONOMICS_BASE_URL}/session`,
    data: {
      bankId,
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-device-id": "any_x_device_id",
      "Content-Type": "application/json",
    },
  };
  const bankPayload = await axios(config);
  return bankPayload?.data;
}

async function createNeonomicsConsentUrl(sessionId, requestUrl, encryptSSN) {
  const accessToken = await createNeonomicsToken();
  const config = {
    method: "get",
    url: `${requestUrl}`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-device-id": "any_x_device_id",
      "x-session-id": sessionId,
      "x-psu-ip-address": process.env.NEONOMICS_PSU_IP_ADDRESS,
      "x-psu-id": encryptSSN || "",
      "Content-Type": "application/json",
    },
  };
  const bankPayload = await axios(config);
  return bankPayload?.data;
}

async function getNeonomicsAccounts(sessionId, encryptSSN) {
  const accessToken = await createNeonomicsToken();
  try {
    const config = {
      method: "get",
      url: `${process.env.NEONOMICS_BASE_URL}/accounts`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-device-id": "any_x_device_id",
        Accept: "application/json",
        "x-psu-id": encryptSSN || "",
        "x-psu-ip-address": process.env.NEONOMICS_PSU_IP_ADDRESS,
        "x-session-id": sessionId,
      },
    };
    const bankPayload = await axios(config);
    return bankPayload?.data;
  } catch (error) {
    return error.response.data;
  }
}

async function getNeonomicsAccountTransactions(sessionId, accountId) {
  const accessToken = await createNeonomicsToken();
  try {
    const config = {
      method: "get",
      url: `${process.env.NEONOMICS_BASE_URL}/accounts/${accountId}/transactions`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-device-id": "any_x_device_id",
        Accept: "application/json",
        "x-psu-ip-address": process.env.NEONOMICS_PSU_IP_ADDRESS,
        "x-session-id": sessionId,
      },
    };
    const bankPayload = await axios(config);
    return bankPayload?.data;
  } catch (error) {
    logger.error("getNeonomicsAccountTransactionsError", error);
    Sentry.captureException(error);
  }
}

async function getNeonomicsAccountTransactionsByDateRange(
  sessionId,
  accountId,
  startDate = new Date(),
  endDate = new Date()
) {
  const accessToken = await createNeonomicsToken();
  try {
    const config = {
      method: "get",
      url: `${process.env.NEONOMICS_BASE_URL}/accounts/${accountId}/transactions-page?fromDate=${startDate}&toDate=${endDate}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-device-id": "any_x_device_id",
        Accept: "application/json",
        "x-psu-ip-address": process.env.NEONOMICS_PSU_IP_ADDRESS,
        "x-session-id": sessionId,
      },
    };
    const bankPayload = await axios(config);
    return bankPayload?.data?.transactions || [];
  } catch (error) {
    logger.error(`getNeonomicsAccountTransactionsByDateRangeError - ${error}`);
    Sentry.captureException(error);
  }
}

async function checkSessionStatus(sessionId) {
  const accessToken = await createNeonomicsToken();
  try {
    const config = {
      method: "get",
      url: `${process.env.NEONOMICS_BASE_URL}/session/${sessionId}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-device-id": "any_x_device_id",
        Accept: "application/json",
      },
    };
    const sessionStatus = await axios(config);
    return sessionStatus?.data;
  } catch (error) {
    Sentry.captureException(error);
  }
}
async function getNeonomicsSingleBank(bankId) {
  const accessToken = await createNeonomicsToken();
  const config = {
    method: "get",
    url: `${process.env.NEONOMICS_BASE_URL}/banks/${bankId}`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-device-id": "any_x_device_id",
      "Content-Type": "application/json",
    },
  };
  const bankPayload = await axios(config);
  return bankPayload?.data;
}

module.exports = {
  createNeonomicsToken,
  getNeonomicsBanks,
  createNeonomicsSession,
  createNeonomicsConsentUrl,
  getNeonomicsAccounts,
  getNeonomicsAccountTransactions,
  getNeonomicsAccountTransactionsByDateRange,
  checkSessionStatus,
  getNeonomicsSingleBank,
};
