const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
const OrganisationModel = require("../models/organisation.model");
const GoalModel = require("../models/goal.model");
const GoalSupportModel = require("../models/goalSupport.model");
const OrganisationSportModel = require("../models/organisationSport.model");
const nifHelper = require("../../../helpers/nif.helper");
const vippsHelper = require("../../../helpers/vipps.helper");
const apiResponse = require("../../../helpers/apiResponse");
const tripleTax = require("../../../helpers/tripleTax.helper");
const { SORT_ORDER } = require("../../../utils/constants");
const {
  getPagination,
  getItem,
  softDelete,
  updateItem,
  createItem,
  totalItems,
} = require("../../../helpers/commonApis");

const createOrganisation = async (req, res, next) => {
  try {
    await createItem({
      req,
      res,
      Model: OrganisationModel,
      itemName: "Organisation",
    });
  } catch (err) {
    next(err);
  }
};

const getOrganisation = async (req, res, next) => {
  try {
    const organisationId = req.params.id;
    if (
      req.user?.organisation_id &&
      req.user.organisation_id.toString() !== organisationId
    ) {
      return apiResponse.unauthorizedResponse(
        res,
        "Du har ikke tilgang til denne organisasjonen.",
        "You are not authorized to access this organisation."
      );
    }
    return await getItem({ id: organisationId, Model: OrganisationModel, res });
  } catch (err) {
    next(err);
  }
};

const msnOrder = async (req, res, next) => {
  try {
    const organisationId = req.params.id;
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
    // You are not authorized to submit MSN order for this organisation
    if (req.user.organisation_id.toString() !== organisationId) {
      return apiResponse.unauthorizedResponse(
        res,
        "Du har ikke tilgang til å sende MSN-bestilling for denne organisasjonen.",
        "You are not authorized to submit MSN order for this organisation."
      );
    }
    const data = await OrganisationModel.findById(organisationId);
    if (!data) {
      return apiResponse.notFoundResponse(res, "Beklager, vi finner ikke dataen du ser etter.", "Not found!");
    }
    data.account_no = req.body.account_no;
    data.address = req.body.address;
    data.phone_no = req.body.phone_no;
    data.msn_status = "in-progress";
    await data.save();
    const msnPayload = await vippsHelper.createVippsMSN(
      data.org_name,
      data.org_id,
      data.account_no,
      data.organisation_number
    );
    const userInfoPayload = await tripleTax.createCustomer(data);
    if (userInfoPayload?.value) {
      await OrganisationModel.findByIdAndUpdate(
        data._id,
        { $set: { triple_tax_id: userInfoPayload?.value?.id } },
        { new: true }
      );
    }

    return apiResponse.successResponseWithData(
      res,
      "MSN-bestilling Oppretting vellykket.",
      "MSN order created successfully",
      {
        prefilled_order_id: msnPayload.prefilledOrderId,
        return_url: msnPayload.returnUrl,
      }
    );
  } catch (err) {
    next(err);
  }
};

const getAllGoalsAndStats = async (req, res, next) => {
  try {
    const organisationId = req.params.id;
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

    const aggregateConditionOrgStats = [
      {
        $match: {
          organisation_id: new ObjectId(organisationId),
        },
      },
      {
        $lookup: {
          from: "paymenttransfers",
          localField: "_id",
          foreignField: "organisation_sports_category_id",
          as: "payment_list",
        },
      },
      {
        $lookup: {
          from: "goalsupports",
          localField: "_id",
          foreignField: "organisation_sports_category_id",
          as: "goal_support_list",
        },
      },
      {
        $lookup: {
          from: "goals",
          localField: "_id",
          foreignField: "organisation_sports_category_id",
          as: "goal_list",
        },
      },
      {
        $addFields: {
          total_received_supports: {
            $sum: "$payment_list.amount",
          },
          published_goals: {
            $size: {
              $filter: {
                input: "$goal_list",
                as: "data",
                cond: {
                  $eq: ["$$data.deleted", false],
                },
              },
            },
          },
          published_goal_list: {
            $filter: {
              input: "$goal_list",
              as: "data",
              cond: {
                $eq: ["$$data.deleted", false],
              },
            },
          },
          active_goal_support_list: {
            $filter: {
              input: "$goal_support_list",
              as: "data",
              cond: {
                $eq: ["$$data.status", "active"],
              },
            },
          },
        },
      },
      {
        $addFields: {
          total_supporters: {
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
          total_active_supports: {
            $size: {
              $reduce: {
                input: "$active_goal_support_list",
                initialValue: [],
                in: {
                  $setUnion: ["$$value", ["$$this.user_id"]],
                },
              },
            },
          },
          active_goals: {
            $size: {
              $filter: {
                input: "$published_goal_list",
                as: "data",
                cond: {
                  $eq: ["$$data.status", "active"],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          published_goals: 1,
          active_goals: 1,
          total_supporters: 1,
          total_active_supports: 1,
          total_received_supports: 1,
          _id: 0,
        },
      },
      {
        $group: {
          _id: null,
          published_goals: {
            $sum: "$published_goals",
          },
          total_supporters: {
            $sum: "$total_supporters",
          },
          total_active_supports: {
            $sum: "$total_active_supports",
          },
          total_received_supports: {
            $sum: "$total_received_supports",
          },
          total_active_goals: {
            $sum: "$active_goals",
          },
        },
      },
    ];

    const aggregateConditionOrgGoalList = [
      {
        $match: {
          organisation_id: new ObjectId(organisationId),
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
          org_name: {
            $first: "$organisation_details.org_name",
          },
          org_logo: {
            $first: "$organisation_details.logo",
          },
          sports_category_name: {
            $first: "$organisation_sport.sports_category_name",
          },
        },
      },
      {
        $project: {
          payment_list: 0,
          goal_support_list: 0,
          organisation_details: 0,
          organisation_sport: 0,
          __v: 0,
          deleted: 0,
        },
      },
    ];
    const findParams = { user_id: new ObjectId(req.user.id) };
    // get organisation stats, details and goals - using promise to run all three queries in parallel
    Promise.all([
      OrganisationSportModel.aggregate(aggregateConditionOrgStats),
      OrganisationModel.findById(organisationId).select(
        "org_name organisation_number org_logo_base64 logo description org_id"
      ),
      GoalModel.aggregate(aggregateConditionOrgGoalList),
      GoalSupportModel.find(findParams),
    ])
      .then(
        ([
          organisationStats,
          OrganisationDetails,
          organisationGoals,
          userGoalSupport,
        ]) => {
          const goalData = organisationGoals.map((item) => {
            const isSupport = userGoalSupport.find(
              (goal) =>
                goal.goal_id.toString() === item._id.toString() &&
                goal.status === "active"
            );
            item.is_support = isSupport ? true : false;
            return item;
          });

          const responseData = {
            stats: {
              published_goals: organisationStats[0]?.published_goals || 0,
              total_active_goals: organisationStats[0]?.total_active_goals || 0,
              total_supporters: organisationStats[0]?.total_supporters || 0,
              total_active_supports:
                organisationStats[0]?.total_active_supports || 0,
              total_received_supports:
                organisationStats[0]?.total_received_supports || 0,
              net_received_supports:
                Number(
                  (
                    0.975 * organisationStats[0]?.total_received_supports
                  ).toFixed(0)
                ) || 0,
            },
            org_details: OrganisationDetails,
            goal_list: goalData,
          };
          return apiResponse.successResponseWithData(
            res,
            "statistikkData innhenting vellykket.",
            "stats data fetched successfully",
            responseData
          );
        }
      )
      .catch((err) => {
        console.log("Error: ", err);
      });
  } catch (err) {
    next(err);
  }
};

const getOrganisationByOrgNo = async (req, res, next) => {
  try {
    const orgNo = req.params.org_no;
    const data = await OrganisationModel.findOne({ org_id: orgNo });
    if (!data) {
      return apiResponse.notFoundResponse(res, "Beklager, vi finner ikke dataen du ser etter.", "Not found!");
    }
    return apiResponse.successResponseWithData(
      res,
      "OrganisasjonsData innhenting vellykket.",
      "Organisation Data Fetched Successfully",
      {
        org_name: data.org_name,
        org_no: data.organisation_number,
        address: data.address || "",
        email: data.email || "",
        phone_no: data?.phone_no || data?.mobile_phone || "",
      }
    );
  } catch (err) {
    next(err);
  }
};

const getTopTenOrganisations = async (req, res, next) => {
  try {
    const page = req.query.page > 0 ? parseInt(req.query.page, 10) : 1;
    const perPage = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const sortKey = req.query.sortKey || "total_support_amount";
    const sortOrder = SORT_ORDER[req.query.sortOrder] || -1; // -1 for descending and 1 for ascending

    const aggregateCondition = [];
    const aggregateConditionTable = [
      {
        $lookup: {
          from: "paymenttransfers",
          localField: "_id",
          foreignField: "organisation_id",
          as: "payment_list",
        },
      },
      {
        $addFields: {
          total_support_amount: {
            $sum: "$payment_list.amount",
          },
        },
      },
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
      {
        $lookup: {
          from: "goalsupports",
          localField: "_id",
          foreignField: "organisation_id",
          as: "goal_support_list",
        },
      },
      {
        $lookup: {
          from: "goals",
          localField: "_id",
          foreignField: "organisation_id",
          as: "goal_list",
        },
      },
      {
        $addFields: {
          non_delete_goal_list: {
            $filter: {
              input: "$goal_support_list",
              as: "data",
              cond: {
                $eq: ["$$data.deleted", false],
              },
            },
          },
          active_goal_support_list: {
            $filter: {
              input: "$goal_support_list",
              as: "data",
              cond: {
                $eq: ["$$data.status", "active"],
              },
            },
          },
        },
      },
      {
        $addFields: {
          active_goal_count: {
            $size: {
              $filter: {
                input: "$non_delete_goal_list",
                as: "data",
                cond: {
                  $eq: ["$$data.status", "active"],
                },
              },
            },
          },
          total_goal_count: {
            $size: "$non_delete_goal_list",
          },
          active_goal_support_count: {
            $size: "$active_goal_support_list",
          },
          active_goal_support_user_count: {
            $size: {
              $reduce: {
                input: "$active_goal_support_list",
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
          goal_list: 0,
          non_delete_goal_list: 0,
          active_goal_support_list: 0,
          __v: 0,
        },
      },
    ];
    if (req.query?.base64) {
      aggregateConditionTable.push({
        $project: {
          org_logo_base64: 0,
        },
      });
    }
    if (req.query?.activeOrg) {
      aggregateConditionTable.unshift({
        $match: {
          account_created: true,
        },
      });
      aggregateCondition.unshift({
        $match: {
          account_created: true,
        },
      });
    }

    const total = await OrganisationModel.countDocuments();
    // const total = totalResult.length;

    const data = await OrganisationModel.aggregate(aggregateConditionTable, {
      allowDiskUse: true,
    });

    if (!data) {
      return apiResponse.notFoundResponse(
        res,
        "Beklager, vi finner ikke dataen du ser etter.",
        "Not found!"
      );
    }

    return apiResponse.successResponseWithData(
      res,
      "Organisasjoner hentet med suksess",
      "Organisations Fetched Successfully",
      {
        pagination: {
          page: +page,
          pages: Math.ceil(total / perPage),
          total: data.length,
          totalRecords: total,
          pageSize: perPage,
        },
        data,
      }
    );
  } catch (err) {
    next(err);
  }
};

const getOrganisationSportsStats = async (req, res, next) => {
  try {
    const { organisationId } = req.query;
    const page = req.query.page > 0 ? parseInt(req.query.page, 10) : 1;
    const perPage = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    // You are not authorized to access this organisation sports
    if (req.user.organisation_id.toString() !== organisationId) {
      return apiResponse.unauthorizedResponse(
        res,
        "Du har ikke tilgang til denne organisasjonens sportsaktiviteter.",
        "You are not authorized to access this organisation sports."
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
    const aggregateCondition = [
      {
        $match: {
          organisation_id: new ObjectId(organisationId),
        },
      },
      {
        $lookup: {
          from: "paymenttransfers",
          localField: "_id",
          foreignField: "organisation_sports_category_id",
          as: "payment_list",
        },
      },
      {
        $lookup: {
          from: "goalsupports",
          localField: "_id",
          foreignField: "organisation_sports_category_id",
          as: "goal_support_list",
        },
      },
      {
        $lookup: {
          from: "goals",
          localField: "_id",
          foreignField: "organisation_sports_category_id",
          as: "goal_list",
        },
      },
      {
        $addFields: {
          support_total_amount: {
            $sum: "$payment_list.amount",
          },
          total_goal_support_count: {
            $size: "$goal_support_list",
          },
          active_goal_support_count: {
            $size: {
              $filter: {
                input: "$goal_support_list",
                as: "data",
                cond: {
                  $and: [
                    {
                      $eq: ["$$data.status", "active"],
                    },
                    {
                      $eq: ["$$data.deleted", false],
                    },
                  ],
                },
              },
            },
          },
          total_goal_count: {
            $size: "$goal_list",
          },
          active_goal_count: {
            $size: {
              $filter: {
                input: "$goal_list",
                as: "data",
                cond: {
                  $eq: ["$$data.deleted", false],
                },
              },
            },
          },
          active_goal_support_list: {
            $filter: {
              input: "$goal_support_list",
              as: "data",
              cond: {
                $and: [
                  {
                    $eq: ["$$data.status", "active"],
                  },
                  {
                    $eq: ["$$data.deleted", false],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          active_goal_support_user_count: {
            $size: {
              $reduce: {
                input: "$active_goal_support_list",
                initialValue: [],
                in: {
                  $setUnion: ["$$value", ["$$this.user_id"]],
                },
              },
            },
          },
          total_goal_support_user_count: {
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
          active_goal_support_list: 0,
          goal_list: 0,
          organisation_id: 0,
          description: 0,
          __v: 0,
          related_org_id: 0,
          parent_activity_id: 0,
          activity_code: 0,
          is_valid_for_reporting: 0,
          is_available_for_bedrift: 0,
          federation_name: 0,
          federation_org_id: 0,
          is_main_activity: 0,
          created_at: 0,
          updated_at: 0,
        },
      },
    ];
    const totalResult = await OrganisationSportModel.aggregate(
      aggregateCondition
    );
    const total = totalResult.length;
    const data = await OrganisationSportModel.aggregate([
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

const getOrganisationSports = async (req, res, next) => {
  try {
    const { organisationId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(organisationId)) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    if (req.user.organisation_id.toString() !== organisationId) {
      return apiResponse.unauthorizedResponse(
        res,
        "Du har ikke tilgang til denne organisasjonen.",
        "You are not authorized to access this organisation."
      );
    }
    const aggregateConditionOrgGoalList = [
      {
        $match: {
          organisation_id: new ObjectId(organisationId),
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
        $addFields: {
          logo: {
            $first: "$organisation_details.logo",
          },
        },
      },
      {
        $project: {
          organisation_details: 0,
          __v: 0,
          deleted: 0,
        },
      },
    ];
    const data = await OrganisationSportModel.aggregate(
      aggregateConditionOrgGoalList
    );
    if (!data) {
      return apiResponse.notFoundResponse(
        res,
        "Beklager, vi finner ikke dataen du ser etter.",
        "Not found!"
      );
    }
    return apiResponse.successResponseWithData(
      res,
      "Organisasjonsidretter hentet med suksess",
      "Organisation Sports Fetched Successfully",
      data
    );
  } catch (err) {
    next(err);
  }
};
const getOrganisationSportsApp = async (req, res, next) => {
  try {
    const { organisationId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(organisationId)) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    const aggregateConditionOrgGoalList = [
      {
        $match: {
          organisation_id: new ObjectId(organisationId),
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
        $addFields: {
          logo: {
            $first: "$organisation_details.logo",
          },
        },
      },
      {
        $project: {
          organisation_details: 0,
          __v: 0,
          deleted: 0,
        },
      },
    ];
    const data = await OrganisationSportModel.aggregate(
      aggregateConditionOrgGoalList
    );
    if (!data) {
      return apiResponse.notFoundResponse(
        res,
        "Beklager, vi finner ikke dataen du ser etter.",
        "Not found!"
      );
    }
    return apiResponse.successResponseWithData(
      res,
      "Organisasjonsidretter hentet med suksess",
      "Organisation Sports Fetched Successfully",
      data
    );
  } catch (err) {
    next(err);
  }
};

const getOrganisations = async (req, res, next) => {
  try {
    const term = req.query.search;
    return await getPagination({
      req,
      res,
      model: OrganisationModel,
      findOptions: {
        $or: [
          { firstName: { $regex: term, $options: "i" } },
          { lastName: { $regex: term, $options: "i" } },
        ],
      },
    });
  } catch (err) {
    next(err);
  }
};

const getOrganisationLeader = async (req, res, next) => {
  try {
    if (!req.params.org_id) {
      return apiResponse.ErrorResponse(
        res,
        "orgId er påkrevd",
        "orgId is required"
      );
    }
    const contactPersons = await nifHelper.getOrganisationContactPersons(
      req.params.org_id
    );
    if (!contactPersons) {
      return apiResponse.ErrorResponse(
        res,
        "Kan ikke få kontaktpersoner for gitt nif-organisasjon",
        "Unable to get contact persons for provided nif organisation"
      );
    }
    // 1 = Leder & 40000004 = Medlemsansvarlig
    const userDetails = contactPersons.find((contact) =>
      contact.functions.some((role) => [1].includes(role.functionTypeId))
    );
    if (!userDetails) {
      return apiResponse.notFoundResponse(
        res,
        "Beklager, vi finner ikke dataen du ser etter.",
        "Not found!"
      );
    }

    return apiResponse.successResponseWithData(
      res,
      "Lederbruker ble hentet",
      "Leader User Fetched Successfully",
      userDetails
    );
  } catch (err) {
    next(err);
  }
};

const getSystemSports = async (req, res, next) => {
  try {
    const item = await OrganisationSportModel.aggregate(
      [
        {
          $group: {
            _id: "$nif_sports_category_id",
            sports_category_name: {
              $first: "$sports_category_name",
            },
            federation_name: {
              $first: "$federation_name",
            },
          },
        },
      ],
      { allowDiskUse: true }
    );
    if (!item) {
      return apiResponse.notFoundResponse(
        res,
        "Beklager, vi finner ikke dataen du ser etter.",
        "Not found!"
      );
    }
    return apiResponse.successResponseWithData(
      res,
      `Sportskategori hentet - Antall: ${item.length}`,
      `Sport Category Fetched Successfully - Count: ${item.length}`,
      item
    );
  } catch (err) {
    next(err);
  }
};

const searchOrganisation = async (req, res, next) => {
  try {
    const term = req.query.search || "";
    const sports_id = req.query.sportsCategoryId;
    const findOptions = {
      org_name: { $regex: `^${term}`, $options: "i" },
    };
    if (sports_id) {
      findOptions["organisation_sport_list.nif_sports_category_id"] =
        +sports_id;
    }
    const page = req.query.page > 0 ? parseInt(req.query.page, 10) : 1;
    const perPage = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const aggregateCondition = [
      {
        $match: findOptions,
      },
    ];
    if (req.query?.base64) {
      aggregateCondition.push({
        $project: {
          org_logo_base64: 0,
        },
      });
    }
    const totalResult = await OrganisationModel.find(findOptions);
    const total = totalResult.length;
    const data = await OrganisationModel.aggregate([
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

const getOrganisationStats = async (req, res, next) => {
  try {
    const organisationId = req.params.id;
    if (req.user.organisation_id.toString() !== organisationId) {
      return apiResponse.unauthorizedResponse(
        res,
        "Du har ikke tilgang til denne organisasjonen",
        "You are not authorized to access this organisation"
      );
    }
    const aggregateCondition = [
      {
        $match: {
          organisation_id: new ObjectId(organisationId),
        },
      },
      {
        $lookup: {
          from: "paymenttransfers",
          localField: "_id",
          foreignField: "organisation_sports_category_id",
          as: "payment_list",
        },
      },
      {
        $lookup: {
          from: "goalsupports",
          localField: "_id",
          foreignField: "organisation_sports_category_id",
          as: "goal_support_list",
        },
      },
      {
        $lookup: {
          from: "goals",
          localField: "_id",
          foreignField: "organisation_sports_category_id",
          as: "goal_list",
        },
      },
      {
        $lookup: {
          from: "pendingpayments",
          localField: "_id",
          foreignField: "organisation_sports_category_id",
          as: "pending_payment_list",
        },
      },
      {
        $lookup: {
          from: "paymenttransfers",
          localField: "_id",
          foreignField: "organisation_sports_category_id",
          as: "charged_payment_list",
        },
      },
      {
        $addFields: {
          filter_pending_payment_list: {
            $filter: {
              input: "$pending_payment_list",
              as: "data",
              cond: {
                $eq: ["$$data.status", "pending"],
              },
            },
          },
          total_received_supports: {
            $sum: "$payment_list.amount",
          },
          published_goals: {
            $size: {
              $filter: {
                input: "$goal_list",
                as: "data",
                cond: {
                  $eq: ["$$data.deleted", false],
                },
              },
            },
          },
          published_goal_list: {
            $filter: {
              input: "$goal_list",
              as: "data",
              cond: {
                $eq: ["$$data.deleted", false],
              },
            },
          },
          active_goal_support_list: {
            $filter: {
              input: "$goal_support_list",
              as: "data",
              cond: {
                $and: [
                  {
                    $eq: ["$$data.status", "active"],
                  },
                  {
                    $eq: ["$$data.deleted", false],
                  },
                ],
              },
            },
          },
          charged_payment_amount: {
            $filter: {
              input: "$charged_payment_list",
              as: "data",
              cond: {
                $eq: ["$$data.status", "charged"],
              },
            },
          },
        },
      },
      {
        $addFields: {
          total_pending_supports: {
            $sum: "$filter_pending_payment_list.amount",
          },
          total_active_supports: {
            $size: "$active_goal_support_list",
          },
          total_charged_amount: {
            $sum: "$charged_payment_amount.amount",
          },
          total_supporters: {
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
          total_active_supporters: {
            $size: {
              $reduce: {
                input: "$active_goal_support_list",
                initialValue: [],
                in: {
                  $setUnion: ["$$value", ["$$this.user_id"]],
                },
              },
            },
          },
          active_goals: {
            $size: {
              $filter: {
                input: "$published_goal_list",
                as: "data",
                cond: {
                  $eq: ["$$data.status", "active"],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          published_goals: 1,
          active_goals: 1,
          total_active_supports: 1,
          total_supporters: 1,
          total_active_supporters: 1,
          total_received_supports: 1,
          total_pending_supports: 1,
          total_charged_amount: 1,
          _id: 0,
        },
      },
      {
        $group: {
          _id: null,
          published_goals: {
            $sum: "$published_goals",
          },
          total_supporters: {
            $sum: "$total_supporters",
          },
          total_active_supporters: {
            $sum: "$total_active_supporters",
          },
          total_active_supports: {
            $sum: "$total_active_supports",
          },
          total_received_supports: {
            $sum: "$total_received_supports",
          },
          total_pending_supports: {
            $sum: "$total_pending_supports",
          },
          total_active_goals: {
            $sum: "$active_goals",
          },
          total_charged_amount: {
            $sum: "$total_charged_amount",
          },
        },
      },
    ];
    const statsData = await OrganisationSportModel.aggregate(
      aggregateCondition
    );
    const responseData = {
      published_goals: statsData[0]?.published_goals || 0,
      total_active_goals: statsData[0]?.total_active_goals || 0,
      total_supporters: statsData[0]?.total_supporters || 0,
      total_active_supporters: statsData[0]?.total_active_supporters || 0,
      total_active_supports: statsData[0]?.total_active_supports || 0,
      total_received_supports: statsData[0]?.total_received_supports || 0,
      total_pending_supports: statsData[0]?.total_pending_supports || 0,
      total_charged_amount: statsData[0]?.total_charged_amount || 0,
      net_received_supports:
        Number((0.975 * statsData[0]?.total_received_supports).toFixed(0)) || 0,
    };
    return apiResponse.successResponseWithData(
      res,
      "Organisasjonsstatistikk ble hentet",
      "Organisation stats fetched successfully",
      responseData
    );
  } catch (err) {
    next(err);
  }
};
const getOrganisationStatsAdmin = async (req, res, next) => {
  try {
    const organisationId = req.params.id;
    const aggregateCondition = [
      {
        $match: {
          organisation_id: new ObjectId(organisationId),
        },
      },
      {
        $lookup: {
          from: "paymenttransfers",
          localField: "_id",
          foreignField: "organisation_sports_category_id",
          as: "payment_list",
        },
      },
      {
        $lookup: {
          from: "goalsupports",
          localField: "_id",
          foreignField: "organisation_sports_category_id",
          as: "goal_support_list",
        },
      },
      {
        $lookup: {
          from: "goals",
          localField: "_id",
          foreignField: "organisation_sports_category_id",
          as: "goal_list",
        },
      },
      {
        $lookup: {
          from: "pendingpayments",
          localField: "_id",
          foreignField: "organisation_sports_category_id",
          as: "pending_payment_list",
        },
      },
      {
        $lookup: {
          from: "paymenttransfers",
          localField: "_id",
          foreignField: "organisation_sports_category_id",
          as: "charged_payment_list",
        },
      },
      {
        $addFields: {
          filter_pending_payment_list: {
            $filter: {
              input: "$pending_payment_list",
              as: "data",
              cond: {
                $eq: ["$$data.status", "pending"],
              },
            },
          },
          total_received_supports: {
            $sum: "$payment_list.amount",
          },
          published_goals: {
            $size: {
              $filter: {
                input: "$goal_list",
                as: "data",
                cond: {
                  $eq: ["$$data.deleted", false],
                },
              },
            },
          },
          published_goal_list: {
            $filter: {
              input: "$goal_list",
              as: "data",
              cond: {
                $eq: ["$$data.deleted", false],
              },
            },
          },
          active_goal_support_list: {
            $filter: {
              input: "$goal_support_list",
              as: "data",
              cond: {
                $and: [
                  {
                    $eq: ["$$data.status", "active"],
                  },
                  {
                    $eq: ["$$data.deleted", false],
                  },
                ],
              },
            },
          },
          charged_payment_amount: {
            $filter: {
              input: "$charged_payment_list",
              as: "data",
              cond: {
                $eq: ["$$data.status", "charged"],
              },
            },
          },
        },
      },
      {
        $addFields: {
          total_pending_supports: {
            $sum: "$filter_pending_payment_list.amount",
          },
          total_active_supports: {
            $size: "$active_goal_support_list",
          },
          total_charged_amount: {
            $sum: "$charged_payment_amount.amount",
          },
          total_supporters: {
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
          total_active_supporters: {
            $size: {
              $reduce: {
                input: "$active_goal_support_list",
                initialValue: [],
                in: {
                  $setUnion: ["$$value", ["$$this.user_id"]],
                },
              },
            },
          },
          active_goals: {
            $size: {
              $filter: {
                input: "$published_goal_list",
                as: "data",
                cond: {
                  $eq: ["$$data.status", "active"],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          published_goals: 1,
          active_goals: 1,
          total_active_supports: 1,
          total_supporters: 1,
          total_active_supporters: 1,
          total_received_supports: 1,
          total_pending_supports: 1,
          total_charged_amount: 1,
          _id: 0,
        },
      },
      {
        $group: {
          _id: null,
          published_goals: {
            $sum: "$published_goals",
          },
          total_supporters: {
            $sum: "$total_supporters",
          },
          total_active_supporters: {
            $sum: "$total_active_supporters",
          },
          total_active_supports: {
            $sum: "$total_active_supports",
          },
          total_received_supports: {
            $sum: "$total_received_supports",
          },
          total_pending_supports: {
            $sum: "$total_pending_supports",
          },
          total_active_goals: {
            $sum: "$active_goals",
          },
          total_charged_amount: {
            $sum: "$total_charged_amount",
          },
        },
      },
    ];
    const statsData = await OrganisationSportModel.aggregate(
      aggregateCondition
    );
    const responseData = {
      published_goals: statsData[0]?.published_goals || 0,
      total_active_goals: statsData[0]?.total_active_goals || 0,
      total_supporters: statsData[0]?.total_supporters || 0,
      total_active_supporters: statsData[0]?.total_active_supporters || 0,
      total_active_supports: statsData[0]?.total_active_supports || 0,
      total_received_supports: statsData[0]?.total_received_supports || 0,
      total_pending_supports: statsData[0]?.total_pending_supports || 0,
      total_charged_amount: statsData[0]?.total_charged_amount || 0,
      net_received_supports:
        Number((0.975 * statsData[0]?.total_received_supports).toFixed(0)) || 0,
    };
    return apiResponse.successResponseWithData(
      res,
      "Organisasjonsstatistikk ble hentet",
      "Organisation stats fetched successfully",
      responseData
    );
  } catch (err) {
    next(err);
  }
};

const getSportSpecificOrganisationStats = async (req, res, next) => {
  try {
    const { organisationId, sportId } = req.query;
    if (req.user.organisation_id.toString() !== organisationId) {
      return apiResponse.unauthorizedResponse(
        res,
        "Du har ikke tilgang til denne organisasjonen",
        "You are not authorized to access this organisation"
      );
    }
    const aggregateCondition = [
      {
        $match: {
          _id: new ObjectId(sportId),
          organisation_id: new ObjectId(organisationId),
        },
      },
      {
        $lookup: {
          from: "paymenttransfers",
          localField: "_id",
          foreignField: "organisation_sports_category_id",
          as: "payment_list",
        },
      },
      {
        $lookup: {
          from: "goalsupports",
          localField: "_id",
          foreignField: "organisation_sports_category_id",
          as: "goal_support_list",
        },
      },
      {
        $lookup: {
          from: "goals",
          localField: "_id",
          foreignField: "organisation_sports_category_id",
          as: "goal_list",
        },
      },
      {
        $lookup: {
          from: "pendingpayments",
          localField: "_id",
          foreignField: "organisation_sports_category_id",
          as: "pending_payment_list",
        },
      },
      {
        $addFields: {
          filter_pending_payment_list: {
            $filter: {
              input: "$pending_payment_list",
              as: "data",
              cond: {
                $eq: ["$$data.status", "pending"],
              },
            },
          },
          total_received_supports: {
            $sum: "$payment_list.amount",
          },
          published_goals: {
            $size: {
              $filter: {
                input: "$goal_list",
                as: "data",
                cond: {
                  $eq: ["$$data.deleted", false],
                },
              },
            },
          },
          published_goal_list: {
            $filter: {
              input: "$goal_list",
              as: "data",
              cond: {
                $eq: ["$$data.deleted", false],
              },
            },
          },
          active_goal_support_list: {
            $filter: {
              input: "$goal_support_list",
              as: "data",
              cond: {
                $and: [
                  {
                    $eq: ["$$data.status", "active"],
                  },
                  {
                    $eq: ["$$data.deleted", false],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          total_pending_supports: {
            $sum: "$filter_pending_payment_list.amount",
          },
          total_active_supports: {
            $size: "$active_goal_support_list",
          },
          total_supporters: {
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
          total_active_supporters: {
            $size: {
              $reduce: {
                input: "$active_goal_support_list",
                initialValue: [],
                in: {
                  $setUnion: ["$$value", ["$$this.user_id"]],
                },
              },
            },
          },
          active_goals: {
            $size: {
              $filter: {
                input: "$published_goal_list",
                as: "data",
                cond: {
                  $eq: ["$$data.status", "active"],
                },
              },
            },
          },
        },
      },
      {
        $project: {
          published_goals: 1,
          active_goals: 1,
          total_active_supports: 1,
          total_supporters: 1,
          total_active_supporters: 1,
          total_received_supports: 1,
          total_pending_supports: 1,
          _id: 0,
        },
      },
    ];

    const statsData = await OrganisationSportModel.aggregate(
      aggregateCondition
    );
    const responseData = {
      published_goals: statsData[0]?.published_goals || 0,
      total_active_goals: statsData[0]?.total_active_goals || 0,
      total_supporters: statsData[0]?.total_supporters || 0,
      total_active_supporters: statsData[0]?.total_active_supporters || 0,
      total_active_supports: statsData[0]?.total_active_supports || 0,
      total_received_supports: statsData[0]?.total_received_supports || 0,
      total_pending_supports: statsData[0]?.total_pending_supports || 0,
      net_received_supports:
        Number((0.975 * statsData[0]?.total_received_supports).toFixed(0)) || 0,
    };

    return apiResponse.successResponseWithData(
      res,
      "sprots spesifikk statistikk hentet vellykket",
      "sprots spesifikk statistikk hentet vellykket",
      responseData
    );
  } catch (err) {
    next(err);
  }
};

const deleteOrganisation = async (req, res, next) => {
  try {
    await softDelete({
      req,
      res,
      Model: OrganisationModel,
      itemName: "Organisation",
    });
  } catch (err) {
    next(err);
  }
};

const updateOrganisation = async (req, res, next) => {
  try {
    if (req?.file?.location) {
      req.body.logo = req?.file?.location;
    }
    if (
      req.user.organisation_id &&
      req.user.organisation_id.toString() !== req.params.id
    ) {
      return apiResponse.unauthorizedResponse(
        res,
        "Du har ikke tillatelse til å oppdatere denne organisasjonen",
        "You are not authorized to update this organisation"
      );
    }
    await updateItem({
      req,
      res,
      Model: OrganisationModel,
      itemName: "Organisation",
    });
  } catch (err) {
    next(err);
  }
};

const totalOrganisations = async (req, res, next) => {
  try {
    await totalItems({
      req,
      res,
      Model: OrganisationModel,
      itemName: "Organisation",
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  updateOrganisation,
  deleteOrganisation,
  getOrganisation,
  getOrganisationByOrgNo,
  msnOrder,
  getTopTenOrganisations,
  getOrganisations,
  getOrganisationLeader,
  getSystemSports,
  searchOrganisation,
  getOrganisationStats,
  getSportSpecificOrganisationStats,
  createOrganisation,
  totalOrganisations,
  getOrganisationSports,
  getOrganisationSportsStats,
  getAllGoalsAndStats,
  getOrganisationSportsApp,
  getOrganisationStatsAdmin,
};
