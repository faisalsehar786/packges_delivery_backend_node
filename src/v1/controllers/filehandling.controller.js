const { validationResult } = require("express-validator");
const apiResponse = require("../../../helpers/apiResponse");
const sydFunctions = require("../../../utils/syd-functions");

const createFileUpload = async (req, res, next) => {
  try {
    //   const errorMessage = sydFunctions.validators(req, res);

    // if (errorMessage) {
    //   return apiResponse.ErrorResponse(res, errorMessage);
    // }
    if (!req.file) {
      return apiResponse.ErrorResponse(res, "fileupload are required");
    }

    const uploadedUrl = req.file.location;

    if (!uploadedUrl) {
      return apiResponse.ErrorResponse(res, "Please add an fileupload");
    }

    return apiResponse.successResponseWithData(res, "Operation success", {
      uploaded_path: uploadedUrl,
    });
  } catch (err) {
    next(err);
  }
};

const deleteFileUpload = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return apiResponse.validationErrorWithData(
        res,
        "Validation Error.",
        errors.array()
      );
    }
    await sydFunctions.deleteImage(req.body.uploaded_path);

    return apiResponse.successResponse(res, "Operation success");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createFileUpload,
  deleteFileUpload,
};
