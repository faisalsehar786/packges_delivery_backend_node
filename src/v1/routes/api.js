const express = require("express");

const app = express();
const userRoute = require("./user.route");
const adminRoute = require("./admin.route");
const organisationRoute = require("./organisation.route");
const organisationUserRoute = require("./organisationUser.route");
const goalRoute = require("./goal.route");
const goalSupportRoute = require("./goalSupport.route");
const paymentTransferRoute = require("./paymentTransfer.route");
const dataMigrationRoute = require("./dataMigration.route");
const filehandlingRoute = require("./filehandling.route");
const notificationRoute = require("./notification.route");
const zendeskRoute = require("./zendesk.route");
const CronJobRoute = require("./cronJob.route");
const OrgImagesRoute = require("./orgImages.route");

// End Points of Api
app.use("/user/", userRoute);
app.use("/admin/", adminRoute);
app.use("/organisation/", organisationRoute);
app.use("/organisation_user/", organisationUserRoute);
app.use("/payment_transfer/", paymentTransferRoute);
app.use("/goal/", goalRoute);
app.use("/goal_support/", goalSupportRoute);
app.use("/data-migration/", dataMigrationRoute);
app.use("/fileupload/", filehandlingRoute);
app.use("/notification/", notificationRoute);
app.use("/zendesk/", zendeskRoute);
app.use("/cron/", CronJobRoute);
app.use("/orgImages/", OrgImagesRoute);

module.exports = app;
