const jwt = require("jsonwebtoken");
const createError = require("http-errors");
const UserModel = require("../src/v1/models/user.model");
const apiResponse = require("../helpers/apiResponse");

const checkUserAuth = async (req, res, next) => {
  let token;
  const authorization = req.headers.Authorization || req.headers.authorization;

  if (authorization && authorization.startsWith("Bearer")) {
    try {
      // Get Token from header
      // eslint-disable-next-line prefer-destructuring
      token = authorization.split(" ")[1];

      // Verify Token
      const { id } = jwt.verify(token, process.env.JWT_SECRET_KEY);
      // Get User from Token
      const data = await UserModel.findOne({
        _id: id,
        access_token: token,
      }).select("-password");
      if (!data) {
        return apiResponse.unauthorizedResponse(
          res,
          "Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ",
          "Unauthorized User"
        );
      }
      req.user = data;
      next();
    } catch (error) {
      return apiResponse.unauthorizedResponse(
        res,
        "Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ",
        "Unauthorized User"
      );
    }
  }
  if (!token) {
    return apiResponse.unauthorizedResponse(
      res,
      "Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ",
      "Unauthorized User"
    );
  }
};

const generateToken = (payload, secretKey, expiresToken) =>
  new Promise((resolve, reject) => {
    const secret = secretKey;
    const options = {
      expiresIn: expiresToken,
    };
    jwt.sign(payload, secret, options, (err, token) => {
      if (err) {
        reject(createError.InternalServerError());
        return;
      }
      resolve(token);
    });
  });

const verifyToken = (token, secretKey) =>
  new Promise((resolve, reject) => {
    jwt.verify(token, secretKey, (err, payload) => {
      if (err) return reject(createError.Unauthorized());

      return resolve(payload);
    });
  });

module.exports = {
  checkUserAuth,
  generateToken,
  verifyToken,
};
