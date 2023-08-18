const axios = require("axios");

async function createTicket(subject, body, name, email) {
  const config = {
    method: "post",
    url: `${process.env.ZENDESK_BASE_URL}/requests.json`,
    headers: {
      Authorization: `${process.env.ZENDESK_AUTHORIZATION_CODE}`,
      "Content-Type": "application/json",
    },
    data: {
      request: {
        subject,
        comment: {
          body,
        },
        requester: {
          name,
          email,
        },
      },
    },
  };
  const userInfoPayload = await axios(config);
  return userInfoPayload?.data;
}

module.exports = {
  createTicket,
};
