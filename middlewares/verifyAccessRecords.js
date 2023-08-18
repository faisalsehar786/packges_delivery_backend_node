const jwt = require("jsonwebtoken");
const OrganisationUserModel = require("../src/v1/models/organisationUser.model");
const apiResponse = require("../helpers/apiResponse");

function verifyAccessRecords() {
  return [
    // authorize based on user role
    async (req, res, next) => {
      const user = await generateAndVerifyToken(req);
      // eslint-disable-next-line eqeqeq
      if (user.role == "org") {
        const orgUser = await OrganisationUserModel.findById(user.id).select(
          "-password"
        );
        // eslint-disable-next-line eqeqeq, no-empty
        if (orgUser.organisation_id.toString() != req.params.id) {
          return apiResponse.unauthorizedResponse(
            res,
            "Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ",
            "Unauthorized User"
          );
        }
        next();
        // eslint-disable-next-line eqeqeq
      } else if (user.role == "admin") {
        next();
      }
    },
  ];
}

const generateAndVerifyToken = async (req, res, next) => {
  try {
    const authorization =
      req.headers.Authorization || req.headers.authorization;

    if (authorization && authorization.startsWith("Bearer")) {
      try {
        // Get Token from header
        // Destructure the array result of split to get the token directly
        const [, token] = authorization.split(" ");

        // Verify Token
        const user = jwt.verify(token, process.env.JWT_SECRET_KEY);
        return user;
      } catch (error) {
        return apiResponse.forbiddenResponse(
          res,
          "Beklager, du har ikke nødvendig tilgang til å kunne utføre denne handlingen.",
          "Sorry, you do not have access to this resource due to access control restrictions"
        );
      }
    }
  } catch (err) {
    next(err);
  }
};

module.exports = {
  verifyAccessRecords,
};
