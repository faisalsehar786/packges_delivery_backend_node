const {
  getPagination,
  getItem,
  softDelete,
  createItem,
  updateItem,
} = require("../../../helpers/commonApis");
const apiResponse = require("../../../helpers/apiResponse");
const PaymentTransferModel = require("../models/paymentTransfer.model");

const createPaymentTransfer = async (req, res, next) => {
  try {
    req.body.image = req?.file?.location || "";
    await createItem({
      req,
      res,
      Model: PaymentTransferModel,
      itemName: "PaymentTransfer",
    });
  } catch (err) {
    next(err);
  }
};

const getPaymentTransfer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const paymentTransferData = await PaymentTransferModel.findById(id)
      .populate({
        path: "organisation_id",
        select: ["org_name", "org_id"],
      })
      .populate({
        path: "organisation_sports_category_id",
        select: ["sports_category_name"],
      })
      .populate({
        path: "goal_id",
        select: ["title", "short_description", "target_amount"],
      });

    if (!paymentTransferData) {
      return apiResponse.notFoundResponse(
        res,
        "Beklager, vi finner ikke dataen du ser etter.",
        "Not found!"
      );
    }
    return apiResponse.successResponseWithData(
      res,
      "Betalingsoverføringsdetaljer",
      "Payment Transfer Details",
      paymentTransferData
    );
  } catch (err) {
    next(err);
  }
};

const getAllPaymentTransfers = async (req, res, next) => {
  try {
    const term = req.query.search;
    return await getPagination({
      req,
      res,
      model: PaymentTransferModel,
      findOptions: {
        name: { $regex: term, $options: "i" },
      },
    });
  } catch (err) {
    next(err);
  }
};

const getOrganisationPaymentTransfers = async (req, res, next) => {
  try {
    const organisation_id = req.query.organisationId;
    const organisation_sports_category_id = req.query.sportsCategoryId;
    const goal_id = req.query.goalId;
    const findOptions = {
      organisation_id,
    };
    if (organisation_sports_category_id) {
      findOptions.organisation_sports_category_id = organisation_sports_category_id;
    }
    if (goal_id) {
      findOptions.goal_id = goal_id;
    }

    const order = req.query.order ? req.query.order : "desc";
    const sortBy = req.query.sortBy ? req.query.sortBy : "_id";
    const page = req.query.page > 0 ? req.query.page : 1;
    const perPage = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const total = await PaymentTransferModel.count(findOptions).exec();
    PaymentTransferModel.find(findOptions)
      .limit(perPage)
      .skip(perPage * (+page - 1))
      .sort([[sortBy, order]])
      .populate({
        path: "organisation_sports_category_id",
        select: ["sports_category_name"],
      })
      .populate({
        path: "goal_id",
        select: ["title"],
      })
      .exec((err, data) => {
        if (err) {
          return apiResponse.ErrorResponse(
            res,
            "Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.",
            "System went wrong, Kindly try again later"
          );
        }
        return apiResponse.successResponseWithPagination(
          res,
          page,
          total,
          perPage,
          data
        );
      });
  } catch (err) {
    next(err);
  }
};

const getUserPaymentTransfers = async (req, res, next) => {
  try {
    const user_id = req.query.userId;
    const organisation_sports_category_id = req.query.sportsCategoryId;
    const goal_id = req.query.goalId;
    const findOptions = {
      user_id,
    };
    if (organisation_sports_category_id) {
      findOptions.organisation_sports_category_id = organisation_sports_category_id;
    }
    if (goal_id) {
      findOptions.goal_id = goal_id;
    }

    const order = req.query.order ? req.query.order : "desc";
    const sortBy = req.query.sortBy ? req.query.sortBy : "_id";
    const page = req.query.page > 0 ? req.query.page : 1;
    const perPage = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const total = await PaymentTransferModel.count(findOptions).exec();
    PaymentTransferModel.find(findOptions)
      .limit(perPage)
      .skip(perPage * (+page - 1))
      .sort([[sortBy, order]])
      .populate({
        path: "organisation_id",
        select: ["org_name", "org_id"],
      })
      .populate({
        path: "organisation_sports_category_id",
        select: ["sports_category_name"],
      })
      .populate({
        path: "goal_id",
        select: ["title"],
      })
      .exec((err, data) => {
        if (err) {
          return apiResponse.ErrorResponse(
            res,
            "Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.",
            "System went wrong, Kindly try again later"
          );
        }
        return apiResponse.successResponseWithPagination(
          res,
          page,
          total,
          perPage,
          data
        );
      });
  } catch (err) {
    next(err);
  }
};

const deletePaymentTransfer = async (req, res, next) => {
  try {
    await softDelete({
      req,
      res,
      Model: PaymentTransferModel,
      itemName: "PaymentTransfer",
    });
  } catch (err) {
    next(err);
  }
};

const updatePaymentTransfer = async (req, res, next) => {
  try {
    await updateItem({
      req,
      res,
      Model: PaymentTransferModel,
      itemName: "PaymentTransfer",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  updatePaymentTransfer,
  deletePaymentTransfer,
  getAllPaymentTransfers,
  getPaymentTransfer,
  createPaymentTransfer,
  getOrganisationPaymentTransfers,
  getUserPaymentTransfers,
};
