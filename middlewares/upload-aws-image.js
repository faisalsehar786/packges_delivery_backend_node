const aws = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const multerS3 = require("multer-s3");
const { randomNumber } = require("../utils/randomNumber");

aws.config.update({
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  region: process.env.AWS_REGION,
});

const s3 = new aws.S3({ useAccelerateEndpoint: true });
module.exports = multer({
  storage: multerS3({
    acl: "public-read",
    s3,
    bucket: process.env.AWS_MEDIA_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata(req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key(req, file, cb) {
      const fileName = `${uuidv4()}_${randomNumber(6)}`;
      cb(null, `_${Date.now().toString()}_${fileName}`);
    },
  }),
  limits: {
    fileSize: 16000000, // 8 MB
  },
});
