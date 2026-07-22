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
exports.ReviewController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const review_service_1 = require("./review.service");
const review_validation_1 = require("./review.validation");
const config_1 = __importDefault(require("../../../config"));
/**
 * Create review handler (passenger or driver).
 */
const createReview = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const reviewerId = req.user.id;
    const reviewerRole = req.user.role; // "user" | "driver"
    const { rideId } = req.params;
    // Validate request dynamically based on user role
    const validationSchema = reviewerRole === "driver"
        ? review_validation_1.ReviewValidations.driverReviewValidationSchema
        : review_validation_1.ReviewValidations.passengerReviewValidationSchema;
    yield validationSchema.parseAsync({ body: req.body });
    const { review, pendingPayment, paymentResult } = yield review_service_1.ReviewServices.createReviewInDB(reviewerId, reviewerRole, rideId, req.body);
    // Handle payment result
    if (paymentResult) {
        if (paymentResult.method === "stripe") {
            const stripeData = paymentResult.data;
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_codes_1.StatusCodes.OK,
                success: true,
                message: "Review submitted successfully. Please complete payment via Stripe.",
                data: {
                    review,
                    payment: {
                        required: true,
                        method: "stripe",
                        status: "pending_payment",
                        checkoutUrl: stripeData.checkoutUrl,
                        sessionId: stripeData.sessionId,
                        expiresAt: stripeData.expiresAt,
                    },
                },
            });
        }
        else if (paymentResult.method === "wallet") {
            const walletData = paymentResult.data;
            return (0, sendResponse_1.default)(res, {
                statusCode: http_status_codes_1.StatusCodes.OK,
                success: true,
                message: "Review submitted successfully. Payment completed via wallet.",
                data: {
                    review,
                    payment: {
                        required: true,
                        method: "wallet",
                        status: "paid",
                        amount: walletData.amount,
                    },
                },
            });
        }
    }
    // Handle pending payment (no payment method provided)
    if (pendingPayment && pendingPayment.status === "pending") {
        return (0, sendResponse_1.default)(res, {
            statusCode: http_status_codes_1.StatusCodes.OK,
            success: true,
            message: "Review submitted successfully",
            data: {
                review,
                payment: {
                    required: true,
                    status: "pending",
                    pendingPaymentId: pendingPayment._id,
                    amount: pendingPayment.amount,
                    currency: config_1.default.stripe.currency || "USD",
                    options: ["pay_now", "skip"],
                },
            },
        });
    }
    // No payment required
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Review submitted successfully",
        data: {
            review,
            payment: {
                required: false,
            },
        },
    });
}));
/**
 * Get reviews received by a driver.
 */
const getDriverReviews = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { driverId } = req.params;
    const result = yield review_service_1.ReviewServices.getDriverReviewsFromDB(driverId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Driver reviews retrieved successfully",
        data: result,
    });
}));
/**
 * Get reviews received by a user (passenger).
 */
const getUserReviews = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const result = yield review_service_1.ReviewServices.getUserReviewsFromDB(userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "User reviews retrieved successfully",
        data: result,
    });
}));
/**
 * Get review and appreciation stats summary for a driver.
 */
const getDriverReviewSummary = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { driverId } = req.params;
    const result = yield review_service_1.ReviewServices.getDriverReviewSummaryFromDB(driverId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Driver review summary retrieved successfully",
        data: result,
    });
}));
exports.ReviewController = {
    createReview,
    getDriverReviews,
    getUserReviews,
    getDriverReviewSummary,
};
