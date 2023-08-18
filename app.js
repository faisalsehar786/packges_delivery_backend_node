/* eslint-disable no-console */
const express = require("express");
const helmet = require("helmet");
const path = require("path");
const bodyParser = require("body-parser");
require("dotenv").config();
const logger = require("morgan");
const cors = require("cors");
const Sentry = require("@sentry/node");
const { ProfilingIntegration } = require("@sentry/profiling-node");

// const { CronJob } = require("cron");
// const cronJobFile = require("./config/cronJob.config");
const { rateLimiter } = require("./middlewares/rateLimiter");
const { sanitize } = require("./middlewares/sanitizerMiddleware");

const app = express();

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.5,
  profilesSampleRate: 0.5, // Profiling sample rate is relative to tracesSampleRate
  integrations: [
    // enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: true }),
    // enable Mongoose tracing
    new Sentry.Integrations.Mongo({
      useMongoose: true, // Default: false
    }),
    // enable Express.js middleware tracing
    new Sentry.Integrations.Express({
      // to trace all requests to the default router
      app,
      // alternatively, you can specify the routes you want to trace:
    }),
    // Add profiling integration to list of integrations
    new ProfilingIntegration(),
  ],
  // Exclude specific requests from being sent to Sentry
  beforeSendTransaction: (event) => {
    if (event.transaction === "/" || event.transaction === "/health") {
      // Exclude health check requests by returning null
      return null;
    }
    return event;
  },
  enviroment: process.env.NODE_ENV,
});

// Use Sentry's request handler middleware
app.use(Sentry.Handlers.requestHandler());

// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

// Apply the rate limiting middleware to all requests
app.use(rateLimiter);

app.disable("x-powered-by");

// Apply security headers using helmet middleware
app.use(
  helmet({
    xssFilter: true,
  })
);

// Middleware to remove excessive headers
app.use((req, res, next) => {
  res.removeHeader("Server");
  res.removeHeader("X-Powered-By");
  res.removeHeader("X-RateLimit-Limit");
  res.removeHeader("X-RateLimit-Remaining");
  res.removeHeader("X-RateLimit-Reset");
  next();
});

// don't show the log when it is test
if (process.env.NODE_ENV !== "test") {
  app.use(logger("dev"));
}

// Increase the request body size limit
app.use(bodyParser.urlencoded({ extended: true, limit: "16mb" }));

// Parse request body as JSON
app.use(bodyParser.json());

// Attach sanitizer middleware
app.use(sanitize);

// app.use(express.static(path.join(__dirname, 'public')));
app.use("/public", express.static(path.join(__dirname, "public")));

const corsConfig = {
  credentials: true,
  origin: true,
  exposedHeaders: ["Authorization"],
};
app.use(cors(corsConfig));

const { connectDB } = require("./config/connectDB.config");
const indexRouter = require("./src/v1/routes");
const apiRouter = require("./src/v1/routes/api");
const apiResponse = require("./helpers/apiResponse");

connectDB();
// Use Sentry's error handler middleware
app.use(Sentry.Handlers.errorHandler());

app.use("/", indexRouter);
app.use("/api/v1/", apiRouter);
app.get("/debug-sentry", () => {
  try {
    // Generate an error
    throw new Error("This is an example error");
  } catch (err) {
    // Capture the error with Sentry
    Sentry.captureException(err);
  }
});

app.all("*", (req, res) =>
  apiResponse.notFoundResponse(res, "Rute ikke funnet", "Route not found")
);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  Sentry.captureException(err);

  // Send an appropriate error response
  // const statusCode = err.status || 500;
  // const message = err.message || "Internal Server Error";
  return apiResponse.ErrorResponse(
    res,
    "Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.",
    "Something went wrong, Kindly try again later"
  );
});

// // create a cron job to fetch transactions and save no of transactions and amount to db
// const job1 = new CronJob(
//   "00 00 01 * * *", // cron job that runs everyday at 01am
//   // "* * * * *", // runs every second
//   async () => {
//     console.log("Fetch Transactions cron job start: ", new Date().toString());
//     await cronJobFile.fetchTransactions();
//   },
//   null,
//   true,
//   "Europe/Oslo"
// );

// const job2 = new CronJob(
//   "0 04 * * 1", // cron job that runs every monday at 4am
//   // "* * * * *", // runs every second
//   async () => {
//     console.log(
//       "Charge Pending Payments cron job start: ",
//       new Date().toString()
//     );
//     await cronJobFile.chargePendingPayments();
//   },
//   null,
//   true,
//   "Europe/Oslo"
// );

// const job3 = new CronJob(
//   "0 21 * * *", // cron job that runs everyday at 9pm
//   // "* * * * *", // runs every second
//   async () => {
//     console.log("Charge Status Update: ", new Date().toString());
//     await cronJobFile.checkChargedPayments();
//   },
//   null,
//   true,
//   "Europe/Oslo"
// );

// const job4 = new CronJob(
//   "0 19 1 * *", // cron job that runs 1st of every month at 7pm
//   // "* * * * *", // runs every second
//   async () => {
//     console.log("Triple Tax Charge: ", new Date().toString());
//     await cronJobFile.tripleTaxOrdersInvoiceCharge();
//   },
//   null,
//   true,
//   "Europe/Oslo"
// );

// const job5 = new CronJob(
//   "0 18 * * *", // cron job that runs everyday at 6pm
//   // "* * * * *", // runs every second
//   async () => {
//     console.log("Push Notifications: ", new Date().toString());
//     await cronJobFile.sendConsentExpirySignals();
//   },
//   null,
//   true,
//   "Europe/Oslo"
// );

// job1.start();
// job2.start();
// job3.start();
// job4.start();
// job5.start();

const port = process.env.PORT;
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
