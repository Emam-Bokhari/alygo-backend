"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CancellationPolicy = void 0;
const mongoose_1 = require("mongoose");
const softDeletePlugin_1 = require("../../../DB/plugins/softDeletePlugin");
const passengerScenarioSchema = new mongoose_1.Schema({
    cancellationFee: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
    platformShare: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
    driverCompensation: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
}, { _id: false });
const driverScenarioSchema = new mongoose_1.Schema({
    cancellationFee: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
    platformShare: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
}, { _id: false });
const cancellationPolicySchema = new mongoose_1.Schema({
    passenger: {
        beforeDriverAccepted: {
            type: passengerScenarioSchema,
            required: true,
        },
        afterDriverAccepted: {
            type: passengerScenarioSchema,
            required: true,
        },
        afterDriverArrived: {
            type: passengerScenarioSchema,
            required: true,
        },
    },
    driver: {
        afterAccept: {
            type: driverScenarioSchema,
            required: true,
        },
        excessiveCancellation: {
            type: driverScenarioSchema,
            required: true,
        },
        excessiveCancellationThreshold: {
            type: Number,
            required: true,
            default: 3,
        },
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
cancellationPolicySchema.plugin(softDeletePlugin_1.softDeletePlugin);
exports.CancellationPolicy = (0, mongoose_1.model)("CancellationPolicy", cancellationPolicySchema);
