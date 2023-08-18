const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");
const OrganisationModel = require("../src/v1/models/organisation.model");

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

async function createVippsAgreement(req) {
  const organisationData = await OrganisationModel.findById(
    req.body.organisation_id
  );
  if (!organisationData) {
    throw new Error("Organisation Id is invalid! Kindly try again.");
  }
  if (
    organisationData.msn === "" ||
    organisationData.msn_status !== "completed"
  ) {
    throw new Error("Organisation does not have a MSN");
  }
  const accessToken = await createVippsToken(organisationData.msn);
  const config = {
    method: "post",
    url: `${process.env.VIPPS_BASE_URL}/recurring/v3/agreements`,
    data: {
      pricing: {
        suggestedMaxAmount: 5000,
        type: "VARIABLE",
        currency: "NOK",
      },
      interval: {
        unit: "WEEK",
        count: 1,
      },
      merchantRedirectUrl: req.body.merchant_redirect_url,
      merchantAgreementUrl: req.body.merchant_agreement_url,
      customerPhoneNumber:
        req.user.mobile_number || process.env.VIPPS_TEST_PHONE_NO,
      productName: req.body.goal_name,
      productDescription: `Støtt oss med ${req.body.support_amount} kr hver gang du kjøper noe`,
      isApp: true,
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Ocp-Apim-Subscription-Key": process.env.VIPPS_SUBSCRIPTION_KEY,
      "Content-Type": "application/json",
      "Idempotency-Key": uuidv4(),
      "Merchant-Serial-Number": organisationData.msn,
      "Vipps-System-Name": process.env.VIPPS_SYSTEM_NAME,
      "Vipps-System-Version": process.env.VIPPS_SYSTEM_VERSION,
      "Vipps-System-Plugin-Name": process.env.VIPPS_SYSTEM_PLUGIN_NAME,
      "Vipps-System-Plugin-Version": process.env.VIPPS_SYSTEM_PLUGIN_VERSION,
    },
  };
  const agreementPayload = await axios(config);
  return agreementPayload?.data;
}

async function updateVippsAgreement(agreementId, status, orgId) {
  const organisationData = await OrganisationModel.findById(orgId);
  if (!organisationData) {
    throw new Error("Organisation Id is invalid! Kindly try again.");
  }
  if (
    organisationData.msn === "" ||
    organisationData.msn_status !== "completed"
  ) {
    throw new Error("Organisation does not have a MSN");
  }
  const accessToken = await createVippsToken(organisationData.msn);
  const config = {
    method: "patch",
    url: `${process.env.VIPPS_BASE_URL}/recurring/v3/agreements/${agreementId}`,
    data: {
      status,
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Ocp-Apim-Subscription-Key": process.env.VIPPS_SUBSCRIPTION_KEY,
      "Content-Type": "application/json",
      "Idempotency-Key": uuidv4(),
      "Merchant-Serial-Number": organisationData.msn,
      "Vipps-System-Name": process.env.VIPPS_SYSTEM_NAME,
      "Vipps-System-Version": process.env.VIPPS_SYSTEM_VERSION,
      "Vipps-System-Plugin-Name": process.env.VIPPS_SYSTEM_PLUGIN_NAME,
      "Vipps-System-Plugin-Version": process.env.VIPPS_SYSTEM_PLUGIN_VERSION,
    },
  };
  const agreementPayload = await axios(config);
  return agreementPayload?.data;
}

async function getVippsAgreementStatus(req, orgId) {
  const organisationData = await OrganisationModel.findById(orgId);
  if (!organisationData) {
    throw new Error("Organisation Id is invalid! Kindly try again.");
  }
  if (
    organisationData.msn === "" ||
    organisationData.msn_status !== "completed"
  ) {
    throw new Error("Organisation does not have a MSN");
  }
  const accessToken = await createVippsToken(organisationData.msn);
  const config = {
    method: "get",
    url: `${process.env.VIPPS_BASE_URL}/recurring/v3/agreements/${req?.user?.agreement_id}`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Ocp-Apim-Subscription-Key": process.env.VIPPS_SUBSCRIPTION_KEY,
      "Content-Type": "application/json",
      "Merchant-Serial-Number": organisationData.msn,
      "Vipps-System-Name": process.env.VIPPS_SYSTEM_NAME,
      "Vipps-System-Version": process.env.VIPPS_SYSTEM_VERSION,
      "Vipps-System-Plugin-Name": process.env.VIPPS_SYSTEM_PLUGIN_NAME,
      "Vipps-System-Plugin-Version": process.env.VIPPS_SYSTEM_PLUGIN_VERSION,
    },
  };
  const agreementPayload = await axios(config);
  return agreementPayload?.data;
}

async function getVippsAgreementStatusForNonAuth(agreement_id, orgId) {
  const organisationData = await OrganisationModel.findById(orgId);
  if (!organisationData) {
    throw new Error("Organisation Id is invalid! Kindly try again.");
  }
  if (
    organisationData.msn === "" ||
    organisationData.msn_status !== "completed"
  ) {
    throw new Error("Organisation does not have a MSN");
  }
  const accessToken = await createVippsToken(organisationData.msn);
  const config = {
    method: "get",
    url: `${process.env.VIPPS_BASE_URL}/recurring/v3/agreements/${agreement_id}`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Ocp-Apim-Subscription-Key": process.env.VIPPS_SUBSCRIPTION_KEY,
      "Content-Type": "application/json",
      "Merchant-Serial-Number": organisationData.msn,
      "Vipps-System-Name": process.env.VIPPS_SYSTEM_NAME,
      "Vipps-System-Version": process.env.VIPPS_SYSTEM_VERSION,
      "Vipps-System-Plugin-Name": process.env.VIPPS_SYSTEM_PLUGIN_NAME,
      "Vipps-System-Plugin-Version": process.env.VIPPS_SYSTEM_PLUGIN_VERSION,
    },
  };
  const agreementPayload = await axios(config);
  return agreementPayload?.data;
}

async function createVippsPaymentCharge(agreementId, amount, orderId, orgId) {
  const organisationData = await OrganisationModel.findById(orgId);
  if (!organisationData) {
    throw new Error("Organisation Id is invalid! Kindly try again.");
  }
  if (
    organisationData.msn === "" ||
    organisationData.msn_status !== "completed"
  ) {
    throw new Error("Organisation does not have a MSN");
  }
  const accessToken = await createVippsToken(organisationData.msn);
  const dueDate = moment().add(1, "days").format("YYYY-MM-DD");
  const config = {
    method: "post",
    url: `${process.env.VIPPS_BASE_URL}/recurring/v3/agreements/${agreementId}/charges`,
    data: {
      amount,
      transactionType: "DIRECT_CAPTURE",
      description: "Månedsabonnement",
      due: dueDate,
      retryDays: 5,
      orderId,
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Ocp-Apim-Subscription-Key": process.env.VIPPS_SUBSCRIPTION_KEY,
      "Content-Type": "application/json",
      "Idempotency-Key": orderId,
      "Merchant-Serial-Number": organisationData.msn,
      "Vipps-System-Name": process.env.VIPPS_SYSTEM_NAME,
      "Vipps-System-Version": process.env.VIPPS_SYSTEM_VERSION,
      "Vipps-System-Plugin-Name": process.env.VIPPS_SYSTEM_PLUGIN_NAME,
      "Vipps-System-Plugin-Version": process.env.VIPPS_SYSTEM_PLUGIN_VERSION,
    },
  };
  const agreementPayload = await axios(config);
  return agreementPayload?.data;
}

async function getChargeStatus(agreement_id, chargeId, orgId) {
  const organisationData = await OrganisationModel.findById(orgId);
  if (!organisationData) {
    throw new Error("Organisation Id is invalid! Kindly try again.");
  }
  if (
    organisationData.msn === "" ||
    organisationData.msn_status !== "completed"
  ) {
    throw new Error("Organisation does not have a MSN");
  }
  const accessToken = await createVippsToken(organisationData.msn);
  const config = {
    method: "get",
    url: `${process.env.VIPPS_BASE_URL}/recurring/v3/agreements/${agreement_id}/charges/${chargeId}`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Ocp-Apim-Subscription-Key": process.env.VIPPS_SUBSCRIPTION_KEY,
      "Content-Type": "application/json",
      "Merchant-Serial-Number": organisationData.msn,
      "Vipps-System-Name": process.env.VIPPS_SYSTEM_NAME,
      "Vipps-System-Version": process.env.VIPPS_SYSTEM_VERSION,
      "Vipps-System-Plugin-Name": process.env.VIPPS_SYSTEM_PLUGIN_NAME,
      "Vipps-System-Plugin-Version": process.env.VIPPS_SYSTEM_PLUGIN_VERSION,
    },
  };
  const agreementPayload = await axios(config);
  return agreementPayload?.data;
}

async function createVippsMSN(orgName, orgNo, accountNo, organisationNumber) {
  const accessToken = await createVippsToken();
  const config = {
    method: "post",
    url: `${process.env.VIPPS_BASE_URL}/partner-api/v1/products/orders`,
    data: {
      orgno: `${organisationNumber}`,
      salesUnitName: `Støtte - ${orgName}`,
      settlementAccountNumber: `${accountNo}`,
      pricePackageKey: "Standard",
      productType: "VIPPS_PA_NETT",
      annualTurnover: "200000",
      intendedPurpose: "Formålstøtte fra Støtte appen.",
      productUseCase: "App",
      website: {
        url: `https://stotte.no/vilkaar/${orgName}/${orgNo}`,
        termsUrl: `https://stotte.no/vilkaar/${orgName}/${orgNo}`,
      },
      complianceData: {
        subscription: {
          turnoverShare: "Ca 15%",
          periodDistribution:
            "Abonnementet varer til brukeren velger å si opp.",
        },
      },
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Ocp-Apim-Subscription-Key": process.env.VIPPS_SUBSCRIPTION_KEY,
      "Idempotency-Key": uuidv4(),
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Vipps-System-Name": process.env.VIPPS_SYSTEM_NAME,
      "Vipps-System-Version": process.env.VIPPS_SYSTEM_VERSION,
      "Vipps-System-Plugin-Name": process.env.VIPPS_SYSTEM_PLUGIN_NAME,
      "Vipps-System-Plugin-Version": process.env.VIPPS_SYSTEM_PLUGIN_VERSION,
    },
  };
  const agreementPayload = await axios(config);
  return agreementPayload?.data;
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
      "grant_type": process.env.VIPPS_LOGIN_GRANT_TYPE,
      "code": code,
      "redirect_uri": redirectUri,
    },
    headers: {
      "Authorization": `Basic ${process.env.VIPPS_LOGIN_BASIC_AUTH}`,
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
      "Authorization": `Bearer ${urlPayload.data.access_token}`,
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
  createVippsAgreement,
  updateVippsAgreement,
  getVippsAgreementStatus,
  createVippsPaymentCharge,
  createVippsMSN,
  getVippsLoginAuthUri,
  getVippsLoginUserInfo,
  getVippsAgreementStatusForNonAuth,
  getChargeStatus,
};
