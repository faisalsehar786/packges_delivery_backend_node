const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
const {
  getPagination,
  softDelete,
  createItem,
  updateItem,
} = require("../../../helpers/commonApis");
const { SORT_ORDER } = require("../../../utils/constants");
const GoalModel = require("../models/goal.model");
const GoalSupportModel = require("../models/goalSupport.model");
const PaymentTransferModel = require("../models/paymentTransfer.model");
const apiResponse = require("../../../helpers/apiResponse");

const createGoal = async (req, res, next) => {
  try {
    req.body.image = req?.file?.location || "";
    req.body.due_date = req?.body?.due_date || new Date("3024-01-01");
    if (
      req.body.organisation_id.toString() !==
      req?.user?.organisation_id.toString()
    ) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, du har ikke tilgang til å opprette mål for denne organisasjonen.",
        "Validation Error",
        "Invalid Data"
      );
    }
    req.body.organisation_id = req?.user?.organisation_id;
    await createItem({
      req,
      res,
      Model: GoalModel,
      itemName: "Goal",
    });
  } catch (err) {
    next(err);
  }
};

const getGoal = async (req, res, next) => {
  try {
    const goalId = req.params.id;
    if (!goalId) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    if (!mongoose.Types.ObjectId.isValid(goalId)) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }

    const aggregateCondition = [
      {
        $match: {
          _id: new ObjectId(goalId),
          organisation_id: new ObjectId(req.user.organisation_id),
        },
      },
      {
        $lookup: {
          from: "paymenttransfers",
          localField: "_id",
          foreignField: "goal_id",
          as: "payment_list",
        },
      },
      {
        $lookup: {
          from: "goalsupports",
          localField: "_id",
          foreignField: "goal_id",
          as: "goal_support_list",
        },
      },
      {
        $lookup: {
          from: "organisations",
          localField: "organisation_id",
          foreignField: "_id",
          as: "organisation_details",
        },
      },
      {
        $lookup: {
          from: "organisationsports",
          localField: "organisation_sports_category_id",
          foreignField: "_id",
          as: "organisation_sport",
        },
      },
      {
        $addFields: {
          support_total_amount: {
            $sum: "$payment_list.amount",
          },
          total_supporter_player: {
            $size: "$goal_support_list",
          },
          organisation_sport_name: {
            $first: "$organisation_sport.sports_category_name",
          },
          org_name: {
            $first: "$organisation_details.org_name",
          },
          org_logo: {
            $first: "$organisation_details.logo",
          },
        },
      },
      {
        $project: {
          payment_list: 0,
          goal_support_list: 0,
          __v: 0,
          deleted: 0,
          organisation_sport: 0,
          organisation_details: 0,
        },
      },
    ];
    const data = await GoalModel.aggregate(aggregateCondition);
    if (data.length) {
      return apiResponse.successResponseWithData(
        res,
        "måldetaljene ble hentet",
        "goal details fetched successfully",
        data[0]
      );
    }

    return apiResponse.notFoundResponse(res, "Beklager, vi finner ikke dataen du ser etter.", "Not found!");
  } catch (err) {
    next(err);
  }
};

const getGoalAdmin = async (req, res, next) => {
  try {
    const goalId = req.params.id;
    if (!goalId) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    if (!mongoose.Types.ObjectId.isValid(goalId)) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }

    const aggregateCondition = [
      {
        $match: {
          _id: new ObjectId(goalId),
        },
      },
      {
        $lookup: {
          from: "paymenttransfers",
          localField: "_id",
          foreignField: "goal_id",
          as: "payment_list",
        },
      },
      {
        $lookup: {
          from: "goalsupports",
          localField: "_id",
          foreignField: "goal_id",
          as: "goal_support_list",
        },
      },
      {
        $lookup: {
          from: "organisations",
          localField: "organisation_id",
          foreignField: "_id",
          as: "organisation_details",
        },
      },
      {
        $lookup: {
          from: "organisationsports",
          localField: "organisation_sports_category_id",
          foreignField: "_id",
          as: "organisation_sport",
        },
      },
      {
        $addFields: {
          support_total_amount: {
            $sum: "$payment_list.amount",
          },
          total_supporter_player: {
            $size: "$goal_support_list",
          },
          organisation_sport_name: {
            $first: "$organisation_sport.sports_category_name",
          },
          org_name: {
            $first: "$organisation_details.org_name",
          },
          org_logo: {
            $first: "$organisation_details.logo",
          },
        },
      },
      {
        $project: {
          payment_list: 0,
          goal_support_list: 0,
          __v: 0,
          deleted: 0,
          organisation_sport: 0,
          organisation_details: 0,
        },
      },
    ];
    const data = await GoalModel.aggregate(aggregateCondition);
    if (data.length) {
      return apiResponse.successResponseWithData(
        res,
        "måldetaljene ble hentet",
        "goal details fetched successfully",
        data[0]
      );
    }

    return apiResponse.notFoundResponse(
      res,
      "Beklager, vi finner ikke dataen du ser etter.",
      "Not found!"
    );
  } catch (err) {
    next(err);
  }
};

const getGoalApp = async (req, res, next) => {
  try {
    const goalId = req.params.id;
    if (!goalId) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    if (!mongoose.Types.ObjectId.isValid(goalId)) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }

    const aggregateCondition = [
      {
        $match: {
          _id: new ObjectId(goalId),
        },
      },
      {
        $lookup: {
          from: "paymenttransfers",
          localField: "_id",
          foreignField: "goal_id",
          as: "payment_list",
        },
      },
      {
        $lookup: {
          from: "goalsupports",
          localField: "_id",
          foreignField: "goal_id",
          as: "goal_support_list",
        },
      },
      {
        $lookup: {
          from: "organisations",
          localField: "organisation_id",
          foreignField: "_id",
          as: "organisation_details",
        },
      },
      {
        $lookup: {
          from: "organisationsports",
          localField: "organisation_sports_category_id",
          foreignField: "_id",
          as: "organisation_sport",
        },
      },
      {
        $addFields: {
          support_total_amount: {
            $sum: "$payment_list.amount",
          },
          total_supporter_player: {
            $size: "$goal_support_list",
          },
          organisation_sport_name: {
            $first: "$organisation_sport.sports_category_name",
          },
          org_name: {
            $first: "$organisation_details.org_name",
          },
          org_logo: {
            $first: "$organisation_details.logo",
          },
        },
      },
      {
        $project: {
          payment_list: 0,
          goal_support_list: 0,
          __v: 0,
          deleted: 0,
          organisation_sport: 0,
          organisation_details: 0,
        },
      },
    ];
    const data = await GoalModel.aggregate(aggregateCondition);
    if (data.length) {
      return apiResponse.successResponseWithData(
        res,
        "måldetaljene ble hentet",
        "goal details fetched successfully",
        data[0]
      );
    }

    return apiResponse.notFoundResponse(res, "Beklager, vi finner ikke dataen du ser etter.", "Not found!");
  } catch (err) {
    next(err);
  }
};

const getGoals = async (req, res, next) => {
  try {
    const term = req.query.search;
    return await getPagination({
      req,
      res,
      model: GoalModel,
      findOptions: {
        name: { $regex: term, $options: "i" },
      },
    });
  } catch (err) {
    next(err);
  }
};

const searchGoals = async (req, res, next) => {
  try {
    const term = req.query.search || "";
    const page = req.query.page > 0 ? parseInt(req.query.page, 10) : 1;
    const perPage = req.query.limit ? parseInt(req.query.limit, 10) : 10;

    const findOptions = {
      title: { $regex: term, $options: "i" },
    };

    const aggregateCondition = [
      {
        $match: findOptions,
      },
      {
        $lookup: {
          from: "organisations",
          localField: "organisation_id",
          foreignField: "_id",
          as: "organisation_details",
        },
      },
      {
        $lookup: {
          from: "organisationsports",
          localField: "organisation_sports_category_id",
          foreignField: "_id",
          as: "organisation_sports_details",
        },
      },
      {
        $unwind: {
          path: "$organisation_details",
        },
      },
      {
        $unwind: {
          path: "$organisation_sports_details",
        },
      },
    ];

    const totalResult = await GoalModel.find(findOptions);

    const total = totalResult.length;
    const data = await GoalModel.aggregate([
      ...aggregateCondition,
      {
        $skip: perPage * (page - 1),
      },
      {
        $limit: perPage,
      },
    ]);

    return apiResponse.successResponseWithPagination(
      res,
      page,
      total,
      perPage,
      data
    );
  } catch (err) {
    next(err);
  }
};

const monthlyStats = async (req, res, next) => {
  try {
    const id = req.params.id || "";
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    const aggregateCondition = [
      {
        $match: {
          goal_id: new ObjectId(id),
          user_id: new ObjectId(req.user.id),
        },
      },
      {
        $group: {
          _id: {
            year: {
              $year: "$created_at",
            },
            month: {
              $month: "$created_at",
            },
          },
          data: {
            $push: "$$ROOT",
          },
          total: {
            $sum: "$amount",
          },
        },
      },
      {
        $project: {
          year: "$_id.year",
          month: "$_id.month",
          date: {
            $concat: [
              {
                $toString: "$_id.year",
              },
              "-",
              {
                $toString: "$_id.month",
              },
            ],
          },
          total: 1,
          _id: 0,
        },
      },
      {
        $sort: {
          date: -1,
        },
      },
      {
        $limit: 6,
      },
    ];
    let data = await PaymentTransferModel.aggregate(aggregateCondition);
    data = data.reverse();
    return apiResponse.successResponseWithData(
      res,
      "måldetaljene ble hentet",
      "goal details fetched successfully",
      data
    );
  } catch (err) {
    next(err);
  }
};

const getOrganisationSportGoals = async (req, res, next) => {
  try {
    const organisation_id = req.query.organisationId;
    const sport_id = req.query.sportId;
    if (!organisation_id) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    // if (!sport_id) {
    //   return apiResponse.validationErrorWithData(
    //     res,
    //     "Valideringsfeil",
    //     "Validation Error",
    //     "Invalid Data"
    //   );
    // }
    if (!mongoose.Types.ObjectId.isValid(organisation_id)) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    // if (!mongoose.Types.ObjectId.isValid(sport_id)) {
    //   return apiResponse.validationErrorWithData(
    //     res,
    //     "Valideringsfeil",
    //     "Validation Error",
    //     "Invalid Data"
    //   );
    // }
    if (organisation_id !== req.user.organisation_id.toString()) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, du har ikke tilgang til å opprette mål for denne organisasjonen.",
        "Validation Error",
        "Invalid Data"
      );
    }
    let paramss = {};
    if (!sport_id) {
      paramss = {
        organisation_id: new ObjectId(organisation_id),
      };
    } else {
      // eslint-disable-next-line no-unused-vars
      paramss = {
        organisation_id: new ObjectId(organisation_id),
        organisation_sports_category_id: new ObjectId(sport_id),
      };
    }
    const page = req.query.page > 0 ? parseInt(req.query.page, 10) : 1;
    const perPage = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const aggregateCondition = [
      {
        $match: paramss,
      },
      {
        $lookup: {
          from: "paymenttransfers",
          localField: "_id",
          foreignField: "goal_id",
          as: "payment_list",
        },
      },
      {
        $lookup: {
          from: "goalsupports",
          localField: "_id",
          foreignField: "goal_id",
          as: "goal_support_list",
        },
      },
      {
        $addFields: {
          support_total_amount: {
            $sum: "$payment_list.amount",
          },
          total_supporter_player: {
            $size: {
              $reduce: {
                input: "$goal_support_list",
                initialValue: [],
                in: {
                  $setUnion: ["$$value", ["$$this.user_id"]],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          payment_list: 0,
          goal_support_list: 0,
          __v: 0,
          deleted: 0,
        },
      },
    ];
    const totalResult = await GoalModel.aggregate(aggregateCondition);

    const total = totalResult.length;
    const data = await GoalModel.aggregate([
      ...aggregateCondition,
      { $sort: { created_at: -1 } },
      // {
      //   $skip: perPage * (page - 1),
      // },
      // {
      //   $limit: perPage,
      // },
    ]);

    return apiResponse.successResponseWithPagination(
      res,
      page,
      total,
      perPage,
      data
    );
  } catch (err) {
    next(err);
  }
};

const getOrganisationSportGoalsApp = async (req, res, next) => {
  try {
    const organisation_id = req.query.organisationId;
    const sport_id = req.query.sportId;
    if (!organisation_id) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    if (!sport_id) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    if (!mongoose.Types.ObjectId.isValid(organisation_id)) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    if (!mongoose.Types.ObjectId.isValid(sport_id)) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    const page = req.query.page > 0 ? parseInt(req.query.page, 10) : 1;
    const perPage = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const aggregateCondition = [
      {
        $match: {
          organisation_id: new ObjectId(organisation_id),
          organisation_sports_category_id: new ObjectId(sport_id),
        },
      },
      {
        $lookup: {
          from: "paymenttransfers",
          localField: "_id",
          foreignField: "goal_id",
          as: "payment_list",
        },
      },
      {
        $lookup: {
          from: "goalsupports",
          localField: "_id",
          foreignField: "goal_id",
          as: "goal_support_list",
        },
      },
      {
        $addFields: {
          support_total_amount: {
            $sum: "$payment_list.amount",
          },
          total_supporter_player: {
            $size: {
              $reduce: {
                input: "$goal_support_list",
                initialValue: [],
                in: {
                  $setUnion: ["$$value", ["$$this.user_id"]],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          payment_list: 0,
          goal_support_list: 0,
          __v: 0,
          deleted: 0,
        },
      },
    ];
    const totalResult = await GoalModel.aggregate(aggregateCondition);

    const total = totalResult.length;
    const data = await GoalModel.aggregate([
      ...aggregateCondition,
      { $sort: { created_at: -1 } },
      {
        $skip: perPage * (page - 1),
      },
      {
        $limit: perPage,
      },
    ]);

    return apiResponse.successResponseWithPagination(
      res,
      page,
      total,
      perPage,
      data
    );
  } catch (err) {
    next(err);
  }
};

const getOrganisationSportGoalsByUser = async (req, res, next) => {
  try {
    const organisation_id = req.query.organisationId;
    const sport_id = req.query.sportId;
    if (!organisation_id) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    if (!sport_id) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    if (!mongoose.Types.ObjectId.isValid(organisation_id)) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    if (!mongoose.Types.ObjectId.isValid(sport_id)) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    const page = req.query.page > 0 ? parseInt(req.query.page, 10) : 1;
    const perPage = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const aggregateCondition = [
      {
        $match: {
          organisation_id: new ObjectId(organisation_id),
          organisation_sports_category_id: new ObjectId(sport_id),
        },
      },
      {
        $lookup: {
          from: "paymenttransfers",
          localField: "_id",
          foreignField: "goal_id",
          as: "payment_list",
        },
      },
      {
        $lookup: {
          from: "organisations",
          localField: "organisation_id",
          foreignField: "_id",
          as: "organisation_details",
        },
      },
      {
        $lookup: {
          from: "organisationsports",
          localField: "organisation_sports_category_id",
          foreignField: "_id",
          as: "organisation_sports",
        },
      },
      {
        $lookup: {
          from: "goalsupports",
          localField: "_id",
          foreignField: "goal_id",
          as: "goal_support_list",
        },
      },
      {
        $addFields: {
          support_total_amount: {
            $sum: "$payment_list.amount",
          },
          org_logo: {
            $first: "$organisation_details.logo",
          },
          org_name: {
            $first: "$organisation_details.org_name",
          },
          organisation_sport_name: {
            $first: "$organisation_sports.sports_category_name",
          },
          goal_support_status: {
            $first: "$goal_support_list.status",
          },
          total_supporter_player: {
            $size: {
              $reduce: {
                input: "$goal_support_list",
                initialValue: [],
                in: {
                  $setUnion: ["$$value", ["$$this.user_id"]],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          payment_list: 0,
          goal_support_list: 0,
          __v: 0,
          deleted: 0,
          organisation_details: 0,
          organisation_sports: 0,
        },
      },
    ];
    const totalResult = await GoalModel.find({
      organisation_id: new ObjectId(organisation_id),
      organisation_sports_category_id: new ObjectId(sport_id),
    });

    const total = totalResult.length;
    const data = await GoalModel.aggregate([
      ...aggregateCondition,
      {
        $skip: perPage * (page - 1),
      },
      {
        $limit: perPage,
      },
    ]);

    const userGoalSupport = await GoalSupportModel.find({
      user_id: new ObjectId(req.user.id),
    });

    const goalData = data.map((item) => {
      const isSupport = userGoalSupport.find(
        (goal) =>
          goal.goal_id.toString() === item._id.toString() &&
          goal.status === "active"
      );
      // eslint-disable-next-line no-param-reassign
      item.is_support = !!isSupport;
      return item;
    });

    return apiResponse.successResponseWithPagination(
      res,
      page,
      total,
      perPage,
      data
    );
  } catch (err) {
    console.log(err)
    next(err);
  }
};

const getOrganisationAllGoals = async (req, res, next) => {
  try {
    const { organisationId } = req.query;
    if (!organisationId) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    if (!mongoose.Types.ObjectId.isValid(organisationId)) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    const page = req.query.page > 0 ? parseInt(req.query.page, 10) : 1;
    const perPage = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const aggregateCondition = [
      {
        $match: {
          organisation_id: new ObjectId(organisationId),
        },
      },
      {
        $sort: {
          created_at: -1,
        },
      },
      {
        $lookup: {
          from: "paymenttransfers",
          localField: "_id",
          foreignField: "goal_id",
          as: "payment_list",
        },
      },
      {
        $lookup: {
          from: "goalsupports",
          localField: "_id",
          foreignField: "goal_id",
          as: "goal_support_list",
        },
      },
      {
        $lookup: {
          from: "organisationsports",
          localField: "organisation_sports_category_id",
          foreignField: "_id",
          as: "organisation_sport_details",
        },
      },
      {
        $addFields: {
          organisation_sport_name: {
            $first: "$organisation_sport_details.sports_category_name",
          },
          support_total_amount: {
            $sum: "$payment_list.amount",
          },
          total_supporter_player: {
            $size: "$goal_support_list",
          },
        },
      },
      {
        $project: {
          payment_list: 0,
          goal_support_list: 0,
          __v: 0,
          deleted: 0,
          organisation_sport_details: 0,
        },
      },
    ];
    const totalResult = await GoalModel.aggregate(aggregateCondition);

    const total = totalResult.length;
    const data = await GoalModel.aggregate([
      ...aggregateCondition,
      {
        $skip: perPage * (page - 1),
      },
      {
        $limit: perPage,
      },
    ]);

    return apiResponse.successResponseWithPagination(
      res,
      page,
      total,
      perPage,
      data
    );
  } catch (err) {
    next(err);
  }
};

const getAllGoals = async (req, res, next) => {
  try {
    const page = req.query.page > 0 ? parseInt(req.query.page, 10) : 1;
    const perPage = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const sortKey = req.query.sortKey || "created_at";
    const sortOrder = SORT_ORDER[req.query.sortOrder] || -1; // -1 for descending and 1 for ascending

    const aggregateCondition = [
      {
        $lookup: {
          from: "paymenttransfers",
          localField: "_id",
          foreignField: "goal_id",
          as: "payment_list",
        },
      },
      {
        $lookup: {
          from: "organisations",
          localField: "organisation_id",
          foreignField: "_id",
          as: "organisation_details",
        },
      },
      {
        $unwind: {
          path: "$organisation_details",
        },
      },
      {
        $lookup: {
          from: "organisationsports",
          localField: "organisation_sports_category_id",
          foreignField: "_id",
          as: "organisation_sport_details",
        },
      },
      {
        $unwind: {
          path: "$organisation_sport_details",
        },
      },
      {
        $lookup: {
          from: "goalsupports",
          localField: "_id",
          foreignField: "goal_id",
          as: "goal_support_list",
        },
      },
      {
        $addFields: {
          support_total_amount: {
            $sum: "$payment_list.amount",
          },
          total_supporter_player: {
            $size: "$goal_support_list",
          },
          organisation_name: "$organisation_details.org_name",
          organisation_org_no: "$organisation_details.org_id",
          organisation_logo: "$organisation_details.logo",
          organisation_logo_base64: "$organisation_details.org_logo_base64",
          organisation_sport_name:
            "$organisation_sport_details.sports_category_name",
        },
      },
      {
        $project: {
          payment_list: 0,
          goal_support_list: 0,
          __v: 0,
          deleted: 0,
          organisation_details: 0,
          organisation_sport_details: 0,
        },
      },
    ];
    const totalResult = await GoalModel.aggregate(aggregateCondition);

    const total = totalResult.length;
    const data = await GoalModel.aggregate([
      ...aggregateCondition,
      {
        $sort: {
          [sortKey]: sortOrder,
        },
      },
      {
        $skip: perPage * (page - 1),
      },
      {
        $limit: perPage,
      },
    ]);

    return apiResponse.successResponseWithPagination(
      res,
      page,
      total,
      perPage,
      data
    );
  } catch (err) {
    next(err);
  }
};

const deleteGoal = async (req, res, next) => {
  try {
    const GoalSupportData = await GoalSupportModel.find({
      goal_id: req.params.id,
    });
    const GoalData = await GoalModel.findOne({
      _id: req.params.id,
    });
    if (GoalSupportData && GoalSupportData?.length > 0) {
      return apiResponse.ErrorResponse(
        res,
        "Dette formålet mottar støtte fra støttespillere og kan ikke slettes. Du kan alternativt sette formålet på pause, eller kansellere det.",
        "Goal Support exist for this Goal, so kindly update goal status to completed or canceled"
      );
    }
    if (
      GoalData.organisation_id.toString() !==
      req.user.organisation_id.toString()
    ) {
      return apiResponse.ErrorResponse(
        res,
        "Du har ikke tillatelse til å slette dette målet",
        "You are not authorized to delete this Goal"
      );
    }
    await softDelete({
      req,
      res,
      Model: GoalModel,
      itemName: "Goal",
    });
  } catch (err) {
    next(err);
  }
};

const deleteGoalAdmin = async (req, res, next) => {
  try {
    const GoalSupportData = await GoalSupportModel.find({
      goal_id: req.params.id,
    });
    if (GoalSupportData && GoalSupportData?.length > 0) {
      return apiResponse.ErrorResponse(
        res,
        "Målstøtte finnes for dette målet, så vennligst oppdater målstatusen til fullført eller kansellert",
        "Goal Support exist for this Goal, so kindly update goal status to completed or canceled"
      );
    }
    await softDelete({
      req,
      res,
      Model: GoalModel,
      itemName: "Goal",
    });
  } catch (err) {
    next(err);
  }
};

const updateGoal = async (req, res, next) => {
  try {
    const GoalData = await GoalModel.findOne({
      _id: req.params.id,
    });
    if (!GoalData) {
      return apiResponse.ErrorResponse(
        res,
        "Målet finnes ikke",
        "Goal does not exist"
      );
    }
    if (
      GoalData.organisation_id.toString() !==
      req.user.organisation_id.toString()
    ) {
      return apiResponse.ErrorResponse(
        res,
        "Du har ikke tillatelse til å oppdatere dette målet",
        "You are not authorized to update this Goal"
      );
    }
    if (req?.file?.location) {
      req.body.image = req?.file?.location;
    }
    if (req?.body?.status) {
      await GoalSupportModel.update(
        { goal_id: req.params.id },
        { status: req?.body?.status }
      );
    }
    // if (
    //   req.user.organisation_id &&
    //   req.body?.organisation_id !== req.user.organisation_id
    // ) {
    //   return apiResponse.ErrorResponse(
    //     res,
    //     "Du har ikke tillatelse til å oppdatere dette målet",
    //     "You are not authorized to update this Goal"
    //   );
    // }
    await updateItem({
      req,
      res,
      Model: GoalModel,
      itemName: "Goal",
    });
  } catch (err) {
    next(err);
  }
};
const updateGoalAdmin = async (req, res, next) => {
  try {
    if (req?.file?.location) {
      req.body.image = req?.file?.location;
    }
    if (req?.body?.status) {
      await GoalSupportModel.update(
        { goal_id: req.params.id },
        { status: req?.body?.status }
      );
    }
    await updateItem({
      req,
      res,
      Model: GoalModel,
      itemName: "Goal",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  updateGoal,
  deleteGoal,
  getGoals,
  searchGoals,
  getGoal,
  createGoal,
  getGoalApp,
  getOrganisationSportGoals,
  getOrganisationSportGoalsByUser,
  getOrganisationAllGoals,
  getAllGoals,
  monthlyStats,
  getOrganisationSportGoalsApp,
  getGoalAdmin,
  deleteGoalAdmin,
  updateGoalAdmin,
};
