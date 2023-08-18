const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");
const { validationResult } = require("express-validator");
const apiResponse = require("../../../helpers/apiResponse");
const {
  generateToken,
  verifyToken,
} = require("../../../middlewares/authMiddleware");
const AdminModel = require("../models/admin.model");
const GoalModel = require("../models/goal.model");
const GoalSupportModel = require("../models/goalSupport.model");
const organisationModel = require("../models/organisation.model");
const PaymentTransferModel = require("../models/paymentTransfer.model");
const AdminUserPasswordResetModel = require("../models/adminPasswordReset.model");
const AdminLoginOtpModel = require("../models/adminLoginOtp.model");
const {
  getPagination,
  softDelete,
  hashPassord,
  getItemWithPopulate,
} = require("../../../helpers/commonApis");
const { sendEmail } = require("../../../helpers/emailSender");
const pendingPaymentModel = require("../models/pendingPayment.model");
const { generateOTP } = require("../../../helpers/otpVerification");
const PendingPaymentModel = require("../models/pendingPayment.model");
const randomNumber = require("../../../utils/randomNumber");

const loginAdmin = async (req, res, next) => {
  try {
    if (!req.body.email || !req.body.password) {
      return apiResponse.ErrorResponse(
        res,
        "E-post og passord er påkrevd.",
        "Email and password are required"
      );
    }
    const params = {
      email: req.body.email,
    };
    const user = await AdminModel.findOne(params).exec();

    console.log(user)

    if (!user) {
      return apiResponse.notFoundResponse(
        res,
        "Ugyldige påloggings opplysninger. Vennligst sjekk brukernavn og passord og prøv igjen.",
        "Invalid Credentials"
      );
    }

    const match = await user.checkPassword(req.body.password, user.password);

    if (!match) {
      return apiResponse.notFoundResponse(
        res,
        "Ugyldige påloggings opplysninger. Vennligst sjekk brukernavn og passord og prøv igjen.",
        "Invalid Credentials"
      );
    }
    const otp = generateOTP();
    const loginOtpDoc = await AdminLoginOtpModel.create({
      user_id: user?.id,
      otp,
    });

    if (!loginOtpDoc) {
      return apiResponse.ErrorResponse(
        res,
        "Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.",
        "System went wrong, Kindly try again later"
      );
    }
    // Generate OTP for login
    const emailBody = `
    Hei ${user.first_name} ${user.last_name},
    <br>Din engangskode for pålogging er: <strong>${otp}</strong>
    <br>Bruk denne engangskoden for å logge på kontoen din.
    <br><br>Med vennlig hilsen,
    <br>Team Støtte`;
    await sendEmail(user.email, "Logg inn OTP", emailBody);

    return apiResponse.successResponseWithData(
      res,
      `Engangskode sendt til ${user.email}.`,
      `OTP sent to ${user.email}`,
      {
        id: loginOtpDoc.id,
      }
    );
  } catch (err) {
    next(err);
  }
};

const loginAdminVerifyOtp = async (req, res, next) => {
  try {
    if (!req.body.otp || !req.body.id) {
      return apiResponse.ErrorResponse(
        res,
        "OTP og ID er ikke oppgitt",
        "OTP and id is not provided"
      );
    }
    const otpDetail = await AdminLoginOtpModel.findById(req.body.id).exec();

    if (!otpDetail) {
      return apiResponse.notFoundResponse(
        res,
        "Engangskoden er utløpt.",
        "OTP Expired"
      );
    }
    if (otpDetail.otp !== req.body.otp) {
      return apiResponse.notFoundResponse(
        res,
        "Ugyldig engangskode.",
        "Invalid OTP"
      );
    }
    const user = await AdminModel.findById(otpDetail.user_id).exec();

    if (!user) {
      return apiResponse.notFoundResponse(
        res,
        "Beklager, brukeren ble ikke funnet. Vennligst sjekk at brukernavnet er riktig skrevet.",
        "User Not Found"
      );
    }

    await AdminLoginOtpModel.findByIdAndDelete(otpDetail.id);

    user.ip_address = req.header("x-forwarded-for") || req.socket.remoteAddress;

    // Generate JWT Access Token
    const token = await generateToken(
      { id: user.id, user_type: user.user_type, role: "admin" },
      process.env.JWT_SECRET_KEY,
      process.env.JWT_AUTH_TOKEN_EXPIRE
    );

    // Generate JWT Refresh Token
    const refreshToken = await generateToken(
      { id: user.id, user_type: user.user_type, role: "admin" },
      process.env.JWT_SECRET_KEY_REFRESH_TOKEN,
      process.env.JWT_REFRESH_TOKEN_EXPIRE
    );

    user.last_login = new Date();
    user.access_token = token;
    user.refresh_token = refreshToken;
    await user.save();

    // remove password extra fields from user object
    user.password = undefined;
    user.ip_address = undefined;
    user.access_token = undefined;
    user.refresh_token = undefined;
    res.set("Authorization", `Bearer ${refreshToken}`);

    return apiResponse.successResponseWithData(
      res,
      `Velkommen ${user.first_name}, autentisering ble vellykket.`,
      `Welcome ${user.first_name}, User Authenticated Successfully`,
      {
        user,
        access_token: token,
      }
    );
  } catch (err) {
    next(err);
  }
};

const loginAdminResendOtp = async (req, res, next) => {
  try {
    if (!req.body.id) {
      return apiResponse.ErrorResponse(res, "ID er påkrevd", "id is required");
    }
    const otpDetail = await AdminLoginOtpModel.findById(req.body.id)
      .populate("user_id")
      .exec();

    if (!otpDetail) {
      return apiResponse.notFoundResponse(
        res,
        "Tiden for oppgitt engangskode er utløpt. Vennligst logg inn på nytt.",
        "Time Expired, Please Login Again"
      );
    }

    // Generate OTP for login
    const emailBody = `
    Hei ${otpDetail.user_id.first_name} ${otpDetail.user_id.last_name},
    <br>Din engangskode for pålogging er: <strong>${otpDetail.otp}</strong>
    <br>Bruk denne engangskoden for å logge på kontoen din.
    <br><br>Med vennlig hilsen,
    <br>Team Støtte`;
    await sendEmail(otpDetail.user_id.email, "Logg inn OTP", emailBody);

    return apiResponse.successResponseWithData(
      res,
      `OTP sendt til ${otpDetail.user_id.email}`,
      `OTP resent to ${otpDetail.user_id.email}`,
      {
        id: otpDetail.id,
      }
    );
  } catch (err) {
    next(err);
  }
};

const logoutAdmin = async (req, res, next) => {
  try {
    // eslint-disable-next-line prefer-const
    let findParams = {
      _id: new ObjectId(req.user._id),
    };
    // eslint-disable-next-line prefer-const
    let user = await AdminModel.findOne(findParams).exec();
    if (!user) {
      return apiResponse.notFoundResponse(
        res,
        "Beklager, vi finner ikke dataen du ser etter.",
        "Not found!"
      );
    }
    user.access_token = "";
    user.refresh_token = "";
    user.save();
    return apiResponse.successResponse(
      res,
      "Bruker logget ut",
      "User Logged out successfully"
    );
  } catch (err) {
    next(err);
  }
};

const createAdmin = async (req, res, next) => {
  try {
    req.body.image = req?.file?.location || "";
    const { ...itemDetails } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    const createdItem = new AdminModel(itemDetails);

    createdItem.save(async (err) => {
      if (err) {
        if (err?.keyValue?.email != null && err?.code === 11000) {
          return apiResponse.ErrorResponse(
            res,
            "E-posten du har angitt er allerede i bruk.",
            "Email already in use"
          );
        }
        return apiResponse.ErrorResponse(
          res,
          "Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.",
          "System went wrong, Kindly try again later"
        );
      }
      const passwordReset = await AdminUserPasswordResetModel.create({
        user_id: createdItem?._id,
      });
      const body = `Hei ${req.body.first_name} ${req.body.last_name}!
      <br>Velkommen til Støtte plattformen.
      <br><br>Klikk her for å fullføre registreringsprosessen:
      <br><a href=${process.env.ADMIN_DOMAIN_URL}/create-account/${passwordReset?._id} target="_blank">${process.env.ADMIN_DOMAIN_URL}/create-account/${passwordReset?._id}</a>
      <br><br>Med vennlig hilsen,
      <br>Team Støtte`;
      sendEmail(req.body.email, "Støtte - Ny bruker", body);
      return apiResponse.successResponseWithData(
        res,
        "Oppretting vellykket.",
        "Created successfully",
        createdItem
      );
    });
    // await createItem({
    //   req,
    //   res,
    //   Model: AdminModel,
    //   itemName: "Admin",
    // });
    // const findUser = await AdminModel.findOne({
    //   email: req.body.email,
    // });
    // if (findUser) {
    //   const passwordReset = await AdminUserPasswordResetModel.create({
    //     user_id: findUser?.id,
    //   });
    //   const body = `Hei ${req.body.first_name} ${req.body.last_name}!
    //   <br>Velkommen til Støtte plattformen.
    //   <br><br>Klikk her for å fullføre registreringsprosessen:
    //   <br><a href=${process.env.ADMIN_DOMAIN_URL}/reset-password/${passwordReset.id} target="_blank">${process.env.ADMIN_DOMAIN_URL}/reset-password/${passwordReset.id}</a>
    //   <br><br>Med vennlig hilsen,
    //   <br>Team Støtte`;
    //   sendEmail(req.body.email, "Støtte - Ny bruker", body);
    // }
  } catch (err) {
    next(err);
  }
};

const getAdmin = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    // if (!mongoose.Types.ObjectId.isValid(adminId)) {
    //   return apiResponse.validationErrorWithData(
    //     res,
    //     "Beklager, det oppstod en valideringsfeil.",
    //     "Validation Error",
    //     "Invalid Data"
    //   );
    // }

    const user = await AdminModel.findById(adminId).select("-password");
    if (!user) {
      return apiResponse.notFoundResponse(
        res,
        "Beklager, vi finner ikke dataen du ser etter.",
        "Not found!"
      );
    }

    // remove password extra fields from user object
    user.password = undefined;
    user.ip_address = undefined;
    user.access_token = undefined;
    user.refresh_token = undefined;

    return apiResponse.successResponseWithData(
      res,
      "Brukerdetaljer hentet",
      "User Details Fetched",
      user
    );
  } catch (err) {
    next(err);
  }
};

const getAdminById = async (req, res, next) => {
  try {
    const adminId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }

    const user = await AdminModel.findById(adminId).select("-password");
    if (!user) {
      return apiResponse.notFoundResponse(
        res,
        "Beklager, vi finner ikke dataen du ser etter.",
        "Not found!"
      );
    }

    // remove password extra fields from user object
    user.password = undefined;
    user.ip_address = undefined;
    user.access_token = undefined;
    user.refresh_token = undefined;

    return apiResponse.successResponseWithData(
      res,
      "Brukerdetaljer hentet",
      "User Details Fetched",
      user
    );
  } catch (err) {
    next(err);
  }
};

const getAdmins = async (req, res, next) => {
  try {
    const term = req.query.search;
    return await getPagination({
      req,
      res,
      model: AdminModel,
      findOptions: {
        $or: [
          { firstName: { $regex: term, $options: "i" } },
          { lastName: { $regex: term } },
        ],
      },
    });
  } catch (err) {
    next(err);
  }
};

const deleteAdmin = async (req, res, next) => {
  try {
    await softDelete({
      req,
      res,
      Model: AdminModel,
      itemName: "Admin",
    });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    if (req?.file?.location) {
      req.body.image = req?.file?.location;
    }
    if (req.user.id !== req.params.id) {
      return apiResponse.ErrorResponse(
        res,
        "Du har ikke tillatelse til å oppdatere denne brukeren.",
        "You are not authorized to update this user"
      );
    }
    if (req.body.user_type && req.body.user_type !== "") {
      return apiResponse.ErrorResponse(
        res,
        "Du er ikke autorisert til å oppdatere brukertype",
        "You are not authorized to update user type"
      );
    }
    if (req?.body?.password && req?.body?.password !== "") {
      const adminUser = await AdminModel.findById(req.user.id);
      if (!adminUser) {
        return apiResponse.notFoundResponse(
          res,
          "Beklager, vi finner ikke dataen du ser etter.",
          "Not found!"
        );
      }
      const passwordRegex =
        /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!]).{8,}$/;
      if (!passwordRegex.test(req.body.password)) {
        return apiResponse.badRequestResponse(
          res,
          "Passordvalidering mislyktes",
          "Password Validation failed"
        );
      }
      req.body.password = await hashPassord({ password: req.body.password });
    }
    // update admin profile
    const updatedAdmin = await AdminModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      }
    );
    // Something went wrong kindly try again later
    if (!updatedAdmin) {
      return apiResponse.ErrorResponse(
        res,
        "Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.",
        "Something went wrong, Kindly try again later"
      );
    }

    // remove password extra fields from user object
    updatedAdmin.password = undefined;
    updatedAdmin.ip_address = undefined;
    updatedAdmin.access_token = undefined;
    updatedAdmin.refresh_token = undefined;

    return apiResponse.successResponseWithData(
      res,
      "Brukerdetaljer oppdatert",
      "User Details Updated",
      updatedAdmin
    );
  } catch (err) {
    next(err);
  }
};

const updateAdmin = async (req, res, next) => {
  try {
    if (req?.file?.location) {
      req.body.image = req?.file?.location;
    }
    if (req?.body?.password && req?.body?.password !== "") {
      const adminUser = await AdminModel.findById(req.params.id);
      if (!adminUser) {
        return apiResponse.notFoundResponse(
          res,
          "Beklager, vi finner ikke dataen du ser etter.",
          "Not found!"
        );
      }
      const passwordRegex =
        /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!]).{8,}$/;
      if (!passwordRegex.test(req.body.password)) {
        return apiResponse.badRequestResponse(
          res,
          "Passordvalidering mislyktes",
          "Password Validation failed"
        );
      }
      if (req.user._id.toString() !== adminUser._id.toString()) {
        const body = `Ditt passord har blitt endret.
          <br>Her er ny innlogginsinfo:
          <br><br>Brukernavn: ${adminUser.email}
          <br>Passord: ${req.body.password}`;
        sendEmail(adminUser.email, "Støtte - Bruker oppdatert", body);
      }
      req.body.password = await hashPassord({ password: req.body.password });
    }
    // update admin profile
    const updatedAdmin = await AdminModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      }
    );
    // Something went wrong kindly try again later
    if (!updatedAdmin) {
      return apiResponse.ErrorResponse(
        res,
        "Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.",
        "Something went wrong, Kindly try again later"
      );
    }

    // remove password extra fields from user object
    updatedAdmin.password = undefined;
    updatedAdmin.ip_address = undefined;
    updatedAdmin.access_token = undefined;
    updatedAdmin.refresh_token = undefined;

    return apiResponse.successResponseWithData(
      res,
      "Brukerdetaljer oppdatert",
      "User Details Updated",
      updatedAdmin
    );
  } catch (err) {
    next(err);
  }
};

const sendUserPasswordResetEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (email) {
      const user = await AdminModel.findOne({ email });
      if (user) {
        const passwordReset = await AdminUserPasswordResetModel.create({
          user_id: user?.id,
        });
        const emailBody = `Hei ${user.first_name} ${user.last_name},
        <br>Følg linken under for å angi et nytt passord for din Støtte konto:
        <br><a href=${process.env.ADMIN_DOMAIN_URL}/reset-password/${passwordReset.id} target="_blank">${process.env.ADMIN_DOMAIN_URL}/reset-password/${passwordReset.id}</a>
        <br><br>Med vennlig hilsen,
        <br>Team Støtte`;
        await sendEmail(user.email, "Tilbakestill ditt passord", emailBody);
        // await sendPasswordResetEmail(user.email, { user, link }, res);

        return apiResponse.successResponse(
          res,
          "Tilbakestill passord Sendt e-post... Vennligst sjekk e-posten din",
          "Password Reset Email Sent... Please Check Your Email"
        );
      }
      return apiResponse.ErrorResponse(
        res,
        "E-post eksisterer ikke",
        "Email doesn't exist"
      );
    }
    return apiResponse.ErrorResponse(
      res,
      "E-postfelt er påkrevd",
      "Email Field is Required"
    );
  } catch (err) {
    next(err);
  }
};

const getResetPasswordRequestDetails = async (req, res, next) => {
  try {
    const requestId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }

    const requestDetail = await AdminUserPasswordResetModel.findById(
      requestId
    ).select("-user_id");
    if (!requestDetail) {
      return apiResponse.successResponse(res, "Link utløpt", "Link Expired");
    }
    return apiResponse.successResponseWithData(
      res,
      "Detalj hentet",
      "Detail Fetched",
      requestDetail
    );
  } catch (err) {
    next(err);
  }
};

const userPasswordReset = async (req, res, next) => {
  try {
    const { password, password_confirmation } = req.body;
    const { id, token } = req.params;
    const user = await AdminModel.findById(id);

    await verifyToken(token, process.env.JWT_SECRET_KEY);

    if (password && password_confirmation) {
      if (password !== password_confirmation) {
        return apiResponse.ErrorResponse(
          res,
          "Nytt passord og Bekreft nytt passord stemmer ikke overens",
          "New Password and Confirm New Password doesn't match"
        );
      }
      const salt = await bcrypt.genSalt(10);
      const newHashPassword = await bcrypt.hash(password, salt);
      await AdminModel.findByIdAndUpdate(user._id, {
        $set: { password: newHashPassword },
      });

      return apiResponse.successResponse(
        res,
        "Passord tilbakestilt",
        "Password Reset Successfully"
      );
    }
    return apiResponse.ErrorResponse(
      res,
      "Alle felt må fylles ut",
      "All Fields are Required"
    );
  } catch (err) {
    next(err);
  }
};

const refreshingToken = async (req, res, next) => {
  try {
    const authorization =
      req.headers.Authorization || req.headers.authorization;

    if (authorization && authorization.startsWith("Bearer")) {
      const token = authorization.split(" ")[1];

      if (!token) {
        return apiResponse.ErrorResponse(res, "Ugyldig token", "Invalid Token");
      }
      const decodedPayload = await verifyToken(
        token,
        process.env.JWT_SECRET_KEY_REFRESH_TOKEN
      );

      if (decodedPayload && decodedPayload.id) {
        const user = await AdminModel.findOne({
          _id: decodedPayload.id,
          refresh_token: token,
        }).exec();

        if (!user) {
          return apiResponse.ErrorResponse(
            res,
            "Ugyldig token / utløpt token",
            "Invalid Token / Expired Token"
          );
        }

        const newToken = await generateToken(
          { id: user.id, user_type: user.user_type, role: "admin" },
          process.env.JWT_SECRET_KEY,
          process.env.JWT_AUTH_TOKEN_EXPIRE
        );
        user.access_token = newToken;
        await user.save();
        user.password = undefined;
        user.ip_address = undefined;
        user.access_token = undefined;
        user.refresh_token = undefined;
        // res.set("Authorization", `Bearer ${newToken}`);

        return apiResponse.successResponseWithData(
          res,
          "Oppdatert token",
          "Updated Token",
          {
            access_token: newToken,
            user,
          }
        );
      }
      return apiResponse.ErrorResponse(
        res,
        "Ugyldig token bestått",
        "Invalid Token Passed"
      );
    }
  } catch (err) {
    next(err);
  }
};

const loggedUser = async (req, res, next) => {
  try {
    if (req.user) {
      await getItemWithPopulate({
        query: { _id: req.user._id },
        Model: AdminModel,
        populateObject: [],
        res,
      });
    } else {
      return apiResponse.ErrorResponse(res, "Ugyldig token", "Invalid Token");
    }
  } catch (err) {
    next(err);
  }
};

const changeUserPassword = async (req, res, next) => {
  try {
    const { password, request_id } = req.body;
    if (!password) {
      return apiResponse.ErrorResponse(
        res,
        "Passord er påkrevd",
        "Password is Required"
      );
    }
    if (!request_id) {
      return apiResponse.ErrorResponse(
        res,
        "Forespørselen er ugyldig",
        "Request is invalid"
      );
    }

    const requestDetail = await AdminUserPasswordResetModel.findById(
      request_id
    );
    if (!requestDetail) {
      return apiResponse.ErrorResponse(res, "Link utløpt", "Link Expired");
    }
    const salt = await bcrypt.genSalt(10);
    const newHashPassword = await bcrypt.hash(password, salt);
    await AdminModel.findByIdAndUpdate(requestDetail.user_id, {
      $set: { password: newHashPassword },
    });
    await AdminUserPasswordResetModel.findByIdAndDelete(request_id);

    return apiResponse.successResponse(
      res,
      "Passord tilbakestilt",
      "Password reset succesfully"
    );
  } catch (err) {
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    Promise.all([
      PaymentTransferModel.aggregate([
        { $group: { _id: null, sum_val: { $sum: "$amount" } } },
      ]),
      organisationModel.count(),
      organisationModel.count({ account_created: true }),
      GoalModel.count(),
      GoalModel.count({ status: "active" }),
      GoalSupportModel.distinct("user_id"),
      GoalSupportModel.distinct("user_id", { status: "active" }),
      GoalSupportModel.count({ status: "active" }),
      pendingPaymentModel.aggregate([
        { $match: { status: "pending" } },
        { $group: { _id: null, total_amount: { $sum: "$amount" } } },
      ]),
      PaymentTransferModel.aggregate([
        { $match: { status: "charged" } },
        { $group: { _id: null, total_amount: { $sum: "$amount" } } },
      ]),
    ])
      .then(
        ([
          totalReceivedSupports,
          totalOrganisations,
          totalActiveOrganisations,
          totalGoals,
          activeGoals,
          totalSupporters,
          totalActiveSupporters,
          totalActiveSupports,
          pendingAmount,
          chargedAmount,
        ]) => {
          const responseData = {
            total_organisations: totalOrganisations,
            total_active_organisations: totalActiveOrganisations,
            total_goals: totalGoals,
            active_goals: activeGoals,
            total_supporters: totalSupporters.length,
            total_active_supporters: totalActiveSupporters.length,
            total_active_supports: totalActiveSupports,
            total_received_supports:
              (totalReceivedSupports[0]?.sum_val || 0).toFixed(0) || 0,
            total_stotte_cut:
              (0.12 * (totalReceivedSupports[0]?.sum_val || 0)).toFixed(0) || 0,
            total_support_paid_org:
              (0.88 * (totalReceivedSupports[0]?.sum_val || 0)).toFixed(0) || 0,
            total_pending_amount: pendingAmount[0]?.total_amount || 0,
            total_charged_amount: chargedAmount[0]?.total_amount || 0,
          };
          return apiResponse.successResponseWithData(
            res,
            "statistikkData innhenting vellykket.",
            "Stats data fetched successfully",
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

const getUserTransactionsAppGoalBased = async (req, res, next) => {
  try {
    const goal_id = req.params.id;
    const yearParams = req.params.year;
    if (!mongoose.Types.ObjectId.isValid(goal_id)) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    const goal = await GoalModel.findOne({
      _id: goal_id,
    }).exec();
    if (!goal) {
      return apiResponse.notFoundResponse(
        res,
        "Beklager, vi finner ikke dataen du ser etter.",
        "Not found!"
      );
    }
    const page = req.query.page > 0 ? req.query.page : 1;
    const perPage = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const countParams = { goal_id };
    const total = await PendingPaymentModel.count(countParams).exec();
    const data = await PendingPaymentModel.find({
      goal_id,
      created_at: {
        $gte: new Date(`${yearParams}-01-01`),
        $lt: new Date(`${yearParams + 1}-01-01`),
      },
    })
      .populate({ path: "goal_id", select: "title" })
      .exec();
    const groupedData = data.reduce((acc, item) => {
      const weekNumber = randomNumber.getWeekNumber(new Date(item.created_at));
      if (!acc[weekNumber]) {
        acc[weekNumber] = [];
      }
      acc[weekNumber].push(item);
      return acc;
    }, {});
    const finalRes = [];
    Object.keys(groupedData).forEach((weekNumber) => {
      const weekData = groupedData[weekNumber];
      if (weekData.length > 0) {
        const updatedWeekData = weekData.map((item) => {
          // eslint-disable-next-line no-param-reassign
          item._doc.goal_title = item.goal_id.title || "";
          // eslint-disable-next-line no-param-reassign
          item._doc.goal_id = undefined;
          return item;
        });
        // eslint-disable-next-line prefer-const
        let resp = {
          week: parseInt(weekNumber, 10),
          total_transactions: 0,
          total_amount: 0,
          goal_title: updatedWeekData[0]?._doc?.goal_title,
          transactions_list: updatedWeekData,
        };
        const sum_total_transactions = updatedWeekData.reduce(
          (acc, obj) => acc + obj.no_of_transactions,
          0
        );
        const sum_total_amount = updatedWeekData.reduce(
          (acc, obj) => acc + obj.amount,
          0
        );
        resp.total_transactions = sum_total_transactions;
        resp.total_amount = sum_total_amount;
        finalRes.push(resp);
      }
    });
    finalRes.sort((a, b) => b.week - a.week);
    return apiResponse.successResponseWithPagination(
      res,
      page,
      total,
      perPage,
      finalRes
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  loginAdmin,
  loginAdminVerifyOtp,
  loginAdminResendOtp,
  logoutAdmin,
  createAdmin,
  getAdmins,
  getAdmin,
  getAdminById,
  updateProfile,
  updateAdmin,
  deleteAdmin,
  sendUserPasswordResetEmail,
  getResetPasswordRequestDetails,
  userPasswordReset,
  refreshingToken,
  loggedUser,
  changeUserPassword,
  getStats,
  getUserTransactionsAppGoalBased,
};
