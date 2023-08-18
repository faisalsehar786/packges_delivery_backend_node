const axios = require("axios");

async function getNifLoginToken(nifCode) {
  const config = {
    method: "post",
    url: `${process.env.NIF_LOGIN_BASE_URL}/auth/realms/nif/protocol/openid-connect/token`,
    data: {
      grant_type: "authorization_code",
      code: nifCode,
      redirect_uri: process.env.NIF_LOGIN_REDIRECT_URI,
    },
    headers: {
      "Authorization": `Basic ${process.env.NIF_LOGIN_CLIENT_SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };
  const authPayload = await axios(config);
  return authPayload.data.access_token;
}

async function getNifLoginUserInfo(code) {
  const accessToken = await getNifLoginToken(code);
  const config = {
    method: "post",
    url: `${process.env.NIF_LOGIN_BASE_URL}/auth/realms/nif/protocol/openid-connect/userinfo`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };
  const userInfoPayload = await axios(config);
  return userInfoPayload?.data;
}

async function getNifToken() {
  const config = {
    method: "post",
    url: process.env.NIF_TOKEN_URL,
    data: {
      client_id: "Stotte",
      client_secret: process.env.NIF_CLIENT_SECRET,
      grant_type: "client_credentials",
      scope: "data_org_read data_org_contactpersons_read",
    },
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };
  const authPayload = await axios(config);
  return authPayload.data.access_token;
}

async function getOrganisationContactPersons(orgId) {
  const accessToken = await getNifToken();
  const config = {
    method: "get",
    url: `${process.env.NIF_BASE_URL}/contactpersons?orgid=${orgId}`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };
  const contactPersonPayload = await axios(config);
  return contactPersonPayload.data;
}

module.exports = {
  getNifLoginUserInfo,
  getOrganisationContactPersons,
};
