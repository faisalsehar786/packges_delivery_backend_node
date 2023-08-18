const jwt = require("jsonwebtoken");
const Roles = require("../utils/roles");
const apiResponse = require("../helpers/apiResponse");

function checkAuthGuard(roles = []) {
  if (typeof roles === "string") {
    // eslint-disable-next-line no-param-reassign
    roles = [roles];
  }

  return [
    // authorize based on user role
    async (req, res, next) => {
      const user = await generateAndVerifyToken(req);
      let role = "";
      if (user.role === "org") {
        // eslint-disable-next-line eqeqeq
        if (user.user_type == "admin") {
          role = Roles.OrgAdmin;
        }
        // eslint-disable-next-line eqeqeq
        if (user.user_type == "manager") {
          role = Roles.OrgManager;
        }
        if (roles.length && !roles.includes(role)) {
          return apiResponse.forbiddenResponse(
            res,
            "Beklager, du har ikke nødvendig tilgang til å kunne utføre denne handlingen.",
            "Sorry, you do not have access to this resource due to access control restrictions"
          );
        }
        next();
      }
      if (user.role === "admin") {
        // eslint-disable-next-line eqeqeq
        if (user.user_type == "admin") {
          role = Roles.Admin;
        }
        // eslint-disable-next-line eqeqeq
        if (user.user_type == "manager") {
          role = Roles.Manager;
        }
        if (roles.length && !roles.includes(role)) {
          return apiResponse.forbiddenResponse(
            res,
            "Beklager, du har ikke nødvendig tilgang til å kunne utføre denne handlingen.",
            "Sorry, you do not have access to this resource due to access control restrictions"
          );
        }
        next();
      }
      if (user.role === "app") {
        role = Roles.User;
        if (roles.length && !roles.includes(role)) {
          return apiResponse.forbiddenResponse(
            res,
            "Beklager, du har ikke nødvendig tilgang til å kunne utføre denne handlingen.",
            "Sorry, you do not have access to this resource due to access control restrictions"
          );
        }
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
  checkAuthGuard,
};
