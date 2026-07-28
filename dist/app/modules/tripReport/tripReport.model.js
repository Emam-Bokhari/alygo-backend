"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TripReport = void 0;
const mongoose_1 = require("mongoose");
const tripReport_constant_1 = require("./tripReport.constant");
const adminNoteSchema = new mongoose_1.Schema({
    note: {
        type: String,
        required: true,
    },
    adminId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, { _id: false });
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
const tripReportSchema = new mongoose_1.Schema({
    ticketId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true,
    },
    rideId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Ride",
        required: true,
        index: true,
    },
    reporterId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    issueId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "ReportIssueCategory",
        required: true,
        index: true,
    },
    providedSummaryDetails: {
        type: String,
        trim: true,
        default: "",
    },
    estimatedResponseTimeInMinutes: {
        type: Number,
        required: true,
        min: 0,
        default: 60,
    },
    status: {
        type: String,
        enum: Object.values(tripReport_constant_1.TRIP_REPORT_STATUS),
        default: tripReport_constant_1.TRIP_REPORT_STATUS.OPEN,
        index: true,
    },
    resolutionNotes: {
        type: String,
        trim: true,
        default: "",
    },
    resolvedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: false,
    },
    resolvedAt: {
        type: Date,
        required: false,
    },
    rideSnapshot: {
        rideCategory: {
            type: String,
            required: true,
        },
        pickupAddress: {
            type: String,
            required: true,
        },
        destinationAddress: {
            type: String,
            required: true,
        },
        driverId: {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        driverName: {
            type: String,
            required: true,
        },
        vehicleName: {
            type: String,
            required: true,
        },
        vehicleNumber: {
            type: String,
            required: true,
        },
        completedAt: {
            type: Date,
            required: true,
        },
    },
    adminNotes: {
        type: [adminNoteSchema],
        default: [],
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
// Unique index on rideId to ensure only one report per ride
tripReportSchema.index({ rideId: 1 }, { unique: true });
exports.TripReport = (0, mongoose_1.model)("TripReport", tripReportSchema);
