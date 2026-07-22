"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LostFound = void 0;
const mongoose_1 = require("mongoose");
const lostAndFound_constant_1 = require("./lostAndFound.constant");
const auditLogSchema = new mongoose_1.Schema({
    action: {
        type: String,
        required: true,
    },
    actor: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    actorRole: {
        type: String,
        required: true,
    },
    details: {
        type: mongoose_1.Schema.Types.Mixed,
        required: false,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
}, { _id: false });
const lostFoundSchema = new mongoose_1.Schema({
    rideId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Ride",
        required: true,
        index: true,
    },
    passengerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    driverId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    reportNumber: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    itemName: {
        type: String,
        required: true,
        trim: true,
    },
    itemCategory: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "LostAndFoundItemCategory",
        required: true,
    },
    itemDescription: {
        type: String,
        required: true,
        trim: true,
    },
    uploadedFiles: {
        type: [
            {
                fileUrl: {
                    type: String,
                    required: true,
                },
                fileName: {
                    type: String,
                },
                uploadedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        default: [],
    },
    lastSeenLocation: {
        type: String,
        required: true,
        trim: true,
    },
    reportStatus: {
        type: String,
        enum: Object.values(lostAndFound_constant_1.REPORT_STATUS),
        default: lostAndFound_constant_1.REPORT_STATUS.REPORTED,
        index: true,
    },
    foundStatus: {
        type: String,
        enum: Object.values(lostAndFound_constant_1.FOUND_STATUS),
        default: lostAndFound_constant_1.FOUND_STATUS.PENDING,
        index: true,
    },
    recoveryMethod: {
        type: String,
        enum: Object.values(lostAndFound_constant_1.RECOVERY_METHOD),
        required: false,
    },
    pickupLocation: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
        },
        coordinates: {
            type: [Number],
            required: false,
        },
        address: {
            type: String,
            trim: true,
        },
    },
    deliveryLocation: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
        },
        coordinates: {
            type: [Number],
            required: false,
        },
        address: {
            type: String,
            trim: true,
        },
    },
    scheduledAt: {
        type: Date,
        required: false,
    },
    deliveryFee: {
        type: Number,
        default: 0,
        min: 0,
    },
    paymentStatus: {
        type: String,
        enum: Object.values(lostAndFound_constant_1.PAYMENT_STATUS),
        default: lostAndFound_constant_1.PAYMENT_STATUS.NOT_REQUIRED,
        index: true,
    },
    paymentIntentId: {
        type: String,
        required: false,
    },
    paymentTransactionId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Transaction",
        required: false,
    },
    paymentReference: {
        type: String,
        required: false,
    },
    paymentAmount: {
        type: Number,
        required: false,
    },
    paymentCurrency: {
        type: String,
        required: false,
    },
    passengerConfirmed: {
        type: Boolean,
        default: false,
    },
    driverConfirmed: {
        type: Boolean,
        default: false,
    },
    passengerRated: {
        type: Boolean,
        default: false,
    },
    passengerRating: {
        type: Number,
        min: 1,
        max: 5,
        required: false,
    },
    passengerReview: {
        type: String,
        trim: true,
        required: false,
    },
    adminNotes: {
        type: String,
        trim: true,
        required: false,
    },
    driverNotes: {
        type: String,
        trim: true,
        required: false,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    auditLogs: {
        type: [auditLogSchema],
        default: [],
    },
}, {
    timestamps: true,
    versionKey: false,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            delete ret.id;
            return ret;
        },
    },
    toObject: {
        virtuals: true,
        transform: (_doc, ret) => {
            delete ret.id;
            return ret;
        },
    },
});
exports.LostFound = (0, mongoose_1.model)("LostFound", lostFoundSchema);
