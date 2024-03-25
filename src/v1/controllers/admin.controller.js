const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const { ObjectId } = require('mongodb')
const { validationResult } = require('express-validator')
const apiResponse = require('../../../helpers/apiResponse')
const { generateToken, verifyToken } = require('../../../middlewares/authMiddleware')
const AdminModel = require('../models/admin.model')
const AdminUserPasswordResetModel = require('../models/adminPasswordReset.model')
const TenderModel = require('../models/tender.model')
const AdminLoginOtpModel = require('../models/adminLoginOtp.model')
const {
  getPagination,
  softDelete,
  hashPassord,
  getItemWithPopulate,
} = require('../../../helpers/commonApis')
const { sendEmail } = require('../../../helpers/emailSender')
const { generateOTP } = require('../../../helpers/otpVerification')
const userModel = require('../models/user.model')

const loginAdmin = async (req, res, next) => {
  try {
    if (!req.body.email || !req.body.password) {
      return apiResponse.ErrorResponse(
        res,
        'E-post og passord er påkrevd.',
        'Email and password are required'
      )
    }
    const params = {
      email: req.body.email,
    }
    const user = await AdminModel.findOne(params).exec()

    if (!user) {
      return apiResponse.notFoundResponse(
        res,
        'Ugyldige påloggings opplysninger. Vennligst sjekk brukernavn og passord og prøv igjen.',
        'Invalid Credentials'
      )
    }

    const match = await user.checkPassword(req.body.password, user.password)

    if (!match) {
      return apiResponse.notFoundResponse(
        res,
        'Ugyldige påloggings opplysninger. Vennligst sjekk brukernavn og passord og prøv igjen.',
        'Invalid Credentials'
      )
    }

    const otp = generateOTP()
    const loginOtpDoc = await AdminLoginOtpModel.create({
      user_id: user?.id,
      otp,
    })

    if (!loginOtpDoc) {
      return apiResponse.ErrorResponse(
        res,
        'Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.',
        'System went wrong, Kindly try again later'
      )
    }
    // Generate OTP for login
    const emailBody = `
    Hei ${user.first_name} ${user.last_name},
    <br>Din engangskode for pålogging er: <strong>${otp}</strong>
    <br>Bruk denne engangskoden for å logge på kontoen din.
    <br><br>Med vennlig hilsen,
    <br>Team HYHM`
    // await sendEmail(user.email, 'Logg inn OTP', emailBody)

    return apiResponse.successResponseWithData(
      res,
      `Engangskode sendt til ${user.email}.`,
      `OTP sent to ${user.email}`,
      {
        id: loginOtpDoc.id,
      }
    )
  } catch (err) {
    next(err)
  }
}

const loginAdminVerifyOtp = async (req, res, next) => {
  try {
    if (!req.body.otp || !req.body.id) {
      return apiResponse.ErrorResponse(
        res,
        'OTP og ID er ikke oppgitt',
        'OTP and id is not provided'
      )
    }
    const otpDetail = await AdminLoginOtpModel.findById(req.body.id).exec()

    if (!otpDetail) {
      return apiResponse.notFoundResponse(res, 'Engangskoden er utløpt.', 'OTP Expired')
    }
    if (otpDetail.otp !== req.body.otp) {
      return apiResponse.notFoundResponse(res, 'Ugyldig engangskode.', 'Invalid OTP')
    }
    const user = await AdminModel.findById(otpDetail.user_id).exec()

    if (!user) {
      return apiResponse.notFoundResponse(
        res,
        'Beklager, brukeren ble ikke funnet. Vennligst sjekk at brukernavnet er riktig skrevet.',
        'User Not Found'
      )
    }

    await AdminLoginOtpModel.findByIdAndDelete(otpDetail.id)

    user.ip_address = req.header('x-forwarded-for') || req.socket.remoteAddress

    // Generate JWT Access Token
    const token = await generateToken(
      { id: user.id, user_type: user.user_type, role: 'admin' },
      process.env.JWT_SECRET_KEY,
      process.env.JWT_AUTH_TOKEN_EXPIRE
    )

    // Generate JWT Refresh Token
    const refreshToken = await generateToken(
      { id: user.id, user_type: user.user_type, role: 'admin' },
      process.env.JWT_SECRET_KEY_REFRESH_TOKEN,
      process.env.JWT_REFRESH_TOKEN_EXPIRE
    )

    user.last_login = new Date()
    user.access_token = token
    user.refresh_token = refreshToken
    await user.save()

    // remove password extra fields from user object
    user.password = undefined
    user.ip_address = undefined
    user.access_token = undefined
    user.refresh_token = undefined
    res.set('Authorization', `Bearer ${refreshToken}`)

    return apiResponse.successResponseWithData(
      res,
      `Velkommen ${user.first_name}, autentisering ble vellykket.`,
      `Welcome ${user.first_name}, User Authenticated Successfully`,
      {
        user,
        access_token: token,
      }
    )
  } catch (err) {
    next(err)
  }
}

const loginAdminResendOtp = async (req, res, next) => {
  try {
    if (!req.body.id) {
      return apiResponse.ErrorResponse(res, 'ID er påkrevd', 'id is required')
    }
    const otpDetail = await AdminLoginOtpModel.findById(req.body.id).populate('user_id').exec()

    if (!otpDetail) {
      return apiResponse.notFoundResponse(
        res,
        'Tiden for oppgitt engangskode er utløpt. Vennligst logg inn på nytt.',
        'Time Expired, Please Login Again'
      )
    }

    // Generate OTP for login
    const emailBody = `
    Hei ${otpDetail.user_id.first_name} ${otpDetail.user_id.last_name},
    <br>Din engangskode for pålogging er: <strong>${otpDetail.otp}</strong>
    <br>Bruk denne engangskoden for å logge på kontoen din.
    <br><br>Med vennlig hilsen,
    <br>Team HYHM`
    await sendEmail(otpDetail.user_id.email, 'Logg inn OTP', emailBody)

    return apiResponse.successResponseWithData(
      res,
      `OTP sendt til ${otpDetail.user_id.email}`,
      `OTP resent to ${otpDetail.user_id.email}`,
      {
        id: otpDetail.id,
      }
    )
  } catch (err) {
    next(err)
  }
}

const logoutAdmin = async (req, res, next) => {
  try {
    // eslint-disable-next-line prefer-const
    let findParams = {
      _id: new ObjectId(req.user._id),
    }
    // eslint-disable-next-line prefer-const
    let user = await AdminModel.findOne(findParams).exec()
    if (!user) {
      return apiResponse.notFoundResponse(
        res,
        'Beklager, vi finner ikke dataen du ser etter.',
        'Not found!'
      )
    }
    user.access_token = ''
    user.refresh_token = ''
    user.save()
    return apiResponse.successResponse(res, 'Bruker logget ut', 'User Logged out successfully')
  } catch (err) {
    next(err)
  }
}

const createAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body

    function isValidEmail(value) {
      const re =
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      return re.test(String(value).toLowerCase())
    }

    if (!email || !password || password.length < 6 || !isValidEmail(email)) {
      return apiResponse.validationErrorWithData(
        res,
        'Beklager, det oppstod en valideringsfeil.',
        'Validation Error',
        'Invalid Data'
      )
    }

    req.body.image = req?.file?.location || ''
    const { ...itemDetails } = req.body
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return apiResponse.validationErrorWithData(
        res,
        'Beklager, det oppstod en valideringsfeil.',
        'Validation Error',
        'Invalid Data'
      )
    }
    const createdItem = new AdminModel(itemDetails)

    createdItem.save(async (err) => {
      if (err) {
        if (err?.keyValue?.email != null && err?.code === 11000) {
          return apiResponse.ErrorResponse(
            res,
            'E-posten du har angitt er allerede i bruk.',
            'Email already in use'
          )
        }
        return apiResponse.ErrorResponse(
          res,
          'Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.',
          'System went wrong, Kindly try again later'
        )
      }
      const passwordReset = await AdminUserPasswordResetModel.create({
        user_id: createdItem?._id,
      })
      const body = `Hei ${req.body.first_name} ${req.body.last_name}!
      <br>Velkommen til HYHM plattformen.
      <br><br>Klikk her for å fullføre registreringsprosessen:
      <br><a href=${process.env.ADMIN_DOMAIN_URL}/create-account/${passwordReset?._id} target="_blank">${process.env.ADMIN_DOMAIN_URL}/create-account/${passwordReset?._id}</a>
      <br><br>Med vennlig hilsen,
      <br>Team HYHM`
      sendEmail(req.body.email, 'HYHM - Ny bruker', body)
      return apiResponse.successResponseWithData(
        res,
        'Oppretting vellykket.',
        'Created successfully',
        createdItem
      )
    })
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
    //   <br>Velkommen til HYHM plattformen.
    //   <br><br>Klikk her for å fullføre registreringsprosessen:
    //   <br><a href=${process.env.ADMIN_DOMAIN_URL}/reset-password/${passwordReset.id} target="_blank">${process.env.ADMIN_DOMAIN_URL}/reset-password/${passwordReset.id}</a>
    //   <br><br>Med vennlig hilsen,
    //   <br>Team HYHM`;
    //   sendEmail(req.body.email, "HYHM - Ny bruker", body);
    // }
  } catch (err) {
    next(err)
  }
}

const getAdmin = async (req, res, next) => {
  try {
    const adminId = req.user.id
    // if (!mongoose.Types.ObjectId.isValid(adminId)) {
    //   return apiResponse.validationErrorWithData(
    //     res,
    //     "Beklager, det oppstod en valideringsfeil.",
    //     "Validation Error",
    //     "Invalid Data"
    //   );
    // }

    const user = await AdminModel.findById(adminId).select('-password')
    if (!user) {
      return apiResponse.notFoundResponse(
        res,
        'Beklager, vi finner ikke dataen du ser etter.',
        'Not found!'
      )
    }

    // remove password extra fields from user object
    user.password = undefined
    user.ip_address = undefined
    user.access_token = undefined
    user.refresh_token = undefined

    return apiResponse.successResponseWithData(
      res,
      'Brukerdetaljer hentet',
      'User Details Fetched',
      user
    )
  } catch (err) {
    next(err)
  }
}

const getAdminById = async (req, res, next) => {
  try {
    const adminId = req.params.id
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return apiResponse.validationErrorWithData(
        res,
        'Beklager, det oppstod en valideringsfeil.',
        'Validation Error',
        'Invalid Data'
      )
    }

    const user = await AdminModel.findById(adminId).select('-password')
    if (!user) {
      return apiResponse.notFoundResponse(
        res,
        'Beklager, vi finner ikke dataen du ser etter.',
        'Not found!'
      )
    }

    // remove password extra fields from user object
    user.password = undefined
    user.ip_address = undefined
    user.access_token = undefined
    user.refresh_token = undefined

    return apiResponse.successResponseWithData(
      res,
      'Brukerdetaljer hentet',
      'User Details Fetched',
      user
    )
  } catch (err) {
    next(err)
  }
}

const getAdmins = async (req, res, next) => {
  try {
    const term = req.query.search
    return await getPagination({
      req,
      res,
      model: AdminModel,
      findOptions: {
        $or: [{ firstName: { $regex: term, $options: 'i' } }, { lastName: { $regex: term } }],
      },
    })
  } catch (err) {
    next(err)
  }
}

const deleteAdmin = async (req, res, next) => {
  try {
    await softDelete({
      req,
      res,
      Model: AdminModel,
      itemName: 'Admin',
    })
  } catch (err) {
    next(err)
  }
}

const updateProfile = async (req, res, next) => {
  try {
    if (req?.file?.location) {
      req.body.image = req?.file?.location
    }
    if (req.user.id !== req.params.id) {
      return apiResponse.ErrorResponse(
        res,
        'Du har ikke tillatelse til å oppdatere denne brukeren.',
        'You are not authorized to update this user'
      )
    }
    if (req.body.user_type && req.body.user_type !== '') {
      return apiResponse.ErrorResponse(
        res,
        'Du er ikke autorisert til å oppdatere brukertype',
        'You are not authorized to update user type'
      )
    }
    if (req?.body?.password && req?.body?.password !== '') {
      const adminUser = await AdminModel.findById(req.user.id)
      if (!adminUser) {
        return apiResponse.notFoundResponse(
          res,
          'Beklager, vi finner ikke dataen du ser etter.',
          'Not found!'
        )
      }
      const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!]).{8,}$/
      if (!passwordRegex.test(req.body.password)) {
        return apiResponse.badRequestResponse(
          res,
          'Passordvalidering mislyktes',
          'Password Validation failed'
        )
      }
      req.body.password = await hashPassord({ password: req.body.password })
    }
    // update admin profile
    const updatedAdmin = await AdminModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    })
    // Something went wrong kindly try again later
    if (!updatedAdmin) {
      return apiResponse.ErrorResponse(
        res,
        'Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.',
        'Something went wrong, Kindly try again later'
      )
    }

    // remove password extra fields from user object
    updatedAdmin.password = undefined
    updatedAdmin.ip_address = undefined
    updatedAdmin.access_token = undefined
    updatedAdmin.refresh_token = undefined

    return apiResponse.successResponseWithData(
      res,
      'Brukerdetaljer oppdatert',
      'User Details Updated',
      updatedAdmin
    )
  } catch (err) {
    next(err)
  }
}

const updateAdmin = async (req, res, next) => {
  try {
    if (req?.file?.location) {
      req.body.image = req?.file?.location
    }
    if (req?.body?.password && req?.body?.password !== '') {
      const adminUser = await AdminModel.findById(req.params.id)
      if (!adminUser) {
        return apiResponse.notFoundResponse(
          res,
          'Beklager, vi finner ikke dataen du ser etter.',
          'Not found!'
        )
      }
      const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!]).{8,}$/
      if (!passwordRegex.test(req.body.password)) {
        return apiResponse.badRequestResponse(
          res,
          'Passordvalidering mislyktes',
          'Password Validation failed'
        )
      }
      if (req.user._id.toString() !== adminUser._id.toString()) {
        const body = `Ditt passord har blitt endret.
          <br>Her er ny innlogginsinfo:
          <br><br>Brukernavn: ${adminUser.email}
          <br>Passord: ${req.body.password}`
        sendEmail(adminUser.email, 'HYHM - Bruker oppdatert', body)
      }
      req.body.password = await hashPassord({ password: req.body.password })
    }
    // update admin profile
    const updatedAdmin = await AdminModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    })
    // Something went wrong kindly try again later
    if (!updatedAdmin) {
      return apiResponse.ErrorResponse(
        res,
        'Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.',
        'Something went wrong, Kindly try again later'
      )
    }

    // remove password extra fields from user object
    updatedAdmin.password = undefined
    updatedAdmin.ip_address = undefined
    updatedAdmin.access_token = undefined
    updatedAdmin.refresh_token = undefined

    return apiResponse.successResponseWithData(
      res,
      'Brukerdetaljer oppdatert',
      'User Details Updated',
      updatedAdmin
    )
  } catch (err) {
    next(err)
  }
}

const sendUserPasswordResetEmail = async (req, res, next) => {
  try {
    const { email } = req.body
    if (email) {
      const user = await AdminModel.findOne({ email })
      if (user) {
        const passwordReset = await AdminUserPasswordResetModel.create({
          user_id: user?.id,
        })
        const emailBody = `Hei ${user.first_name} ${user.last_name},
        <br>Følg linken under for å angi et nytt passord for din HYHM konto:
        <br><a href=${process.env.ADMIN_DOMAIN_URL}/reset-password/${passwordReset.id} target="_blank">${process.env.ADMIN_DOMAIN_URL}/reset-password/${passwordReset.id}</a>
        <br><br>Med vennlig hilsen,
        <br>Team HYHM`
        await sendEmail(user.email, 'Tilbakestill ditt passord', emailBody)
        // await sendPasswordResetEmail(user.email, { user, link }, res);

        return apiResponse.successResponse(
          res,
          'Tilbakestill passord Sendt e-post... Vennligst sjekk e-posten din',
          'Password Reset Email Sent... Please Check Your Email'
        )
      }
      return apiResponse.ErrorResponse(res, 'E-post eksisterer ikke', "Email doesn't exist")
    }
    return apiResponse.ErrorResponse(res, 'E-postfelt er påkrevd', 'Email Field is Required')
  } catch (err) {
    next(err)
  }
}

const getResetPasswordRequestDetails = async (req, res, next) => {
  try {
    const requestId = req.params.id
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return apiResponse.validationErrorWithData(
        res,
        'Beklager, det oppstod en valideringsfeil.',
        'Validation Error',
        'Invalid Data'
      )
    }

    const requestDetail = await AdminUserPasswordResetModel.findById(requestId).select('-user_id')
    if (!requestDetail) {
      return apiResponse.successResponse(res, 'Link utløpt', 'Link Expired')
    }
    return apiResponse.successResponseWithData(
      res,
      'Detalj hentet',
      'Detail Fetched',
      requestDetail
    )
  } catch (err) {
    next(err)
  }
}

const userPasswordReset = async (req, res, next) => {
  try {
    const { password, password_confirmation } = req.body
    const { id, token } = req.params
    const user = await AdminModel.findById(id)

    await verifyToken(token, process.env.JWT_SECRET_KEY)

    if (password && password_confirmation) {
      if (password !== password_confirmation) {
        return apiResponse.ErrorResponse(
          res,
          'Nytt passord og Bekreft nytt passord stemmer ikke overens',
          "New Password and Confirm New Password doesn't match"
        )
      }
      const salt = await bcrypt.genSalt(10)
      const newHashPassword = await bcrypt.hash(password, salt)
      await AdminModel.findByIdAndUpdate(user._id, {
        $set: { password: newHashPassword },
      })

      return apiResponse.successResponse(res, 'Passord tilbakestilt', 'Password Reset Successfully')
    }
    return apiResponse.ErrorResponse(res, 'Alle felt må fylles ut', 'All Fields are Required')
  } catch (err) {
    next(err)
  }
}

const refreshingToken = async (req, res, next) => {
  try {
    const authorization = req.headers.Authorization || req.headers.authorization

    if (authorization && authorization.startsWith('Bearer')) {
      const token = authorization.split(' ')[1]

      if (!token) {
        return apiResponse.ErrorResponse(res, 'Ugyldig token', 'Invalid Token')
      }
      const decodedPayload = await verifyToken(token, process.env.JWT_SECRET_KEY_REFRESH_TOKEN)

      if (decodedPayload && decodedPayload.id) {
        const user = await AdminModel.findOne({
          _id: decodedPayload.id,
          refresh_token: token,
        }).exec()

        if (!user) {
          return apiResponse.ErrorResponse(
            res,
            'Ugyldig token / utløpt token',
            'Invalid Token / Expired Token'
          )
        }

        const newToken = await generateToken(
          { id: user.id, user_type: user.user_type, role: 'admin' },
          process.env.JWT_SECRET_KEY,
          process.env.JWT_AUTH_TOKEN_EXPIRE
        )
        user.access_token = newToken
        await user.save()
        user.password = undefined
        user.ip_address = undefined
        user.access_token = undefined
        user.refresh_token = undefined
        // res.set("Authorization", `Bearer ${newToken}`);

        return apiResponse.successResponseWithData(res, 'Oppdatert token', 'Updated Token', {
          access_token: newToken,
          user,
        })
      }
      return apiResponse.ErrorResponse(res, 'Ugyldig token bestått', 'Invalid Token Passed')
    }
  } catch (err) {
    next(err)
  }
}

const loggedUser = async (req, res, next) => {
  try {
    if (req.user) {
      await getItemWithPopulate({
        query: { _id: req.user._id },
        Model: AdminModel,
        populateObject: [],
        res,
      })
    } else {
      return apiResponse.ErrorResponse(res, 'Ugyldig token', 'Invalid Token')
    }
  } catch (err) {
    next(err)
  }
}

const changeUserPassword = async (req, res, next) => {
  try {
    const { password, request_id } = req.body
    if (!password) {
      return apiResponse.ErrorResponse(res, 'Passord er påkrevd', 'Password is Required')
    }
    if (!request_id) {
      return apiResponse.ErrorResponse(res, 'Forespørselen er ugyldig', 'Request is invalid')
    }

    const requestDetail = await AdminUserPasswordResetModel.findById(request_id)
    if (!requestDetail) {
      return apiResponse.ErrorResponse(res, 'Link utløpt', 'Link Expired')
    }
    const salt = await bcrypt.genSalt(10)
    const newHashPassword = await bcrypt.hash(password, salt)
    await AdminModel.findByIdAndUpdate(requestDetail.user_id, {
      $set: { password: newHashPassword },
    })
    await AdminUserPasswordResetModel.findByIdAndDelete(request_id)

    return apiResponse.successResponse(res, 'Passord tilbakestilt', 'Password reset succesfully')
  } catch (err) {
    next(err)
  }
}

const getAdminStats = async (req, res, next) => {
  try {
    const aggregateCondition = [
      // {
      //   $match:
      //     /**
      //      * query: The query in MQL.
      //      */
      //     {
      //       $or: [
      //         {
      //           "order_awarded.awarded_to_driver":
      //             ObjectId("64e31e7b9db00656f9270541"),
      //         },
      // {
      //   driver_id: ObjectId(
      //     "64e31e7b9db00656f9270541"
      //   ),
      // },
      //       ],
      //     },
      // }
      {
        $addFields:
          /**
           * newField: The new field name.
           * expression: The new field expression.
           */
          {
            driver_order_completed: {
              $size: {
                $filter: {
                  input: '$order_awarded',
                  as: 'orderAwarded',
                  cond: {
                    $and: [
                      {
                        $eq: ['$$orderAwarded.order_awarded_status', 'completed'],
                      },
                    ],
                  },
                },
              },
            },
            driver_order_cancel: {
              $size: {
                $filter: {
                  input: '$order_awarded',
                  as: 'orderAwarded',
                  cond: {
                    $and: [
                      {
                        $eq: ['$$orderAwarded.order_awarded_status', 'cancel'],
                      },
                    ],
                  },
                },
              },
            },
            driver_order_accepted: {
              $size: {
                $filter: {
                  input: '$order_awarded',
                  as: 'orderAwarded',
                  cond: {
                    $and: [
                      {
                        $eq: ['$$orderAwarded.order_awarded_status', 'accepted'],
                      },
                    ],
                  },
                },
              },
            },
          },
      },
      {
        $lookup:
          /**
           * from: The target collection.
           * localField: The local join field.
           * foreignField: The target join field.
           * as: The name for the results.
           * pipeline: Optional pipeline to run on the foreign collection.
           * let: Optional variables to use in the pipeline field stages.
           */
          {
            from: 'payments',
            localField: 'driver_id',
            foreignField: 'driver_id',
            as: 'driver_payments',
          },
      },
      {
        $addFields:
          /**
           * newField: The new field name.
           * expression: The new field expression.
           */
          {
            driver_total_earning_array: {
              $filter: {
                input: '$driver_payments',
                as: 'payment',
                cond: {
                  $and: [
                    {
                      $eq: ['$$payment.status', 'completed'],
                    },
                  ],
                },
              },
            },
          },
      },
      {
        $addFields:
          /**
           * newField: The new field name.
           * expression: The new field expression.
           */
          {
            driver_total_earning: {
              $sum: '$driver_total_earning_array.driver_share_amount',
            },
          },
      },
      {
        $group: {
          _id: 'stats',
          total: {
            $sum: 1,
          },
          tender_published: {
            $sum: {
              $cond: [
                {
                  $eq: ['$tender_status', 'published'],
                },
                1,
                0,
              ],
            },
          },
          tender_accepted: {
            $sum: {
              $cond: [
                {
                  $eq: ['$tender_status', 'accepted'],
                },
                1,
                0,
              ],
            },
          },
          order_awaiting_for_payment: {
            $sum: {
              $cond: [
                {
                  $eq: ['$order.order_status', 'awaiting_for_payment'],
                },
                1,
                0,
              ],
            },
          },
          order_payment_done: {
            $sum: {
              $cond: [
                {
                  $eq: ['$order.order_status', 'payment_done'],
                },
                1,
                0,
              ],
            },
          },
          order_processing: {
            $sum: {
              $cond: [
                {
                  $eq: ['$order.order_status', 'processing'],
                },
                1,
                0,
              ],
            },
          },
          order_on_the_way: {
            $sum: {
              $cond: [
                {
                  $eq: ['$order.order_status', 'on_the_way'],
                },
                1,
                0,
              ],
            },
          },
          order_completed: {
            $sum: {
              $cond: [
                {
                  $eq: ['$order.order_status', 'completed'],
                },
                1,
                0,
              ],
            },
          },
          order_cancel: {
            $sum: {
              $cond: [
                {
                  $eq: ['$order.order_status', 'cancel'],
                },
                1,
                0,
              ],
            },
          },
          driver_order_completed: {
            $sum: '$driver_order_completed',
          },
          driver_order_cancel: {
            $sum: '$driver_order_cancel',
          },
          driver_order_accepted: {
            $sum: '$driver_order_accepted',
          },
          driver_total_earning: {
            $first: '$driver_total_earning',
          },
        },
      },
    ]
    const userDetail = await TenderModel.aggregate(aggregateCondition)

    return apiResponse.successResponseWithData(
      res,
      'Brukerdetaljene ble hentet',
      'User detail fetched successfully',
      userDetail?.length > 0 ? userDetail[0] : null
    )
  } catch (err) {
    next(err)
  }
}

const getAppUsersStats = async (req, res, next) => {
  try {
    const aggregateCondition = [
      {
        $group: {
          _id: 'stats',
          total: {
            $sum: 1,
          },
          user_type_driver_count: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    {
                      $reduce: {
                        input: '$user_type',
                        initialValue: false,
                        in: {
                          $eq: ['$$this.role', 'driver'],
                        },
                      },
                    },
                    true,
                  ],
                },
                1,
                0,
              ],
            },
          },
          user_type_customer_count: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    {
                      $reduce: {
                        input: '$user_type',
                        initialValue: false,
                        in: {
                          $eq: ['$$this.role', 'customer'],
                        },
                      },
                    },
                    true,
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]

    const constDriver = await userModel.count({ 'user_type.role': 'driver' })

    const userDetail = await userModel.aggregate(aggregateCondition)

    userDetail?.length > 0 ? (userDetail[0].user_type_driver_count = constDriver) : null
    return apiResponse.successResponseWithData(
      res,
      'Brukerdetaljene ble hentet',
      'User detail fetched successfully',
      userDetail?.length > 0 ? userDetail[0] : null
    )
  } catch (err) {
    next(err)
  }
}

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
  getAdminStats,
  getAppUsersStats,
}
