/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-continue */
const moment = require("moment");
const { ObjectId } = require("mongodb");
const Sentry = require("@sentry/node");
const { v4: uuidv4 } = require("uuid");
const vippsHelper = require("../helpers/vipps.helper");
const neonomicsHelper = require("../helpers/neonomics.helper");
const tripleTaxHelper = require("../helpers/tripleTax.helper");
const oneSignalHelper = require("../helpers/oneSignal.helper");
const GoalSupportModel = require("../src/v1/models/goalSupport.model");
const PaymentTransferModel = require("../src/v1/models/paymentTransfer.model");
const PendingPaymentModel = require("../src/v1/models/pendingPayment.model");
const PendingPaymentLogModel = require("../src/v1/models/pendingPaymentLog.model");
const NotificationModel = require("../src/v1/models/notification.model");
const UserModel = require("../src/v1/models/user.model");
const TripleTaxOrdersModel = require("../src/v1/models/tripletaxOrders.model");
const logger = require("../utils/logger");

module.exports.fetchTransactions = async () => {
  const sentryCheckInId = await sentryCheckInStarted("fetchTransactions");
  try {
    const sessionData = moment().subtract(3, "months").format("YYYY-MM-DD");
    const aggregateCondition = [
      {
        $match: {
          status: "active",
          session_id_date: { $gt: new Date(sessionData) },
        },
      },
      {
        $group: {
          _id: "$user_id",
          goalSupports: {
            $push: "$$ROOT",
          },
          agreement_payload: {
            $push: "$agreement_payload",
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user_detail",
        },
      },
    ];
    const goalSupportData = await GoalSupportModel.aggregate([
      ...aggregateCondition,
    ]);
    await Promise.allSettled(
      goalSupportData.map(async (goalSpt) => {
        // const checkConsent = await neonomicsHelper.getNeonomicsAccounts(
        //   goalSpt.user_detail[0].session_id
        // );
        // logger.info(`checkConsnt ${goalSpt.user_detail[0].session_id} - ${checkConsent?.errorCode}`);
        // if (checkConsent?.errorCode === "1426") {
        // send notification to get consent again
        //   await sendNotification(
        //     goalSpt.user_id,
        //     goalSpt.user_id,
        //     goalSpt?.agreement_payload[0]?.productName
        //   );
        // } else {
        // get transactions for each user - based on user session id and account id
        const { transactions, filteredTransactions } = await getTransactions(
          goalSpt.user_detail[0].session_id,
          goalSpt.user_detail[0]?.account_id,
          goalSpt?.agreement_payload[0]?.productName,
          goalSpt.user_id
        );
        const transactionCount = filteredTransactions.length;
        logger.info(
          `transactionCount ${goalSpt.user_detail[0].session_id} - ${transactionCount}`
        );
        // once we get all the transaction of user then we will loop all the goal support for that user and create pending payment based on support amount
        if (transactionCount > 0) {
          goalSpt.goalSupports.forEach(async (support) => {
            await this.populatePendingCharge(
              support,
              transactionCount,
              transactions,
              filteredTransactions
            );
          });
        }
        // }
      })
    );

    // 🟢 Notify Sentry your job has completed successfully:
    sentryCheckInCompleted("fetchTransactions", sentryCheckInId);
  } catch (error) {
    sentryCheckInFailed("fetchTransactions", sentryCheckInId);
    logger.error(`fetchTransactionsError - ${error}`);
    Sentry.captureException(error);
  }
};

module.exports.populatePendingCharge = async (
  support,
  transactionCount,
  transactions,
  filteredTransactions
) => {
  try {
    const supportAmount = support.support_amount;
    const totalAmount = supportAmount * transactionCount;

    const pendingModel = new PendingPaymentModel();
    pendingModel.goal_support_id = support._id;
    pendingModel.user_id = support.user_id;
    pendingModel.organisation_id = support.organisation_id;
    pendingModel.organisation_sports_category_id =
      support.organisation_sports_category_id;
    pendingModel.goal_id = support.goal_id;
    pendingModel.support_amount = support.support_amount;
    pendingModel.max_amount = support?.agreement_payload?.pricing?.maxAmount;
    pendingModel.amount = totalAmount;
    pendingModel.transaction_fetch_date = moment().subtract(1, "day");
    pendingModel.no_of_transactions = transactionCount;
    await pendingModel.save();
    await this.createPendingChargeLog(
      support,
      pendingModel._id,
      transactions,
      filteredTransactions
    );
  } catch (error) {
    logger.error(`populatePendingChargeError - ${error}`);
    Sentry.captureException(error);
  }
};

module.exports.createPendingChargeLog = async (
  support,
  paymentId,
  transactions,
  filteredTransactions
) => {
  try {
    const supportAmount = support.support_amount;
    const totalAmount = supportAmount * filteredTransactions.length;

    const paymentLogModel = new PendingPaymentLogModel();
    paymentLogModel.pending_payment_id = paymentId;
    paymentLogModel.goal_support_id = support._id;
    paymentLogModel.user_id = support.user_id;
    paymentLogModel.pre_filter_transactions = transactions;
    paymentLogModel.post_filter_transactions = filteredTransactions;
    paymentLogModel.amount = totalAmount;
    paymentLogModel.transaction_fetch_date = moment();
    paymentLogModel.no_of_transactions = filteredTransactions.length;
    paymentLogModel.no_of_transactions_all = transactions.length;
    await paymentLogModel.save();
  } catch (error) {
    logger.error(`paymentLogModelError - ${error}`);
    Sentry.captureException(error);
  }
};

async function getTransactions(sessionId, accountId, productName, user_id) {
  try {
    const transactions =
      await neonomicsHelper.getNeonomicsAccountTransactionsByDateRange(
        sessionId,
        accountId,
        moment().format("YYYY-MM-DD"),
        moment().format("YYYY-MM-DD")
      );
    // eslint-disable-next-line eqeqeq, no-empty
    if (transactions?.errorCode == "1426") {
      // send notification to get consent again
      const response = await oneSignalHelper.createNotification(
        sessionId,
        "Bankkonto tilknytning avsluttet.",
        "Consent Expired",
        "Utfør BankID for tilknytte kontoen igjen."
      );
      if (response?.id !== "") {
        await sendOneSignalNotification(
          response?.id,
          user_id,
          "Bankkonto tilknytning avsluttet."
        );
      }
      return [];
    }
    const filteredTransactions = transactions.filter(
      (transaction) =>
        transaction.creditDebitIndicator === "DBIT" &&
        (transaction.valueDate !== null ||
          transaction.valueDate !== "" ||
          transaction.valueDate !== undefined)
    );
    return { transactions, filteredTransactions };
  } catch (error) {
    logger.error(`getTransactionsError - ${error}`);
    return [];
  }
}

// pending status get populate from pending modal , check goal support status
module.exports.chargePendingPayments = async () => {
  // 🟡 Notify Sentry your job is running:
  const sentryCheckInId = await sentryCheckInStarted("chargePendingPayments");
  try {
    // group by goal support id and check if goal support is active or not
    const aggregateCondition = [
      {
        $match: {
          status: "pending",
        },
      },
      {
        $group: {
          _id: "$goal_support_id",
          totalAmount: {
            $sum: "$amount",
          },
          totalTransaction: {
            $sum: "$no_of_transactions",
          },
        },
      },
      {
        $lookup: {
          from: "goalsupports",
          localField: "_id",
          foreignField: "_id",
          as: "goal_support_list",
        },
      },
    ];
    const PendingPayments = await PendingPaymentModel.aggregate([
      ...aggregateCondition,
    ]);
    await Promise.allSettled(
      PendingPayments.map(async (pt) => {
        // data is soft deleted from goal support - so we need to check if goal support is active or not
        if (pt.goal_support_list.length > 0) {
          if (pt.goal_support_list[0].status === "active") {
            const totalAmount = pt.totalAmount * 100;
            const amount =
              totalAmount >
              pt.goal_support_list[0]?.agreement_payload?.pricing?.maxAmount
                ? pt.goal_support_list[0]?.agreement_payload?.pricing?.maxAmount
                : totalAmount;
            const Payload = {
              agreement_id: pt.goal_support_list[0]?.agreement_id,
              support_amount: pt.goal_support_list[0]?.support_amount,
              maxAmount:
                pt.goal_support_list[0]?.agreement_payload?.pricing?.maxAmount,
              amount,
              user_id: pt.goal_support_list[0]?.user_id,
              organisation_id: pt.goal_support_list[0]?.organisation_id,
              organisation_sports_category_id:
                pt.goal_support_list[0]?.organisation_sports_category_id,
              goal_id: pt.goal_support_list[0]?.goal_id,
              goal_support_id: pt._id,
              total_transaction_count: pt.totalTransaction,
            };
            await createCharge(Payload);
          }
        } else {
          PendingPaymentModel.updateMany(
            { goal_support_id: new ObjectId(pt._id) },
            { $set: { status: "cancelled" } },
            { upsert: true }
          );
        }
      })
    );
    // 🟢 Notify Sentry your job has completed successfully:
    sentryCheckInCompleted("chargePendingPayments", sentryCheckInId);
    return;
  } catch (error) {
    sentryCheckInFailed("chargePendingPayments", sentryCheckInId);
    logger.error(`chargePendingPaymentsError - ${error}`);
    Sentry.captureException(error);
  }
};

// async function sendNotification(goalSupportId, userId, supportTitle) {
//   // check notification collection for user id and goal support id
//   const notificationData = await NotificationModel.find({
//     user_id: userId,
//     goal_support_id: goalSupportId,
//   });
//   // if data is not present then send notification to provide consent again.
//   if (!notificationData.length) {
//     NotificationModel.create({
//       user_id: userId,
//       goal_support_id: goalSupportId,
//       title: "Goal Support Consent Required",
//       type: "goal_support",
//       body: `The Goal Support Expired For: ${supportTitle}, Kindly provide consent again.`,
//     });
//   }
// }

async function createCharge(supportDetails) {
  try {
    const checkAgStatus = await vippsHelper.getVippsAgreementStatusForNonAuth(
      supportDetails.agreement_id,
      supportDetails.organisation_id
    );
    if (checkAgStatus.status === "ACTIVE") {
      const chargeData = await vippsHelper.createVippsPaymentCharge(
        supportDetails.agreement_id,
        supportDetails.amount,
        uuidv4(),
        supportDetails.organisation_id
      );
      if (chargeData?.chargeId) {
        // if chargeId is return that means transaction has been made and we will store transfer in Payment Model
        const paymentInsertModel = new PaymentTransferModel();
        paymentInsertModel.goal_support_id = supportDetails.goal_support_id;
        paymentInsertModel.user_id = supportDetails.user_id;
        paymentInsertModel.organisation_id = supportDetails.organisation_id;
        paymentInsertModel.organisation_sports_category_id =
          supportDetails.organisation_sports_category_id;
        paymentInsertModel.goal_id = supportDetails.goal_id;
        paymentInsertModel.support_amount = supportDetails.support_amount;
        paymentInsertModel.amount = supportDetails.amount / 100; // because amount is in cents and we do not need to store amount in cents in our database
        paymentInsertModel.agreement_id = supportDetails.agreement_id;
        paymentInsertModel.charge_id = chargeData?.chargeId;
        paymentInsertModel.max_amount = supportDetails?.maxAmount;
        paymentInsertModel.no_of_transactions =
          supportDetails.total_transaction_count;
        await paymentInsertModel.save();

        await PendingPaymentModel.updateMany(
          {
            goal_support_id: new ObjectId(supportDetails.goal_support_id),
            status: "pending",
          },
          {
            $set: {
              status: "charged",
              payment_transfer_id: paymentInsertModel._id,
            },
          }
        );
      }
    }
  } catch (error) {
    Sentry.captureException(error);
  }
}

module.exports.checkChargedPayments = async () => {
  // 🟡 Notify Sentry your job is running:
  const sentryCheckInId = await sentryCheckInStarted("checkChargedPayments");
  try {
    const PaymentTransfers = await PaymentTransferModel.find({
      status: { $in: ["reserved", "due", "pending"] },
    });
    await Promise.allSettled(
      PaymentTransfers.map(async (pt) => {
        const checkCharge = await vippsHelper.getChargeStatus(
          pt.agreement_id,
          pt.charge_id
        );
        pt.status = checkCharge.status.toString().toLowerCase();
        pt.charge_date = Date.now();
        pt.save();
        if (checkCharge.status === "CHARGED") {
          PendingPaymentModel.updateMany(
            { payment_transfer_id: new ObjectId(pt._id) },
            { $set: { status: "paid", billed: true, billed_date: Date.now() } },
            { upsert: true }
          );
        }
      })
    );
    // 🟢 Notify Sentry your job has completed successfully:
    sentryCheckInCompleted("checkChargedPayments", sentryCheckInId);
  } catch (error) {
    sentryCheckInFailed("checkChargedPayments", sentryCheckInId);
    Sentry.captureException(error);
  }
};

module.exports.tripleTaxOrdersInvoiceCharge = async () => {
  // 🟡 Notify Sentry your job is running:
  const sentryCheckInId = await sentryCheckInStarted(
    "tripleTaxOrdersInvoiceCharge"
  );
  try {
    const aggregateCondition = [
      {
        $match: {
          status: "charged",
          invoice_status: false,
        },
      },
      {
        $group: {
          _id: "$organisation_id",
          totalAmount: {
            $sum: "$amount",
          },
        },
      },
      {
        $lookup: {
          from: "organisations",
          localField: "_id",
          foreignField: "_id",
          as: "organisation_details",
        },
      },
    ];
    // fetch all transaction where organisation payment is charged and invoice payment is false
    const PaymentTransfers = await PaymentTransferModel.aggregate([
      ...aggregateCondition,
    ]);
    if (PaymentTransfers.length > 0) {
      await Promise.allSettled(
        PaymentTransfers.map(async (pt) => {
          // invoice is created only if total amount is greater than 10,000 norwegian krone
          if (pt.totalAmount >= 10000) {
            if (pt.organisation_details[0]?.triple_tax_id) {
              const chargeAmount = pt.totalAmount * 0.12;
              // const netAmount = pt.totalAmount * 0.88;
              const order = await tripleTaxHelper.createOrder(
                pt.organisation_details[0],
                chargeAmount,
                chargeAmount * 1.25
              );
              const tripleTaxOrder = new TripleTaxOrdersModel();
              tripleTaxOrder.organisation_id = pt.organisation_details[0]._id;
              tripleTaxOrder.total_amount = pt.totalAmount;
              tripleTaxOrder.charge_amount = pt.totalAmount * 0.12;
              tripleTaxOrder.order_id = order?.value?.id;
              tripleTaxOrder.save();

              const invoice = await tripleTaxHelper.createInvoice(
                order?.value?.id,
                pt.organisation_details[0].triple_tax_id,
                chargeAmount
              );
              await PaymentTransferModel.updateMany(
                {
                  organisation_id: pt.organisation_details[0]._id,
                  status: "charged",
                  invoice_status: false,
                },
                {
                  $set: {
                    invoice_status: true,
                    invoice_id: invoice?.value?.id,
                  },
                }
              );
              await TripleTaxOrdersModel.findByIdAndUpdate(
                tripleTaxOrder._id,
                { $set: { invoice_id: invoice?.value?.id } },
                { new: true }
              );
            }
          }
        })
      );
      // 🟢 Notify Sentry your job has completed successfully:
      sentryCheckInCompleted("tripleTaxOrdersInvoiceCharge", sentryCheckInId);
    }
  } catch (error) {
    sentryCheckInFailed("tripleTaxOrdersInvoiceCharge", sentryCheckInId);
    Sentry.captureException(error);
  }
};

async function sendOneSignalNotification(item_id, userId, title) {
  // if data is not present then send notification to provide consent again.
  NotificationModel.create({
    user_id: userId,
    item_id,
    title,
    type: "consent",
    body: title,
  });
}

module.exports.sendConsentExpirySignals = async () => {
  // 🟡 Notify Sentry your job is running:
  const sentryCheckInId = await sentryCheckInStarted(
    "sendConsentExpirySignals"
  );
  try {
    const now = moment.utc();
    const findActiveUsers = await UserModel.find({
      status: "active",
      session_id: { $exists: true, $ne: "" },
    });
    await Promise.allSettled(
      findActiveUsers.map(async (user) => {
        const checkConsent =
          await neonomicsHelper.getNeonomicsAccountTransactionsByDateRange(
            user.session_id
          );
        // eslint-disable-next-line eqeqeq
        if (checkConsent?.errorCode == "1426") {
          const response = await oneSignalHelper.createNotification(
            user.session_id,
            "Bankkonto tilknytning avsluttet.",
            "Consent Expired",
            "Utfør BankID for tilknytte kontoen igjen."
          );
          if (response?.id !== "") {
            await sendOneSignalNotification(
              response?.id,
              user._id,
              "Bankkonto tilknytning avsluttet."
            );
          }
        } else {
          const checkSession = await neonomicsHelper.checkSessionStatus(
            user.session_id
          );
          if (checkSession && checkSession?.createdAt) {
            const end = moment(new Date(checkSession.createdAt)).format(
              "YYYY-MM-DD HH:mm:ss"
            );
            const days = now.diff(end, "days");
            if (days === 75 || days === 80) {
              const checkConsent_1 =
                await neonomicsHelper.getNeonomicsAccountTransactionsByDateRange(
                  user.session_id
                );
              // eslint-disable-next-line eqeqeq
              if (checkConsent_1?.errorCode == "1426") {
                const response = await oneSignalHelper.createNotification(
                  user.session_id,
                  "Bankkonto tilknytning avsluttet.",
                  "Consent Expired",
                  "Utfør BankID for tilknytte kontoen igjen."
                );
                if (response?.id !== "") {
                  await sendOneSignalNotification(
                    response?.id,
                    user._id,
                    "Bankkonto tilknytning avsluttet."
                  );
                }
              } else {
                const response = await oneSignalHelper.createNotification(
                  user.session_id,
                  `Det er ${days} dager igjen av din kontotilknytning`,
                  "Consent Expiry Alert",
                  `Vennligst forny din tilknytning.`
                );
                if (response?.id !== "") {
                  await sendOneSignalNotification(
                    response?.id,
                    user._id,
                    `Det er ${days} dager igjen av din kontotilknytning. Vennligst forny din tilknytning.`
                  );
                }
              }
            }
            if (days >= 90) {
              const response = await oneSignalHelper.createNotification(
                user.session_id,
                "Bankkonto tilknytning avsluttet.",
                "Consent Expired",
                "Utfør BankID for tilknytte kontoen igjen."
              );
              if (response?.id !== "") {
                await sendOneSignalNotification(
                  response?.id,
                  user._id,
                  "Bankkonto tilknytning avsluttet."
                );
              }
            }
          }
        }
      })
    );
    // 🟢 Notify Sentry your job has completed successfully:
    sentryCheckInCompleted("sendConsentExpirySignals", sentryCheckInId);
  } catch (error) {
    sentryCheckInFailed("sendConsentExpirySignals", sentryCheckInId);
    Sentry.captureException(error);
  }
};

async function sentryCheckInStarted(slug) {
  // 🟡 Notify Sentry your job is running:
  const checkInId = Sentry.captureCheckIn({
    monitorSlug: slug,
    status: "in_progress",
  });
  return checkInId;
}

async function sentryCheckInCompleted(slug, checkInId) {
  // 🟢 Notify Sentry your job has completed successfully:
  Sentry.captureCheckIn({
    checkInId,
    monitorSlug: slug,
    status: "ok",
  });
}

async function sentryCheckInFailed(slug, checkInId) {
  // 🔴 Notify Sentry your job has failed:
  Sentry.captureCheckIn({
    checkInId,
    monitorSlug: slug,
    status: "error",
  });
}
