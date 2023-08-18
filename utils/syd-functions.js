
const { validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const aws = require('aws-sdk');
aws.config.update({
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  region: process.env.AWS_REGION,
});

const s3 = new aws.S3({ useAccelerateEndpoint: true });
/**
 * This method deletes in the images folder, the image whose
 * the URL was passed to it as a parameter
 */
exports.deleteImage = async (filePath) => {
  if (filePath) {
    const keypath = filePath.split('/').pop();

    const params = {
      Bucket: process.env.AWS_MEDIA_BUCKET,
      Key: keypath,
    };
    try {
      await s3.headObject(params).promise();
      console.log('File Found in S3');
      try {
        await s3.deleteObject(params).promise();
        console.log('file deleted Successfully');
      } catch (err) {
        console.log('ERROR in file Deleting : ' + JSON.stringify(err));
      }
    } catch (err) {
      console.log('File not Found ERROR : ' + err.code);
    }
  }

  // filePath = path.join(__dirname, '..', filePath);
  // // setTimeout(() => { //I used it to clearly see the deletion of the image
  // fs.unlink(filePath, error => {
  //     console.log('(SYD FUNCTIONS) DELETE IMAGE ERROR', error);
  // });
  // // }, 3000);
};

/**
 * This method allows to validate the fields sent by the user.
 * For more information read on how to use express-validator (https://express-validator.github.io/docs/)
 */
exports.validators = async (req) => {
  let errorMessage = null;
  const validationErrors = validationResult(req);
  if (!validationErrors.isEmpty()) {
    console.log(
      'VALIDATION ERROR',
      validationErrors.array()[0]
    );
    errorMessage = validationErrors.array()[0].msg;
    if (req.file) {
      await this.deleteImage(req.file.path.replace('\\', '/'));
    }
  }
  return errorMessage;
};
