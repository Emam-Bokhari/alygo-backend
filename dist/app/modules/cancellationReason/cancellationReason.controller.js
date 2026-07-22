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
exports.CancellationReasonController = void 0;
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const cancellationReason_service_1 = require("./cancellationReason.service");
const createCancellationReason = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield cancellationReason_service_1.CancellationReasonServices.createCancellationReasonToDB(req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 201,
        message: "Cancellation reason created successfully",
        data: result,
    });
}));
const getCancellationReason = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { cancellationReasonId } = req.params;
    const result = yield cancellationReason_service_1.CancellationReasonServices.getCancellationReasonFromDB(cancellationReasonId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Cancellation reason retrieved successfully",
        data: result,
    });
}));
const getAllCancellationReasons = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield cancellationReason_service_1.CancellationReasonServices.getAllCancellationReasonsFromDB(req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Cancellation reasons retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
}));
const getActiveCancellationReasons = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield cancellationReason_service_1.CancellationReasonServices.getActiveCancellationReasonsFromDB(req.query);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Active cancellation reasons retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
}));
const updateCancellationReason = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { cancellationReasonId } = req.params;
    const result = yield cancellationReason_service_1.CancellationReasonServices.updateCancellationReasonFromDB(cancellationReasonId, req.body);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Cancellation reason updated successfully",
        data: result,
    });
}));
const deleteCancellationReason = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { cancellationReasonId } = req.params;
    const result = yield cancellationReason_service_1.CancellationReasonServices.deleteCancellationReasonFromDB(cancellationReasonId);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Cancellation reason deleted successfully",
        data: result,
    });
}));
const updateCancellationReasonStatus = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { cancellationReasonId } = req.params;
    const { status } = req.body;
    const result = yield cancellationReason_service_1.CancellationReasonServices.updateCancellationReasonStatusFromDB(cancellationReasonId, status);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: 200,
        message: "Cancellation reason status updated successfully",
        data: result,
    });
}));
exports.CancellationReasonController = {
    createCancellationReason,
    getCancellationReason,
    getAllCancellationReasons,
    getActiveCancellationReasons,
    updateCancellationReason,
    deleteCancellationReason,
    updateCancellationReasonStatus,
};
