"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralController = void 0;
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const referral_service_1 = require("./referral.service");
const referral_constant_1 = require("./referral.constant");
const getUserInfo = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result =
      yield referral_service_1.ReferralService.getUserReferralInfo(userId);
    (0, sendResponse_1.default)(res, {
      statusCode: 200,
      success: true,
      message: "User referral information retrieved successfully",
      data: result,
    });
  }),
);
const getDriverInfo = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result =
      yield referral_service_1.ReferralService.getDriverReferralInfo(userId);
    (0, sendResponse_1.default)(res, {
      statusCode: 200,
      success: true,
      message: "Driver referral information retrieved successfully",
      data: result,
    });
  }),
);
const getDriverProgress = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result =
      yield referral_service_1.ReferralService.getDriverReferralProgress(
        userId,
      );
    (0, sendResponse_1.default)(res, {
      statusCode: 200,
      success: true,
      message: "Driver referral progress retrieved successfully",
      data: result,
    });
  }),
);
const getDriverPayouts = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result =
      yield referral_service_1.ReferralService.getDriverPayoutHistory(userId);
    (0, sendResponse_1.default)(res, {
      statusCode: 200,
      success: true,
      message: "Driver referral payout history retrieved successfully",
      data: result,
    });
  }),
);
const verifyCode = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { code } = req.body;
    const result =
      yield referral_service_1.ReferralService.verifyReferralCode(code);
    (0, sendResponse_1.default)(res, {
      statusCode: 200,
      success: true,
      message: "Referral code verified successfully",
      data: result,
    });
  }),
);
const getRules = (0, catchAsync_1.default)((req, res) =>
  __awaiter(void 0, void 0, void 0, function* () {
    (0, sendResponse_1.default)(res, {
      statusCode: 200,
      success: true,
      message: "Referral rules retrieved successfully",
      data: referral_constant_1.REFERRAL_RULES,
    });
  }),
);
exports.ReferralController = {
  getUserInfo,
  getDriverInfo,
  getDriverProgress,
  getDriverPayouts,
  verifyCode,
  getRules,
};
