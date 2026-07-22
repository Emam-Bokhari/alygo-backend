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
exports.ReportIssueCategoryController = void 0;
const reportIssueCategory_service_1 = require("./reportIssueCategory.service");
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const createReportIssueCategory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const categoryData = req.body;
    const result = yield reportIssueCategory_service_1.ReportIssueCategoryService.createReportIssueCategoryToDB(categoryData);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Report issue category created successfully",
        data: result,
    });
}));
const getAllReportIssueCategories = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield reportIssueCategory_service_1.ReportIssueCategoryService.getAllReportIssueCategoriesFromDB(req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Report issue categories retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
}));
const getActiveReportIssueCategories = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield reportIssueCategory_service_1.ReportIssueCategoryService.getActiveReportIssueCategoriesFromDB(req.query);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Active report issue categories retrieved successfully",
        data: result.data,
        meta: result.meta,
    });
}));
const getReportIssueCategoryById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.categoryId;
    const result = yield reportIssueCategory_service_1.ReportIssueCategoryService.getReportIssueCategoryById(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Report issue category retrieved successfully",
        data: result,
    });
}));
const updateReportIssueCategory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.categoryId;
    const updateData = req.body;
    const result = yield reportIssueCategory_service_1.ReportIssueCategoryService.updateReportIssueCategoryToDB(id, updateData);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Report issue category updated successfully",
        data: result,
    });
}));
const deleteReportIssueCategory = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.categoryId;
    const result = yield reportIssueCategory_service_1.ReportIssueCategoryService.deleteReportIssueCategoryFromDB(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Report issue category deleted successfully",
        data: result,
    });
}));
const updateReportIssueCategoryStatus = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.params.categoryId;
    const { status } = req.body;
    const result = yield reportIssueCategory_service_1.ReportIssueCategoryService.updateReportIssueCategoryStatusToDB(id, status);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Report issue category status updated successfully",
        data: result,
    });
}));
exports.ReportIssueCategoryController = {
    createReportIssueCategory,
    getAllReportIssueCategories,
    getActiveReportIssueCategories,
    getReportIssueCategoryById,
    updateReportIssueCategory,
    deleteReportIssueCategory,
    updateReportIssueCategoryStatus,
};
