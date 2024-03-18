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
const vippsHelper = require('../../../helpers/vipps.helper')
const {sendEmail} = require('../../../helpers/emailSender')
const {
  getPagination,
  softDelete,
  totalItems,
  hashPassord,
  getFilterOptions,
} = require('../../../helpers/commonApis')
const notification = require('../models/notification.model')
const randomNumber = require('../../../utils/randomNumber')
const TenderModel = require('../models/tender.model')
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
    const userId = req.params.id

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

const getDetailProfileDriver = async (req, res, next) => {
  try {
    const userId = req?.params?.id

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
        $match:
          /**
           * query: The query in MQL.
           */
          {
            $or: [
              {
                'order_awarded.awarded_to_driver': new ObjectId(userId),
              },
              {
                driver_id: new ObjectId(userId),
              },
            ],
          },
      },
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

const getDetailProfileCustomer = async (req, res, next) => {
  try {
    const userId = req?.params?.id
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
        $match:
          /**
           * query: The query in MQL.
           */
          {
            $or: [
              // {
              //   'order_awarded.awarded_to_driver': new ObjectId(userId),
              // },
              {
                customer_id: new ObjectId(userId),
              },
            ],
          },
      },
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

const getUsers = async (req, res, next) => {
  const term = req?.query?.search ? req?.query?.search : ''
  const role = req?.query?.role ? req?.query?.role : 'all'
  const filter = getFilterOptions(req)
  let andCod = []
  let orCod = []

  if (term) {
    orCod.push(
      {first_name: {$regex: term, $options: 'i'}},
      {last_name: {$regex: term, $options: 'i'}},
      {mobile_number: {$regex: term, $options: 'i'}},
      {email: {$regex: term, $options: 'i'}}
    )
  }
  if (role != 'all' && role) {
    andCod.push({'user_type.role': role})
  }

  console.log(andCod)

  try {
    return await getPagination({
      req,
      res,
      model: UserModel,
      findOptions: {
        $and: andCod.length > 0 ? andCod : [{}],
        $or: orCod.length > 0 ? orCod : [{}],
        ...filter,
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
    // if (req.user.id !== req.params.id) {
    //   return apiResponse.ErrorResponse(
    //     res,
    //     'Du har ikke tilgang til å oppdatere andre brukeres data',
    //     "You are not allowed to update other user's data"
    //   )
    // }
    if (req.body.email) {
      delete req.body.email
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

    await UserModel.updateOne(
      {_id: user?._id},
      {
        access_token: token,
        refresh_token: refreshToken,
        push_token: req.body.push_token ? req.body.push_token : '',
      }
    )
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

const getDetailProfileStatsData = async (req, res, next) => {
  const userId = req?.user?.id
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

  /////// customer stats
  const aggregateCondition1 = [
    {
      $match:
        /**
         * query: The query in MQL.
         */
        {
          $or: [
            // {
            //   'order_awarded.awarded_to_driver': new ObjectId(userId),
            // },
            {
              customer_id: new ObjectId(userId),
            },
          ],
        },
    },
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
      },
    },
  ]
  const userDetail1 = await TenderModel.aggregate(aggregateCondition1)

  ///////driver Stats//////////////

  const aggregateCondition2 = [
    {
      $match:
        /**
         * query: The query in MQL.
         */
        {
          $or: [
            {
              'order_awarded.awarded_to_driver': new ObjectId(userId),
            },
            {
              driver_id: new ObjectId(userId),
            },
          ],
        },
    },
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
  const userDetail2 = await TenderModel.aggregate(aggregateCondition2)

  return apiResponse.successResponseWithData(
    res,
    'Brukerdetaljene ble hentet',
    'User detail fetched successfully',
    {
      customer_stats: userDetail1?.length > 0 ? userDetail1[0] : null,
      driver_stats: userDetail2?.length > 0 ? userDetail2[0] : null,
      user: req?.user,
    }
  )
}

module.exports = {
  loginVippsAuthUri,
  loginVippsUserInfo,
  getUsers,
  getDetailProfile,
  getDetailProfileStatsData,
  getUser,
  updateUser,
  deleteUser,
  totalUsers,
  loginUser,
  refreshTokenUser,
  searchUser,
  logout,
  loginFrontEnd,
  loginFrontEndVerifyOtp,
  loginFrontEndResendOtp,
  createUserFrontEnd,
  sendUserFrontEndPasswordResetEmail,
  getUserFrontEndResetPasswordRequestDetails,
  changeUserFrontEndUserPassword,
  getDetailProfileCustomer,
  getDetailProfileDriver,
}
