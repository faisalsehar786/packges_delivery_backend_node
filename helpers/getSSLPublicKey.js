const sslCertificate = require("get-ssl-certificate");
const Sentry = require("@sentry/node");

async function getPublicKey(url) {
  try {
    sslCertificate
      .get(url, 250, 443, "https:")
      .then((certificate) => {
        /* Check and get pub key and convert it to base64 */
        const publicKeyBuffer = Buffer.from(certificate.pubkey, "base64");
        /* Check if it is actually a buffer or other data */
        if (Buffer.isBuffer(publicKeyBuffer)) {
          return publicKeyBuffer.toString("base64");
        }
      })
      .catch((error) => {
        console.log(error);
      });
  } catch (error) {
    Sentry.captureException(error);
  }
}

module.exports = {
  getPublicKey,
};
