"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.ReviewServices = void 0;
const review_model_1 = require("./review.model");
const ride_model_1 = require("../ride/ride.model");
const user_model_1 = require("../user/user.model");
const driver_model_1 = require("../driver/driver.model");
const car_model_1 = require("../car/car.model");
const pendingPayment_model_1 = require("../pendingPayment/pendingPayment.model");
const pendingPayment_service_1 = require("../pendingPayment/pendingPayment.service");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = __importStar(require("mongoose"));
const review_constant_1 = require("./review.constant");
const ride_constant_1 = require("../ride/ride.constant");
const points_service_1 = require("../tier/points.service");
/**
 * Submit a rating & review for a completed ride.
 */
const createReviewInDB = (reviewerId, reviewerRole, rideId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const ride = yield ride_model_1.Ride.findById(rideId);
    if (!ride) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Ride not found");
    }
    // 1. Validate ride is COMPLETED
    if (ride.status !== ride_constant_1.RIDE_STATUS.COMPLETED) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Cannot review a ride with status: ${ride.status}. Only completed rides can be reviewed.`);
    }
    // 2. Validate reviewer participation and determine receiver
    let receiverId;
    let receiverRole;
    if (reviewerRole === "user") {
        if (ride.userId.toString() !== reviewerId) {
            throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, "You did not participate in this ride as a passenger.");
        }
        if (!ride.driverId) {
            throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Ride does not have an assigned driver.");
        }
        receiverId = ride.driverId;
        receiverRole = "driver";
    }
    else {
        // Driver role
        if (!ride.driverId || ride.driverId.toString() !== reviewerId) {
            throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, "You did not participate in this ride as a driver.");
        }
        receiverId = ride.userId;
        receiverRole = "user";
    }
    // Prevent self-review (redundant sanity check)
    if (reviewerId === receiverId.toString()) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "You cannot submit a review for yourself.");
    }
    // 3. Ensure reviewer has not already reviewed this ride
    const existingReview = yield review_model_1.Review.findOne({
        rideId: new mongoose_1.Types.ObjectId(rideId),
        reviewerId: new mongoose_1.Types.ObjectId(reviewerId),
    });
    if (existingReview) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.CONFLICT, "You have already submitted a review for this ride.");
    }
    // 4. Fetch Driver Name and Car/Vehicle Info for Snapshot
    let driverName = "Unknown Driver";
    const driverUser = yield user_model_1.User.findById(ride.driverId);
    if (driverUser) {
        driverName = driverUser.name;
    }
    let vehicleName = "Unknown Vehicle";
    let vehicleNumber = "Unknown License Plate";
    if (ride.carId) {
        const car = yield car_model_1.Car.findById(ride.carId);
        if (car) {
            vehicleName = `${car.brand} ${car.model}`.trim();
            vehicleNumber = car.licensePlate;
        }
    }
    const { rating, reviewText, selectedTags, appreciation } = payload;
    const session = yield mongoose_1.default.startSession();
    session.startTransaction();
    try {
        // 5. Create immutable ride snapshot and save Review
        const reviewData = {
            rideId: new mongoose_1.Types.ObjectId(rideId),
            reviewerId: new mongoose_1.Types.ObjectId(reviewerId),
            reviewerRole,
            receiverId,
            receiverRole,
            rating,
            reviewText: reviewText ? reviewText.trim() : "",
            selectedTags: selectedTags || "",
            appreciation: reviewerRole === "user" ? appreciation || 0 : 0,
            status: review_constant_1.REVIEW_STATUS.ACTIVE,
            rideSnapshot: {
                driverName,
                vehicleName,
                vehicleNumber,
                completedAt: ride.completedAt || new Date(),
                rideCategory: ride.rideCategory.name,
                pickup: ride.pickup.address,
                destination: ride.destination.address,
                fare: ride.fare.total,
            },
            reviewForId: receiverId,
            reviewById: new mongoose_1.Types.ObjectId(reviewerId),
        };
        const [review] = yield review_model_1.Review.create([reviewData], { session });
        // 6. Incrementally update receiver's rating statistics atomically
        if (receiverRole === "user") {
            const user = yield user_model_1.User.findById(receiverId).session(session);
            if (user) {
                const totalRatings = user.totalRatings || 0;
                const oldAverage = user.averageRating || 0;
                const newAverage = (oldAverage * totalRatings + rating) / (totalRatings + 1);
                user.averageRating = Number(newAverage.toFixed(2));
                user.totalRatings = totalRatings + 1;
                user.totalReviews = (user.totalReviews || 0) + 1;
                yield user.save({ session });
            }
        }
        else if (receiverRole === "driver") {
            const driver = yield driver_model_1.Driver.findOne({ userId: receiverId }).session(session);
            if (driver) {
                const totalRatings = driver.totalRatings || 0;
                const oldAverage = driver.averageRating || 0;
                const newAverage = (oldAverage * totalRatings + rating) / (totalRatings + 1);
                driver.averageRating = Number(newAverage.toFixed(2));
                driver.totalRatings = totalRatings + 1;
                driver.totalReviews = (driver.totalReviews || 0) + 1;
                yield driver.save({ session });
                // Award points if passenger left a 5-star rating for driver
                if (rating === 5) {
                    points_service_1.PointsService.awardPoints(receiverId, "five_star_rating", "review", review._id, { notes: `5-Star Rating received for Ride ${rideId}`, session }).catch((err) => console.error("Error awarding rating points:", err));
                }
            }
        }
        // 7. If passenger has driver appreciation amount > 0, handle payment
        let pendingPaymentDoc = null;
        let paymentResult = null;
        if (reviewerRole === "user" && appreciation && appreciation > 0) {
            const driverProfile = yield driver_model_1.Driver.findOne({
                userId: receiverId,
            }).session(session);
            if (!driverProfile) {
                throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Driver profile not found");
            }
            const [newPendingPayment] = yield pendingPayment_model_1.PendingPayment.create([
                {
                    userId: new mongoose_1.Types.ObjectId(reviewerId),
                    rideId: new mongoose_1.Types.ObjectId(rideId),
                    driverId: driverProfile._id,
                    type: "driver_appreciation",
                    amount: appreciation,
                    status: "pending",
                },
            ], { session });
            pendingPaymentDoc = newPendingPayment;
            // Handle immediate payment based on paymentMethod
            if (payload.paymentMethod === "skip") {
                // Skip payment - void it immediately
                pendingPaymentDoc.status = "voided";
                yield pendingPaymentDoc.save({ session });
            }
            else if (payload.paymentMethod === "wallet") {
                // Pay immediately with wallet
                yield session.commitTransaction();
                session.endSession();
                const paidPayment = yield pendingPayment_service_1.PendingPaymentService.payCancellationFeeWithWallet(reviewerId, pendingPaymentDoc._id.toString());
                paymentResult = { method: "wallet", status: "paid", data: paidPayment };
                return { review, pendingPayment: paidPayment, paymentResult };
            }
            else if (payload.paymentMethod === "stripe") {
                // Create stripe checkout session
                yield session.commitTransaction();
                session.endSession();
                const stripeResult = yield pendingPayment_service_1.PendingPaymentService.payCancellationFeeNow(reviewerId, pendingPaymentDoc._id.toString());
                paymentResult = {
                    method: "stripe",
                    status: "pending_payment",
                    data: stripeResult,
                };
                return { review, pendingPayment: pendingPaymentDoc, paymentResult };
            }
            // If no paymentMethod provided, keep pending payment for later payment
        }
        yield session.commitTransaction();
        session.endSession();
        return { review, pendingPayment: pendingPaymentDoc, paymentResult };
    }
    catch (error) {
        yield session.abortTransaction();
        session.endSession();
        throw error;
    }
});
/**
 * Get reviews received by a driver.
 */
const getDriverReviewsFromDB = (driverId) => __awaiter(void 0, void 0, void 0, function* () {
    let driver = yield driver_model_1.Driver.findById(driverId);
    if (!driver) {
        driver = yield driver_model_1.Driver.findOne({ userId: new mongoose_1.Types.ObjectId(driverId) });
    }
    if (!driver) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Driver profile not found");
    }
    return yield review_model_1.Review.find({
        receiverId: driver.userId,
        receiverRole: "driver",
    })
        .populate("reviewerId", "name email profileImage")
        .sort({ createdAt: -1 });
});
/**
 * Get reviews received by a passenger.
 */
const getUserReviewsFromDB = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.User.findById(userId);
    if (!user) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "User profile not found");
    }
    return yield review_model_1.Review.find({
        receiverId: user._id,
        receiverRole: "user",
    })
        .populate("reviewerId", "name email profileImage")
        .sort({ createdAt: -1 });
});
/**
 * Get review and appreciation statistics summary for a driver.
 */
const getDriverReviewSummaryFromDB = (driverId) => __awaiter(void 0, void 0, void 0, function* () {
    let driver = yield driver_model_1.Driver.findById(driverId);
    if (!driver) {
        driver = yield driver_model_1.Driver.findOne({ userId: new mongoose_1.Types.ObjectId(driverId) });
    }
    if (!driver) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Driver profile not found");
    }
    // Calculate rating distribution dynamically
    const starAggregation = yield review_model_1.Review.aggregate([
        {
            $match: {
                receiverId: driver.userId,
                receiverRole: "driver",
            },
        },
        {
            $group: {
                _id: "$rating",
                count: { $sum: 1 },
            },
        },
    ]);
    const ratingDistribution = {
        "1": 0,
        "2": 0,
        "3": 0,
        "4": 0,
        "5": 0,
    };
    starAggregation.forEach((item) => {
        const star = item._id.toString();
        if (star in ratingDistribution) {
            ratingDistribution[star] = item.count;
        }
    });
    return {
        averageRating: driver.averageRating || 0,
        totalReviews: driver.totalReviews || 0,
        ratingDistribution,
        totalAppreciation: driver.totalAppreciationAmount || 0,
        averageAppreciation: driver.averageAppreciation || 0,
    };
});
exports.ReviewServices = {
    createReviewInDB,
    getDriverReviewsFromDB,
    getUserReviewsFromDB,
    getDriverReviewSummaryFromDB,
};
