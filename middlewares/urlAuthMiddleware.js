const apiResponse = require("../helpers/apiResponse");

const checkAuthURL = async (req, res, next) => {
  try {
    // var splitBaseURL = req.baseUrl.toString().split("/");
    // var splitURL = req.url.toString().split("/");

    next();
  } catch (error) {
    return apiResponse.unauthorizedResponse(
      res,
      "Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ",
      "Unauthorized User"
    );
  }
};

module.exports = {
  checkAuthURL,
};
