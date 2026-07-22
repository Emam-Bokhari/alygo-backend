"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ride = void 0;
const mongoose_1 = require("mongoose");
const ride_constant_1 = require("./ride.constant");
const rideSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    driverId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: false,
        index: true,
    },
    carId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Car",
        required: false,
    },
    serviceAreaId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "ServiceArea",
        required: false,
    },
    serviceCategoryId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "ServiceCategory",
        required: false,
    },
    rideCategory: {
        categoryId: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "RideCategory",
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        commissionRate: {
            type: Number,
            required: true,
        },
    },
    pickup: {
        address: {
            type: String,
            required: true,
        },
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
                required: true,
            },
            coordinates: {
                type: [Number],
                required: true,
                index: "2dsphere",
            },
        },
    },
    stops: [
        {
            order: {
                type: Number,
                required: true,
            },
            address: {
                type: String,
                required: true,
            },
            location: {
                type: {
                    type: String,
                    enum: ["Point"],
                    default: "Point",
                    required: true,
                },
                coordinates: {
                    type: [Number],
                    required: true,
                },
            },
            isCompleted: {
                type: Boolean,
                default: false,
            },
            completedAt: {
                type: Date,
                required: false,
            },
        },
    ],
    destination: {
        address: {
            type: String,
            required: true,
        },
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
                required: true,
            },
            coordinates: {
                type: [Number],
                required: true,
                index: "2dsphere",
            },
        },
    },
    routeInfo: {
        totalDistanceKm: {
            type: Number,
            required: true,
        },
        totalDurationMinutes: {
            type: Number,
            required: true,
        },
        googleRouteId: {
            type: String,
            required: false,
        },
        polyline: {
            type: String,
            required: false,
        },
    },
    driverMatching: {
        requestExpireSeconds: {
            type: Number,
            required: true,
        },
        searchRadiusKm: {
            type: Number,
            required: true,
        },
        requiredDriverCount: {
            type: Number,
            required: true,
        },
        notifiedDrivers: [
            {
                driverId: {
                    type: mongoose_1.Schema.Types.ObjectId,
                    ref: "User",
                    required: true,
                },
                sentAt: {
                    type: Date,
                    required: true,
                },
                respondedAt: {
                    type: Date,
                    required: false,
                },
                status: {
                    type: String,
                    enum: Object.values(ride_constant_1.DRIVER_MATCHING_STATUS),
                    required: true,
                },
            },
        ],
    },
    rideType: {
        type: String,
        enum: Object.values(ride_constant_1.RIDE_TYPE),
        default: ride_constant_1.RIDE_TYPE.INSTANT,
        required: true,
    },
    scheduledAt: {
        type: Date,
        required: false,
    },
    timezone: {
        type: String,
        required: false,
        trim: true,
    },
    reservationStatus: {
        type: String,
        enum: ["pending", "confirmed", "cancelled", "expired"],
        default: "pending",
    },
    reservationConfirmedAt: {
        type: Date,
        required: false,
    },
    reservationAssignedAt: {
        type: Date,
        required: false,
    },
    reservationAcceptedAt: {
        type: Date,
        required: false,
    },
    reservationExpiresAt: {
        type: Date,
        required: false,
    },
    assignedDriverId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: false,
        index: true,
    },
    reservationReminderSent: {
        "24h": { type: Boolean, default: false },
        "1h": { type: Boolean, default: false },
        "30m": { type: Boolean, default: false },
        "15m": { type: Boolean, default: false },
    },
    reservationCancelledReason: {
        type: String,
        required: false,
    },
    shareToken: {
        type: String,
        unique: true,
        sparse: true,
    },
    isSharingActive: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        enum: Object.values(ride_constant_1.RIDE_STATUS),
        required: true,
        index: true,
    },
    pickupVerification: {
        method: {
            type: String,
            enum: Object.values(ride_constant_1.VERIFICATION_METHOD),
            required: true,
        },
        otp: {
            code: {
                type: String,
                required: false,
            },
            expiresAt: {
                type: Date,
                required: false,
            },
            createdAt: {
                type: Date,
                required: false,
            },
            verified: {
                type: Boolean,
                default: false,
            },
            verifiedAt: {
                type: Date,
                required: false,
            },
            attempts: {
                type: Number,
                default: 0,
            },
        },
        phoneLastFourDigits: {
            value: {
                type: String,
                required: false,
            },
            verified: {
                type: Boolean,
                default: false,
            },
            verifiedAt: {
                type: Date,
                required: false,
            },
        },
        verificationAttempts: [
            {
                method: {
                    type: String,
                    enum: Object.values(ride_constant_1.VERIFICATION_METHOD),
                },
                attemptedAt: {
                    type: Date,
                    default: Date.now,
                },
                success: {
                    type: Boolean,
                },
                ipAddress: {
                    type: String,
                },
            },
        ],
    },
    dropVerification: {
        method: {
            type: String,
            enum: Object.values(ride_constant_1.VERIFICATION_METHOD),
            required: true,
        },
        otp: {
            code: {
                type: String,
                required: false,
            },
            expiresAt: {
                type: Date,
                required: false,
            },
            createdAt: {
                type: Date,
                required: false,
            },
            verified: {
                type: Boolean,
                default: false,
            },
            verifiedAt: {
                type: Date,
                required: false,
            },
            attempts: {
                type: Number,
                default: 0,
            },
        },
        phoneLastFourDigits: {
            value: {
                type: String,
                required: false,
            },
            verified: {
                type: Boolean,
                default: false,
            },
            verifiedAt: {
                type: Date,
                required: false,
            },
        },
        verificationAttempts: [
            {
                method: {
                    type: String,
                    enum: Object.values(ride_constant_1.VERIFICATION_METHOD),
                },
                attemptedAt: {
                    type: Date,
                    default: Date.now,
                },
                success: {
                    type: Boolean,
                },
                ipAddress: {
                    type: String,
                },
            },
        ],
    },
    fare: {
        baseFare: {
            type: Number,
            required: true,
        },
        distanceFare: {
            type: Number,
            required: true,
        },
        timeFare: {
            type: Number,
            required: true,
        },
        stopWaitingCharge: {
            type: Number,
            required: true,
        },
        cancellationFee: {
            type: Number,
            required: true,
        },
        discount: {
            type: Number,
            required: true,
        },
        subtotal: {
            type: Number,
            required: true,
        },
        commission: {
            type: Number,
            required: true,
        },
        driverEarning: {
            type: Number,
            required: true,
        },
        total: {
            type: Number,
            required: true,
        },
        surgeMultiplier: {
            type: Number,
            required: false,
            default: 1.0,
        },
        surgeApplied: {
            type: Number,
            required: false,
            default: 0.0,
        },
        rideFare: {
            type: Number,
            required: false,
        },
        pendingCancellationFee: {
            type: Number,
            required: false,
        },
    },
    payment: {
        method: {
            type: String,
            enum: Object.values(ride_constant_1.PAYMENT_METHOD),
            required: false,
        },
        status: {
            type: String,
            enum: Object.values(ride_constant_1.PAYMENT_STATUS),
            required: false,
        },
        stripePaymentIntentId: {
            type: String,
            required: false,
        },
        stripeCheckoutSessionId: {
            type: String,
            required: false,
        },
        paidAt: {
            type: Date,
            required: false,
        },
    },
    cancellation: {
        cancelledBy: {
            type: String,
            enum: Object.values(ride_constant_1.CANCELLED_BY),
            required: false,
        },
        cancellationReasonId: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "CancellationReason",
            required: false,
        },
        cancellationReasonName: {
            type: String,
            required: false,
        },
        cancellationFee: {
            type: Number,
            required: false,
        },
        driverCompensation: {
            type: Number,
            required: false,
        },
        platformShare: {
            type: Number,
            required: false,
        },
        cancellationPolicy: {
            scenario: { type: String, required: false },
            policyName: { type: String, required: false },
            cancellationFee: { type: Number, required: false },
            driverCompensation: { type: Number, required: false },
            platformShare: { type: Number, required: false },
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "voided"],
            required: false,
        },
        paymentCollectionMode: {
            type: String,
            required: false,
        },
        rideStatusBeforeCancellation: {
            type: String,
            required: false,
        },
        surgeSnapshot: {
            multiplier: { type: Number, default: 1.0 },
            amount: { type: Number, default: 0.0 },
        },
        fareSnapshot: {
            type: mongoose_1.Schema.Types.Mixed,
            required: false,
        },
        cancelledAt: {
            type: Date,
            required: false,
        },
    },
    requestedAt: {
        type: Date,
        required: true,
        default: Date.now,
        index: true,
    },
    acceptedAt: {
        type: Date,
        required: false,
    },
    userApprovedAt: {
        type: Date,
        required: false,
    },
    arrivedAt: {
        type: Date,
        required: false,
    },
    startedAt: {
        type: Date,
        required: false,
    },
    completedAt: {
        type: Date,
        required: false,
    },
}, {
    timestamps: true,
    versionKey: false,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            var _a, _b, _c, _d, _e, _f;
            delete ret.id;
            // Security: Never expose phoneLastFourDigits.value in JSON responses
            // The value is stored for verification but must never be sent to clients
            if ((_a = ret.pickupVerification) === null || _a === void 0 ? void 0 : _a.phoneLastFourDigits) {
                delete ret.pickupVerification.phoneLastFourDigits.value;
            }
            if ((_b = ret.dropVerification) === null || _b === void 0 ? void 0 : _b.phoneLastFourDigits) {
                delete ret.dropVerification.phoneLastFourDigits.value;
            }
            // Also clear OTP code after verification to prevent reuse
            if ((_d = (_c = ret.pickupVerification) === null || _c === void 0 ? void 0 : _c.otp) === null || _d === void 0 ? void 0 : _d.code) {
                delete ret.pickupVerification.otp.code;
            }
            if ((_f = (_e = ret.dropVerification) === null || _e === void 0 ? void 0 : _e.otp) === null || _f === void 0 ? void 0 : _f.code) {
                delete ret.dropVerification.otp.code;
            }
            return ret;
        },
    },
    toObject: {
        virtuals: true,
        transform: (_doc, ret) => {
            var _a, _b, _c, _d, _e, _f;
            delete ret.id;
            // Security: Never expose phoneLastFourDigits.value in JSON responses
            // The value is stored for verification but must never be sent to clients
            if ((_a = ret.pickupVerification) === null || _a === void 0 ? void 0 : _a.phoneLastFourDigits) {
                delete ret.pickupVerification.phoneLastFourDigits.value;
            }
            if ((_b = ret.dropVerification) === null || _b === void 0 ? void 0 : _b.phoneLastFourDigits) {
                delete ret.dropVerification.phoneLastFourDigits.value;
            }
            // Also clear OTP code after verification to prevent reuse
            if ((_d = (_c = ret.pickupVerification) === null || _c === void 0 ? void 0 : _c.otp) === null || _d === void 0 ? void 0 : _d.code) {
                delete ret.pickupVerification.otp.code;
            }
            if ((_f = (_e = ret.dropVerification) === null || _e === void 0 ? void 0 : _e.otp) === null || _f === void 0 ? void 0 : _f.code) {
                delete ret.dropVerification.otp.code;
            }
            return ret;
        },
    },
});
// Virtual field to calculate time remaining to pickup
rideSchema.virtual("timeRemainingToPickup").get(function () {
    if (this.rideType !== ride_constant_1.RIDE_TYPE.SCHEDULED || !this.scheduledAt) {
        return null;
    }
    const now = new Date();
    const scheduledTime = new Date(this.scheduledAt);
    const diffMs = scheduledTime.getTime() - now.getTime();
    if (diffMs <= 0) {
        return "0 minutes";
    }
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) {
        const remainingHours = diffHours % 24;
        return `${diffDays} days ${remainingHours} hours remaining`;
    }
    else if (diffHours > 0) {
        const remainingMins = diffMins % 60;
        return `${diffHours} hours ${remainingMins} minutes remaining`;
    }
    else {
        return `${diffMins} minutes remaining`;
    }
});
// Virtual field to get scheduledAt in user's timezone for display
rideSchema.virtual("scheduledAtDisplay").get(function () {
    if (!this.scheduledAt || !this.timezone) {
        return this.scheduledAt;
    }
    // This would need timezone conversion, but virtual fields can't use async imports
    // For now, return the UTC time - client should handle timezone conversion
    return this.scheduledAt;
});
exports.Ride = (0, mongoose_1.model)("Ride", rideSchema);
