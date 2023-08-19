const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");
const { validationResult } = require("express-validator");
const OrganisationUserModel = require("../models/organisationUser.model");
const OrganisationModel = require("../models/organisation.model");
const organisationSportModel = require("../models/organisationSport.model");
const GoalModel = require("../models/goal.model");
const OrganisationUserPasswordResetModel = require("../models/organisationUserPasswordReset.model");
const {
  generateToken,
  verifyToken,
} = require("../../../middlewares/authMiddleware");
const { generateOTP } = require("../../../helpers/otpVerification");
const OrganisationLoginOtpModel = require("../models/organisationLoginOtp.model");
const apiResponse = require("../../../helpers/apiResponse");
const nifHelper = require("../../../helpers/nif.helper");
const {
  getPagination,
  softDelete,
  totalItems,
  hashPassord,
  getItemWithPopulate,
  getPaginationWithPopulate,
} = require("../../../helpers/commonApis");
const { sendEmail } = require("../../../helpers/emailSender");

const nifAuth = async (req, res, next) => {
  try {
    if (!req.body.code || !req.body.org_id) {
      return apiResponse.ErrorResponse(res, "code and orgId is required");
    }
    const findOrg = {
      org_id: req.body.org_id,
    };
    const organisationDetail = await OrganisationModel.findOne(findOrg).exec();

    if (!organisationDetail) {
      return apiResponse.ErrorResponse(
        res,
        "Vi finner ikke organisasjon basert på innsendt orgId, vennligst kontakt kundestøtte",
        "We cant find organisation based on the submitted orgId, kindly contact customer support"
      );
    }

    const userInfo = await nifHelper.getNifLoginUserInfo(req.body.code);
    if (!userInfo) {
      return apiResponse.ErrorResponse(res, "Unable to get NIF details");
    }

    const contactPersons = await nifHelper.getOrganisationContactPersons(
      req.body.org_id
    );
    if (!contactPersons) {
      return apiResponse.ErrorResponse(
        res,
        "Unable to get contact persons for provided nif organisation"
      );
    }

    // 1 = Leder & 40000004 = Medlemsansvarlig
    const userDetails = contactPersons.find(
      (contact) =>
        // eslint-disable-next-line eqeqeq
        contact.buypassId == userInfo.bp_id_sub &&
        contact.functions.some((role) =>
          [1, 40000004].includes(role.functionTypeId)
        )
    );

    if (!userDetails) {
      return apiResponse.ErrorResponse(
        res,
        "User is not leder, Only leder can login via NIF"
      );
    }
    let user;
    // return res.json(userDetails)
    const findOrgUser = {
      email: userDetails.primaryEmail,
    };
    user = await OrganisationUserModel.findOne(findOrgUser).exec();
    const findOrgSport = {
      organisation_id: organisationDetail._id,
    };
    const sportList = await organisationSportModel.find(findOrgSport).select({
      nif_sports_category_id: 1,
      sports_category_name: 1,
      federation_name: 1,
    });

    if (!user) {
      // register org user into stotte
      user = await OrganisationUserModel.create({
        first_name: userDetails?.firstName,
        last_name: userDetails?.lastName,
        email: userDetails?.primaryEmail,
        mobile_number: userDetails?.primaryPhoneMobile,
        birth_date: userInfo?.birthdate,
        password: process.env.NIF_LOGIN_DEFAULT_PASSCODE,
        organisation_id: organisationDetail._id,
      });

      if (!organisationDetail.account_created) {
        // make organisation active
        organisationDetail.account_created = true;
        await organisationDetail.save();

        // create defult goal for every sport
        sportList.forEach(async (sport) => {
          await GoalModel.create({
            organisation_id: organisationDetail._id,
            organisation_sports_category_id: sport._id,
            title: "Generell støtte",
            short_description: `Støtt - ${organisationDetail.org_name} sin daglige drift og prosjektene de ønsker å realisere.`,
            target_amount: 0,
            start_date: new Date(),
            due_date: new Date("3024-01-01"),
          });
        });
      }
    }

    user.sports_list = sportList;
    user._doc.organisation_id = {
      _id: organisationDetail._id,
      org_name: organisationDetail.org_name,
      organisation_number: organisationDetail.org_id,
    };

    // Generate JWT Token
    const token = await generateToken(
      user._id,
      process.env.JWT_SECRET_KEY,
      process.env.JWT_AUTH_TOKEN_EXPIRE
    );

    user.last_login = new Date();
    user.ip_address = req.header("x-forwarded-for") || req.socket.remoteAddress;
    user.access_token = token;
    await user.save();

    // remove password extra fields from user object
    user.password = undefined;
    user.ip_address = undefined;
    user.access_token = undefined;
    user.refresh_token = undefined;
    res.set("Authorization", `Bearer ${token}`);

    return apiResponse.successResponseWithData(
      res,
      `Welcome ${user.first_name}, User Authenticated Successfully`,
      {
        user,
      }
    );
  } catch (err) {
    next(err);
  }
};

const msnOrgDefaultGoalCreation = async (req, res) => {
  try {
    if (!req.params.orgId) {
      return apiResponse.ErrorResponse(res, "orgId is required");
    }
    const findOrg = {
      org_id: req.params.orgId,
    };
    const organisationDetail = await OrganisationModel.findOne(findOrg).exec();

    if (!organisationDetail) {
      return apiResponse.ErrorResponse(
        res,
        "We cant find organisation based on the submitted orgId, kindly contact customer support"
      );
    }

    const findOrgSport = {
      organisation_id: organisationDetail._id,
    };
    const sportList = await organisationSportModel.find(findOrgSport).select({
      nif_sports_category_id: 1,
      sports_category_name: 1,
      federation_name: 1,
    });

    if (!organisationDetail.account_created) {
      // make organisation active
      organisationDetail.account_created = true;
      await organisationDetail.save();

      await Promise.all(
        // create defult goal for every sport
        sportList.map(async (sport) => {
          const result = await GoalModel.create({
            organisation_id: organisationDetail._id,
            organisation_sports_category_id: sport._id,
            title: "Generell støtte",
            short_description: `Støtt - ${organisationDetail.org_name} sin daglige drift og prosjektene de ønsker å realisere.`,
            target_amount: 0,
            start_date: new Date(),
            due_date: new Date("3024-01-01"),
          });
          // eslint-disable-next-line no-console
          console.log("result: ", result);
        })
      );
    }

    return apiResponse.successResponseWithData(
      res,
      `Default Goal Created Successfully`
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log(err);
  }
};

const loginOrganisationUser = async (req, res, next) => {
  try {
    if (!req.body.email || !req.body.password) {
      return apiResponse.ErrorResponse(res, "need email and password");
    }
    const findParams = {
      email: req.body.email,
    };
    const user = await OrganisationUserModel.findOne(findParams)
      .populate({
        path: "organisation_id",
        select: ["org_name", "organisation_number", "msn", "msn_status"],
      })
      .populate({
        path: "sports_list",
        select: [
          "nif_sports_category_id",
          "sports_category_name",
          "federation_name",
        ],
      })
      .exec();

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
    const loginOtpDoc = await OrganisationLoginOtpModel.create({
      user_id: user?.id,
      otp,
    });

    if (!loginOtpDoc) {
      return apiResponse.ErrorResponse(
        res,
        "Noe gikk galt, prøv igjen",
        "Something went wrong, kindly try again"
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

const loginOrganisationUserVerifyOtp = async (req, res, next) => {
  try {
    if (!req.body.otp || !req.body.id) {
      return apiResponse.ErrorResponse(
        res,
        "trenger otp og id",
        "need otp and id"
      );
    }
    const otpDetail = await OrganisationLoginOtpModel.findById(
      req.body.id
    ).exec();

    if (!otpDetail) {
      return apiResponse.notFoundResponse(
        res,
        "Engangskoden er utløpt.",
        "OTP Expired"
      );
    }
    if (otpDetail.otp !== req.body.otp) {
      return apiResponse.notFoundResponse(res, "Ugyldig OTP", "Invalid OTP");
    }
    const user = await OrganisationUserModel.findById(otpDetail.user_id)
      .populate({
        path: "organisation_id",
        select: ["org_name", "organisation_number", "msn", "msn_status"],
      })
      .populate({
        path: "sports_list",
        select: [
          "nif_sports_category_id",
          "sports_category_name",
          "federation_name",
        ],
      })
      .exec();

    if (!user) {
      return apiResponse.notFoundResponse(
        res,
        "Beklager, brukeren ble ikke funnet. Vennligst sjekk at brukernavnet er riktig skrevet.",
        "User not found"
      );
    }
    if (user.user_type === "admin") {
      const findOrgSport = {
        organisation_id: user.organisation_id,
      };
      const sportList = await organisationSportModel.find(findOrgSport).select({
        nif_sports_category_id: 1,
        sports_category_name: 1,
        federation_name: 1,
      });
      user.sports_list = sportList;
    }

    await OrganisationLoginOtpModel.findByIdAndDelete(otpDetail.id);

    user.ip_address = req.header("x-forwarded-for") || req.socket.remoteAddress;

    // Generate JWT Access Token
    const token = await generateToken(
      { id: user.id, user_type: user.user_type, role: "org" },
      process.env.JWT_SECRET_KEY,
      process.env.JWT_AUTH_TOKEN_EXPIRE
    );

    // Generate JWT Refresh Token
    const refreshToken = await generateToken(
      { id: user.id, user_type: user.user_type, role: "org" },
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
        access_token: token,
        user,
      }
    );
  } catch (err) {
    next(err);
  }
};

const loginOrganisationUserResendOtp = async (req, res, next) => {
  try {
    if (!req.body.id) {
      return apiResponse.ErrorResponse(
        res,
        "ID er ikke oppgitt",
        "id is not provided"
      );
    }
    const otpDetail = await OrganisationLoginOtpModel.findById(req.body.id)
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
      `OTP sendes på nytt til ${otpDetail.user_id.email}`,
      `OTP resent to ${otpDetail.user_id.email}`,
      {
        id: otpDetail.id,
      }
    );
  } catch (err) {
    next(err);
  }
};

const logoutOrganisationUser = async (req, res, next) => {
  try {
    // eslint-disable-next-line prefer-const
    let findParams = {
      _id: new ObjectId(req.user._id),
    };
    // eslint-disable-next-line prefer-const
    let user = await OrganisationUserModel.findOne(findParams).exec();
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
      "Bruker logget av vellykket",
      "User Logged out successfully"
    );
  } catch (err) {
    next(err);
  }
};

const createOrganisationUser = async (req, res, next) => {
  try {
    req.body.image = req?.file?.location || "";
    if (req?.body?.new_password && req?.body?.new_password !== "") {
      req.body.password = await hashPassord({
        password: req.body.new_password,
      });
    }
    if (req.user.organisation_id.toString() !== req.body.organisation_id) {
      return apiResponse.ErrorResponse(
        res,
        "Du har ikke tillatelse til å opprette brukere for denne organisasjonen",
        "You are not authorized to create users for this organisation"
      );
    }
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
    const createdItem = new OrganisationUserModel(itemDetails);

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
      const passwordReset = await OrganisationUserPasswordResetModel.create({
        user_id: createdItem?._id,
      });
      const body = `Hei ${req.body.first_name} ${req.body.last_name}!
      <br>Velkommen til Støtte plattformen.
      <br><br>Klikk her for å fullføre registreringsprosessen:
      <br><a href=${process.env.ORG_DOMAIN_URL}/create-account/${passwordReset?._id} target="_blank">${process.env.ORG_DOMAIN_URL}/create-account/${passwordReset?._id}</a>
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
    //   Model: OrganisationUserModel,
    //   itemName: "OrganisationUser",
    // });
  } catch (err) {
    next(err);
  }
};

const getOrganisationUser = async (req, res, next) => {
  try {
    const organisationUserId = req.user.id;
    // if (!mongoose.Types.ObjectId.isValid(organisationUserId)) {
    //   return apiResponse.validationErrorWithData(
    //     res,
    //     "Beklager, det oppstod en valideringsfeil.",
    //     "Validation Error",
    //     "Invalid Data"
    //   );
    // }
    const user = await OrganisationUserModel.findById(
      organisationUserId
    ).select("-password");
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

const getOrganisationUsers = async (req, res, next) => {
  try {
    const term = req.query.search;
    return await getPagination({
      req,
      res,
      model: OrganisationUserModel,
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

const getOrganisationUserByOrgId = async (req, res, next) => {
  try {
    const organisationId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(organisationId)) {
      return apiResponse.validationErrorWithData(
        res,
        "Beklager, det oppstod en valideringsfeil.",
        "Validation Error",
        "Invalid Data"
      );
    }
    // You are not authorized to access users of this organisation
    if (req.user.organisation_id.toString() !== organisationId) {
      return apiResponse.ErrorResponse(
        res,
        "Du har ikke tillatelse til å få tilgang til brukere av denne organisasjonen",
        "You are not authorized to access users of this organisation"
      );
    }
    return await getPaginationWithPopulate({
      req,
      res,
      model: OrganisationUserModel,
      findOptions: {
        organisation_id: organisationId,
      },
      populateObject: {
        path: "sports_list",
        select: [
          "nif_sports_category_id",
          "sports_category_name",
          "federation_name",
        ],
      },
    });
  } catch (err) {
    next(err);
  }
};

const deleteOrganisationUser = async (req, res, next) => {
  if (req.user.organisation_id.toString() !== req.params.id) {
    return apiResponse.ErrorResponse(
      res,
      "Du har ikke tillatelse til å slette denne brukeren",
      "You are not authorized to delete this user"
    );
  }
  try {
    await softDelete({
      req,
      res,
      Model: OrganisationUserModel,
      itemName: "OrganisationUser",
    });
  } catch (err) {
    next(err);
  }
};

const updateOrganisationUserProfile = async (req, res, next) => {
  try {
    if (req?.file?.location) {
      req.body.image = req?.file?.location;
    }
    if (req?.body?.new_password && req?.body?.new_password !== "") {
      const passwordRegex =
        /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!]).{8,}$/;
      if (!passwordRegex.test(req.body.new_password)) {
        return apiResponse.validationErrorWithData(
          res,
          "Passordvalidering mislyktes",
          "Password validation failed",
          "Invalid Data"
        );
      }
      req.body.password = await hashPassord({
        password: req.body.new_password,
      });
    }
    if (req.body.user_type && req.body.user_type !== "") {
      return apiResponse.ErrorResponse(
        res,
        "Du er ikke autorisert til å oppdatere brukertype",
        "You are not authorized to update user type"
      );
    }
    if (req.body.sports_list && req.body?.sports_list?.length > 0) {
      // you are not authorized to update sub division permissions
      return apiResponse.ErrorResponse(
        res,
        "Du er ikke autorisert til å oppdatere underavdelingsrettigheter",
        "You are not authorized to update sub division permissions"
      );
    }
    const OrganisationUser = await OrganisationUserModel.findById(
      req.params.id
    ).exec();
    if (!OrganisationUser) {
      return apiResponse.ErrorResponse(
        res,
        "Bruker ikke funnet",
        "User not found"
      );
    }
    if (
      req.user.organisation_id.toString() !==
      req.body.organisation_id.toString()
    ) {
      return apiResponse.ErrorResponse(
        res,
        "Du er ikke autorisert til å oppdatere brukerorganisasjonen",
        "You are not authorized to update user organisation"
      );
    }
    // update org user profile
    const updatedOrgUser = await OrganisationUserModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      }
    );
    // Something went wrong kindly try again later
    if (!updatedOrgUser) {
      return apiResponse.ErrorResponse(
        res,
        "Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.",
        "Something went wrong, Kindly try again later"
      );
    }

    // remove password extra fields from user object
    updatedOrgUser.password = undefined;
    updatedOrgUser.ip_address = undefined;
    updatedOrgUser.access_token = undefined;
    updatedOrgUser.refresh_token = undefined;

    return apiResponse.successResponseWithData(
      res,
      "Brukerdetaljer oppdatert",
      "User Details Updated",
      updatedOrgUser
    );
  } catch (err) {
    next(err);
  }
};

const updateOrganisationUser = async (req, res, next) => {
  try {
    if (req?.file?.location) {
      req.body.image = req?.file?.location;
    }
    if (req?.body?.new_password && req?.body?.new_password !== "") {
      const passwordRegex =
        /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!]).{8,}$/;
      if (!passwordRegex.test(req.body.new_password)) {
        return apiResponse.validationErrorWithData(
          res,
          "Passordvalidering mislyktes",
          "Password validation failed",
          "Invalid Data"
        );
      }
      req.body.password = await hashPassord({
        password: req.body.new_password,
      });
    }
    const OrganisationUser = await OrganisationUserModel.findById(
      req.params.id
    ).exec();
    if (!OrganisationUser) {
      return apiResponse.ErrorResponse(
        res,
        "Bruker ikke funnet",
        "User not found"
      );
    }
    if (
      req.user.organisation_id.toString() !==
      req.body.organisation_id.toString()
    ) {
      // you are not authorized to update user organisation
      return apiResponse.ErrorResponse(
        res,
        "Du er ikke autorisert til å oppdatere brukerorganisasjonen",
        "You are not authorized to update user organisation"
      );
    }
    // update org user profile
    const updatedOrgUser = await OrganisationUserModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
      }
    );
    // Something went wrong kindly try again later
    if (!updatedOrgUser) {
      return apiResponse.ErrorResponse(
        res,
        "Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.",
        "Something went wrong, Kindly try again later"
      );
    }

    // remove password extra fields from user object
    updatedOrgUser.password = undefined;
    updatedOrgUser.ip_address = undefined;
    updatedOrgUser.access_token = undefined;
    updatedOrgUser.refresh_token = undefined;

    return apiResponse.successResponseWithData(
      res,
      "Brukerdetaljer oppdatert",
      "User Details Updated",
      updatedOrgUser
    );
  } catch (err) {
    next(err);
  }
};

const totalOrganisationUsers = async (req, res, next) => {
  try {
    await totalItems({
      req,
      res,
      Model: OrganisationUserModel,
      itemName: "OrganisationUser",
    });
  } catch (err) {
    next(err);
  }
};

const sendUserPasswordResetEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (email) {
      const user = await OrganisationUserModel.findOne({ email });
      if (user) {
        const passwordReset = await OrganisationUserPasswordResetModel.create({
          user_id: user?.id,
        });
        const emailBody = `Hei ${user.first_name} ${user.last_name},
        <br>Følg linken under for å angi et nytt passord for din Støtte konto:
        <br><a href=${process.env.ORG_DOMAIN_URL}/reset-password/${passwordReset.id} target="_blank">${process.env.ORG_DOMAIN_URL}/reset-password/${passwordReset.id}</a>
        <br><br>Med vennlig hilsen,
        <br>Team Støtte`;
        await sendEmail(user.email, "Tilbakestill ditt passord", emailBody);
        // await sendPasswordResetEmail(user.email, { user, link }, res);

        return apiResponse.successResponse(
          res,
          "Tilbakestill passord e-post sendt... Vennligst sjekk e-posten din",
          "Password Reset Email Sent... Please Check Your Email"
        );
      }
      return apiResponse.notFoundResponse(
        res,
        "E-post finnes ikke",
        "Email doesn't exists"
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

    const requestDetail = await OrganisationUserPasswordResetModel.findById(
      requestId
    ).select("-user_id");
    if (!requestDetail) {
      return apiResponse.ErrorResponse(res, "Link utløpt", "Link Expired");
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
    const user = await OrganisationUserModel.findById(id);

    await verifyToken(token, process.env.JWT_SECRET_KEY);

    if (password && password_confirmation) {
      if (password !== password_confirmation) {
        return apiResponse.ErrorResponse(
          res,
          "Nytt passord og bekreft at nytt passord stemmer ikke",
          "New Password and Confirm New Password doesn't match"
        );
      }
      const salt = await bcrypt.genSalt(10);
      const newHashPassword = await bcrypt.hash(password, salt);
      await OrganisationUserModel.findByIdAndUpdate(user._id, {
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
        const user = await OrganisationUserModel.findOne({
          _id: decodedPayload.id,
          refresh_token: token,
        })
          .populate({
            path: "organisation_id",
            select: ["org_name", "organisation_number", "msn", "msn_status"],
          })
          .exec();
        if (!user) {
          return apiResponse.ErrorResponse(
            res,
            "Ugyldig token / utløpt token",
            "Invalid Token / Expired Token"
          );
        }
        const newToken = await generateToken(
          { id: user.id, user_type: user.user_type, role: "org" },
          process.env.JWT_SECRET_KEY,
          process.env.JWT_AUTH_TOKEN_EXPIRE
        );
        user.access_token = newToken;
        await user.save();
        // res.set("Authorization", `Bearer ${newToken}`);

        user.password = undefined;
        user.ip_address = undefined;
        user.access_token = undefined;
        user.refresh_token = undefined;

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
    console.log(err)
    next(err);
  }
};

const loggedUser = async (req, res, next) => {
  try {
    if (req.user) {
      await getItemWithPopulate({
        query: { _id: req?.user?._id },
        Model: OrganisationUserModel,
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
    const requestDetail = await OrganisationUserPasswordResetModel.findById(
      request_id
    );
    if (!requestDetail) {
      return apiResponse.ErrorResponse(res, "Link utløpt", "Link Expired");
    }
    const salt = await bcrypt.genSalt(10);
    const newHashPassword = await bcrypt.hash(password, salt);
    await OrganisationUserModel.findByIdAndUpdate(requestDetail.user_id, {
      $set: { password: newHashPassword },
    });
    await OrganisationUserPasswordResetModel.findByIdAndDelete(request_id);

    return apiResponse.successResponse(
      res,
      "Passord tilbakestilt",
      "Password reset succesfully"
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  nifAuth,
  msnOrgDefaultGoalCreation,
  updateOrganisationUserProfile,
  updateOrganisationUser,
  deleteOrganisationUser,
  getOrganisationUser,
  getOrganisationUsers,
  createOrganisationUser,
  totalOrganisationUsers,
  getOrganisationUserByOrgId,
  loginOrganisationUser,
  loginOrganisationUserVerifyOtp,
  loginOrganisationUserResendOtp,
  logoutOrganisationUser,
  sendUserPasswordResetEmail,
  getResetPasswordRequestDetails,
  userPasswordReset,
  refreshingToken,
  loggedUser,
  changeUserPassword,
};
