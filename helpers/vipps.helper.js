const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");

async function createVippsToken(msn) {
  const config = {
    method: "post",
    url: `${process.env.VIPPS_BASE_URL}/accesstoken/get`,
    headers: {
      client_id: process.env.VIPPS_CLIENT_ID,
      client_secret: process.env.VIPPS_CLIENT_SECRET,
      "Ocp-Apim-Subscription-Key": process.env.VIPPS_SUBSCRIPTION_KEY,
      "Merchant-Serial-Number": msn,
      "Vipps-System-Name": process.env.VIPPS_SYSTEM_NAME,
      "Vipps-System-Version": process.env.VIPPS_SYSTEM_VERSION,
      "Vipps-System-Plugin-Name": process.env.VIPPS_SYSTEM_PLUGIN_NAME,
      "Vipps-System-Plugin-Version": process.env.VIPPS_SYSTEM_PLUGIN_VERSION,
    },
  };
  const authPayload = await axios(config);
  return authPayload.data.access_token;
}

// for vips login - get uri for vipps authentication
async function getVippsLoginAuthUri(redirectUri, callbackUri) {
  // api to get url from vips login api
  const config = {
    method: "get",
    url: `${process.env.VIPPS_BASE_URL}/access-management-1.0/access/.well-known/openid-configuration`,
    headers: {
      "Merchant-Serial-Number": process.env.VIPPS_LOGIN_MSN,
      "Vipps-System-Name": process.env.VIPPS_SYSTEM_NAME,
      "Vipps-System-Version": process.env.VIPPS_SYSTEM_VERSION,
      "Vipps-System-Plugin-Name": process.env.VIPPS_SYSTEM_PLUGIN_NAME,
      "Vipps-System-Plugin-Version": process.env.VIPPS_SYSTEM_PLUGIN_VERSION,
    },
  };
  const urlPayload = await axios(config);
  const vippsAuthUri = `${
    urlPayload?.data?.authorization_endpoint
  }?Content-Type=application/x-www-form-urlencoded&response_type=${
    process.env.VIPPS_LOGIN_RESPONSE_TYPE
  }&client_id=${process.env.VIPPS_LOGIN_CLIENT_ID}&scope=${
    process.env.VIPPS_LOGIN_SCOPE
  }&state=${uuidv4()}&redirect_uri=${redirectUri}&app_callback_uri=${callbackUri}&final_redirect_is_app=true&requested_flow=app_to_app`;
  return vippsAuthUri;
}

// for vips login - get url for login
async function getVippsLoginUserInfo(code, redirectUri) {
  // api to fetch access token
  const config = {
    method: "post",
    url: `${process.env.VIPPS_BASE_URL}/access-management-1.0/access/oauth2/token`,
    data: {
      grant_type: process.env.VIPPS_LOGIN_GRANT_TYPE,
      code,
      redirect_uri: redirectUri,
    },
    headers: {
      Authorization: `Basic ${process.env.VIPPS_LOGIN_BASIC_AUTH}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Merchant-Serial-Number": process.env.VIPPS_LOGIN_MSN,
      "Vipps-System-Name": process.env.VIPPS_SYSTEM_NAME,
      "Vipps-System-Version": process.env.VIPPS_SYSTEM_VERSION,
      "Vipps-System-Plugin-Name": process.env.VIPPS_SYSTEM_PLUGIN_NAME,
      "Vipps-System-Plugin-Version": process.env.VIPPS_SYSTEM_PLUGIN_VERSION,
    },
  };
  const urlPayload = await axios(config);

  // get user details from vipps
  const config2 = {
    method: "get",
    url: `${process.env.VIPPS_BASE_URL}/vipps-userinfo-api/userinfo`,
    headers: {
      Authorization: `Bearer ${urlPayload.data.access_token}`,
      "Merchant-Serial-Number": process.env.VIPPS_LOGIN_MSN,
      "Vipps-System-Name": process.env.VIPPS_SYSTEM_NAME,
      "Vipps-System-Version": process.env.VIPPS_SYSTEM_VERSION,
      "Vipps-System-Plugin-Name": process.env.VIPPS_SYSTEM_PLUGIN_NAME,
      "Vipps-System-Plugin-Version": process.env.VIPPS_SYSTEM_PLUGIN_VERSION,
    },
  };
  const userInfo = await axios(config2);
  return userInfo?.data;
}

module.exports = {
  createVippsToken,
  getVippsLoginAuthUri,
  getVippsLoginUserInfo,
};
