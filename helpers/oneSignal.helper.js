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
        ios_badgeType: "Increase",
        ios_badgeCount: +1,
      }),
    };
    const notificationPayload = await axios(config);
    return notificationPayload?.data;
  } catch (error) {
    Sentry.captureException(error);
  }
}

async function createOneSignalNotification(
  heading,
  content,
  notiType,
  sendToType,
  sendToArray
) {
  try {
    let dataParam = {};
    if (sendToType == "all") {
      dataParam = {
        included_segments: ["All"],
        contents: { en: content },
        headings: { en: heading },
        app_id: process.env.ONE_SIGNAL_APP_ID,
        data: {
          url: "https://stotte.no/notifications",
          type: notiType,
        },
        ios_badgeType: "Increase",
        ios_badgeCount: 1,
      };
    } else if (sendToType == "single") {
      dataParam = {
        include_player_ids: sendToArray,
        contents: { en: content },
        headings: { en: heading },
        app_id: process.env.ONE_SIGNAL_APP_ID,
        data: {
          url: "https://stotte.no/notifications",
          type: notiType,
        },
        ios_badgeType: "Increase",
        ios_badgeCount: 1,
      };
    } else {
      return false;
    }
    const config = {
      method: "post",
      url: `${process.env.ONE_SIGNAL_BASE_URL}/notifications`,
      headers: {
        Authorization: `Basic ${process.env.ONE_SIGNAL_API_KEY}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      data: JSON.stringify(dataParam),
    };
    const notificationPayload = await axios(config);
    return notificationPayload?.data;
  } catch (error) {
    Sentry.captureException(error);
  }
}

module.exports = {
  createNotification,
  createOneSignalNotification,
};
