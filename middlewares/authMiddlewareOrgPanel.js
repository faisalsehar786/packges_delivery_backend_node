const jwt = require("jsonwebtoken");

const sslCertificate = require("get-ssl-certificate");
// const OrgUserModel = require("../src/v1/models/organisationUser.model");
const apiResponse = require("../helpers/apiResponse");

const checkOrgUserAuth = async (req, res, next) => {
  let token;
  const authorization = req.headers.Authorization || req.headers.authorization;
  const origin = req.get("origin");
  if (authorization && authorization.startsWith("Bearer")) {
    try {
      sslCertificate
        .get(origin.replace(/^https?:\/\//i, ""), 250, 443, "https:")
        .then((certificate) => {
          /* Check and get pub key and convert it to base64 */
          const publicKeyBuffer = Buffer.from(certificate.pubkey, "base64");
          /* Check if it is actually a buffer or other data */
          if (Buffer.isBuffer(publicKeyBuffer)) {
            if (
              !(
                process.env.ORG_PUBLIC_KEY == publicKeyBuffer.toString("base64")
              )
            ) {
              return apiResponse.ProxyError(
                res,
                "Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ",
                "Unauthorized User"
              );
            }
          } else {
            return apiResponse.ProxyError(
              res,
              "Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ",
              "Unauthorized User"
            );
          }
        })
        .catch((error) => {
          console.log("error: ", error);
          return apiResponse.ProxyError(
            res,
            "Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ",
            "Unauthorized User"
          );
        });
      // Get Token from header
      // eslint-disable-next-line prefer-destructuring
      token = authorization.split(" ")[1];
      // Verify Token
      const { id } = jwt.verify(token, process.env.JWT_SECRET_KEY);
      // Get User from Token
      // const data = await OrgUserModel.findOne({
      //   _id: id,
      //   access_token: token,
      // }).select("-password");
      // if (!data) {
      //   return apiResponse.unauthorizedResponse(
      //     res,
      //     "Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ",
      //     "Unauthorized User"
      //   );
      // }
      // const ip_address =
      //   req.header("x-forwarded-for") || req.socket.remoteAddress;
      // if (data.ip_address !== ip_address && data.access_token !== token) {
      //   return apiResponse.unauthorizedResponse(
      //     res,
      //     "Uautorisert bruker. Du har ikke nødvendig tilgang til å kunne utføre denne handlingen. ",
      //     "Unauthorized User"
      //   );
      // }
      // req.user = data;
      // next();
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

module.exports = {
  checkOrgUserAuth,
};
