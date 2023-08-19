/* eslint-disable no-param-reassign */
/* eslint-disable no-restricted-syntax */
const mongoose = require('mongoose')
const {ObjectId} = require('mongodb')
const bcrypt = require('bcrypt')
const _ = require('lodash')
const moment = require('moment')
const apiResponse = require('../../../helpers/apiResponse')
const {validationResult} = require('express-validator')
const {generateToken, verifyToken} = require('../../../middlewares/authMiddleware')
const OrganisationUserPasswordResetModel = require('../models/organisationUserPasswordReset.model')
const UserModel = require('../models/user.model')
const PaymentTransferModel = require('../models/paymentTransfer.model')
const PendingPaymentModel = require('../models/pendingPayment.model')
const GoalSupportModel = require('../models/goalSupport.model')
const vippsHelper = require('../../../helpers/vipps.helper')
const {sendEmail} = require('../../../helpers/emailSender')
const {getPagination, softDelete, totalItems, hashPassord} = require('../../../helpers/commonApis')
const notification = require('../models/notification.model')
const randomNumber = require('../../../utils/randomNumber')
const OrganisationLoginOtpModel = require('../models/organisationLoginOtp.model')
const {generateOTP} = require('../../../helpers/otpVerification')

const loginVippsAuthUri = async (req, res, next) => {
  try {
    const uriPayload = await vippsHelper.getVippsLoginAuthUri(
      req.body.redirect_uri,
      req.body.callback_uri
    )
    return apiResponse.successResponseWithData(
      res,
      'URI for å autentisere Vipps hentet',
      'URI to authenticate Vipps fetched',
      uriPayload
    )
  } catch (err) {
    next(err)
  }
}

const loginVippsUserInfo = async (req, res, next) => {
  try {
    const userInfoPayload = await vippsHelper.getVippsLoginUserInfo(
      req.body.code,
      req.body.redirect_uri
    )
    if (!userInfoPayload) {
      return apiResponse.notFoundResponse(
        res,
        'Kan ikke logge på, prøv igjen',
        'Unable to login, Kindly try again'
      )
    }
    // eslint-disable-next-line prefer-const
    let findParams = {
      mobile_number: userInfoPayload.phone_number,
    }
    // check user already exist in db
    let user = await UserModel.findOne(findParams).exec()

    if (!user) {
      // register user
      user = await UserModel.create({
        first_name: userInfoPayload?.given_name,
        last_name: userInfoPayload?.family_name,
        mobile_number: userInfoPayload?.phone_number,
        email: userInfoPayload?.email,
        birth_date: userInfoPayload?.birthdate,
        password: process.env.VIPPS_LOGIN_DEFAULT_PASSCODE,
      })
    }

    if (req.body.push_token) {
      user.push_token = req.body.push_token
    }

    user.ip_address = req.header('x-forwarded-for') || req.socket.remoteAddress

    // Generate JWT Access Token
    const token = await generateToken(
      {id: user.id, user_type: '', role: 'app'},
      process.env.JWT_SECRET_KEY,
      process.env.JWT_AUTH_TOKEN_EXPIRE
    )

    // Generate JWT Refresh Token
    const refreshToken = await generateToken(
      {id: user.id, user_type: '', role: 'app'},
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
    user.session_id = undefined
    user.bank_name = undefined
    user.account_id = undefined
    user.agreement_id = undefined
    user.bank_account = undefined
    user.bank_connection_list = undefined
    user.push_token = undefined
    res.set('Authorization', `Bearer ${refreshToken}`)

    return apiResponse.successResponseWithData(
      res,
      `Velkommen ${user.first_name}, autentisering ble vellykket.`,
      `Welcome ${user.first_name}, User Authenticated Successfully`,
      {
        access_token: token,
        user,
      }
    )
  } catch (err) {
    next(err)
  }
}

const getUser = async (req, res, next) => {
  try {
    const userId = req.user.id
    // if (!mongoose.Types.ObjectId.isValid(userId)) {
    //   return apiResponse.validationErrorWithData(
    //     res,
    //     "Beklager, det oppstod en valideringsfeil.",
    //     "Validation Error",
    //     "Invalid Data"
    //   );
    // }
    const user = await UserModel.findById(userId).select('-password')
    if (!user) {
      return apiResponse.notFoundResponse(
        res,
        'Beklager, vi finner ikke dataen du ser etter.',
        'Not found!'
      )
    }
    // remove extra fields from response
    user.password = undefined
    user.ip_address = undefined
    user.access_token = undefined
    user.refresh_token = undefined
    user.session_id = undefined
    user.bank_name = undefined
    user.account_id = undefined
    user.agreement_id = undefined
    user.bank_account = undefined
    user.bank_connection_list = undefined
    user.push_token = undefined

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

const getDetailProfile = async (req, res, next) => {
  try {
    const userId = req.params.id
    if (!userId) {
      return apiResponse.validationErrorWithData(
        res,
        'Beklager, det oppstod en valideringsfeil.',
        'Validation Error',
        'Invalid Data'
      )
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse.validationErrorWithData(
        res,
        'Beklager, det oppstod en valideringsfeil.',
        'Validation Error',
        'Invalid Data'
      )
    }
    const aggregateCondition = [
      {
        $match: {
          _id: new ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: 'notifications',
          localField: '_id',
          foreignField: 'user_id',
          as: 'notifications_list',
        },
      },
      {
        $lookup: {
          from: 'goalsupports',
          localField: '_id',
          foreignField: 'user_id',
          as: 'goal_support_list',
        },
      },
      {
        $lookup: {
          from: 'paymenttransfers',
          localField: '_id',
          foreignField: 'user_id',
          as: 'payment_list',
        },
      },
      {
        $lookup: {
          from: 'pendingpayments',
          localField: '_id',
          foreignField: 'user_id',
          as: 'all_pending_payment_list',
        },
      },
      {
        $addFields: {
          total_amount: {
            $sum: '$payment_list.amount',
          },
          pending_payment_list: {
            $filter: {
              input: '$all_pending_payment_list',
              as: 'data',
              cond: {
                $eq: ['$$data.status', 'pending'],
              },
            },
          },
          active_goal_support_count: {
            $size: {
              $filter: {
                input: '$goal_support_list',
                as: 'data',
                cond: {
                  $eq: ['$$data.status', 'active'],
                },
              },
            },
          },
          unread_notifications_count: {
            $size: {
              $filter: {
                input: '$notifications_list',
                as: 'data',
                cond: {
                  $eq: ['$$data.read', false],
                },
              },
            },
          },
          stopped_goal_support_count: {
            $size: {
              $filter: {
                input: '$goal_support_list',
                as: 'data',
                cond: {
                  $and: [
                    {
                      $eq: ['$$data.status', 'completed'],
                    },
                    {
                      $eq: ['$$data.status', 'canceled'],
                    },
                  ],
                },
              },
            },
          },
          paused_goal_support_count: {
            $size: {
              $filter: {
                input: '$goal_support_list',
                as: 'data',
                cond: {
                  $eq: ['$$data.status', 'paused'],
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          pending_total_amount: {
            $sum: '$pending_payment_list.amount',
          },
        },
      },
      {
        $unwind: {
          path: '$goal_support_list',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'goalsupports',
          localField: 'goal_support_list.goal_id',
          foreignField: 'goal_id',
          as: 'goal_support_list.goal_supports',
        },
      },
      {
        $lookup: {
          from: 'goals',
          localField: 'goal_support_list.goal_id',
          foreignField: '_id',
          as: 'goal_support_list.goal_detail',
        },
      },
      {
        $unwind: {
          path: '$goal_support_list.goal_detail',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'paymenttransfers',
          localField: 'goal_support_list.goal_id',
          foreignField: 'goal_id',
          as: 'goal_support_list.payment_list',
        },
      },
      {
        $lookup: {
          from: 'organisations',
          localField: 'goal_support_list.organisation_id',
          foreignField: '_id',
          as: 'goal_support_list.organisation_details',
        },
      },
      {
        $unwind: {
          path: '$goal_support_list.organisation_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'pendingpayments',
          localField: 'goal_support_list._id',
          foreignField: 'goal_support_id',
          as: 'goal_support_list.all_pending_payment_list',
        },
      },
      {
        $lookup: {
          from: 'organisationsports',
          localField: 'goal_support_list.organisation_sports_category_id',
          foreignField: '_id',
          as: 'goal_support_list.sport_details',
        },
      },
      {
        $unwind: {
          path: '$goal_support_list.sport_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          'goal_support_list.sports_category_name':
            '$goal_support_list.sport_details.sports_category_name',
          'goal_support_list.user_payment_list': {
            $filter: {
              input: '$goal_support_list.payment_list',
              as: 'data',
              cond: {
                $eq: ['$$data.user_id', new ObjectId(userId)],
              },
            },
          },
          'goal_support_list.active_goal_support': {
            $filter: {
              input: '$goal_support_list.goal_supports',
              as: 'data',
              cond: {
                $eq: ['$$data.status', 'active'],
              },
            },
          },
          'goal_support_list.pending_payment_list': {
            $filter: {
              input: '$goal_support_list.all_pending_payment_list',
              as: 'data',
              cond: {
                $eq: ['$$data.status', 'pending'],
              },
            },
          },
        },
      },
      {
        $addFields: {
          'goal_support_list.total_amount': {
            $sum: '$goal_support_list.payment_list.amount',
          },
          'goal_support_list.user_total_amount': {
            $sum: '$goal_support_list.user_payment_list.amount',
          },
          'goal_support_list.pending_amount': {
            $sum: '$goal_support_list.pending_payment_list.amount',
          },
          'goal_support_list.active_goal_support_user_count': {
            $size: {
              $reduce: {
                input: '$goal_support_list.active_goal_support',
                initialValue: [],
                in: {
                  $setUnion: ['$$value', ['$$this.user_id']],
                },
              },
            },
          },
          'goal_support_list.goal_title': '$goal_support_list.goal_detail.title',
          'goal_support_list.goal_description': '$goal_support_list.goal_detail.short_description',
          'goal_support_list.organisation_name': '$goal_support_list.organisation_details.org_name',
          'goal_support_list.organisation_number':
            '$goal_support_list.organisation_details.organisation_number',
          'goal_support_list.organisation_logo_base64':
            '$goal_support_list.organisation_details.org_logo_base64',
          'goal_support_list.organisation_logo': '$goal_support_list.organisation_details.logo',
          'goal_support_list.pending_payment_list.goal_title':
            '$goal_support_list.goal_detail.title',
        },
      },
      {
        $project: {
          'goal_support_list.agreement_payload': 0,
          'goal_support_list.goal_detail': 0,
          'goal_support_list.__v': 0,
          'goal_support_list.payment_list': 0,
          'goal_support_list.accounts': 0,
          'goal_support_list.organisation_details': 0,
          'goal_support_list.active_goal_support': 0,
          'goal_support_list.all_pending_payment_list': 0,
          'goal_support_list.goal_supports': 0,
          'goal_support_list.sport_details': 0,
        },
      },
      {
        $group: {
          _id: '$_id',
          first_name: {
            $first: '$first_name',
          },
          last_name: {
            $first: '$last_name',
          },
          email: {
            $first: '$email',
          },
          mobile_number: {
            $first: '$mobile_number',
          },
          image: {
            $first: '$image',
          },
          status: {
            $first: '$status',
          },
          session_id: {
            $first: '$session_id',
          },
          session_id_date: {
            $first: '$session_id_date',
          },
          created_at: {
            $first: '$created_at',
          },
          total_amount: {
            $first: '$total_amount',
          },
          pending_total_amount: {
            $first: '$pending_total_amount',
          },
          bank_account: {
            $first: '$bank_account',
          },
          bank_id: {
            $first: '$bank_id',
          },
          bank_name: {
            $first: '$bank_name',
          },
          bank_connection_list: {
            $first: '$bank_connection_list',
          },
          active_goal_support_count: {
            $first: '$active_goal_support_count',
          },
          stopped_goal_support_count: {
            $first: '$stopped_goal_support_count',
          },
          paused_goal_support_count: {
            $first: '$paused_goal_support_count',
          },
          unread_notifications_count: {
            $first: '$unread_notifications_count',
          },
          goal_support_list: {
            $push: '$goal_support_list',
          },
        },
      },
    ]
    const userDetail = await UserModel.aggregate(aggregateCondition)
    if (userDetail?.length === 0) {
      return apiResponse.notFoundResponse(
        res,
        'Beklager, vi finner ikke dataen du ser etter.',
        'Not found!'
      )
    }
    // filter the goal support if the goal support _id does not exist.
    userDetail[0].goal_support_list = userDetail[0].goal_support_list.filter(
      (goalSupport) => goalSupport?._id
    )

    const filteredUserProfile = {
      ...userDetail[0],
      bank_connection_list: userDetail[0]?.bank_connection_list?.length
        ? [
            {
              id: userDetail[0]?.bank_connection_list[0]?.id || '',
              bban: userDetail[0]?.bank_connection_list[0]?.bban || '',
              displayName: userDetail[0]?.bank_connection_list[0]?.displayName || '',
            },
          ]
        : [],
    }

    userDetail[0].unread_notifications_count = await notification.countDocuments({
      user_id: new ObjectId(userId),
      read: false,
    })
    return apiResponse.successResponseWithData(
      res,
      'Brukerdetaljene ble hentet',
      'User detail fetched successfully',
      filteredUserProfile
    )
  } catch (err) {
    next(err)
  }
}

const getDetailProfileApp = async (req, res, next) => {
  try {
    const userId = req.user.id
    if (!userId) {
      return apiResponse.validationErrorWithData(
        res,
        'Beklager, det oppstod en valideringsfeil.',
        'Validation Error',
        'Invalid Data'
      )
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse.validationErrorWithData(
        res,
        'Beklager, det oppstod en valideringsfeil.',
        'Validation Error',
        'Invalid Data'
      )
    }
    const aggregateCondition = [
      {
        $match: {
          _id: new ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: 'notifications',
          localField: '_id',
          foreignField: 'user_id',
          as: 'notifications_list',
        },
      },
      {
        $lookup: {
          from: 'goalsupports',
          localField: '_id',
          foreignField: 'user_id',
          as: 'goal_support_list',
        },
      },
      {
        $lookup: {
          from: 'paymenttransfers',
          localField: '_id',
          foreignField: 'user_id',
          as: 'payment_list',
        },
      },
      {
        $lookup: {
          from: 'pendingpayments',
          localField: '_id',
          foreignField: 'user_id',
          as: 'all_pending_payment_list',
        },
      },
      {
        $addFields: {
          total_amount: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$payment_list',
                    as: 'payment',
                    cond: {$eq: ['$$payment.status', 'charged']},
                  },
                },
                in: '$$this.amount',
              },
            },
          },
          reserved_amount: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$payment_list',
                    as: 'payment',
                    cond: {$ne: ['$$payment.status', 'charged']},
                  },
                },
                in: '$$this.amount',
              },
            },
          },
          pending_payment_list: {
            $filter: {
              input: '$all_pending_payment_list',
              as: 'data',
              cond: {
                $eq: ['$$data.status', 'pending'],
              },
            },
          },
          active_goal_support_count: {
            $size: {
              $filter: {
                input: '$goal_support_list',
                as: 'data',
                cond: {
                  $eq: ['$$data.status', 'active'],
                },
              },
            },
          },
          unread_notifications_count: {
            $size: {
              $filter: {
                input: '$notifications_list',
                as: 'data',
                cond: {
                  $eq: ['$$data.read', false],
                },
              },
            },
          },
          stopped_goal_support_count: {
            $size: {
              $filter: {
                input: '$goal_support_list',
                as: 'data',
                cond: {
                  $and: [
                    {
                      $eq: ['$$data.status', 'completed'],
                    },
                    {
                      $eq: ['$$data.status', 'canceled'],
                    },
                  ],
                },
              },
            },
          },
          paused_goal_support_count: {
            $size: {
              $filter: {
                input: '$goal_support_list',
                as: 'data',
                cond: {
                  $eq: ['$$data.status', 'paused'],
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          pending_total_amount: {
            $sum: '$pending_payment_list.amount',
          },
        },
      },
      {
        $unwind: {
          path: '$goal_support_list',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'goalsupports',
          localField: 'goal_support_list.goal_id',
          foreignField: 'goal_id',
          as: 'goal_support_list.goal_supports',
        },
      },
      {
        $lookup: {
          from: 'goals',
          localField: 'goal_support_list.goal_id',
          foreignField: '_id',
          as: 'goal_support_list.goal_detail',
        },
      },
      {
        $unwind: {
          path: '$goal_support_list.goal_detail',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'paymenttransfers',
          localField: 'goal_support_list.goal_id',
          foreignField: 'goal_id',
          as: 'goal_support_list.payment_list',
        },
      },
      {
        $lookup: {
          from: 'organisations',
          localField: 'goal_support_list.organisation_id',
          foreignField: '_id',
          as: 'goal_support_list.organisation_details',
        },
      },
      {
        $unwind: {
          path: '$goal_support_list.organisation_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'pendingpayments',
          localField: 'goal_support_list._id',
          foreignField: 'goal_support_id',
          as: 'goal_support_list.all_pending_payment_list',
        },
      },
      {
        $lookup: {
          from: 'organisationsports',
          localField: 'goal_support_list.organisation_sports_category_id',
          foreignField: '_id',
          as: 'goal_support_list.sport_details',
        },
      },
      {
        $unwind: {
          path: '$goal_support_list.sport_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          'goal_support_list.sports_category_name':
            '$goal_support_list.sport_details.sports_category_name',
          'goal_support_list.user_payment_list': {
            $filter: {
              input: '$goal_support_list.payment_list',
              as: 'data',
              cond: {
                $eq: ['$$data.user_id', new ObjectId(userId)],
              },
            },
          },
          'goal_support_list.active_goal_support': {
            $filter: {
              input: '$goal_support_list.goal_supports',
              as: 'data',
              cond: {
                $eq: ['$$data.status', 'active'],
              },
            },
          },
          'goal_support_list.pending_payment_list': {
            $filter: {
              input: '$goal_support_list.all_pending_payment_list',
              as: 'data',
              cond: {
                $eq: ['$$data.status', 'pending'],
              },
            },
          },
        },
      },
      {
        $addFields: {
          'goal_support_list.total_amount': {
            $sum: '$goal_support_list.payment_list.amount',
          },
          'goal_support_list.user_total_amount': {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$goal_support_list.user_payment_list',
                    as: 'payment',
                    cond: {$eq: ['$$payment.status', 'charged']},
                  },
                },
                in: '$$this.amount',
              },
            },
          },
          'goal_support_list.user_total_reserved_amount': {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$goal_support_list.user_payment_list',
                    as: 'payment',
                    cond: {$ne: ['$$payment.status', 'charged']},
                  },
                },
                in: '$$this.amount',
              },
            },
          },
          'goal_support_list.pending_amount': {
            $sum: '$goal_support_list.pending_payment_list.amount',
          },
          'goal_support_list.active_goal_support_user_count': {
            $size: {
              $reduce: {
                input: '$goal_support_list.active_goal_support',
                initialValue: [],
                in: {
                  $setUnion: ['$$value', ['$$this.user_id']],
                },
              },
            },
          },
          'goal_support_list.goal_title': '$goal_support_list.goal_detail.title',
          'goal_support_list.target_amount': '$goal_support_list.goal_detail.target_amount',
          'goal_support_list.goal_description': '$goal_support_list.goal_detail.short_description',
          'goal_support_list.goal_start_date': '$goal_support_list.goal_detail.start_date',
          'goal_support_list.goal_end_date': {
            $cond: {
              if: {
                $eq: [
                  {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$goal_support_list.goal_detail.due_date',
                    },
                  },
                  '3024-01-01',
                ],
              },
              then: '',
              else: '$goal_support_list.goal_detail.due_date',
            },
          },
          'goal_support_list.organisation_name': '$goal_support_list.organisation_details.org_name',
          'goal_support_list.organisation_number':
            '$goal_support_list.organisation_details.organisation_number',
          'goal_support_list.organisation_logo_base64':
            '$goal_support_list.organisation_details.org_logo_base64',
          'goal_support_list.organisation_logo': '$goal_support_list.organisation_details.logo',
          'goal_support_list.pending_payment_list.goal_title':
            '$goal_support_list.goal_detail.title',
        },
      },
      {
        $project: {
          'goal_support_list.agreement_payload': 0,
          'goal_support_list.goal_detail': 0,
          'goal_support_list.__v': 0,
          'goal_support_list.payment_list': 0,
          'goal_support_list.accounts': 0,
          'goal_support_list.organisation_details': 0,
          'goal_support_list.active_goal_support': 0,
          'goal_support_list.all_pending_payment_list': 0,
          'goal_support_list.goal_supports': 0,
          'goal_support_list.sport_details': 0,
        },
      },
      {
        $group: {
          _id: '$_id',
          first_name: {
            $first: '$first_name',
          },
          last_name: {
            $first: '$last_name',
          },
          email: {
            $first: '$email',
          },
          mobile_number: {
            $first: '$mobile_number',
          },
          image: {
            $first: '$image',
          },
          status: {
            $first: '$status',
          },
          session_id: {
            $first: '$session_id',
          },
          session_id_date: {
            $first: '$session_id_date',
          },
          created_at: {
            $first: '$created_at',
          },
          total_amount: {
            $first: '$total_amount',
          },
          reserved_amount: {
            $first: '$reserved_amount',
          },
          pending_total_amount: {
            $first: '$pending_total_amount',
          },
          bank_account: {
            $first: '$bank_account',
          },
          bank_id: {
            $first: '$bank_id',
          },
          bank_name: {
            $first: '$bank_name',
          },
          bank_connection_list: {
            $first: '$bank_connection_list',
          },
          active_goal_support_count: {
            $first: '$active_goal_support_count',
          },
          stopped_goal_support_count: {
            $first: '$stopped_goal_support_count',
          },
          paused_goal_support_count: {
            $first: '$paused_goal_support_count',
          },
          unread_notifications_count: {
            $first: '$unread_notifications_count',
          },
          goal_support_list: {
            $push: '$goal_support_list',
          },
        },
      },
    ]
    const userDetail = await UserModel.aggregate(aggregateCondition)
    if (userDetail?.length === 0) {
      return apiResponse.notFoundResponse(
        res,
        'Beklager, vi finner ikke dataen du ser etter.',
        'Not found!'
      )
    }
    // filter the goal support if the goal support _id does not exist.
    userDetail[0].goal_support_list = userDetail[0].goal_support_list.filter(
      (goalSupport) => goalSupport?._id
    )

    const filteredUserProfile = {
      ...userDetail[0],
      bank_connection_list: userDetail[0]?.bank_connection_list?.length
        ? [
            {
              id: userDetail[0]?.bank_connection_list[0]?.id || '',
              bban: userDetail[0]?.bank_connection_list[0]?.bban || '',
              displayName: userDetail[0]?.bank_connection_list[0]?.displayName || '',
            },
          ]
        : [],
    }

    userDetail[0].unread_notifications_count = await notification.countDocuments({
      user_id: new ObjectId(userId),
      read: false,
    })
    return apiResponse.successResponseWithData(
      res,
      'Brukerdetaljene ble hentet',
      'User detail fetched successfully',
      filteredUserProfile
    )
  } catch (err) {
    next(err)
  }
}

const getUserTransactions = async (req, res, next) => {
  try {
    const userId = req.params.id
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse.validationErrorWithData(
        res,
        'Beklager, det oppstod en valideringsfeil.',
        'Validation Error',
        'Invalid Data'
      )
    }
    const page = req.query.page > 0 ? req.query.page : 1
    const perPage = req.query.limit ? parseInt(req.query.limit, 10) : 10
    const aggregateCondition = [
      {
        $match: {
          user_id: new ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: 'pendingpayments',
          localField: '_id',
          foreignField: 'payment_transfer_id',
          as: 'pending_payment_list',
        },
      },
      {
        $lookup: {
          from: 'goals',
          localField: 'goal_id',
          foreignField: '_id',
          as: 'goal_details',
        },
      },
      {
        $unwind: {
          path: '$goal_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          goal_title: '$goal_details.title',
          goal_description: '$goal_details.short_description',
        },
      },
      {
        $project: {
          goal_details: 0,
        },
      },
    ]
    const currentMonth = moment().month()
    const firstDayOfMonth = moment().month(currentMonth).startOf('month')

    const lastDayOfMonth = moment().month(currentMonth).endOf('month')
    const weekDates = []

    const currentDate = moment(firstDayOfMonth).startOf('isoWeek')
    while (currentDate.isSameOrBefore(lastDayOfMonth)) {
      const weekStart = currentDate.format('YYYY-MM-DD')
      const weekEnd = moment(currentDate).endOf('isoWeek').format('YYYY-MM-DD')

      weekDates.push({start: weekStart, end: weekEnd})

      currentDate.add(1, 'week')
    }
    const countParams = {user_id: userId}
    const total = await PaymentTransferModel.count(countParams).exec()
    const data = await PaymentTransferModel.aggregate([...aggregateCondition])
    const grouped_items = _.groupBy(data, (b) => moment(b.created_at).format('YYYY-MM-DD'))

    _.values(grouped_items).forEach((arr) =>
      arr.sort((a, b) => moment(a.created_at).day() - moment(b.created_at).day())
    )

    const finalRes = []
    let inc = 1
    weekDates.forEach((el) => {
      // eslint-disable-next-line guard-for-in
      for (const key in grouped_items) {
        const isInRange = moment(key).isBetween(el.start, el.end, null, '[]')
        const hasKeyValue = finalRes.some((obj) => obj.date === moment(el.end).format('DD.MM.YYYY'))
        let filteredArray
        if (hasKeyValue) {
          filteredArray = finalRes.filter((obj) => obj.date === moment(el.end).format('DD.MM.YYYY'))
        }
        if (isInRange) {
          // eslint-disable-next-line prefer-const
          let obj = {
            date: moment(el.end).format('DD.MM.YYYY'),
            goals: [],
          }
          let g = {}
          const groupByGoal = _.groupBy(grouped_items[key], (it) => it.goal_id)

          for (const singleGoal in groupByGoal) {
            if (singleGoal.length > 0) {
              g = {}
              g = {
                goal_title: groupByGoal[singleGoal][0].goal_title,
                status: groupByGoal[singleGoal][0].status,
                max_amount: groupByGoal[singleGoal][0].max_amount,
                no_of_transaction: groupByGoal[singleGoal][0].no_of_transactions,
                total_amount: 0,
                pending_payment_list: groupByGoal[singleGoal][0].pending_payment_list,
                // eslint-disable-next-line no-plusplus
                increment: inc++,
                transaction_fetch_date: groupByGoal[singleGoal][0].transaction_fetch_date,
              }
              // eslint-disable-next-line no-undef
              for (trs of groupByGoal[singleGoal][0].pending_payment_list) {
                // eslint-disable-next-line no-undef
                g.total_amount += trs.amount
              }
              obj.goals.push(g)
            }
          }
          if (!hasKeyValue) {
            finalRes.push(obj)
          } else {
            filteredArray[0].goals.push(g)
          }
        }
      }
    })
    const aggregateConditionPending = [
      {
        $match: {
          user_id: new ObjectId(userId),
          status: 'pending',
        },
      },
      {
        $lookup: {
          from: 'goals',
          localField: 'goal_id',
          foreignField: '_id',
          as: 'goal_details',
        },
      },
      {
        $unwind: {
          path: '$goal_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          goal_title: '$goal_details.title',
          goal_description: '$goal_details.short_description',
        },
      },
      {
        $project: {
          goal_details: 0,
        },
      },
    ]
    const dataPending = await PendingPaymentModel.aggregate([...aggregateConditionPending])
    // eslint-disable-next-line prefer-const
    let grouped_items_pending = _.groupBy(dataPending, (b) =>
      moment(b.created_at).format('YYYY-MM-DD')
    )

    _.values(grouped_items_pending).forEach((arr) =>
      arr.sort((a, b) => moment(a.created_at).day() - moment(b.created_at).day())
    )
    weekDates.forEach((el) => {
      // eslint-disable-next-line guard-for-in, prefer-const
      for (let key in grouped_items_pending) {
        const isInRange = moment(key).isBetween(el.start, el.end, null, '[]')
        const hasKeyValue = finalRes.some((obj) => obj.date === moment(el.end).format('DD.MM.YYYY'))
        let filteredArray
        if (hasKeyValue) {
          filteredArray = finalRes.filter((obj) => obj.date === moment(el.end).format('DD.MM.YYYY'))
        }
        if (isInRange) {
          // eslint-disable-next-line prefer-const
          let obj = {
            date: moment(el.end).format('DD.MM.YYYY'),
            goals: [],
          }
          let g = {}
          const groupByGoal = _.groupBy(grouped_items_pending[key], (it) => it.goal_id)
          // eslint-disable-next-line prefer-const
          for (let singleGoal in groupByGoal) {
            if (singleGoal.length > 0) {
              g = {}
              g = {
                goal_title: groupByGoal[singleGoal][0].goal_title,
                max_amount: groupByGoal[singleGoal][0].max_amount,
                status: groupByGoal[singleGoal][0].status,
                no_of_transaction: groupByGoal[singleGoal][0].no_of_transactions,
                total_amount: 0,
                pending_payment_list: [],
                // eslint-disable-next-line no-plusplus
                increment: inc++,
                transaction_fetch_date: groupByGoal[singleGoal][0].transaction_fetch_date,
              }
              // eslint-disable-next-line no-undef
              for (trs of groupByGoal[singleGoal]) {
                // eslint-disable-next-line no-undef
                g.total_amount += trs.amount
                g.pending_payment_list.push({
                  // eslint-disable-next-line no-undef
                  created_at: trs.created_at,
                  // eslint-disable-next-line no-undef
                  no_of_transactions: trs.no_of_transactions,
                  // eslint-disable-next-line no-undef
                  support_amount: trs.support_amount,
                  // eslint-disable-next-line no-undef
                  amount: trs.amount,
                })
              }
              obj.goals.push(g)
            }
          }
          if (!hasKeyValue) {
            finalRes.push(obj)
          } else {
            filteredArray[0].goals.push(g)
          }
        }
      }
    })
    return apiResponse.successResponseWithPagination(res, page, total, perPage, finalRes)
  } catch (err) {
    next(err)
  }
}

const getUserTransactionsApp = async (req, res, next) => {
  try {
    const userId = req.params.id
    const yearParams = req.params.year
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return apiResponse.validationErrorWithData(
        res,
        'Beklager, det oppstod en valideringsfeil.',
        'Validation Error',
        'Invalid Data'
      )
    }
    // you are not allowed to see other user's transactions
    if (req.user.id !== userId) {
      return apiResponse.ErrorResponse(
        res,
        'Du har ikke tilgang til å se andre brukeres transaksjoner',
        "You are not allowed to see other user's transactions"
      )
    }

    const page = req.query.page > 0 ? req.query.page : 1
    const perPage = req.query.limit ? parseInt(req.query.limit, 10) : 10
    const countParams = {user_id: userId}
    const total = await PendingPaymentModel.count(countParams).exec()
    const data = await PendingPaymentModel.find({
      user_id: userId,
      created_at: {
        $gte: new Date(`${yearParams}-01-01`),
        $lt: new Date(`${yearParams + 1}-01-01`),
      },
    })
    const groupedData = data.reduce((acc, item) => {
      const weekNumber = randomNumber.getWeekNumber(new Date(item.created_at))
      if (!acc[weekNumber]) {
        acc[weekNumber] = []
      }
      acc[weekNumber].push(item)
      return acc
    }, {})
    const finalRes = []
    Object.keys(groupedData).forEach((weekNumber) => {
      const weekData = groupedData[weekNumber]
      if (weekData.length > 0) {
        // eslint-disable-next-line prefer-const
        let resp = {
          week: parseInt(weekNumber, 10),
          total_transactions: 0,
          total_amount: 0,
          transactions_list: weekData,
        }
        const sum_total_transactions = weekData.reduce(
          (acc, obj) => acc + obj.no_of_transactions,
          0
        )
        const sum_total_amount = weekData.reduce((acc, obj) => acc + obj.amount, 0)
        resp.total_transactions = sum_total_transactions
        resp.total_amount = sum_total_amount
        finalRes.push(resp)
      }
    })
    finalRes.sort((a, b) => b.week - a.week)
    return apiResponse.successResponseWithPagination(res, page, total, perPage, finalRes)
  } catch (err) {
    next(err)
  }
}

const getUserTransactionsAppGoalSupport = async (req, res, next) => {
  try {
    const goal_support_id = req.params.id
    const yearParams = req.params.year
    if (!mongoose.Types.ObjectId.isValid(goal_support_id)) {
      return apiResponse.validationErrorWithData(
        res,
        'Beklager, det oppstod en valideringsfeil.',
        'Validation Error',
        'Invalid Data'
      )
    }
    const goalSupport = await GoalSupportModel.findOne({
      _id: goal_support_id,
    }).exec()
    if (!goalSupport) {
      return apiResponse.notFoundResponse(
        res,
        'Beklager, vi finner ikke dataen du ser etter.',
        'Not found!'
      )
    }
    // You are not allowed to see other user's transactions
    if (req.user.id !== goalSupport.user_id.toString()) {
      return apiResponse.ErrorResponse(
        res,
        'Du har ikke tilgang til å se andre brukeres transaksjoner',
        "You are not allowed to see other user's transactions"
      )
    }
    const page = req.query.page > 0 ? req.query.page : 1
    const perPage = req.query.limit ? parseInt(req.query.limit, 10) : 10
    const countParams = {goal_support_id}
    const total = await PendingPaymentModel.count(countParams).exec()
    const data = await PendingPaymentModel.find({
      goal_support_id,
      created_at: {
        $gte: new Date(`${yearParams}-01-01`),
        $lt: new Date(`${yearParams + 1}-01-01`),
      },
    })
      .populate({path: 'goal_id', select: 'title'})
      .exec()
    const groupedData = data.reduce((acc, item) => {
      const weekNumber = randomNumber.getWeekNumber(new Date(item.created_at))
      if (!acc[weekNumber]) {
        acc[weekNumber] = []
      }
      acc[weekNumber].push(item)
      return acc
    }, {})
    const finalRes = []
    Object.keys(groupedData).forEach((weekNumber) => {
      const weekData = groupedData[weekNumber]
      if (weekData.length > 0) {
        const updatedWeekData = weekData.map((item) => {
          item._doc.goal_title = item.goal_id.title || ''
          item._doc.goal_id = undefined
          return item
        })
        // eslint-disable-next-line prefer-const
        let resp = {
          week: parseInt(weekNumber, 10),
          total_transactions: 0,
          total_amount: 0,
          goal_title: updatedWeekData[0]?._doc?.goal_title,
          transactions_list: updatedWeekData,
        }
        const sum_total_transactions = updatedWeekData.reduce(
          (acc, obj) => acc + obj.no_of_transactions,
          0
        )
        const sum_total_amount = updatedWeekData.reduce((acc, obj) => acc + obj.amount, 0)
        resp.total_transactions = sum_total_transactions
        resp.total_amount = sum_total_amount
        finalRes.push(resp)
      }
    })
    finalRes.sort((a, b) => b.week - a.week)
    return apiResponse.successResponseWithPagination(res, page, total, perPage, finalRes)
  } catch (err) {
    next(err)
  }
}

const getUsers = async (req, res, next) => {
  try {
    const term = req.query.search
    return await getPagination({
      req,
      res,
      model: UserModel,
      findOptions: {
        $or: [
          {firstName: {$regex: term, $options: 'i'}},
          {lastName: {$regex: term, $options: 'i'}},
        ],
      },
    })
  } catch (err) {
    next(err)
  }
}

const deleteUser = async (req, res, next) => {
  try {
    await softDelete({
      req,
      res,
      Model: UserModel,
      itemName: 'User',
    })
  } catch (err) {
    next(err)
  }
}

const updateUser = async (req, res, next) => {
  try {
    if (req?.file?.location) {
      req.body.image = req?.file?.location
    }
    if (req.body.password) {
      req.body.password = await hashPassord({password: req.body.password})
    }
    if (req.user.id !== req.params.id) {
      return apiResponse.ErrorResponse(
        res,
        'Du har ikke tilgang til å oppdatere andre brukeres data',
        "You are not allowed to update other user's data"
      )
    }

    // update user profile
    const updatedUser = await UserModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    })
    // Something went wrong kindly try again later
    if (!updatedUser) {
      return apiResponse.ErrorResponse(
        res,
        'Beklager, det oppstod en systemfeil. Vennligst prøv igjen senere.',
        'Something went wrong, Kindly try again later'
      )
    }

    // remove password extra fields from user object
    updatedUser.password = undefined
    updatedUser.ip_address = undefined
    updatedUser.access_token = undefined
    updatedUser.refresh_token = undefined
    updatedUser.session_id = undefined
    updatedUser.bank_name = undefined
    updatedUser.account_id = undefined
    updatedUser.agreement_id = undefined
    updatedUser.bank_account = undefined
    updatedUser.bank_connection_list = undefined
    updatedUser.push_token = undefined

    return apiResponse.successResponseWithData(
      res,
      'Brukerdetaljer oppdatert',
      'User Details Updated',
      updatedUser
    )
  } catch (err) {
    next(err)
  }
}

const logout = async (req, res, next) => {
  try {
    // eslint-disable-next-line prefer-const
    let findParams = {
      _id: new ObjectId(req.user._id),
    }
    // eslint-disable-next-line prefer-const
    let user = await UserModel.findOne(findParams).exec()
    if (!user) {
      return apiResponse.notFoundResponse(
        res,
        'Beklager, vi finner ikke dataen du ser etter.',
        'Not found!'
      )
    }
    user.push_token = ''
    user.access_token = ''
    user.save()
    return apiResponse.successResponse(
      res,
      'Bruker logget av vellykket',
      'User Logged out successfully'
    )
  } catch (err) {
    next(err)
  }
}

const totalUsers = async (req, res, next) => {
  try {
    await totalItems({
      req,
      res,
      Model: UserModel,
      itemName: 'OrganisationUser',
    })
  } catch (err) {
    next(err)
  }
}

const loginUser = async (req, res, next) => {
  try {
    if (!req.body.email || !req.body.password) {
      return apiResponse.ErrorResponse(res, 'trenger e-post og passord', 'need email and password')
    }
    // eslint-disable-next-line prefer-const
    let findParams = {
      email: req.body.email,
    }
    // eslint-disable-next-line prefer-const
    let user = await UserModel.findOne(findParams).exec()
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

    // Generate JWT Access Token
    const token = await generateToken(
      {id: user.id, user_type: '', role: 'app'},
      process.env.JWT_SECRET_KEY,
      process.env.JWT_AUTH_TOKEN_EXPIRE
    )

    // Generate JWT Refresh Token
    const refreshToken = await generateToken(
      {id: user.id, user_type: '', role: 'app'},
      process.env.JWT_SECRET_KEY_REFRESH_TOKEN,
      process.env.JWT_REFRESH_TOKEN_EXPIRE
    )

    user.push_token = req.body.push_token ? req.body.push_token : ''
    user.access_token = token
    user.refresh_token = refreshToken
    await user.save()

    user.password = undefined
    res.set('Authorization', `Bearer ${refreshToken}`)

    return apiResponse.successResponseWithData(
      res,
      `Velkommen ${user.first_name}, autentisering ble vellykket.`,
      `Welcome ${user.first_name}, User Authenticated Successfully`,
      {
        access_token: token,
        user,
      }
    )
  } catch (err) {
    next(err)
  }
}

const refreshTokenUser = async (req, res, next) => {
  try {
    const authorization = req.headers.Authorization || req.headers.authorization

    if (authorization && authorization.startsWith('Bearer')) {
      const token = authorization.split(' ')[1]

      if (!token) {
        return apiResponse.JwtErrorResponse(res, 'Ugyldig token', 'Invalid Token')
      }
      const decodedPayload = await verifyToken(token, process.env.JWT_SECRET_KEY_REFRESH_TOKEN)

      if (decodedPayload && decodedPayload.id) {
        const user = await UserModel.findOne({
          _id: decodedPayload.id,
          refresh_token: token,
        }).exec()
        if (!user) {
          return apiResponse.JwtErrorResponse(
            res,
            'Ugyldig token / utløpt token',
            'Invalid Token / Expired Token'
          )
        }

        const newToken = await generateToken(
          {id: user.id, user_type: '', role: 'app'},
          process.env.JWT_SECRET_KEY,
          process.env.JWT_AUTH_TOKEN_EXPIRE
        )
        user.access_token = newToken
        await user.save()
        // res.set("Authorization", `Bearer ${newToken}`);
        user.password = undefined
        user.ip_address = undefined
        user.access_token = undefined
        user.refresh_token = undefined
        user.session_id = undefined
        user.bank_name = undefined
        user.account_id = undefined
        user.agreement_id = undefined
        user.bank_account = undefined
        user.bank_connection_list = undefined
        user.push_token = undefined

        return apiResponse.successResponseWithData(res, 'Oppdatert token', 'Updated Token', {
          access_token: newToken,
          user,
        })
      }
      return apiResponse.JwtErrorResponse(res, 'Ugyldig token bestått', 'Invalid Token Passed')
    }
  } catch (err) {
    next(err)
  }
}

const searchUser = async (req, res, next) => {
  try {
    const term = req.query.search || ''
    const page = req.query.page > 0 ? parseInt(req.query.page, 10) : 1
    const perPage = req.query.limit ? parseInt(req.query.limit, 10) : 10

    const findOptions = {
      $or: [
        {first_name: {$regex: term, $options: 'i'}},
        {last_name: {$regex: term, $options: 'i'}},
        {mobile_number: {$regex: term, $options: 'i'}},
      ],
    }

    const aggregateCondition = [
      {
        $match: findOptions,
      },
    ]

    const totalResult = await UserModel.find(findOptions)

    const total = totalResult.length
    const data = await UserModel.aggregate([
      ...aggregateCondition,
      {
        $skip: perPage * (page - 1),
      },
      {
        $limit: perPage,
      },
    ])

    res.status(200).json({
      pagination: {
        page: +page,
        pages: Math.ceil(total / perPage),
        total: data.length,
        totalRecords: total,
        pageSize: perPage,
      },
      data,
    })
  } catch (err) {
    next(err)
  }
}

const loginFrontEnd = async (req, res, next) => {
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
    const user = await UserModel.findOne(params).exec()

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
    const loginOtpDoc = await OrganisationLoginOtpModel.create({
      user_id: user?.id,
      otp,
    })

    if (!loginOtpDoc) {
      return apiResponse.ErrorResponse(
        res,
        'Noe gikk galt, prøv igjen',
        'Something went wrong, kindly try again'
      )
    }
    // Generate OTP for login
    const emailBody = `
    Hei ${user.first_name} ${user.last_name},
    <br>Din engangskode for pålogging er: <strong>${otp}</strong>
    <br>Bruk denne engangskoden for å logge på kontoen din.
    <br><br>Med vennlig hilsen,
    <br>Team Støtte`
    await sendEmail(user.email, 'Logg inn OTP', emailBody)

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

const loginFrontEndVerifyOtp = async (req, res, next) => {
  try {
    if (!req.body.otp || !req.body.id) {
      return apiResponse.ErrorResponse(
        res,
        'OTP og ID er ikke oppgitt',
        'OTP and id is not provided'
      )
    }
    const otpDetail = await OrganisationLoginOtpModel.findById(req.body.id).exec()

    if (!otpDetail) {
      return apiResponse.notFoundResponse(res, 'Engangskoden er utløpt.', 'OTP Expired')
    }
    if (otpDetail.otp !== req.body.otp) {
      return apiResponse.notFoundResponse(res, 'Ugyldig engangskode.', 'Invalid OTP')
    }
    const user = await UserModel.findById(otpDetail.user_id).exec()

    if (!user) {
      return apiResponse.notFoundResponse(
        res,
        'Beklager, brukeren ble ikke funnet. Vennligst sjekk at brukernavnet er riktig skrevet.',
        'User Not Found'
      )
    }

    await OrganisationLoginOtpModel.findByIdAndDelete(otpDetail.id)

    // Generate JWT Access Token
    const token = await generateToken(
      {id: user.id, user_type: '', role: 'app'},
      process.env.JWT_SECRET_KEY,
      process.env.JWT_AUTH_TOKEN_EXPIRE
    )

    // Generate JWT Refresh Token
    const refreshToken = await generateToken(
      {id: user.id, user_type: '', role: 'app'},
      process.env.JWT_SECRET_KEY_REFRESH_TOKEN,
      process.env.JWT_REFRESH_TOKEN_EXPIRE
    )

    user.push_token = req.body.push_token ? req.body.push_token : ''
    user.access_token = token
    user.refresh_token = refreshToken
    await user.save()

    user.password = undefined
    res.set('Authorization', `Bearer ${refreshToken}`)

    return apiResponse.successResponseWithData(
      res,
      `Velkommen ${user.first_name}, autentisering ble vellykket.`,
      `Welcome ${user.first_name}, User Authenticated Successfully`,
      {
        access_token: token,
        user,
      }
    )
  } catch (err) {
    next(err)
  }
}

const loginFrontEndResendOtp = async (req, res, next) => {
  try {
    if (!req.body.id) {
      return apiResponse.ErrorResponse(res, 'ID er påkrevd', 'id is required')
    }
    const otpDetail = await OrganisationLoginOtpModel.findById(req.body.id)
      .populate('user_id')
      .exec()

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
    <br>Team Støtte`
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

const createUserFrontEnd = async (req, res, next) => {
  try {
    const {email, password} = req.body

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

    const {...itemDetails} = req.body
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return apiResponse.validationErrorWithData(
        res,
        'Beklager, det oppstod en valideringsfeil.',
        'Validation Error',
        'Invalid Data'
      )
    }
    const createdItem = new UserModel(itemDetails)

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
      const passwordReset = await OrganisationUserPasswordResetModel.create({
        user_id: createdItem?._id,
      })
      const body = `Hei ${req.body.first_name} ${req.body.last_name}!
      <br>Velkommen til Støtte plattformen.
      <br><br>Klikk her for å fullføre registreringsprosessen:
      <br><a href=${process.env.ORG_DOMAIN_URL}/create-account/${passwordReset?._id} target="_blank">${process.env.ORG_DOMAIN_URL}/create-account/${passwordReset?._id}</a>
      <br><br>Med vennlig hilsen,
      <br>Team Støtte`
      sendEmail(req.body.email, 'Støtte - Ny bruker', body)
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
    //   Model: UserModel,
    //   itemName: "OrganisationUser",
    // });
  } catch (err) {
    next(err)
  }
}

const sendUserFrontEndPasswordResetEmail = async (req, res, next) => {
  try {
    const {email} = req.body
    if (email) {
      const user = await UserModel.findOne({email})
      if (user) {
        const passwordReset = await OrganisationUserPasswordResetModel.create({
          user_id: user?.id,
        })
        const emailBody = `Hei ${user.first_name} ${user.last_name},
        <br>Følg linken under for å angi et nytt passord for din Støtte konto:
        <br><a href=${process.env.ORG_DOMAIN_URL}/reset-password/${passwordReset.id} target="_blank">${process.env.ORG_DOMAIN_URL}/reset-password/${passwordReset.id}</a>
        <br><br>Med vennlig hilsen,
        <br>Team Støtte`
        await sendEmail(user.email, 'Tilbakestill ditt passord', emailBody)
        // await sendPasswordResetEmail(user.email, { user, link }, res);

        return apiResponse.successResponse(
          res,
          'Tilbakestill passord e-post sendt... Vennligst sjekk e-posten din',
          'Password Reset Email Sent... Please Check Your Email'
        )
      }
      return apiResponse.notFoundResponse(res, 'E-post finnes ikke', "Email doesn't exists")
    }
    return apiResponse.ErrorResponse(res, 'E-postfelt er påkrevd', 'Email Field is Required')
  } catch (err) {
    next(err)
  }
}

const getUserFrontEndResetPasswordRequestDetails = async (req, res, next) => {
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

    const requestDetail = await OrganisationUserPasswordResetModel.findById(requestId).select(
      '-user_id'
    )
    if (!requestDetail) {
      return apiResponse.ErrorResponse(res, 'Link utløpt', 'Link Expired')
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

const changeUserFrontEndUserPassword = async (req, res, next) => {
  try {
    const {password, request_id} = req.body
    if (!password) {
      return apiResponse.ErrorResponse(res, 'Passord er påkrevd', 'Password is Required')
    }
    if (!request_id) {
      return apiResponse.ErrorResponse(res, 'Forespørselen er ugyldig', 'Request is invalid')
    }
    const requestDetail = await OrganisationUserPasswordResetModel.findById(request_id)

    if (!requestDetail) {
      return apiResponse.ErrorResponse(res, 'Link utløpt', 'Link Expired')
    }
    const salt = await bcrypt.genSalt(10)

    const newHashPassword = await bcrypt.hash(password, salt)

    console.log(newHashPassword)

    await UserModel.findByIdAndUpdate(requestDetail.user_id, {
      $set: {password: newHashPassword},
    })

    await OrganisationUserPasswordResetModel.findByIdAndDelete(request_id)

    return apiResponse.successResponse(res, 'Passord tilbakestilt', 'Password reset succesfully')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  loginVippsAuthUri,
  loginVippsUserInfo,
  getUsers,
  getDetailProfile,
  getDetailProfileApp,
  getUserTransactions,
  getUser,
  updateUser,
  deleteUser,
  totalUsers,
  loginUser,
  refreshTokenUser,
  searchUser,
  logout,
  getUserTransactionsApp,
  getUserTransactionsAppGoalSupport,
  loginFrontEnd,
  loginFrontEndVerifyOtp,
  loginFrontEndResendOtp,
  createUserFrontEnd,
  sendUserFrontEndPasswordResetEmail,
  getUserFrontEndResetPasswordRequestDetails,
  changeUserFrontEndUserPassword,
}
