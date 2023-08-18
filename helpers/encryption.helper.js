const crypto = require("crypto");
const cryptoJS = require("crypto-js");

async function encryptNeoNomicsSSN(ssn) {
  const rawValue = process.env.NEONOMICS_ENCRYPTION_KEY;
  const iv = crypto.randomBytes(12);
  const key = Buffer.from(rawValue, "base64");
  const decryptedSSN = await cryptoDecrypt(ssn);
  const cipher = crypto.createCipheriv("aes-128-gcm", key, iv, {
    authTagLength: 16,
  });
  const enc = Buffer.concat([
    cipher.update(decryptedSSN),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  const encryptedSSN = Buffer.concat([iv, enc]).toString("base64");
  return encryptedSSN;
}

async function cryptoDecrypt(value) {
  const decrypted = cryptoJS.AES.decrypt(value, process.env.CRYPTO_HASH);
  return decrypted.toString(cryptoJS.enc.Utf8);
}

module.exports = {
  encryptNeoNomicsSSN,
};
