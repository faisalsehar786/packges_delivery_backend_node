const mongoose = require("mongoose");
const { validationResult } = require("express-validator");
const { ObjectId } = require("mongodb");
const notification = require("../models/notification.model");
const apiResponse = require("../../../helpers/apiResponse");
const goalSupport = require("../models/goalSupport.model");
const {
  softDelete,
  totalItems,
  updateItem,
  getFilterOptions,
} = require("../../../helpers/commonApis");

const createnotification = async (req, res, next) => {
  try {
    const loged_User = req.user._id;
    const { sender_id, receiver_id, item_id, title, type, body, read } =
      req.body;

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }

    const SaveObject = {
      sender_id,
      receiver_id,
      item_id,
      title,
      type,
      body,
      read,
    };

    SaveObject.user_id = loged_User;
    const createdItem = new notification(SaveObject);

    createdItem.save(async (err) => {
      if (err) {
        return apiResponse.ErrorResponse(res, err);
      }
      return apiResponse.successResponseWithData(
        res,
        "varsling Oppretting vellykket.",
        "notification  Created Successfully",
        createdItem
      );
    });
  } catch (err) {
    next(err);
  }
};

const updatenotification = async (req, res, next) => {
  try {
    await updateItem({
      req,
      res,
      Model: notification,
      itemName: "notification",
    });
  } catch (err) {
    next(err);
  }
};

const getnotification = async (req, res, next) => {
  try {
    const fetchId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(fetchId)) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    const item = await notification
      .findById(fetchId)
      .populate("user_id")
      .populate("sender_id")
      .populate("receiver_id");

    if (!item) {
      return apiResponse.ErrorResponse(
        res,
        "Beklager, vi finner ikke dataen du ser etter.",
        "Not found!"
      );
    }

    return apiResponse.successResponseWithData(
      res,
      "Operasjonssuksess",
      "Operation success",
      item
    );
  } catch (err) {
    next(err);
  }
};

const getnotifications = async (req, res, next) => {
  try {
    const order = req.query.order ? req.query.order : "desc";
    const sortBy = req.query.sortBy ? req.query.sortBy : "_id";
    const page = req.query.page > 0 ? req.query.page : 1;
    const perPage = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const term = req.query.search;

    if (term) {
      let queryParams = {
        $and: [
          {
            user_id: req.user._id,
          },
        ],
        $or: [{ title: { $regex: term, $options: "i" } }],
      };
      const total = await notification.count(queryParams).exec();
      const findParams = {
        $and: [
          {
            user_id: req.user._id,
          },
        ],
        $or: [{ title: { $regex: term, $options: "i" } }],
      };
      notification
        .find(findParams)
        .populate("user_id")
        .populate("sender_id")
        .populate("receiver_id")
        .limit(perPage)
        .skip(perPage * (+page - 1))
        .sort([[sortBy, order]])
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
    } else {
      const prms5 = {
        $and: [
          {
            user_id: req.user._id,
          },
        ],
      };
      const total = await notification.count(prms5).exec();
      const prms6 = {
        $and: [
          {
            user_id: req.user._id,
          },
        ],
      };
      notification
        .find(prms6)
        .populate("user_id")
        .populate("sender_id")
        .populate("receiver_id")
        .limit(perPage)
        .skip(perPage * (+page - 1))
        .sort([[sortBy, order]])
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
    }
  } catch (err) {
    next(err);
  }
};

const getnotificationSender = async (req, res, next) => {
  try {
    const order = req.query.order ? req.query.order : "desc";
    const type = req.query.type ? req.query.type : "goal_support";
    const read = req.query.read ? req.query.read : false;
    const senderId = req.query.sender_id;
    const sortBy = req.query.sortBy ? req.query.sortBy : "_id";
    const page = req.query.page > 0 ? req.query.page : 1;
    const perPage = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const term = req.query.search;

    if (type && read) {
      const queryParams = {
        $and: [
          {
            sender_id: senderId,
          },
          {
            type: type,
          },
          {
            read: read,
          },
        ],
      };
      const total = await notification.count(queryParams).exec();
      const queryParamss = {
        $and: [
          {
            sender_id: senderId,
          },
          {
            type: type,
          },
          {
            read: read,
          },
        ],
      };
      notification
        .find(queryParamss)
        .populate("user_id")
        .populate("sender_id")
        .populate("receiver_id")
        .limit(perPage)
        .skip(perPage * (+page - 1))
        .sort([[sortBy, order]])
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
    } else {
      const queryParamsss = {
        $and: [
          {
            sender_id: senderId,
          },
        ],
      };
      const total = await notification.count(queryParamsss).exec();
      const queryParamssss = {
        $and: [
          {
            sender_id: senderId,
          },
        ],
      };
      notification
        .find(queryParamssss)
        .populate("user_id")
        .populate("sender_id")
        .populate("receiver_id")
        .limit(perPage)
        .skip(perPage * (+page - 1))
        .sort([[sortBy, order]])
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
    }
  } catch (err) {
    next(err);
  }
};

const getnotificationReceiver = async (req, res, next) => {
  try {
    const order = req.query.order ? req.query.order : "desc";
    const type = req.query.type ? req.query.type : "goal_support";
    const read = req.query.read ? req.query.read : false;
    const receiver_id = req.query.receiver_id;
    const sortBy = req.query.sortBy ? req.query.sortBy : "_id";
    const page = req.query.page > 0 ? req.query.page : 1;
    const perPage = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const term = req.query.search;
    const filter = await getFilterOptions(req);
    const getRefineData = (rcdata) => {
      let count = rcdata?.data.length;
      let counter = 0;
      let pushData = [];

      // if (count > 0) {
      const retData = rcdata?.data?.map(async (collectData) => {
        if (collectData?.type === "goal_support") {
          const prms7 = { _id: collectData?.item_id };
          const data2 = await goalSupport.findOne(prms7).populate("meeting_id");
          if (data2) {
            collectData.item_id = JSON.stringify(data2);
            counter++;
          } else {
            counter++;
          }
        }

        pushData.push(collectData);
      });
      Promise.all(retData).then(() => {
        apiResponse.successResponseWithPagination(
          res,
          rcdata?.pagination?.page || 1,
          rcdata?.pagination?.total || 0,
          perPage || 10,
          pushData
        );
      });
    };

    if (read) {
      const prms1 = {
        $and: [
          {
            receiver_id: receiver_id,
          },

          {
            read: read,
          },
        ],
        ...filter,
      };
      const total = await notification.count(prms1).exec();
      let prms2 = {
        $and: [
          {
            receiver_id: receiver_id,
          },

          {
            read: read,
          },
        ],
        ...filter,
      };
      notification
        .find(prms2)
        .populate("user_id")
        .populate("sender_id")
        .populate("receiver_id")
        .limit(perPage)
        .skip(perPage * (+page - 1))
        .sort([[sortBy, order]])
        .exec((err, data) => {
          const rcData = getRefineData({
            pagination: {
              page: +page,
              pages: Math.ceil(total / perPage),
              total: data.length,
              totalRecords: total,
              pageSize: perPage,
            },
            data,
          });
        });
    } else {
      let prms3 = {
        $and: [
          {
            receiver_id: receiver_id,
          },
        ],
        ...filter,
      };
      const total = await notification.count(prms3).exec();
      let prms4 = {
        $and: [
          {
            receiver_id,
          },
        ],
        ...filter,
      };
      notification
        .find(prms4)
        .populate("user_id")
        .populate("sender_id")
        .populate("receiver_id")
        .limit(perPage)
        .skip(perPage * (+page - 1))
        .sort([[sortBy, order]])
        .exec((err, data) => {
          const rcData = getRefineData({
            pagination: {
              page: +page,
              pages: Math.ceil(total / perPage),
              total: data.length,
              totalRecords: total,
              pageSize: perPage,
            },
            data,
          });
        });
    }
  } catch (err) {
    next(err);
  }
};

const deletenotification = async (req, res, next) => {
  try {
    await softDelete({
      req,
      res,
      Model: notification,
      itemName: "notification ",
    });
  } catch (err) {
    next(err);
  }
};

const totalnotification = async (req, res, next) => {
  try {
    await totalItems({
      req,
      res,
      Model: notification,
      itemName: "notification ",
    });
  } catch (err) {
    next(err);
  }
};

const getOneSignalNotification = async (req, res, next) => {
  try {
    const fetchId = req.user.id;
    // if (!mongoose.Types.ObjectId.isValid(fetchId)) {
    //   return apiResponse.validationErrorWithData(
    //     res,
    //     "Beklager, det oppstod en valideringsfeil.",
    //     "Validation Error",
    //     "Invalid Data"
    //   );
    // }
    const findParams = { user_id: new ObjectId(fetchId), type: "consent" };
    const item = await notification
      .find(findParams)
      .populate("user_id")
      .populate("sender_id")
      .populate("receiver_id");

    if (!item) {
      return apiResponse.ErrorResponse(
        res,
        "Beklager, vi finner ikke dataen du ser etter.",
        "Not found!"
      );
    }

    return apiResponse.successResponseWithData(
      res,
      "Operasjonssuksess",
      "Operation success",
      item
    );
  } catch (err) {
    next(err);
  }
};

const notificationMarkAsRead = async (req, res, next) => {
  try {
    const fetchId = req.user.id;
    // if (!mongoose.Types.ObjectId.isValid(fetchId)) {
    //   return apiResponse.validationErrorWithData(
    //     res,
    //     "Beklager, det oppstod en valideringsfeil.",
    //     "Validation Error",
    //     "Invalid Data"
    //   );
    // }
    await notification.updateMany(
      { _id: new ObjectId(fetchId) },
      {
        $set: { read: true },
      }
    );

    return apiResponse.successResponseWithData(
      res,
      "Operasjonssuksess",
      "Operation success"
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createnotification,
  updatenotification,
  getnotification,
  getnotificationSender,
  getnotificationReceiver,
  deletenotification,
  getnotifications,
  totalnotification,
  getOneSignalNotification,
  notificationMarkAsRead,
};
