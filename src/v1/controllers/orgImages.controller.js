const { createItem } = require("../../../helpers/commonApis");
const apiResponse = require("../../../helpers/apiResponse");
const OrgImagesModel = require("../models/orgImages.model");

const createOrgImages = async (req, res, next) => {
  try {
    req.body.image = req?.file?.location || "";
    await createItem({
      req,
      res,
      Model: OrgImagesModel,
      itemName: "OrgImages",
    });
  } catch (err) {
    next(err);
  }
};

const getOrgImages = async (req, res, next) => {
  try {
    const { type } = req.params;
    const orgImagesData = await OrgImagesModel.find({ images_type: type });

    if (!orgImagesData) {
      return apiResponse.ErrorResponse(
        res,
        "Organisasjonsbilder ikke hentet",
        "Org Images Not Fetched"
      );
    }
    return apiResponse.successResponseWithData(
      res,
      "Detaljer om organisasjonsbilder",
      "Org Images Details",
      orgImagesData
    );
  } catch (err) {
    next(err);
  }
};

const getAllOrgImages = async (req, res, next) => {
  try {
    const orgImagesData = await OrgImagesModel.find();

    if (!orgImagesData) {
      return apiResponse.notFoundResponse(
        res,
        "Organisasjonsbilder ikke hentet",
        "Org Images Not Fetched"
      );
    }
    return apiResponse.successResponseWithData(
      res,
      "Detaljer om organisasjonsbilder",
      "Org Images Details",
      orgImagesData
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOrgImages,
  getOrgImages,
  getAllOrgImages,
};
