"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralController = void 0;
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const referral_service_1 = require("./referral.service");
const http_status_codes_1 = require("http-status-codes");
// --- NEW PASSENGER APIS ---
const getUserDashboard = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result = yield referral_service_1.ReferralService.getUserReferralDashboard(userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Passenger referral dashboard retrieved successfully",
        data: result,
    });
}));
const getReferredUsersHistory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result = yield referral_service_1.ReferralService.getUserHistory(userId, req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Referred users history retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
}));
const getUserRewardHistory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result = yield referral_service_1.ReferralService.getRewardPayoutHistory(userId, "user", req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Passenger referral reward history retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
}));
// --- NEW DRIVER APIS ---
const getDriverDashboard = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result = yield referral_service_1.ReferralService.getDriverReferralDashboard(userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Driver referral dashboard retrieved successfully",
        data: result,
    });
}));
const getDriverReferralProgress = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result = yield referral_service_1.ReferralService.getDriverProgressList(userId, req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Driver referral progress list retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
}));
const getDriverRewardHistory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result = yield referral_service_1.ReferralService.getRewardPayoutHistory(userId, "driver", req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Driver referral reward history retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
}));
// --- RULES API ---
const getRules = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const role = req.query.role || "user";
    const result = yield referral_service_1.ReferralService.getRules(role);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Referral rules retrieved successfully",
        data: result,
    });
}));
// --- VERIFY CODE ---
const verifyCode = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { code } = req.body;
    const result = yield referral_service_1.ReferralService.verifyReferralCode(code);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Referral code verified successfully",
        data: result,
    });
}));
exports.ReferralController = {
    getUserDashboard,
    getReferredUsersHistory,
    getUserRewardHistory,
    getDriverDashboard,
    getDriverReferralProgress,
    getDriverRewardHistory,
    getRules,
    verifyCode,
};
