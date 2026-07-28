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
exports.CancellationPolicyService = exports.CANCEL_SCENARIO_MAPPING = void 0;
const http_status_codes_1 = require("http-status-codes");
const cancellationPolicy_model_1 = require("./cancellationPolicy.model");
const ApiErrors_1 = __importDefault(require("../../../errors/ApiErrors"));
exports.CANCEL_SCENARIO_MAPPING = {
    "passenger.beforeDriverAccepted": {
        scenario: "passenger_cancelled_before_driver_accept",
        policyName: "Passenger Cancellation Before Driver Accept",
    },
    "passenger.afterDriverAccepted": {
        scenario: "passenger_cancelled_after_driver_accept",
        policyName: "Passenger Cancellation After Driver Accept",
    },
    "passenger.afterDriverArrived": {
        scenario: "passenger_cancelled_after_driver_arrive",
        policyName: "Passenger Cancellation After Driver Arrive",
    },
    "driver.afterAccept": {
        scenario: "driver_cancelled_after_accept",
        policyName: "Driver Cancellation After Accept",
    },
    "driver.excessiveCancellation": {
        scenario: "driver_cancelled_excessive",
        policyName: "Driver Excessive Cancellation",
    },
};
const getDefaultPolicyConfig = () => ({
    passenger: {
        beforeDriverAccepted: {
            cancellationFee: 0,
            platformShare: 0,
            driverCompensation: 0,
        },
        afterDriverAccepted: {
            cancellationFee: 10,
            platformShare: 3,
            driverCompensation: 7,
        },
        afterDriverArrived: {
            cancellationFee: 15,
            platformShare: 4,
            driverCompensation: 11,
        },
    },
    driver: {
        afterAccept: { cancellationFee: 5, platformShare: 5 },
        excessiveCancellation: { cancellationFee: 20, platformShare: 20 },
        excessiveCancellationThreshold: 3,
    },
});
const getPolicyConfig = (session) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    let policy = yield cancellationPolicy_model_1.CancellationPolicy.findOne().session(session);
    if (!policy ||
        policy.policyName ||
        !policy.passenger ||
        !policy.passenger.beforeDriverAccepted ||
        ((_b = (_a = policy.driver) === null || _a === void 0 ? void 0 : _a.afterAccept) === null || _b === void 0 ? void 0 : _b.driverCompensation) !== undefined) {
        if (policy) {
            yield cancellationPolicy_model_1.CancellationPolicy.deleteMany({}).session(session);
        }
        const [newPolicy] = yield cancellationPolicy_model_1.CancellationPolicy.create([getDefaultPolicyConfig()], { session });
        policy = newPolicy;
    }
    return policy;
});
const createOrUpdateCancellationPolicyToDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const policy = yield cancellationPolicy_model_1.CancellationPolicy.findOne();
    if (policy) {
        const updated = yield cancellationPolicy_model_1.CancellationPolicy.findByIdAndUpdate(policy._id, payload, { new: true });
        if (!updated) {
            throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Failed to update cancellation policy");
        }
        return updated;
    }
    const createCancellationPolicy = yield cancellationPolicy_model_1.CancellationPolicy.create(payload);
    if (!createCancellationPolicy) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Failed to create cancellation policy");
    }
    return createCancellationPolicy;
});
const getActiveCancellationPolicyFromDB = () => __awaiter(void 0, void 0, void 0, function* () {
    return yield getPolicyConfig();
});
exports.CancellationPolicyService = {
    getPolicyConfig,
    createOrUpdateCancellationPolicyToDB,
    getActiveCancellationPolicyFromDB,
};
