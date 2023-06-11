const jwt = require("jsonwebtoken");
const HttpError = require("../models/http-error");

const secretKey = process.env.JWT_KEY;

const checkAuth = (req, res, next) => {
  // If the request is an options request, we don't need to check for authorization
  // browser specifically sends an options request before sending the actual request
  if (req.method === "OPTIONS") {
    return next();
  }
  try {
    // Check if the authorization header is present with token
    // if not present throws error and catch it with catch block
    const token = req.headers.authorization.split(" ")[1];

    if (!token) {
      throw new Error("Authentication failed!");
    }

    // Verify the token using your secret key
    const decodedToken = jwt.verify(token, secretKey);

    // Add the user data to the request object
    req.userData = { userId: decodedToken.userId };
    // next middleware if token is verified
    next();
  } catch (err) {
    const error = new HttpError("Authentication failed!", 403);
    return next(error);
  }
};

module.exports = checkAuth;
