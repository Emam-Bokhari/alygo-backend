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
const createCancellationPolicyToDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
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
const getCancellationPolicyFromDB = (_cancellationPolicyId) => __awaiter(void 0, void 0, void 0, function* () {
    return yield getPolicyConfig();
});
const getAllCancellationPolicyFromDB = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (_query = {}) {
    const policy = yield getPolicyConfig();
    const result = policy ? [policy] : [];
    return {
        meta: {
            page: 1,
            limit: 10,
            total: result.length,
            totalPage: 1,
        },
        result,
    };
});
const getActiveCancellationPoliciesFromDB = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (_query = {}) {
    const policy = yield getPolicyConfig();
    const result = policy ? [policy] : [];
    return {
        meta: {
            page: 1,
            limit: 10,
            total: result.length,
            totalPage: 1,
        },
        result,
    };
});
const getCancellationPolicyByActorAndTriggerFromDB = (actorType, triggerType) => __awaiter(void 0, void 0, void 0, function* () {
    const policy = yield getPolicyConfig();
    if (!policy)
        return null;
    let scenario;
    const normalizedActor = actorType.toLowerCase();
    if (normalizedActor === "user" || normalizedActor === "passenger") {
        scenario = policy.passenger[triggerType];
    }
    else if (normalizedActor === "driver") {
        scenario = policy.driver[triggerType];
    }
    if (!scenario)
        return null;
    const actorKey = normalizedActor === "user" ? "passenger" : normalizedActor;
    const internalKey = `${actorKey}.${triggerType}`;
    const mapped = exports.CANCEL_SCENARIO_MAPPING[internalKey] || {
        scenario: internalKey.replace(".", "_"),
        policyName: triggerType.replace(/([A-Z])/g, " $1").trim(),
    };
    return {
        _id: policy._id,
        policyName: mapped.policyName,
        scenario: mapped.scenario,
        actorType,
        triggerType,
        cancellationFee: scenario.cancellationFee,
        otherPartyCompensation: scenario.driverCompensation || 0,
        platformShare: scenario.platformShare,
        status: "ACTIVE",
        createdAt: policy.createdAt,
        updatedAt: policy.updatedAt,
    };
});
const updateCancellationPolicyToDB = (_cancellationPolicyId, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const policy = yield getPolicyConfig();
    const updated = yield cancellationPolicy_model_1.CancellationPolicy.findByIdAndUpdate(policy._id, payload, { new: true });
    if (!updated) {
        throw new ApiErrors_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Cancellation policy not found");
    }
    return updated;
});
const updateCancellationPolicyStatusToDB = (_cancellationPolicyId, _status) => __awaiter(void 0, void 0, void 0, function* () {
    return yield getPolicyConfig();
});
const deleteCancellationPolicyToDB = (_cancellationPolicyId) => __awaiter(void 0, void 0, void 0, function* () {
    const policy = yield getPolicyConfig();
    const result = yield cancellationPolicy_model_1.CancellationPolicy.softDeleteById(policy._id.toString());
    return result;
});
exports.CancellationPolicyService = {
    getPolicyConfig,
    createCancellationPolicyToDB,
    getCancellationPolicyFromDB,
    getAllCancellationPolicyFromDB,
    getActiveCancellationPoliciesFromDB,
    getCancellationPolicyByActorAndTriggerFromDB,
    updateCancellationPolicyToDB,
    deleteCancellationPolicyToDB,
    updateCancellationPolicyStatusToDB,
};
