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
exports.SurgeRuleController = void 0;
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const http_status_codes_1 = require("http-status-codes");
const surgeRule_service_1 = require("./surgeRule.service");
const surgeCalculation_service_1 = require("./surgeCalculation.service");
const createSurgeRule = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const user = req.user;
    const result = yield surgeRule_service_1.SurgeRuleService.createSurgeRule(user, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        success: true,
        message: "Surge Rule Created Successfully",
        data: result,
    });
}));
const getAllSurgeRules = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield surgeRule_service_1.SurgeRuleService.getAllSurgeRules(req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Surge Rules Retrieved Successfully",
        data: result.data,
        meta: result.meta,
    });
}));
const getSurgeRuleById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { surgeRuleId } = req.params;
    const result = yield surgeRule_service_1.SurgeRuleService.getSurgeRuleById(surgeRuleId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Surge Rule Retrieved Successfully",
        data: result,
    });
}));
const updateSurgeRule = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { surgeRuleId } = req.params;
    const result = yield surgeRule_service_1.SurgeRuleService.updateSurgeRule(surgeRuleId, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Surge Rule Updated Successfully",
        data: result,
    });
}));
const deleteSurgeRule = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { surgeRuleId } = req.params;
    const result = yield surgeRule_service_1.SurgeRuleService.deleteSurgeRule(surgeRuleId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Surge Rule Deleted Successfully",
        data: result,
    });
}));
const getActiveSurgeRules = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield surgeRule_service_1.SurgeRuleService.getActiveSurgeRules(req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Active Surge Rules Retrieved Successfully",
        data: result.data,
        meta: result.meta,
    });
}));
const updateSurgeRuleStatus = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { surgeRuleId } = req.params;
    const { status } = req.body;
    const result = yield surgeRule_service_1.SurgeRuleService.updateSurgeRuleStatus(surgeRuleId, status);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Surge Rule Status Updated Successfully",
        data: result,
    });
}));
const testSurgeCalculation = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { serviceAreaId } = req.params;
    const { testDate } = req.query;
    const date = testDate ? new Date(testDate) : new Date();
    const result = yield surgeCalculation_service_1.SurgeCalculationService.testSurgeCalculation(serviceAreaId, date);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Surge Calculation Test Result",
        data: result,
    });
}));
exports.SurgeRuleController = {
    createSurgeRule,
    getAllSurgeRules,
    getActiveSurgeRules,
    getSurgeRuleById,
    updateSurgeRule,
    updateSurgeRuleStatus,
    deleteSurgeRule,
    testSurgeCalculation,
};
