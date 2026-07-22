"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Event = void 0;
const mongoose_1 = require("mongoose");
const softDeletePlugin_1 = require("../../../DB/plugins/softDeletePlugin");
const status_1 = require("../../../constants/status");
const eventSchema = new mongoose_1.Schema({
    eventName: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    timezone: {
        type: String,
        required: true,
        trim: true,
    },
    startDateTime: {
        type: Date,
        required: true,
    },
    endDateTime: {
        type: Date,
        required: true,
    },
    serviceAreaId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "ServiceArea",
    },
    location: {
        type: {
            type: String,
            enum: ["Point"],
            default: "Point",
        },
        coordinates: {
            type: [Number],
            required: false,
        },
    },
    coverageRadiusKm: {
        type: Number,
        min: 0,
    },
    status: {
        type: String,
        enum: Object.values(status_1.STATUS),
        default: status_1.STATUS.ACTIVE,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
    },
}, {
    timestamps: true,
    versionKey: false,
});
eventSchema.index({ location: "2dsphere" });
eventSchema.plugin(softDeletePlugin_1.softDeletePlugin);
exports.Event = (0, mongoose_1.model)("Event", eventSchema);
