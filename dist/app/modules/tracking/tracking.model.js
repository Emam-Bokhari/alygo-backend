"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tracking = void 0;
const mongoose_1 = require("mongoose");
const trackingSchema = new mongoose_1.Schema({
    rideId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Ride",
        required: true,
        index: true,
    },
    driverId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: false,
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: false,
    },
    driverLocation: {
        type: {
            type: String,
            enum: ["Point"],
        },
        coordinates: {
            type: [Number],
            index: "2dsphere",
        },
    },
    userLocation: {
        type: {
            type: String,
            enum: ["Point"],
        },
        coordinates: {
            type: [Number],
            index: "2dsphere",
        },
    },
    lastUpdatedAt: {
        type: Date,
        default: Date.now,
        required: true,
    },
    // Live tracking enhancements
    remainingDistanceKm: {
        type: Number,
        required: false,
    },
    estimatedArrivalMinutes: {
        type: Number,
        required: false,
    },
    etaCalculatedAt: {
        type: Date,
        required: false,
    },
    lastDriverLocationUpdateAt: {
        type: Date,
        required: false,
    },
    driverOnTheWayAt: {
        type: Date,
        required: false,
    },
    driverArrivedAt: {
        type: Date,
        required: false,
    },
    targetIsPickup: {
        type: Boolean,
        required: false,
    },
    targetIsDestination: {
        type: Boolean,
        required: false,
    },
    currentStopOrder: {
        type: Number,
        required: false,
        default: -1, // -1 means no stops completed yet
    },
    targetType: {
        type: String,
        enum: ["pickup", "stop", "destination"],
        required: false,
    },
    targetLocation: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
        },
        coordinates: {
            type: [Number],
            default: [0, 0],
        },
    },
    targetStopOrder: {
        type: Number,
        required: false,
        default: null,
    },
    activeLeg: {
        from: { type: String },
        to: { type: String },
        distanceKm: { type: Number },
        durationMinutes: { type: Number },
        isCurrent: { type: Boolean },
    },
    totalDistanceKm: {
        type: Number,
        required: false,
    },
    totalDurationMinutes: {
        type: Number,
        required: false,
    },
    routeLegs: [
        {
            from: { type: String },
            to: { type: String },
            distanceKm: { type: Number },
            durationMinutes: { type: Number },
            isCurrent: { type: Boolean },
        },
    ],
    polyline: {
        type: String,
        required: false,
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
exports.Tracking = (0, mongoose_1.model)("Tracking", trackingSchema);
