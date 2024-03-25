import * as LocalAuthentication from "expo-local-authentication";
import { Share } from "react-native";
import OneSignal from "react-native-onesignal";
import * as Sentry from "@sentry/react-native";

function isValidEmail(value) {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(value).toLowerCase());
}

function validateEmail(value, setEmailError) {
  if (value == "") {
    setEmailError("");
  } else if (isValidEmail(value)) {
    setEmailError("");
  } else {
    setEmailError("Invalid Email");
  }
}

function validatePassword(value, setPasswordError) {
  if (value.length < 9) {
    setPasswordError("Password must be 9 characters");
  } else {
    setPasswordError("");
  }
}

function validateInput(value, minLength, setError) {
  if (value.length < minLength) {
    setError("Invalid Input");
  } else {
    setError("");
  }
}

function calculateAngle(coordinates) {
  let startLat = coordinates[0]["latitude"];
  let startLng = coordinates[0]["longitude"];
  let endLat = coordinates[1]["latitude"];
  let endLng = coordinates[1]["longitude"];
  let dx = endLat - startLat;
  let dy = endLng - startLng;

  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

const isTouchEnabled = async () => {
  const hasHardWare = await LocalAuthentication.hasHardwareAsync();
  const hasEnrolled = await LocalAuthentication.isEnrolledAsync();
  return hasHardWare && hasEnrolled;
};

const setExternalId = (id) => {
  OneSignal.setExternalUserId(id, (results) => {
    // The results will contain push and email success statuses

    // Push can be expected in almost every situation with a success status, but
    // as a pre-caution its good to verify it exists
    if (results.push && results.push.success) {
    }

    // Verify the email is set or check that the results have an email success status
    if (results.email && results.email.success) {
    }

    // Verify the number is set or check that the results have an sms success status
    if (results.sms && results.sms.success) {
    }
  });
};

const removeExternalId = () => {
  OneSignal.removeExternalUserId((results) => {
    // The results will contain push and email success statuses

    // Push can be expected in almost every situation with a success status, but
    // as a pre-caution its good to verify it exists
    if (results.push && results.push.success) {
    }

    // Verify the email is set or check that the results have an email success status
    if (results.email && results.email.success) {
    }
  });
};

const shareTextData = (message = "") => {
  Share.share({
    message: message.toString(),
  });
};

export const reportToSentry = (args) => {
  const { error, type, url, reqType, params } = args;
  Sentry.withScope((scope) => {
    if (type) {
      scope.setExtra("operation-type", type);
    }
    if (url) {
      scope.setExtra("url", url);
    }
    if (reqType) {
      scope.setExtra("request-type", reqType);
    }
    if (params) {
      scope.setExtra("params", params);
    }
    if (typeof error === "string") Sentry.captureMessage(JSON.stringify(error));
    else Sentry.captureMessage(JSON.stringify(error));
  });
};

function isEmptyObject(obj) {
  return Object.keys(obj).length === 0;
}
export function numberWithSpaces(x) {
  return x?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
const utils = {
  isValidEmail,
  validateEmail,
  validatePassword,
  validateInput,
  calculateAngle,
  isTouchEnabled,
  setExternalId,
  removeExternalId,
  shareTextData,
  reportToSentry,
  isEmptyObject,
  numberWithSpaces,
};

export default utils;
