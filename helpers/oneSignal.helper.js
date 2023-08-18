const axios = require("axios");
const Sentry = require("@sentry/node");

async function createNotification(playerIds, content, heading, subTitle) {
  try {
    const config = {
      method: "post",
      url: `${process.env.ONE_SIGNAL_BASE_URL}/notifications`,
      headers: {
        Authorization: `Basic ${process.env.ONE_SIGNAL_API_KEY}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      data: JSON.stringify({
        include_player_ids: [playerIds],
        contents: { en: content },
        headings: { en: heading },
        subtitle: { en: subTitle },
        app_id: process.env.ONE_SIGNAL_APP_ID,
      }),
    };
    const notificationPayload = await axios(config);
    return notificationPayload?.data;
  } catch (error) {
    Sentry.captureException(error);
  }
}

module.exports = {
  createNotification,
};
