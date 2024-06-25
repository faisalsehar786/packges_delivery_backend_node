const parser = require('ua-parser-js')
const jwt = require('jsonwebtoken')
// const sslCertificate = require('get-ssl-certificate')
const AdminModel = require('../src/v1/models/admin.model')
const UserModel = require('../src/v1/models/user.model')
const apiResponse = require('../helpers/apiResponse')
// const logger = require('../utils/logger')

// This function checks the authentication origins.
const checkAuthOrigins = async (req, res, next) => {
  try {
    const origin = req.get('origin')
    const ua = parser(req.headers['user-agent'])

    const SecurePathsAdmin = ['http://localhost:3000', 'https://hyhm.netlify.app']
    /* Check request coming from browser  */
    if (ua.browser.name !== undefined) {
      /* Org Origin and data check  */
      if (SecurePathsAdmin.includes(origin)) {
        // if (process.env.NODE_ENV !== 'development') {
        //   sslCertificate
        //     .get(origin.replace(/^https?:\/\//i, ''), 250, 443, 'https:')
        //     .then((certificate) => {
        //       /* Check and get pub key and convert it to base64 */
        //       const publicKeyBuffer = Buffer.from(certificate.pubkey, 'base64')
        //       /* Check if it is actually a buffer or other data */
        //       if (Buffer.isBuffer(publicKeyBuffer)) {
        //         if (!(process.env.ADMIN_PUBLIC_KEY === publicKeyBuffer.toString('base64'))) {
        //           return apiResponse.ProxyError(
        //             res,
        //             'Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ',
        //             'Unauthorized User'
        //           )
        //         }
        //       } else {
        //         return apiResponse.ProxyError(
        //           res,
        //           'Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ',
        //           'Unauthorized User'
        //         )
        //       }
        //     })
        //     .catch((error) => {
        //       logger.log(error)
        //       return apiResponse.ProxyError(
        //         res,
        //         'Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ',
        //         'Unauthorized User'
        //       )
        //     })
        // }
        /* Admin Origin and data check  */
        const { id, token } = await decodeAndVerifyToken(req)
        const data = await AdminModel.findOne({
          _id: id,
          access_token: token,
        }).select('-password')
        if (!data) {
          return apiResponse.unauthorizedResponse(
            res,
            'Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ',
            'Unauthorized User'
          )
        }
        const ip_address = req.header('x-forwarded-for') || req.socket.remoteAddress
        if (data.ip_address !== ip_address && data.access_token !== token) {
          return apiResponse.unauthorizedResponse(
            res,
            'Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ',
            'Unauthorized User'
          )
        }
        req.user = data
        next()
      } else {
        return apiResponse.unauthorizedResponse(
          res,
          'Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ',
          'Unauthorized User'
        )
      }
    } else {
      /* Auth check from users model */
      const otherAgentsList = [/Android/, /iPad/, /iOS/, /iPhone/]
      const testAgentsList = [/PostmanRuntime/]
      const isMatch = otherAgentsList.some((rx) => rx.test(req.headers['user-agent']))
      const isMatchTest = testAgentsList.some((rx) => rx.test(req.headers['user-agent']))

      if (isMatch) {
        const { id, token } = await decodeAndVerifyToken(req)
        const data = await UserModel.findOne({
          _id: id,
          access_token: token,
        }).select('-password')
        if (!data) {
          return apiResponse.unauthorizedResponse(
            res,
            'Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ',
            'Unauthorized User'
          )
        }
        req.user = data
        next()
      } else if (isMatchTest) {
        const { id, token } = await decodeAndVerifyToken(req)
        Promise.all([
          UserModel.findOne({
            _id: id,
            access_token: token,
          }).select('-password'),

          AdminModel.findOne({
            _id: id,
            access_token: token,
          }).select('-password'),
        ]).then((values) => {
          const [userData, adminData] = values
          const data = userData || adminData
          if (!data) {
            return apiResponse.unauthorizedResponse(
              res,
              'Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ',
              'Unauthorized User'
            )
          }
          req.user = data
          next()
        })
      } else {
        return apiResponse.unauthorizedResponse(
          res,
          'Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ',
          'Unauthorized User'
        )
      }
    }
  } catch (error) {
    return apiResponse.unauthorizedResponse(
      res,
      'Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ',
      'Unauthorized User'
    )
  }
}

// This function decodes and verifies a JWT token.
const decodeAndVerifyToken = async (req, res, next) => {
  try {
    const authorization = req.headers.Authorization || req.headers.authorization

    if (authorization && authorization.startsWith('Bearer')) {
      try {
        // Get Token from header
        const token = authorization.split(' ')[1]

        // Verify Token
        const { id } = jwt.verify(token, process.env.JWT_SECRET_KEY)
        return { id, token }
      } catch (error) {
        return apiResponse.unauthorizedResponse(
          res,
          'Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ',
          'Unauthorized User'
        )
      }
    }
  } catch (err) {
    next(err)
  }
}

module.exports = {
  checkAuthOrigins,
}
