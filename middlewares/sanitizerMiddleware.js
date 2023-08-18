/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
const xss = require("xss");

// Middleware function to sanitize data using XSS library
const sanitize = (req, res, next) => {
  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize route parameters
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

// Helper function to recursively sanitize object properties
const sanitizeObject = (obj) => {
  for (const key in obj) {
    if (typeof obj[key] === "object") {
      if (Array.isArray(obj[key])) {
        obj[key] = sanitizeArray(obj[key]);
      } else {
        obj[key] = sanitizeObject(obj[key]);
      }
    } else if (typeof obj[key] === "string") {
      obj[key] = xss(obj[key]);
    }
  }
  return obj;
};

// Helper function to sanitize array elements
const sanitizeArray = (arr) => {
  for (let i = 0; i < arr.length; i += 1) {
    if (typeof arr[i] === "object") {
      arr[i] = sanitizeObject(arr[i]);
    } else if (typeof arr[i] === "string") {
      arr[i] = xss(arr[i]);
    }
  }
  return arr;
};

module.exports = { sanitize };
