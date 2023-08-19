const { ObjectId } = require("mongodb");
const mongoose = require("mongoose");
const apiResponse = require("../../../helpers/apiResponse");
const vippsHelper = require("../../../helpers/vipps.helper");
const neonomicsHelper = require("../../../helpers/neonomics.helper");
const encryptionHelper = require("../../../helpers/encryption.helper");
const GoalSupportModel = require("../models/goalSupport.model");
const { SORT_ORDER } = require("../../../utils/constants");
const GoalModel = require("../models/goal.model");
const UserModel = require("../models/user.model");

const {
  getPagination,
  createItem,
  updateItem,
  softDelete,
  totalItems,
} = require("../../../helpers/commonApis");

const getAllBanks = async (req, res, next) => {
  try {
    const bankList = await neonomicsHelper.getNeonomicsBanks();
    return apiResponse.successResponseWithData(
      res,
      "Bankliste hentet",
      "Bank List Fetched",
      bankList
    );
  } catch (err) {
    next(err);
  }
};

const selectBank = async (req, res, next) => {
  try {
    if (!req.body.bankId) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    const encryptSSN = req.body.psuId
      ? await encryptionHelper.encryptNeoNomicsSSN(req.body.psuId)
      : "";
    const sessionData = await neonomicsHelper.createNeonomicsSession(
      req.body.bankId
    );
    const accountData = await neonomicsHelper.getNeonomicsAccounts(
      sessionData.sessionId,
      encryptSSN
    );
    if (accountData?.errorCode === "1426") {
      const consentData = await neonomicsHelper.createNeonomicsConsentUrl(
        sessionData.sessionId,
        accountData.links[0].href,
        encryptSSN
      );
      const bankData = await neonomicsHelper.getNeonomicsSingleBank(
        req.body.bankId
      );
      // save sessionId in userModel
      await UserModel.findByIdAndUpdate(req.user.id, {
        session_id: sessionData.sessionId,
        bank_id: req.body.bankId,
        bank_name: bankData?.bankOfficialName || "",
      });
      return apiResponse.successResponseWithData(
        res,
        "samtykke",
        "consent",
        consentData.links[0]
      );
    }
    return apiResponse.successResponseWithData(
      res,
      "kontoliste",
      "account-list",
      accountData
    );
  } catch (err) {
    next(err);
  }
};

const selectBankV3 = async (req, res, next) => {
  try {
    if (!req.user.bank_id) {
      return apiResponse.ErrorResponse(
        res,
        "velg først bank",
        "first select the bank"
      );
    }
    const encryptSSN = req.body.psuId
      ? await encryptionHelper.encryptNeoNomicsSSN(req.body.psuId)
      : "";
    const sessionData = await neonomicsHelper.createNeonomicsSession(
      req.user.bank_id
    );
    const accountData = await neonomicsHelper.getNeonomicsAccounts(
      sessionData.sessionId,
      encryptSSN
    );
    if (accountData?.errorCode === "1426") {
      const consentData = await neonomicsHelper.createNeonomicsConsentUrl(
        sessionData.sessionId,
        accountData.links[0].href,
        encryptSSN
      );
      const bankData = await neonomicsHelper.getNeonomicsSingleBank(
        req.user.bank_id
      );
      // save sessionId in userModel
      await UserModel.findByIdAndUpdate(req.user.id, {
        session_id: sessionData.sessionId,
        bank_name: bankData?.bankOfficialName || "",
      });
      return apiResponse.successResponseWithData(
        res,
        "samtykke",
        "consent",
        consentData.links[0]
      );
    }
    return apiResponse.successResponseWithData(
      res,
      "kontoliste",
      "account-list",
      accountData
    );
  } catch (err) {
    next(err);
  }
};

const getAccounts = async (req, res, next) => {
  if (!req?.user?.session_id) {
    return apiResponse.ErrorResponse(
      res,
      "velg først bank",
      "first select the bank"
    );
  }
  try {
    const accountData = await neonomicsHelper.getNeonomicsAccounts(
      req.user.session_id
    );
    if (accountData?.errorCode === "1426") {
      return apiResponse.ErrorResponse(
        res,
        "Samtykke er ikke gitt av kunden",
        "Consent is not provided by customer"
      );
    }
    return apiResponse.successResponseWithData(
      res,
      "kontoliste",
      "account-list",
      accountData
    );
  } catch (err) {
    next(err);
  }
};

const selectAccountV3 = async (req, res, next) => {
  try {
    if (!req?.user?.session_id) {
      return apiResponse.ErrorResponse(res, "Prøv igjen", "Kindly try again");
    }
    if (!req?.body?.bban_list || !req?.body?.bban_list?.length) {
      return apiResponse.ErrorResponse(
        res,
        "Velg minst én bank",
        "Kindly select one bank atleast"
      );
    }
    const accountData = await neonomicsHelper.getNeonomicsAccounts(
      req.user.session_id
    );
    if (accountData?.errorCode === "1426") {
      return apiResponse.ErrorResponse(
        res,
        "Neonomics-samtykke er ikke gitt",
        "Neonomics Consent is not Provided"
      );
    }

    const filterAccountList = accountData.filter((account) => {
      if (req?.body?.bban_list.includes(account.bban)) return account;
    });
    if (!filterAccountList || filterAccountList.length === 0) {
      return apiResponse.ErrorResponse(
        res,
        "Den oppgitte kontoen samsvarer ikke med brukerautorisert konto",
        "The provided account does not match user authorised account"
      );
    }

    // save account_id & bank_connection_list in userModel
    await UserModel.findByIdAndUpdate(req.user.id, {
      account_id: filterAccountList[0].id,
      session_id_date: new Date(),
      bank_account: filterAccountList[0].bban,
      bank_connection_list: filterAccountList,
    });

    // update session_id & bank_connection_list in userModel
    await GoalSupportModel.updateMany(
      { user_id: req.user.id },
      {
        session_id: req.user.session_id,
        session_id_date: new Date(),
        accounts: filterAccountList,
      }
    );

    return apiResponse.successResponse(
      res,
      "Kontosamtykke oppdatert",
      "Account Consent Updated"
    );
  } catch (err) {
    next(err);
  }
};

const createAgreement = async (req, res, next) => {
  try {
    const agreementData = await vippsHelper.createVippsAgreement(req);
    if (!agreementData) {
      return apiResponse.ErrorResponse(
        res,
        "Kan ikke opprette Vipps-avtale",
        "Unable to create Vipps Agreement"
      );
    }
    // save agreementId in userModel
    await UserModel.findByIdAndUpdate(req.user.id, {
      agreement_id: agreementData.agreementId,
    });
    return apiResponse.successResponseWithData(
      res,
      "Vipps-avtale opprettet",
      "Vipps Agreement Created",
      agreementData
    );
  } catch (err) {
    next(err);
  }
};

const getAgreementStatus = async (req, res, next) => {
  try {
    if (!req?.user?.agreement_id) {
      return apiResponse.ErrorResponse(
        res,
        "Opprett først Vipps-avtalen",
        "Kindly first create the Vipps Agreement"
      );
    }
    // you are not authorised to access this agreement
    if (req.user.agreement_id !== req.body.agreement_id) {
      return apiResponse.ErrorResponse(
        res,
        "Du har ikke tilgang til denne avtalen",
        "You are not authorised to access this agreement"
      );
    }
    const agreementData = await vippsHelper.getVippsAgreementStatus(
      req,
      req.body.organisation_id
    );
    if (!agreementData) {
      return apiResponse.ErrorResponse(
        res,
        "Kan ikke hente Vipps-avtalen",
        "Unable to fetch Vipps Agreement"
      );
    }
    return apiResponse.successResponseWithData(
      res,
      "Avtaledetaljer",
      "Agreement Details",
      agreementData
    );
  } catch (err) {
    next(err);
  }
};

const createGoalSupport = async (req, res, next) => {
  try {
    if (!req?.user?.session_id) {
      return apiResponse.ErrorResponse(
        res,
        "Velg først bank",
        "Kindly first select the bank"
      );
    }
    // you are not authorised to create goal support for this user
    if (req?.body?.user_id && req.user.id !== req?.body?.user_id) {
      return apiResponse.ErrorResponse(
        res,
        "Du har ikke tilgang til å opprette målstøtte for denne brukeren",
        "Uou are not authorised to create goal support for this user"
      );
    }
    if (!req?.body?.bban_list || !req?.body?.bban_list?.length) {
      return apiResponse.ErrorResponse(
        res,
        "Velg en bank",
        "Kindly select one bank"
      );
    }
    if (req.body.support_amount < 2 || req.body.support_amount > 12) {
      return apiResponse.ErrorResponse(
        res,
        "Støttebeløpet bør være større enn 1 og mindre enn 13",
        "Support amount should be greater than 1 and less than 13"
      );
    }
    const accountData = await neonomicsHelper.getNeonomicsAccounts(
      req.user.session_id
    );
    if (accountData?.errorCode === "1426") {
      return apiResponse.ErrorResponse(
        res,
        "Neonomics-samtykke er ikke gitt",
        "Neonomics Consent is not Provided"
      );
    }
    const agreementData = await vippsHelper.getVippsAgreementStatus(
      req,
      req.body.organisation_id
    );
    if (agreementData.status !== "ACTIVE") {
      return apiResponse.ErrorResponse(
        res,
        "Vipps-avtalen er ikke godkjent",
        "Vipps Agreement is not Approved"
      );
    }
    let goalData;
    // incase goal_id is not provided
    if (!req.body.goal_id) {
      goalData = await GoalModel.create({
        organisation_id: req.body.organisation_id,
        organisation_sports_category_id:
          req.body.organisation_sports_category_id,
        title: "Organisation Support & Assistance",
        short_description:
          "Supporting organisations with resources and assistance to help them thrive.",
        target_amount: 0,
        start_date: new Date(),
        due_date: new Date("2043-10-10"),
      });
      req.body.goal_id = goalData._id;
    }
    const filterAccountList = accountData.filter((account) => {
      if (req?.body?.bban_list.includes(account.bban)) return account;
    });
    if (!filterAccountList || filterAccountList.length === 0) {
      return apiResponse.ErrorResponse(
        res,
        "Den oppgitte kontoen samsvarer ikke med brukerautorisert konto",
        "The provided account does not match user authorised account"
      );
    }
    req.body.user_id = req.user.id;
    req.body.session_id = req.user.session_id;
    req.body.session_id_date = new Date();
    req.body.accounts = filterAccountList;
    req.body.agreement_id = req.user.agreement_id;
    req.body.agreement_payload = agreementData;
    const userUpdatePayload = {
      account_id: filterAccountList[0].id,
      session_id_date: new Date(),
      bank_account: filterAccountList[0].bban,
      bank_connection_list: filterAccountList,
    };
    // save account_id in userModel
    await UserModel.findByIdAndUpdate(req.user.id, userUpdatePayload);

    await createItem({
      req,
      res,
      Model: GoalSupportModel,
      itemName: "GoalSupport",
    });
  } catch (err) {
    next(err);
  }
};

const createGoalSupportV2 = async (req, res, next) => {
  try {
    if (!req?.user?.session_id) {
      return apiResponse.ErrorResponse(
        res,
        "Velg først bank",
        "Kindly first select the bank"
      );
    }
    // you are not authorised to create goal support for this user
    if (req?.body?.user_id && req.user.id !== req?.body?.user_id) {
      return apiResponse.ErrorResponse(
        res,
        "Du har ikke tilgang til å opprette målstøtte for denne brukeren",
        "Uou are not authorised to create goal support for this user"
      );
    }
    if (req.body.support_amount < 2 || req.body.support_amount > 12) {
      return apiResponse.ErrorResponse(
        res,
        "Støttebeløpet bør være større enn 1 og mindre enn 13",
        "Support amount should be greater than 1 and less than 13"
      );
    }
    // const accountData = await neonomicsHelper.getNeonomicsAccounts(
    //   req.user.session_id
    // );
    // if (accountData?.errorCode === "1426") {
    //   return apiResponse.ErrorResponse(res, "Neonomics Consent is not Provided");
    // }
    const agreementData = await vippsHelper.getVippsAgreementStatus(
      req,
      req.body.organisation_id
    );
    if (agreementData.status !== "ACTIVE") {
      return apiResponse.ErrorResponse(
        res,
        "Vipps-avtalen er ikke godkjent",
        "Vipps Agreement is not Approved"
      );
    }

    req.body.user_id = req.user.id;
    req.body.session_id = req.user.session_id;
    req.body.session_id_date = req?.user?.session_id_date;
    req.body.accounts = req?.user?.bank_connection_list;
    req.body.agreement_id = req.user.agreement_id;
    req.body.agreement_payload = agreementData;

    await createItem({
      req,
      res,
      Model: GoalSupportModel,
      itemName: "GoalSupport",
    });
  } catch (err) {
    next(err);
  }
};

const getGoalSupport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const goalSupportData = await GoalSupportModel.findById(id)
      .populate({
        path: "organisation_id",
        select: ["org_name"],
      })
      .populate({
        path: "organisation_sports_category_id",
        select: ["sports_category_name"],
      })
      .populate({
        path: "goal_id",
        select: ["title", "short_description", "target_amount"],
      });

    if (!goalSupportData) {
      return apiResponse.ErrorResponse(
        res,
        "Målstøtte ikke hentet",
        "Goal Support Not Fetched"
      );
    }
    return apiResponse.successResponseWithData(
      res,
      "Målstøttedetaljer",
      "GoalSupport Details",
      goalSupportData
    );
  } catch (err) {
    next(err);
  }
};

const getGoalSupportApp = async (req, res, next) => {
  try {
    const { id } = req.params;
    const goalSupportData = await GoalSupportModel.findById(id)
      .populate({
        path: "organisation_id",
        select: ["org_name"],
      })
      .populate({
        path: "organisation_sports_category_id",
        select: ["sports_category_name"],
      })
      .populate({
        path: "goal_id",
        select: ["title", "short_description", "target_amount"],
      });

    if (!goalSupportData) {
      return apiResponse.ErrorResponse(
        res,
        "Målstøtte ikke hentet",
        "Goal Support Not Fetched"
      );
    }
    return apiResponse.successResponseWithData(
      res,
      "Målstøttedetaljer",
      "GoalSupport Details",
      goalSupportData
    );
  } catch (err) {
    next(err);
  }
};
const getSupportPlayersByOrganisation = async (req, res, next) => {
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
    // You are not authorised to access this organisation
    if (req.user.organisation_id.toString() !== organisation_id.toString()) {
      return apiResponse.unauthorizedResponse(
        res,
        "Du har ikke tilgang til denne organisasjonen",
        "You are not authorised to access this organisation"
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
          foreignField: "goal_support_id",
          as: "payment_list",
        },
      },
      {
        $addFields: {
          support_total_amount: {
            $sum: "$payment_list.amount",
          },
        },
      },
      {
        $group: {
          _id: "$user_id",
          goal_support_list: {
            $push: "$$ROOT",
          },
          user_id: {
            $first: "$user_id",
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user_detail",
        },
      },
      {
        $unwind: {
          path: "$user_detail",
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$user_detail", "$$ROOT"],
          },
        },
      },
      {
        $addFields: {
          total_goal_support_count: {
            $size: "$goal_support_list",
          },
          active_goal_support_count: {
            $size: {
              $filter: {
                input: "$goal_support_list",
                as: "data",
                cond: { $eq: ["$$data.status", "active"] }
              },
            },
          },
          user_total_support_amount: {
            $sum: "$goal_support_list.support_total_amount",
          },
          support_start_date: {
            $min: "$goal_support_list.created_at"
          },
        },
      },
      {
        $project: {
          user_detail: 0,
          goal_support_list: 0,
          password: 0,
        },
      },
    ];
    const totalResult = await GoalSupportModel.aggregate(aggregateCondition);

    const total = totalResult.length;
    const data = await GoalSupportModel.aggregate([
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

const getAllSupportPlayers = async (req, res, next) => {
  try {
    const page = req.query.page > 0 ? parseInt(req.query.page, 10) : 1;
    const perPage = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const sortKey = req.query.sortKey || "total_support_amount";
    const sortOrder = SORT_ORDER[req.query.sortOrder] || -1; // -1 for descending and 1 for ascending

    const aggregateCondition = [
      {
        $lookup: {
          from: "paymenttransfers",
          localField: "_id",
          foreignField: "goal_support_id",
          as: "payment_list",
        },
      },
      {
        $addFields: {
          support_total_amount: {
            $sum: "$payment_list.amount",
          },
        },
      },
      {
        $group: {
          _id: "$user_id",
          goal_support_list: {
            $push: "$$ROOT",
          },
          user_id: {
            $first: "$user_id",
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user_id",
          foreignField: "_id",
          as: "user_detail",
        },
      },
      {
        $unwind: {
          path: "$user_detail",
        },
      },
      {
        $replaceRoot: {
          newRoot: {
            $mergeObjects: ["$user_detail", "$$ROOT"],
          },
        },
      },
      {
        $addFields: {
          total_goal_support_count: {
            $size: "$goal_support_list"
          },
          active_goal_support_count: {
            $size: {
              $filter: {
                input: "$goal_support_list",
                as: "data",
                cond: { $eq: ["$$data.status", "active"] },
              },
            },
          },
          user_total_support_amount: {
            $sum: "$goal_support_list.support_total_amount",
          },
          support_start_date: {
            $min: "$goal_support_list.created_at"
          },
        },
      },
      {
        $project: {
          user_detail: 0,
          goal_support_list: 0,
          password: 0,
        },
      },
    ];
    const totalResult = await GoalSupportModel.aggregate(aggregateCondition);

    const total = totalResult.length;
    const data = await GoalSupportModel.aggregate([
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

const getGoalSupportByUserId = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const term = req.query.search || "";
    const findOptions = {
      user_id: userId,
      title: { $regex: term, $options: "i" },
    };
    const order = req.query.order ? req.query.order : "desc";
    const sortBy = req.query.sortBy ? req.query.sortBy : "_id";
    const page = req.query.page > 0 ? req.query.page : 1;
    const perPage = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const total = await GoalSupportModel.count(findOptions).exec();
    GoalSupportModel.find(findOptions)
      .limit(perPage)
      .skip(perPage * (+page - 1))
      .sort([[sortBy, order]])
      .populate({
        path: "organisation_id",
        select: ["org_name"],
      })
      .populate({
        path: "organisation_sports_category_id",
        select: ["sports_category_name"],
      })
      .populate({
        path: "goal_id",
        select: ["title", "short_description", "target_amount"],
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

const getAllGoalSupports = async (req, res, next) => {
  try {
    const term = req.query.search;
    return await getPagination({
      req,
      res,
      model: GoalSupportModel,
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

const deleteGoalSupport = async (req, res, next) => {
  try {
    await softDelete({
      req,
      res,
      Model: GoalSupportModel,
      itemName: "GoalSupport",
    });
  } catch (err) {
    next(err);
  }
};

const updateGoalSupport = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    const goalSupportData = await GoalSupportModel.findById(req.params.id);
    if (!goalSupportData) {
      return apiResponse.notFoundResponse(
        res,
        "Målstøttedata ikke funnet",
        "Goal Support Data not found"
      );
    }
    if (req.user.id !== goalSupportData.user_id.toString()) {
      return apiResponse.unauthorizedResponse(
        res,
        "Du har ikke tilgang til å oppdatere denne målstøtten",
        "You are not authorised to update this goal support"
      );
    }
    if (req?.body?.status && req?.body?.status === "canceled") {
      await vippsHelper.updateVippsAgreement(
        goalSupportData.agreement_id,
        "STOPPED",
        goalSupportData.organisation_id
      );
    }
    if (
      req.body.support_amount &&
      (req.body.support_amount < 2 || req.body.support_amount > 12)
    ) {
      return apiResponse.ErrorResponse(
        res,
        "Støttebeløpet bør være større enn 1 og mindre enn 13",
        "Support amount should be greater than 1 and less than 13"
      );
    }
    await updateItem({
      req,
      res,
      Model: GoalSupportModel,
      itemName: "GoalSupport",
    });
  } catch (err) {
    next(err);
  }
};

const totalGoalSupports = async (req, res, next) => {
  try {
    await totalItems({
      req,
      res,
      Model: GoalSupportModel,
      itemName: "GoalSupport",
    });
  } catch (err) {
    next(err);
  }
};

const deleteBankAccount = async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.user.id);
    user.session_id = "";
    user.bank_id = "";
    user.account_id = "";
    user.bank_account = "";
    user.bank_connection_list = [];
    await user.save();

    await GoalSupportModel.updateMany(
      { user_id: req.user.id },
      {
        session_id: "",
        accounts: [],
        status: "paused",
      }
    );

    return apiResponse.successResponse(
      res,
      "Bankkonto er fjernet",
      "Bank Account Removed Successfully"
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllBanks,
  selectBank,
  selectBankV3,
  getAccounts,
  selectAccountV3,
  createAgreement,
  getAgreementStatus,
  createGoalSupport,
  createGoalSupportV2,
  getAllGoalSupports,
  getSupportPlayersByOrganisation,
  getAllSupportPlayers,
  getGoalSupport,
  getGoalSupportByUserId,
  updateGoalSupport,
  deleteGoalSupport,
  totalGoalSupports,
  deleteBankAccount,
  getGoalSupportApp,
};
