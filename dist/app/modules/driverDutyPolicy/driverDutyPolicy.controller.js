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
exports.DriverDutyPolicyController = void 0;
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const driverDutyPolicy_service_1 = require("./driverDutyPolicy.service");
const createDriverDutyPolicy = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield driverDutyPolicy_service_1.DriverDutyPolicyServices.createDriverDutyPolicyToDB(req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 201,
        message: "Driver duty policy created successfully",
        data: result,
    });
}));
const getDriverDutyPolicy = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { driverDutyPolicyId } = req.params;
    const result = yield driverDutyPolicy_service_1.DriverDutyPolicyServices.getDriverDutyPolicyFromDB(driverDutyPolicyId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Driver duty policy retrieved successfully",
        data: result,
    });
}));
const getAllDriverDutyPolicies = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield driverDutyPolicy_service_1.DriverDutyPolicyServices.getAllDriverDutyPoliciesFromDB(req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Driver duty policies retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
}));
const updateDriverDutyPolicy = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { driverDutyPolicyId } = req.params;
    const result = yield driverDutyPolicy_service_1.DriverDutyPolicyServices.updateDriverDutyPolicyFromDB(driverDutyPolicyId, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Driver duty policy updated successfully",
        data: result,
    });
}));
const deleteDriverDutyPolicy = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { driverDutyPolicyId } = req.params;
    const result = yield driverDutyPolicy_service_1.DriverDutyPolicyServices.deleteDriverDutyPolicyFromDB(driverDutyPolicyId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Driver duty policy deleted successfully",
        data: result,
    });
}));
const getActiveDriverDutyPolicies = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield driverDutyPolicy_service_1.DriverDutyPolicyServices.getActiveDriverDutyPoliciesFromDB(req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Active driver duty policies retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
}));
const updateDriverDutyPolicyStatus = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { driverDutyPolicyId } = req.params;
    const { status } = req.body;
    const result = yield driverDutyPolicy_service_1.DriverDutyPolicyServices.updateDriverDutyPolicyStatusFromDB(driverDutyPolicyId, status);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Driver duty policy status updated successfully",
        data: result,
    });
}));
const getGlobalRule = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield driverDutyPolicy_service_1.DriverDutyPolicyServices.getGlobalRuleFromDB();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Global duty hour rule retrieved successfully",
        data: result,
    });
}));
const getStateRules = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield driverDutyPolicy_service_1.DriverDutyPolicyServices.getStateRulesFromDB(req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "State rules retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
}));
const getCityRules = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield driverDutyPolicy_service_1.DriverDutyPolicyServices.getCityRulesFromDB(req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "City rules retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
}));
const getZoneRules = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield driverDutyPolicy_service_1.DriverDutyPolicyServices.getZoneRulesFromDB(req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Zone rules retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
}));
const getAirportRules = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield driverDutyPolicy_service_1.DriverDutyPolicyServices.getAirportRulesFromDB(req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Airport rules retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
}));
const getMonitoringCards = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield driverDutyPolicy_service_1.DriverDutyPolicyServices.getMonitoringCardsFromDB();
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Driver monitoring cards retrieved successfully",
        data: result,
    });
}));
const getDriverMonitoringList = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield driverDutyPolicy_service_1.DriverDutyPolicyServices.getDriverMonitoringListFromDB(req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Driver monitoring list retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
}));
exports.DriverDutyPolicyController = {
    createDriverDutyPolicy,
    getDriverDutyPolicy,
    getAllDriverDutyPolicies,
    updateDriverDutyPolicy,
    deleteDriverDutyPolicy,
    getActiveDriverDutyPolicies,
    updateDriverDutyPolicyStatus,
    getGlobalRule,
    getStateRules,
    getCityRules,
    getZoneRules,
    getAirportRules,
    getMonitoringCards,
    getDriverMonitoringList,
};
