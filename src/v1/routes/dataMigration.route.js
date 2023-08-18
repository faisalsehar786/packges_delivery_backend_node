const express = require('express');
const dataMigrationController = require('../controllers/dataMigration.controller');
const organisationModel = require('../models/organisation.model');
const router = express.Router();

// router.get('/nif', dataMigrationController.nifDataMigration);
// router.get('/nif-club-sports', dataMigrationController.nifDataMigrationForClubSports);
// router.get('/nif-organisations', dataMigrationController.nifDataMigrationForOrganisations);
// router.get('/nif-all-clubs', dataMigrationController.nifDataMigrationForAllClubs);
// router.get('/nif-stats', dataMigrationController.nifContactPersonStats); // to check the companies that have leader in contact person

// router.get("/org_default_values", async (req, res) => {
//   const result = await organisationModel.updateMany(
//     { msn: { $exists: false } },
//     { $set: { msn: "", msn_status: "pending" } }
//   );
//   console.log(result);
//   return res.json({ status: "success", message: "Done", data: result });
// });

module.exports = router;
