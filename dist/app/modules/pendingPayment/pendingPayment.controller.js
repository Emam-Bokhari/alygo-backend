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
exports.PendingPaymentController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const pendingPayment_service_1 = require("./pendingPayment.service");
const getPendingPayments = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const result = yield pendingPayment_service_1.PendingPaymentService.getPendingPaymentsByUser(userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Pending payments retrieved successfully",
        data: result,
    });
}));
const payCancellationFeeWithStripe = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const { pendingPaymentId } = req.params;
    const result = yield pendingPayment_service_1.PendingPaymentService.payCancellationFeeNow(userId, pendingPaymentId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Stripe checkout session created successfully",
        data: result,
    });
}));
const payCancellationFeeWithWallet = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const { pendingPaymentId } = req.params;
    const result = yield pendingPayment_service_1.PendingPaymentService.payCancellationFeeWithWallet(userId, pendingPaymentId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Cancellation fee paid successfully with wallet",
        data: result,
    });
}));
const skipPendingPayment = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.user.id;
    const { pendingPaymentId } = req.params;
    const result = yield pendingPayment_service_1.PendingPaymentService.skipPendingPayment(userId, pendingPaymentId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Payment skipped successfully",
        data: result,
    });
}));
exports.PendingPaymentController = {
    getPendingPayments,
    payCancellationFeeWithStripe,
    payCancellationFeeWithWallet,
    skipPendingPayment,
};
