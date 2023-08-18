const express = require("express");
const { body } = require("express-validator");
const filehandlingController = require("../controllers/filehandling.controller");
const { checkUserAuth } = require("../../../middlewares/authMiddleware");
const uploadawsFile = require("../../../middlewares/upload-aws-image");
const {
  checkAuthOrigins,
} = require("../../../middlewares/authMiddlewareGenericAll");

const router = express.Router();

router.post(
  "/",
  uploadawsFile.single("fileupload"),
  checkAuthOrigins,
  filehandlingController.createFileUpload
);

router.delete(
  "/",
  [
    body(
      "uploaded_path",
      "uploaded_path must not be empty and its must be url pattern"
    )
      .isLength({ min: 1 })
      .trim(),
  ],
  checkUserAuth,
  filehandlingController.deleteFileUpload
);

module.exports = router;
