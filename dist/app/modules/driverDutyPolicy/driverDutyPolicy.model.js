"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverDutyPolicy = void 0;
const mongoose_1 = require("mongoose");
const driverDutyPolicy_constant_1 = require("./driverDutyPolicy.constant");
const status_1 = require("../../../constants/status");
const softDeletePlugin_1 = require("../../../DB/plugins/softDeletePlugin");
const driverDutyPolicySchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    scopeType: {
        type: String,
        enum: Object.values(driverDutyPolicy_constant_1.DRIVER_DUTY_POLICY_SCOPE_TYPE),
        required: true,
    },
    countryId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "ServiceArea",
        default: null,
    },
    stateId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "ServiceArea",
        default: null,
    },
    cityId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "ServiceArea",
        default: null,
    },
    zoneId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "ServiceArea",
        default: null,
    },
    airportId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "ServiceArea",
        default: null,
    },
    // Driving Rules
    maxDrivingHoursPerDay: {
        type: Number,
        required: true,
        min: 0,
    },
    maxContinuousDrivingHours: {
        type: Number,
        required: true,
        min: 0,
    },
    breakAfterHours: {
        type: Number,
        required: true,
        min: 0,
    },
    breakDurationMinutes: {
        type: Number,
        required: true,
        min: 0,
    },
    // Trip Rules
    maxTripsPerDay: {
        type: Number,
        min: 0,
    },
    minimumRestHours: {
        type: Number,
        min: 0,
    },
    status: {
        type: String,
        enum: Object.values(status_1.STATUS),
        default: status_1.STATUS.ACTIVE,
    },
}, {
    timestamps: true,
    versionKey: false,
});
driverDutyPolicySchema.plugin(softDeletePlugin_1.softDeletePlugin);
exports.DriverDutyPolicy = (0, mongoose_1.model)("DriverDutyPolicy", driverDutyPolicySchema);
