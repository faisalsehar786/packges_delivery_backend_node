const jwt = require('jsonwebtoken')
const createError = require('http-errors')
const UserModel = require('../src/v1/models/user.model')
const AdminUserModel = require('../src/v1/models/admin.model')
const apiResponse = require('../helpers/apiResponse')

const checkUserAuth = async (req, res, next) => {
  let token
  const authorization = req.headers.Authorization || req.headers.authorization

  if (authorization && authorization.startsWith('Bearer')) {
    try {
      // Get Token from header
      // eslint-disable-next-line prefer-destructuring
      token = authorization.split(' ')[1]

      // Verify Token
      const {id} = jwt.verify(token, process.env.JWT_SECRET_KEY)
      // Get User from Token
      const data = await UserModel.findOne({
        _id: id,
        access_token: token,
      }).select('-password')
      if (data) {
        req.user = data
        next()
      } else {
        await checkAdminUserAuth(req, res, next)
      }
    } catch (error) {
      return apiResponse.unauthorizedResponse(
        res,
        'Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ',
        'Unauthorized User'
      )
    }
  }
  if (!token) {
    return apiResponse.unauthorizedResponse(
      res,
      'Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ',
      'Unauthorized User'
    )
  }
}

const checkAdminUserAuth = async (req, res, next) => {
  let token
  const origin = req.get('origin')
  const authorization = req.headers.Authorization || req.headers.authorization
  if (authorization && authorization.startsWith('Bearer')) {
    try {
      // sslCertificate
      //   .get(origin.replace(/^https?:\/\//i, ""), 250, 443, "https:")
      //   .then((certificate) => {
      //     /* Check and get pub key and convert it to base64 */
      //     const publicKeyBuffer = Buffer.from(certificate.pubkey, "base64");
      //     /* Check if it is actually a buffer or other data */
      //     if (Buffer.isBuffer(publicKeyBuffer)) {
      //       if (
      //         !(
      //           process.env.ADMIN_PUBLIC_KEY ==
      //           publicKeyBuffer.toString("base64")
      //         )
      //       ) {
      //         return apiResponse.ProxyError(
      //           res,
      //           "Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ",
      //           "Unauthorized User"
      //         );
      //       }
      //     } else {
      //       return apiResponse.ProxyError(
      //         res,
      //         "Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ",
      //         "Unauthorized User"
      //       );
      //     }
      //   })
      //   // eslint-disable-next-line arrow-body-style
      //   .catch(() => {
      //     return apiResponse.ProxyError(
      //       res,
      //       "Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ",
      //       "Unauthorized User"
      //     );
      //   });
      // Get Token from header
      // eslint-disable-next-line prefer-destructuring
      token = authorization.split(' ')[1]
      // Verify Token
      const {id} = jwt.verify(token, process.env.JWT_SECRET_KEY)

      console.log(id)

      // Get User from Token
      const data = await AdminUserModel.findOne({
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
      // const ip_address =
      //   req.header("x-forwarded-for") || req.socket.remoteAddress;
      // if (data.ip_address !== ip_address && data.access_token !== token) {
      //   return apiResponse.unauthorizedResponse(
      //     res,
      //     "Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ",
      //     "Unauthorized User"
      //   );
      // }
      req.user = data
      next()
    } catch (error) {
      return apiResponse.unauthorizedResponse(
        res,
        'Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ',
        'Unauthorized User'
      )
    }
  }
  if (!token) {
    return apiResponse.unauthorizedResponse(
      res,
      'Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ',
      'Unauthorized User'
    )
  }
}

const generateToken = (payload, secretKey, expiresToken) =>
  new Promise((resolve, reject) => {
    const secret = secretKey
    const options = {
      expiresIn: expiresToken,
    }
    jwt.sign(payload, secret, options, (err, token) => {
      if (err) {
        reject(createError.InternalServerError())
        return
      }
      resolve(token)
    })
  })

const verifyToken = (token, secretKey) =>
  new Promise((resolve, reject) => {
    jwt.verify(token, secretKey, (err, payload) => {
      if (err) return reject(createError.Unauthorized())

      return resolve(payload)
    })
  })

module.exports = {
  checkUserAuth,
  generateToken,
  verifyToken,
}
