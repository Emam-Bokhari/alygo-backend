"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("../../config"));
const ApiErrors_1 = __importDefault(require("../../errors/ApiErrors"));
const handleValidationError_1 = __importDefault(
  require("../../errors/handleValidationError"),
);
const handleZodError_1 = __importDefault(
  require("../../errors/handleZodError"),
);
const logger_1 = require("../../shared/logger");
const http_status_codes_1 = require("http-status-codes");
const responseMode_1 = require("../../constants/responseMode");
const responseMode_2 = require("../../config/responseMode");
const globalErrorHandler = (error, req, res, next) => {
  try {
    const errorInfo = {
      name: error === null || error === void 0 ? void 0 : error.name,
      message: error === null || error === void 0 ? void 0 : error.message,
      stack: error === null || error === void 0 ? void 0 : error.stack,
    };
    config_1.default.node_env === "development"
      ? console.log("🚨 globalErrorHandler", errorInfo)
      : logger_1.errorLogger.error("🚨 globalErrorHandler", errorInfo);
  } catch (logError) {
    console.log(
      "Error logging failed:",
      (logError === null || logError === void 0 ? void 0 : logError.message) ||
        String(logError),
    );
  }
  let statusCode = 500;
  let message = "Something went wrong";
  let errorMessages = [];
  if (error.name === "ZodError") {
    const simplifiedError = (0, handleZodError_1.default)(error);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorMessages = simplifiedError.errorMessages;
  } else if (error.name === "ValidationError") {
    const simplifiedError = (0, handleValidationError_1.default)(error);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorMessages = simplifiedError.errorMessages;
  } else if (error.name === "TokenExpiredError") {
    statusCode = http_status_codes_1.StatusCodes.UNAUTHORIZED;
    message = "Session Expired";
    errorMessages = (
      error === null || error === void 0 ? void 0 : error.message
    )
      ? [
          {
            path: "",
            message:
              "Your session has expired. Please log in again to continue.",
          },
        ]
      : [];
  } else if (error.name === "JsonWebTokenError") {
    statusCode = http_status_codes_1.StatusCodes.UNAUTHORIZED;
    message = "Invalid Token";
    errorMessages = (
      error === null || error === void 0 ? void 0 : error.message
    )
      ? [
          {
            path: "",
            message: "Your token is invalid. Please log in again to continue.",
          },
        ]
      : [];
  } else if (error instanceof ApiErrors_1.default) {
    statusCode = error.statusCode;
    message = error.message;
    errorMessages = error.message
      ? [
          {
            path: "",
            message: error.message,
          },
        ]
      : [];
  } else if (error instanceof Error) {
    message = error.message;
    errorMessages = error.message
      ? [
          {
            path: "",
            message:
              error === null || error === void 0 ? void 0 : error.message,
          },
        ]
      : [];
  }
  // main switch here
  if (responseMode_2.responseMode === responseMode_1.RESPONSE_MODE.SOFT) {
    return res.status(200).json({
      success: false,
      message,
      errorMessages,
      data: [],
      stack:
        config_1.default.node_env !== "production"
          ? error === null || error === void 0
            ? void 0
            : error.stack
          : undefined,
    });
  }
  console.log("responseMode =", responseMode_2.responseMode);
  // STRICT MODE (default fallback)
  return res.status(statusCode).json({
    success: false,
    message,
    errorMessages,
    stack:
      config_1.default.node_env !== "production"
        ? error === null || error === void 0
          ? void 0
          : error.stack
        : undefined,
  });
};
exports.default = globalErrorHandler;
