const express = require("express");
const cronJob = require("../../../config/cronJob.config")

const router = express.Router();

// router.get("/fetch-pending-transactions", cronJob.fetchTransactions);

module.exports = router;
